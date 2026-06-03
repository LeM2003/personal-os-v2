import { NextResponse } from 'next/server'
import { createClient as createServer } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

// POST — supprime définitivement le compte de l'utilisateur connecté + ses données.
// La suppression de auth.users cascade vers toutes les tables (FK on delete cascade).
export async function POST() {
  try {
    // 1. Identifier l'utilisateur via sa session (cookie)
    const supabase = await createServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    // 2. Supprimer avec le service_role (seul habilité à supprimer un auth.user)
    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // 3. Couper la session
    await supabase.auth.signOut()
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
