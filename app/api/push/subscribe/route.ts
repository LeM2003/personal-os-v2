import { NextRequest, NextResponse } from 'next/server'
import { getUserFromBearer } from '@/lib/supabase/token'

export async function POST(req: NextRequest) {
  try {
    const { endpoint, keys } = await req.json()
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }

    const { user, admin } = await getUserFromBearer(req.headers.get('authorization'))
    if (!user || !admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Insert via service_role (RLS contournée en sécurité car user_id vérifié via le token)
    await admin.from('push_subscriptions').upsert({
      user_id:    user.id,
      endpoint,
      p256dh:     keys.p256dh,
      auth:       keys.auth,
      user_agent: req.headers.get('user-agent')?.slice(0, 200) ?? null,
    }, { onConflict: 'user_id,endpoint' })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = await req.json()
    const { user, admin } = await getUserFromBearer(req.headers.get('authorization'))
    if (!user || !admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await admin.from('push_subscriptions')
      .delete().eq('user_id', user.id).eq('endpoint', endpoint)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
