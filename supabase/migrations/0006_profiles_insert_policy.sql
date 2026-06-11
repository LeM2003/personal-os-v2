-- =============================================================================
-- Personal OS v2 — Migration 0006 : policy INSERT manquante sur profiles
-- Date: 2026-06-11
--
-- PROBLÈME : le sync du profil côté client fait un `upsert` (INSERT ... ON CONFLICT).
-- Or profiles n'avait AUCUNE policy INSERT → l'upsert renvoie 403 → le profil
-- (prénom, mode, settings) ne se synchronise jamais.
--
-- SOLUTION : autoriser un utilisateur à insérer SON propre profil (id = auth.uid()).
-- Le trigger handle_new_user() crée déjà le profil à l'inscription ; cette policy
-- couvre le cas upsert côté client.
-- =============================================================================

create policy "users insert own profile" on public.profiles
  for insert to authenticated
  with check (auth.uid() = id);
