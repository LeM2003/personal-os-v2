/**
 * Test E2E "smoke" — pilote l'app de bout en bout via Playwright.
 * Couvre : landing (desktop+mobile), signup, dashboard, création tâche,
 * navigation entre onglets, réglages. Capture erreurs console + réseau.
 *
 * Lancement : node tests/e2e-smoke.mjs [URL]
 * Par défaut : https://personal-os.click
 */
import { chromium } from 'playwright'

const BASE = process.argv[2] || 'https://personal-os.click'
const TS = Date.now()
const TEST_EMAIL = `qa.smoke.${TS}@example.com`
const TEST_PASS = 'QaTest2026!'
const SHOT = (n) => `/tmp/pos-e2e-${n}.png`

const results = []
const consoleErrors = []
const networkErrors = []
function log(step, ok, detail = '') {
  results.push({ step, ok, detail })
  console.log(`${ok ? '✅' : '❌'} ${step}${detail ? ' — ' + detail : ''}`)
}

const browser = await chromium.launch({ channel: 'chrome' })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()

page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200))
})
const forbidden = []
page.on('response', (r) => {
  if (r.status() >= 500) networkErrors.push(`${r.status()} ${r.url().slice(0, 110)}`)
  else if (r.status() === 403 || r.status() === 400) forbidden.push(`${r.status()} ${r.url().slice(0, 110)}`)
})

try {
  // 1. LANDING desktop
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 45000 })
  const title = await page.title()
  log('Landing desktop charge', !!title, `title="${title}"`)
  await page.screenshot({ path: SHOT('1-landing-desktop'), fullPage: false })

  const hasCTA = await page.locator('text=/Entrer|Créer|Se connecter/i').first().isVisible().catch(() => false)
  log('CTA visible sur landing', hasCTA)

  // 2. LANDING mobile (375px)
  await page.setViewportSize({ width: 375, height: 812 })
  await page.waitForTimeout(800)
  await page.screenshot({ path: SHOT('2-landing-mobile'), fullPage: false })
  const bodyW = await page.evaluate(() => document.body.scrollWidth)
  log('Pas de débordement horizontal mobile', bodyW <= 390, `scrollWidth=${bodyW}px`)

  // 3. SIGNUP
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto(BASE, { waitUntil: 'networkidle' })
  // Ouvre le modal auth
  await page.locator('text=/Entrer|Créer un compte|Essayer/i').first().click().catch(() => {})
  await page.waitForTimeout(1000)
  // Bascule sur "Créer un compte" si nécessaire
  await page.locator('text=/Créer un compte/i').first().click().catch(() => {})
  await page.waitForTimeout(500)

  // Remplit le formulaire
  const inputs = page.locator('input')
  const n = await inputs.count()
  log('Formulaire auth ouvert', n >= 2, `${n} champs`)

  // Remplit prénom/nom si présents, puis email/password
  await page.locator('input[placeholder*="rénom" i]').first().fill('QA').catch(() => {})
  await page.locator('input[type="email"], input[placeholder*="mail" i]').first().fill(TEST_EMAIL).catch(() => {})
  const pwInputs = page.locator('input[type="password"]')
  const pwCount = await pwInputs.count()
  if (pwCount >= 1) await pwInputs.nth(0).fill(TEST_PASS)
  if (pwCount >= 2) await pwInputs.nth(1).fill(TEST_PASS)
  await page.screenshot({ path: SHOT('3-signup-filled') })

  // Clic PRÉCIS sur le bouton submit (pas l'onglet "Créer un compte")
  await page.getByRole('button', { name: /Créer mon compte/i }).click().catch(() => {})
  await page.waitForTimeout(5000)
  await page.screenshot({ path: SHOT('4-after-signup') })

  // Entré dans l'app = le modal auth a disparu
  const modalGone = !(await page.locator('text=/Créer mon compte/i').first().isVisible().catch(() => false))
  log('Compte créé → modal fermé', modalGone)

  // 4. Passe l'onboarding si présent (cliquer les boutons suivant/commencer)
  for (let i = 0; i < 4; i++) {
    const next = page.locator('button:has-text("Suivant"), button:has-text("Commencer"), button:has-text("C\'est parti"), button:has-text("Continuer"), button:has-text("Terminer")').first()
    if (await next.isVisible().catch(() => false)) { await next.click().catch(() => {}); await page.waitForTimeout(800) }
    else break
  }
  await page.waitForTimeout(1500)
  await page.screenshot({ path: SHOT('5-dashboard') })

  // 5. NAVIGATION entre onglets (cible la sidebar .nav-item, sinon n'importe quel élément cliquable)
  const tabs = ['Tâches', 'Projets', 'Finances', 'Statistiques']
  for (const t of tabs) {
    const el = page.locator(`.nav-item:has-text("${t}"), [role="navigation"] >> text="${t}"`).first()
    const ok = await el.click({ timeout: 4000 }).then(() => true).catch(async () => {
      // fallback : premier élément contenant le texte
      return page.locator(`text="${t}"`).first().click({ timeout: 3000 }).then(() => true).catch(() => false)
    })
    await page.waitForTimeout(1200)
    log(`Navigation onglet "${t}"`, ok)
  }

  // 6. CRÉER une tâche (sur l'onglet Tâches)
  await page.locator('text="Tâches"').first().click().catch(() => {})
  await page.waitForTimeout(1200)
  const quickInput = page.locator('input[placeholder*="Ajouter une tâche" i]').first()
  if (await quickInput.isVisible().catch(() => false)) {
    await quickInput.fill('Tâche QA test E2E')
    await quickInput.press('Enter')
    await page.waitForTimeout(1500)
    const created = await page.locator('text="Tâche QA test E2E"').first().isVisible().catch(() => false)
    log('Création de tâche', created)
    await page.screenshot({ path: SHOT('6-task-created') })
  } else {
    log('Création de tâche', false, 'champ rapide introuvable')
  }

  // 7. RÉGLAGES — toggle thème/accent
  await page.locator('text=/Réglages/i').first().click().catch(() => {})
  await page.waitForTimeout(1200)
  const settingsOk = await page.locator('text=/Apparence|Th[èe]me|accent/i').first().isVisible().catch(() => false)
  log('Page Réglages accessible', settingsOk)
  await page.screenshot({ path: SHOT('7-settings') })

} catch (e) {
  log('EXCEPTION', false, String(e).slice(0, 200))
} finally {
  // Bilan
  console.log('\n──────── BILAN ────────')
  const pass = results.filter(r => r.ok).length
  console.log(`Tests: ${pass}/${results.length} OK`)
  console.log(`Erreurs console: ${consoleErrors.length}`)
  consoleErrors.slice(0, 8).forEach(e => console.log('  ⚠ ' + e))
  console.log(`Erreurs réseau (5xx): ${networkErrors.length}`)
  networkErrors.slice(0, 8).forEach(e => console.log('  ⚠ ' + e))
  console.log(`Réponses 403/400: ${forbidden.length}`)
  forbidden.slice(0, 8).forEach(e => console.log('  • ' + e))
  console.log(`\nCompte test créé: ${TEST_EMAIL} (à supprimer)`)
  await browser.close()
}
