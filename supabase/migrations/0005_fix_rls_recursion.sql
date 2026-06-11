-- =============================================================================
-- Personal OS v2 — Migration 0005 : FIX récursion RLS (bug critique)
-- Date: 2026-06-11
--
-- PROBLÈME : les policies "admins read all X" faisaient
--   exists (select 1 from public.profiles where id = auth.uid() and role in (...))
-- Sur la table `profiles`, ce self-SELECT re-déclenche les policies de profiles
-- → récursion infinie → Postgres renvoie 500 sur TOUTES les requêtes.
--
-- SOLUTION : une fonction SECURITY DEFINER `is_admin()` qui contourne RLS
-- (donc pas de récursion), utilisée à la place du sous-SELECT.
-- =============================================================================

-- 1. Fonction is_admin() — SECURITY DEFINER bypasse RLS (pas de récursion)
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'superadmin')
  );
$$;

create or replace function public.is_superadmin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'superadmin'
  );
$$;

-- 2. profiles — remplace les policies récursives
drop policy if exists "admins read all profiles" on public.profiles;
create policy "admins read all profiles" on public.profiles
  for select to authenticated using (public.is_admin());

drop policy if exists "superadmins update any profile" on public.profiles;
create policy "superadmins update any profile" on public.profiles
  for update to authenticated using (public.is_superadmin());

-- 3. Toutes les autres tables — remplace le sous-SELECT par is_admin()
drop policy if exists "admins read all projects" on public.projects;
create policy "admins read all projects" on public.projects
  for select to authenticated using (public.is_admin());

drop policy if exists "admins read all tasks" on public.tasks;
create policy "admins read all tasks" on public.tasks
  for select to authenticated using (public.is_admin());

drop policy if exists "admins read all habits" on public.habits;
create policy "admins read all habits" on public.habits
  for select to authenticated using (public.is_admin());

drop policy if exists "admins read all completions" on public.habit_completions;
create policy "admins read all completions" on public.habit_completions
  for select to authenticated using (public.is_admin());

drop policy if exists "admins read all exams" on public.exams;
create policy "admins read all exams" on public.exams
  for select to authenticated using (public.is_admin());

drop policy if exists "admins read all devoirs" on public.devoirs;
create policy "admins read all devoirs" on public.devoirs
  for select to authenticated using (public.is_admin());

drop policy if exists "admins read all expenses" on public.expenses;
create policy "admins read all expenses" on public.expenses
  for select to authenticated using (public.is_admin());

drop policy if exists "admins read all ideas" on public.ideas;
create policy "admins read all ideas" on public.ideas
  for select to authenticated using (public.is_admin());

drop policy if exists "admins read all folders" on public.folders;
create policy "admins read all folders" on public.folders
  for select to authenticated using (public.is_admin());

-- feedback : admins lisent + modifient, superadmins suppriment
drop policy if exists "admins read all feedback" on public.feedback;
create policy "admins read all feedback" on public.feedback
  for select to authenticated using (public.is_admin());

drop policy if exists "admins update feedback" on public.feedback;
create policy "admins update feedback" on public.feedback
  for update to authenticated using (public.is_admin());

drop policy if exists "superadmins delete feedback" on public.feedback;
create policy "superadmins delete feedback" on public.feedback
  for delete to authenticated using (public.is_superadmin());

-- events : admins lisent, superadmins suppriment
drop policy if exists "admins read all events" on public.events;
create policy "admins read all events" on public.events
  for select to authenticated using (public.is_admin());

drop policy if exists "superadmins delete events" on public.events;
create policy "superadmins delete events" on public.events
  for delete to authenticated using (public.is_superadmin());

-- =============================================================================
-- FIN 0005 — après exécution, les requêtes Supabase ne renvoient plus 500.
-- =============================================================================
