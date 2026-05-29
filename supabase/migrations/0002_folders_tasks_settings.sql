-- =============================================================================
-- Personal OS v2 — Migration 0002
-- Date: 2026-05-29
-- Description:
--   1. TABLE folders        — dossiers/catégories colorés pour les tâches (feature Trudido #2)
--   2. ALTER TABLE tasks    — champs manquants vs TypeScript (récurrence, heure, durée, flexibilité,
--                             sous-tâches, dossier, devoir lié)
--   3. ALTER TABLE profiles — colonnes personnalisation UI (feature Trudido #1)
-- =============================================================================


-- =============================================================================
-- 1. TABLE : folders (catégories colorées pour les tâches)
-- =============================================================================

create table public.folders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null check (length(name) > 0 and length(name) <= 100),
  color       text not null default '#38bdf8'
                check (color ~ '^#[0-9A-Fa-f]{6}$'),
  emoji       text check (length(emoji) <= 4),
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_folders_user_position on public.folders(user_id, position);

create trigger trg_folders_updated_at
  before update on public.folders
  for each row execute function public.set_updated_at();

alter table public.folders enable row level security;

create policy "users manage own folders" on public.folders
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "admins read all folders" on public.folders
  for select to authenticated
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'superadmin')
  ));


-- =============================================================================
-- 2. ALTER TABLE tasks — champs manquants
-- =============================================================================

-- Heure planifiée dans la journée (pour la vue Day-view)
alter table public.tasks
  add column if not exists task_time time;

-- Durée estimée en minutes
alter table public.tasks
  add column if not exists duration_min integer check (duration_min is null or duration_min > 0);

-- Tâche récurrente
alter table public.tasks
  add column if not exists recurring boolean not null default false;

alter table public.tasks
  add column if not exists recurrence text
    check (recurrence is null or recurrence in ('daily', 'weekly', 'monthly'));

-- Jours de récurrence (ex: ["Lundi","Mercredi"] pour weekly)
alter table public.tasks
  add column if not exists recurrence_days jsonb not null default '[]'::jsonb;

-- Heure de déclenchement de la récurrence (pour notifications)
alter table public.tasks
  add column if not exists recurrence_time time;

-- Date de dernière complétion (gestion reset récurrentes)
alter table public.tasks
  add column if not exists last_completed_at date;

-- Tâche flexible (deadline indicative, pas bloquante)
alter table public.tasks
  add column if not exists flexible boolean not null default false;

-- Sous-tâches stockées en jsonb [{id, text, done}]
alter table public.tasks
  add column if not exists subtasks jsonb not null default '[]'::jsonb;

-- Dossier/catégorie coloré (FK → folders, suppression dossier = null)
alter table public.tasks
  add column if not exists folder_id uuid references public.folders(id) on delete set null;

-- Devoir scolaire lié (FK → devoirs, optionnel)
alter table public.tasks
  add column if not exists linked_devoir_id uuid references public.devoirs(id) on delete set null;

-- Index pour les requêtes fréquentes sur les nouvelles colonnes
create index if not exists idx_tasks_user_folder
  on public.tasks(user_id, folder_id) where folder_id is not null;

create index if not exists idx_tasks_user_task_time
  on public.tasks(user_id, task_time) where task_time is not null and status != 'done';

create index if not exists idx_tasks_user_recurring
  on public.tasks(user_id, recurring) where recurring = true and status != 'done';

-- Contrainte : recurrence obligatoire si recurring = true
alter table public.tasks
  add constraint chk_recurring_recurrence
    check (
      (recurring = false)
      or (recurring = true and recurrence is not null)
    );


-- =============================================================================
-- 3. ALTER TABLE profiles — personnalisation UI (feature Réglages)
-- =============================================================================

-- Thème choisi par l'utilisateur : dark / light / system
alter table public.profiles
  add column if not exists theme text not null default 'dark'
    check (theme in ('dark', 'light', 'system'));

-- Couleur d'accent choisie
alter table public.profiles
  add column if not exists accent_color text not null default 'cyan'
    check (accent_color in ('cyan', 'violet', 'emerald', 'amber', 'rose', 'blue'));

-- Taille d'affichage
alter table public.profiles
  add column if not exists font_scale text not null default 'md'
    check (font_scale in ('sm', 'md', 'lg'));

-- Préférence de réduction des animations
alter table public.profiles
  add column if not exists reduce_motion boolean not null default false;

-- Onglet de démarrage par défaut
alter table public.profiles
  add column if not exists default_tab text not null default 'dashboard'
    check (default_tab in ('dashboard', 'taches', 'projets', 'ecole', 'finances', 'stats', 'ajustements', 'reglages'));


-- =============================================================================
-- FIN DE LA MIGRATION 0002
-- =============================================================================
--
-- APRÈS EXÉCUTION :
--   Aucune action manuelle requise.
--   Les nouvelles colonnes profiles ont des valeurs par défaut — 0 downtime.
--   Les nouvelles colonnes tasks sont nullable ou ont des defaults — 0 downtime.
--
-- =============================================================================
