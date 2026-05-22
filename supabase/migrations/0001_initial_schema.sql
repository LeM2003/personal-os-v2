-- =============================================================================
-- Personal OS v2 — Initial Schema Migration
-- Version: 0001
-- Date: 2026-05-22
-- Description: Schéma initial complet avec auth, modules métier, feedback, events.
--              Calibrage Top 1 mondial (RLS strict, multi-tenant, audit trail).
-- =============================================================================
--
-- Tables :
--   1. profiles            — extension de auth.users (rôle, profil, i18n)
--   2. projects            — projets vue Kanban
--   3. tasks               — tâches libres ou liées aux projets
--   4. habits              — habitudes à tracker
--   5. habit_completions   — historique des complétions jour par jour
--   6. exams               — examens scolaires
--   7. devoirs             — devoirs/homework
--   8. expenses            — dépenses & revenus
--   9. ideas               — capture d'idées (mémo IA)
--  10. feedback            — feedback in-app
--  11. events              — analytics maison (audit trail immuable)
--
-- =============================================================================


-- =============================================================================
-- 1. SHARED FUNCTIONS (triggers réutilisables)
-- =============================================================================

-- 1.1 Auto-update du champ updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1.2 Auto-création du profile à l'inscription via auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  );
  return new;
end;
$$;

-- 1.3 Auto-set completed_at sur tasks
create or replace function public.handle_task_completion()
returns trigger language plpgsql as $$
begin
  if new.status = 'done' and (old.status is null or old.status != 'done') then
    new.completed_at = now();
  elsif new.status != 'done' then
    new.completed_at = null;
  end if;
  return new;
end;
$$;

-- 1.4 Auto-set submitted_at sur devoirs
create or replace function public.handle_devoir_submission()
returns trigger language plpgsql as $$
begin
  if new.status in ('submitted', 'graded') and old.submitted_at is null then
    new.submitted_at = now();
  end if;
  return new;
end;
$$;

-- 1.5 Auto-set resolved_at + resolved_by sur feedback
create or replace function public.handle_feedback_resolution()
returns trigger language plpgsql as $$
begin
  if new.status in ('resolved', 'wont_fix', 'duplicate') and old.resolved_at is null then
    new.resolved_at = now();
    new.resolved_by = auth.uid();
  end if;
  return new;
end;
$$;


-- =============================================================================
-- 2. TABLE : profiles (extension de auth.users)
-- =============================================================================

create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text unique not null,
  full_name       text,
  username        text unique,
  avatar_url      text,
  role            text not null default 'user' check (role in ('user', 'admin', 'superadmin')),
  profile_mode    text not null default 'student' check (profile_mode in ('student', 'professional', 'both', 'custom')),
  custom_modules  jsonb not null default '[]'::jsonb,
  timezone        text not null default 'Africa/Dakar',
  locale          text not null default 'fr' check (locale in ('fr', 'en', 'pt', 'ar')),
  onboarding_done boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_profiles_role on public.profiles(role) where role != 'user';
create index idx_profiles_created_at on public.profiles(created_at desc);

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy "users read own profile" on public.profiles
  for select to authenticated
  using (auth.uid() = id);

create policy "users update own profile" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select role from public.profiles where id = auth.uid())
  );

create policy "admins read all profiles" on public.profiles
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'superadmin')
    )
  );

create policy "superadmins update any profile" on public.profiles
  for update to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'superadmin'
    )
  );


-- =============================================================================
-- 3. TABLE : projects (vue Kanban)
-- =============================================================================

create table public.projects (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  title         text not null check (length(title) > 0 and length(title) <= 200),
  description   text check (length(description) <= 5000),
  status        text not null default 'backlog'
                  check (status in ('backlog', 'in_progress', 'done', 'archived')),
  color         text default '#3B82F6',
  emoji         text,
  target_date   date,
  position      integer not null default 0,
  ai_analysis   jsonb,
  ai_score      integer check (ai_score between 0 and 100),
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_projects_user_status
  on public.projects(user_id, status) where status != 'archived';
create index idx_projects_user_target
  on public.projects(user_id, target_date) where target_date is not null;

create trigger trg_projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

alter table public.projects enable row level security;

create policy "users manage own projects" on public.projects
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "admins read all projects" on public.projects
  for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'superadmin')));


