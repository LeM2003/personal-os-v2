import { NextRequest } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return new Response(JSON.stringify({ error: 'GROQ_API_KEY non configurée' }), { status: 500 })
  }

  const { messages, context } = await req.json()

  const today = new Date().toISOString().split('T')[0]
  const todayLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  // Build a rich context summary from user data
  const ctx = context || {}
  const tasks = ctx.tasks || []
  const examens = ctx.examens || []
  const devoirs = ctx.devoirs || []
  const projects = ctx.projects || []
  const expenses = ctx.expenses || []
  const profile = ctx.profile || {}
  const streak = ctx.streak || 0

  const urgentTasks = tasks.filter((t: any) => t.status !== 'Terminé' && !t.recurring && t.deadline === today)
  const pendingTasks = tasks.filter((t: any) => t.status !== 'Terminé' && !t.recurring).slice(0, 5)
  const upcomingExams = examens
    .filter((e: any) => new Date(e.date) >= new Date(today))
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3)
  const pendingDevoirs = devoirs.filter((d: any) => d.statut !== 'Rendu').slice(0, 3)
  const activeProjects = projects.filter((p: any) => p.status !== 'Terminé').slice(0, 3)
  const weekExpenses = expenses
    .filter((e: any) => e.date >= new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0])
    .reduce((s: number, e: any) => s + (e.amount || 0), 0)

  const hour = new Date().getHours()
  const timeContext = hour < 7 ? 'tôt le matin (avant 7h)'
    : hour < 12 ? 'ce matin'
    : hour < 14 ? 'à l\'heure du déjeuner'
    : hour < 18 ? 'cet après-midi'
    : hour < 21 ? 'ce soir'
    : 'tard le soir'

  const modeContext = profile.mode === 'etudiant'
    ? 'étudiant(e) — priorise les révisions, examens et devoirs'
    : profile.mode === 'entrepreneur'
    ? 'professionnel(le) / entrepreneur(e) — priorise les projets, clients et productivité'
    : 'étudiant(e) ET entrepreneur(e) — jongle entre études et projets'

  const systemPrompt = `Tu es l'assistant personnel de ${profile.prenom || 'l\'utilisateur'}, intégré dans Personal OS.

**PROFIL** : ${modeContext}
**MOMENT** : ${todayLabel}, ${timeContext}

Tu connais leur situation aujourd'hui :

**TÂCHES URGENTES (deadline aujourd'hui)** : ${urgentTasks.length === 0 ? 'Aucune' : urgentTasks.map((t: any) => `"${t.name}" (${t.priority})`).join(', ')}

**TÂCHES EN ATTENTE** : ${pendingTasks.length === 0 ? 'Aucune' : pendingTasks.map((t: any) => `"${t.name}" — ${t.status}`).join('; ')}

**PROCHAINS EXAMENS** : ${upcomingExams.length === 0 ? 'Aucun' : upcomingExams.map((e: any) => `${e.matiere} le ${e.date}${e.heure ? ' à ' + e.heure : ''}`).join('; ')}

**DEVOIRS À RENDRE** : ${pendingDevoirs.length === 0 ? 'Aucun' : pendingDevoirs.map((d: any) => `${d.matiere} — avant ${d.dateRendu || '?'}`).join('; ')}

**PROJETS ACTIFS** : ${activeProjects.length === 0 ? 'Aucun' : activeProjects.map((p: any) => p.name).join(', ')}

**STREAK** : ${streak} jour(s) consécutifs actifs
**DÉPENSES (7 derniers jours)** : ${weekExpenses.toLocaleString('fr-FR')} FCFA

Ta mission :
- Répondre en français, de façon concise et actionnable
- Être encourageant, direct, comme un assistant personnel bienveillant
- Réponses courtes (3-5 phrases max sauf si demande détaillée)
- Ne pas inventer de données absentes du contexte

## ACTIONS DISPONIBLES

Quand l'utilisateur veut CRÉER quelque chose, inclus un bloc d'action à la fin de ta réponse.
Format exact (JSON sur une seule ligne) :

Pour une tâche :
[ACTION:create_task:{"name":"...","priority":"Critique|Important|Optionnel","deadline":"YYYY-MM-DD ou vide","project":""}]

Pour une idée/projet :
[ACTION:create_idea:{"name":"...","objective":"...","type":"idee"}]

Pour un examen :
[ACTION:create_exam:{"matiere":"...","date":"YYYY-MM-DD","heure":"HH:MM","salle":""}]

Pour un devoir :
[ACTION:create_devoir:{"matiere":"...","description":"...","dateRendu":"YYYY-MM-DD","priorite":"Critique|Important|Optionnel"}]

Pour une dépense :
[ACTION:create_expense:{"name":"...","amount":0,"category":"Alimentation|Transport|Loisirs|Santé|Autre"}]

Règles :
- N'inclus UN SEUL bloc ACTION par réponse
- Le bloc ACTION doit être à la toute fin du message
- Utilise des actions seulement quand l'utilisateur demande explicitement de créer quelque chose
- La date du jour est ${today} — convertis les dates relatives (demain, vendredi prochain, etc.)
- Si une info manque (date, priorité...), choisis une valeur raisonnable par défaut`

  const stream = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    temperature: 0.5,
    max_tokens: 512,
    stream: true,
  })

  // Return a streaming response
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || ''
        if (text) controller.enqueue(encoder.encode(text))
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  })
}
