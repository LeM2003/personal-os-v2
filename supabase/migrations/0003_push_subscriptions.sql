-- =============================================================================
-- Personal OS v2 — Migration 0003
-- Date: 2026-05-30
-- Description: Table push_subscriptions pour Web Push VAPID
-- =============================================================================

create table public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index idx_push_user on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

create policy "users manage own subscriptions" on public.push_subscriptions
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =============================================================================
-- APRÈS EXÉCUTION : aucune action manuelle requise.
-- =============================================================================
