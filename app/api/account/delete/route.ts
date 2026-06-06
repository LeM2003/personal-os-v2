import { NextRequest, NextResponse } from 'next/server'
import { getUserFromBearer } from '@/lib/supabase/token'

// POST — supprime définitivement le compte de l'utilisateur connecté + ses données.
// La suppression de auth.users cascade vers toutes les tables (FK on delete cascade).
// Auth par token Bearer (fiable en TWA/PWA, contrairement aux cookies).
export async function POST(req: NextRequest) {
  try {
    const { user, admin } = await getUserFromBearer(req.headers.get('authorization'))
    if (!user || !admin) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    // Supprimer le compte avec le service_role (cascade vers toutes les tables)
    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