-- =============================================================================
-- 4. TABLE : tasks (libres ou liées aux projets)
-- =============================================================================

create table public.tasks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  project_id    uuid references public.projects(id) on delete set null,
  title         text not null check (length(title) > 0 and length(title) <= 500),
  description   text check (length(description) <= 5000),
  status        text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  priority      text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  due_date      timestamptz,
  completed_at  timestamptz,
  tags          jsonb not null default '[]'::jsonb,
  ai_generated  boolean not null default false,
  position      integer not null default 0,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_tasks_user_status on public.tasks(user_id, status) where status != 'done';
create index idx_tasks_user_project on public.tasks(user_id, project_id) where project_id is not null;
create index idx_tasks_user_due on public.tasks(user_id, due_date) where due_date is not null and status != 'done';

create trigger trg_tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

create trigger trg_tasks_completion
  before insert or update on public.tasks
  for each row execute function public.handle_task_completion();

alter table public.tasks enable row level security;

create policy "users manage own tasks" on public.tasks
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "admins read all tasks" on public.tasks
  for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'superadmin')));


-- =============================================================================
-- 5. TABLE : habits + habit_completions (habit tracker 90 jours)
-- =============================================================================

create table public.habits (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  name            text not null check (length(name) > 0 and length(name) <= 100),
  description     text check (length(description) <= 1000),
  icon            text,
  color           text default '#10B981',
  frequency       text not null default 'daily'
                    check (frequency in ('daily', 'weekdays', 'weekends', 'weekly', 'custom')),
  custom_days     jsonb not null default '[]'::jsonb,
  target_per_week integer not null default 7 check (target_per_week between 1 and 7),
  is_archived     boolean not null default false,
  position        integer not null default 0,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_habits_user_active on public.habits(user_id, position) where is_archived = false;

create trigger trg_habits_updated_at
  before update on public.habits
  for each row execute function public.set_updated_at();

alter table public.habits enable row level security;

create policy "users manage own habits" on public.habits
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "admins read all habits" on public.habits
  for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'superadmin')));


create table public.habit_completions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  habit_id       uuid not null references public.habits(id) on delete cascade,
  completed_date date not null default current_date,
  notes          text check (length(notes) <= 500),
  created_at     timestamptz not null default now(),
  unique (habit_id, completed_date)
);

create index idx_completions_habit_date on public.habit_completions(habit_id, completed_date desc);
create index idx_completions_user_date on public.habit_completions(user_id, completed_date desc);

alter table public.habit_completions enable row level security;

create policy "users manage own completions" on public.habit_completions
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "admins read all completions" on public.habit_completions
  for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'superadmin')));


-- =============================================================================
-- 6. TABLE : exams (module École)
-- =============================================================================

create table public.exams (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  subject         text not null check (length(subject) > 0 and length(subject) <= 100),
  title           text check (length(title) <= 200),
  description     text check (length(description) <= 5000),
  exam_date       timestamptz not null,
  duration_min    integer check (duration_min > 0 and duration_min <= 1440),
  location        text check (length(location) <= 200),
  topics          jsonb not null default '[]'::jsonb,
  difficulty      text default 'medium' check (difficulty in ('low', 'medium', 'high')),
  weight          numeric(4,2) default 1.0 check (weight >= 0 and weight <= 100),
  status          text not null default 'upcoming' check (status in ('upcoming', 'completed', 'cancelled')),
  grade           numeric(5,2) check (grade >= 0),
  max_grade       numeric(5,2) check (max_grade > 0),
  notes           text check (length(notes) <= 10000),
  ai_generated    boolean not null default false,
  ai_revision_plan jsonb,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_exams_user_upcoming on public.exams(user_id, exam_date) where status = 'upcoming';
create index idx_exams_user_subject_grade
  on public.exams(user_id, subject) where status = 'completed' and grade is not null;

create trigger trg_exams_updated_at
  before update on public.exams
  for each row execute function public.set_updated_at();

alter table public.exams enable row level security;

create policy "users manage own exams" on public.exams
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "admins read all exams" on public.exams
  for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'superadmin')));


-- =============================================================================
-- 7. TABLE : devoirs (module École — homework)
-- =============================================================================

