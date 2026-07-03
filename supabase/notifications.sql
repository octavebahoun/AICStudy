-- semaine 5 : notifications réelles (avant ça la cloche dans la topbar ne servait à rien,
-- rien n'écrivait jamais dedans) + activation du temps réel sur les tables qui en ont besoin

create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  type text not null,
  message text not null,
  link text,
  read boolean default false,
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;

create policy "Users can view their notifications"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "Users can update their notifications"
  on public.notifications for update
  using (user_id = auth.uid());

-- Insert permissif : une notification est créée par l'acteur d'une action (ex. l'étudiant qui
-- s'inscrit) pour UN AUTRE utilisateur (le formateur) — donc "user_id = auth.uid()" bloquerait
-- ce cas. On autorise tout utilisateur authentifié à créer une notification (même compromis
-- que les policies forum/modules existantes basées sur auth.role() = 'authenticated').
create policy "Authenticated users can create notifications"
  on public.notifications for insert
  with check (auth.role() = 'authenticated');

-- Realtime : sans ça, aucun postgres_changes ne se déclenche jamais, silencieusement.
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.forum_posts;
alter publication supabase_realtime add table public.courses;
alter publication supabase_realtime add table public.quiz_attempts;
alter publication supabase_realtime add table public.enrollments;
