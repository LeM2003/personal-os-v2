-- =============================================================================
-- Personal OS v2 — Migration 0007 (PROPOSÉE — non appliquée) : module École complet
-- Date: 2026-06-23
--
-- CONTEXTE : exams et devoirs (migration 0001) sont déjà synchronisés cloud
-- (voir commit "feat(sync): branche devoirs + examens"). Il manque encore 3
-- tables pour que le module École soit intégralement multi-appareil :
-- subjects (matières), courses (emploi du temps hebdo), grades (notes).
-- Sans elles, ces 3 collections restent strictement locales à l'appareil.
--
-- ⚠️ CETTE MIGRATION N'A PAS ÉTÉ APPLIQUÉE À LA BASE DE PRODUCTION.
-- Raison : je n'ai pas d'accès direct à la base (pas de token CLI / connection
-- string) — appliquer un changement de schéma à une base de prod avec de vrais
-- utilisateurs sans validation explicite serait irresponsable. Pour l'activer :
--   1. Relire ce fichier
--   2. L'exécuter via Supabase Dashboard → SQL Editor (coller tout le contenu)
--      OU me donner un accès (token `supabase login` / connection string) pour
--      que je l'applique et enchaîne sur les mappers + EducationContext.
-- =============================================================================


-- =============================================================================
-- 1. TABLE : subjects (matières — coef pour moyennes pondérées)
-- =============================================================================

create table public.subjects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null check (length(name) > 0 and length(name) <= 100),
  short       text check (length(short) <= 20),
  coef        numeric(4,2) not null default 1 check (coef > 0 and coef <= 20),
  color       text default '#6366f1',
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_subjects_user on public.subjects(user_id, position);

create trigger trg_subjects_updated_at
  before update on public.subjects
  for each row execute function public.set_updated_at();

alter table public.subjects enable row level security;

create policy "users manage own subjects" on public.subjects
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "admins read all subjects" on public.subjects
  for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'superadmin')));


-- =============================================================================
-- 2. TABLE : courses (emploi du temps hebdomadaire récurrent)
-- =============================================================================
-- Note : un cours n'est PAS lié à une matière (le type Course de l'app n'a pas
-- de subjectId — juste un nom libre). Pas de FK vers subjects pour rester
-- fidèle au modèle actuel ; à ajouter plus tard si l'app évolue en ce sens.

create table public.courses (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  name            text not null check (length(name) > 0 and length(name) <= 200),
  day_of_week     text not null check (day_of_week in ('Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche')),
  start_time      text not null check (start_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  end_time        text check (end_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  room            text check (length(room) <= 100),
  teacher         text check (length(teacher) <= 100),
  color           text default '#6366f1',
  start_date      date,
  end_date        date,
  attended_dates  jsonb not null default '[]'::jsonb,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_courses_user_day on public.courses(user_id, day_of_week);

create trigger trg_courses_updated_at
  before update on public.courses
  for each row execute function public.set_updated_at();

alter table public.courses enable row level security;

create policy "users manage own courses" on public.courses
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "admins read all courses" on public.courses
  for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'superadmin')));


-- =============================================================================
-- 3. TABLE : grades (notes — liées à une matière, pour moyennes pondérées)
-- =============================================================================

create table public.grades (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  subject_id  uuid not null references public.subjects(id) on delete cascade,
  grade       numeric(5,2) not null check (grade >= 0),
  coef        numeric(4,2) not null default 1 check (coef > 0 and coef <= 20),
  type        text default 'Contrôle' check (length(type) <= 50),
  title       text check (length(title) <= 200),
  graded_at   date,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_grades_user_subject on public.grades(user_id, subject_id);

create trigger trg_grades_updated_at
  before update on public.grades
  for each row execute function public.set_updated_at();

alter table public.grades enable row level security;

create policy "users manage own grades" on public.grades
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "admins read all grades" on public.grades
  for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'superadmin')));


-- =============================================================================
-- FIN DE LA MIGRATION 0007 (PROPOSÉE)
--
-- APRÈS APPLICATION : me le signaler pour que j'enchaîne sur :
--   - mappers subjectToRow/rowToSubject, courseToRow/rowToCourse, gradeToRow/rowToGrade
--   - EducationContext : courses/notes/subjects sur useSyncedCollection
--   - build + déploiement + vérification
-- =============================================================================