create table public.devoirs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  exam_id         uuid references public.exams(id) on delete set null,
  subject         text not null check (length(subject) > 0 and length(subject) <= 100),
  title           text not null check (length(title) > 0 and length(title) <= 300),
  description     text check (length(description) <= 5000),
  type            text not null default 'homework'
                    check (type in ('homework', 'project', 'presentation', 'lab', 'essay', 'reading', 'other')),
  due_date        timestamptz not null,
  submitted_at    timestamptz,
  status          text not null default 'todo'
                    check (status in ('todo', 'doing', 'submitted', 'graded', 'cancelled')),
  estimated_min   integer check (estimated_min > 0 and estimated_min <= 10080),
  actual_min      integer check (actual_min >= 0),
  difficulty      text default 'medium' check (difficulty in ('low', 'medium', 'high')),
  grade           numeric(5,2) check (grade >= 0),
  max_grade       numeric(5,2) check (max_grade > 0),
  weight          numeric(4,2) default 1.0 check (weight >= 0 and weight <= 100),
  attachments     jsonb not null default '[]'::jsonb,
  notes           text check (length(notes) <= 10000),
  ai_generated    boolean not null default false,
  ai_help_used    boolean not null default false,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_devoirs_user_due on public.devoirs(user_id, due_date) where status in ('todo', 'doing');
create index idx_devoirs_user_subject_graded
  on public.devoirs(user_id, subject) where status = 'graded' and grade is not null;
create index idx_devoirs_exam_id on public.devoirs(exam_id) where exam_id is not null;

create trigger trg_devoirs_updated_at
  before update on public.devoirs
  for each row execute function public.set_updated_at();

create trigger trg_devoirs_submission
  before update on public.devoirs
  for each row execute function public.handle_devoir_submission();

alter table public.devoirs enable row level security;

create policy "users manage own devoirs" on public.devoirs
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "admins read all devoirs" on public.devoirs
  for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'superadmin')));


-- =============================================================================
-- 8. TABLE : expenses (module Finances — dépenses & revenus)
-- =============================================================================

create table public.expenses (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  type                text not null default 'expense' check (type in ('expense', 'income')),
  amount              numeric(12,2) not null check (amount > 0),
  currency            char(3) not null default 'XOF' check (currency ~ '^[A-Z]{3}$'),
  category            text not null check (length(category) > 0 and length(category) <= 50),
  subcategory         text check (length(subcategory) <= 50),
  description         text check (length(description) <= 1000),
  merchant            text check (length(merchant) <= 200),
  payment_method      text default 'cash'
                        check (payment_method in ('cash', 'wave', 'orange_money', 'free_money', 'card', 'transfer', 'other')),
  occurred_at         timestamptz not null default now(),
  recurring           boolean not null default false,
  recurring_frequency text check (recurring_frequency in ('daily', 'weekly', 'monthly', 'yearly') or recurring_frequency is null),
  tags                jsonb not null default '[]'::jsonb,
  attachments         jsonb not null default '[]'::jsonb,
  ai_generated        boolean not null default false,
  ai_categorized      boolean not null default false,
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint chk_recurring_frequency
    check ((recurring = false) or (recurring = true and recurring_frequency is not null))
);

create index idx_expenses_user_occurred on public.expenses(user_id, occurred_at desc);
create index idx_expenses_user_category on public.expenses(user_id, category, occurred_at desc);
create index idx_expenses_user_type_month on public.expenses(user_id, type, occurred_at desc);

create trigger trg_expenses_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

alter table public.expenses enable row level security;

create policy "users manage own expenses" on public.expenses
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "admins read all expenses" on public.expenses
  for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'superadmin')));


-- =============================================================================
-- 9. TABLE : ideas (capture d'idées / mémo IA)
-- =============================================================================

create table public.ideas (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  project_id    uuid references public.projects(id) on delete set null,
  title         text not null check (length(title) > 0 and length(title) <= 300),
  content       text check (length(content) <= 50000),
  type          text not null default 'note'
                  check (type in ('note', 'business', 'feature', 'thought', 'quote', 'dream', 'other')),
  tags          jsonb not null default '[]'::jsonb,
  color         text default '#FBBF24',
  pinned        boolean not null default false,
  archived      boolean not null default false,
  attachments   jsonb not null default '[]'::jsonb,
  ai_generated  boolean not null default false,
  ai_context    jsonb,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_ideas_user_active
  on public.ideas(user_id, pinned desc, created_at desc) where archived = false;
create index idx_ideas_user_type
  on public.ideas(user_id, type, created_at desc) where archived = false;

create trigger trg_ideas_updated_at
  before update on public.ideas
  for each row execute function public.set_updated_at();

alter table public.ideas enable row level security;

create policy "users manage own ideas" on public.ideas
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "admins read all ideas" on public.ideas
  for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'superadmin')));


-- =============================================================================
-- 10. TABLE : feedback (feedback in-app)
-- =============================================================================

create table public.feedback (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles(id) on delete set null,
  email         text check (length(email) <= 200),
  type          text not null default 'other'
                  check (type in ('bug', 'feature_request', 'praise', 'complaint', 'question', 'other')),
  severity      text default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  message       text not null check (length(message) > 0 and length(message) <= 5000),
  page          text check (length(page) <= 500),
  device_info   jsonb not null default '{}'::jsonb,
  attachments   jsonb not null default '[]'::jsonb,
  status        text not null default 'new'
                  check (status in ('new', 'seen', 'in_progress', 'resolved', 'wont_fix', 'duplicate')),
  admin_notes   text check (length(admin_notes) <= 5000),
  resolved_at   timestamptz,
  resolved_by   uuid references public.profiles(id) on delete set null,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_feedback_status_created
  on public.feedback(status, created_at desc) where status in ('new', 'seen', 'in_progress');
create index idx_feedback_user
  on public.feedback(user_id, created_at desc) where user_id is not null;
create index idx_feedback_type_created on public.feedback(type, created_at desc);

create trigger trg_feedback_updated_at
  before update on public.feedback
  for each row execute function public.set_updated_at();

create trigger trg_feedback_resolution
  before update on public.feedback
  for each row execute function public.handle_feedback_resolution();

alter table public.feedback enable row level security;

create policy "anyone can submit feedback" on public.feedback
  for insert to authenticated
  with check (user_id is null or user_id = auth.uid());

create policy "users read own feedback" on public.feedback
  for select to authenticated
  using (user_id = auth.uid());

create policy "admins read all feedback" on public.feedback
  for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'superadmin')));

create policy "admins update feedback" on public.feedback
  for update to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'superadmin')));

create policy "superadmins delete feedback" on public.feedback
  for delete to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'superadmin'));


-- =============================================================================
-- 11. TABLE : events (analytics maison — audit trail immuable)
-- =============================================================================

create table public.events (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.profiles(id) on delete set null,
  session_id      text,
  event_name      text not null check (length(event_name) > 0 and length(event_name) <= 100),
  event_category  text check (length(event_category) <= 50),
  properties      jsonb not null default '{}'::jsonb,
  page            text check (length(page) <= 500),
  referrer        text check (length(referrer) <= 500),
  device_info     jsonb not null default '{}'::jsonb,
  ip_address      inet,
  user_agent      text check (length(user_agent) <= 500),
  occurred_at     timestamptz not null default now()
);

create index idx_events_user_occurred on public.events(user_id, occurred_at desc) where user_id is not null;
create index idx_events_name_occurred on public.events(event_name, occurred_at desc);
create index idx_events_category_occurred on public.events(event_category, occurred_at desc) where event_category is not null;
create index idx_events_properties_gin on public.events using gin (properties);

alter table public.events enable row level security;

create policy "users insert own events" on public.events
  for insert to authenticated
  with check (user_id is null or user_id = auth.uid());

create policy "users read own events" on public.events
  for select to authenticated
  using (user_id = auth.uid());

create policy "admins read all events" on public.events
  for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'superadmin')));

create policy "superadmins delete events" on public.events
  for delete to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'superadmin'));


-- =============================================================================
-- FIN DE LA MIGRATION 0001
-- =============================================================================
--
-- PROCHAINES ÉTAPES (manuelles après exécution) :
--
-- 1. S'inscrire sur l'app avec metzod237@gmail.com via Supabase Auth
-- 2. Exécuter ce SQL pour devenir superadmin :
--      UPDATE public.profiles
--      SET role = 'superadmin'
--      WHERE email = 'metzod237@gmail.com';
--
-- =============================================================================
