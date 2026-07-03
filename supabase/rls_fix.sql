
-- ── Je ne maitrise pas encore le sql totalemnt il me faut 1 semaine pour finir le cour sur sql 
alter table public.enrollments
  add column if not exists progress int default 0,
  add column if not exists status text default 'active';

drop policy if exists "Authenticated can view all users" on public.users;
create policy "Authenticated can view all users"
  on public.users for select
  using (auth.role() = 'authenticated');

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);


drop policy if exists "Admins can manage all courses" on public.courses;
create policy "Admins can manage all courses"
  on public.courses for all
  using (exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  ));

drop policy if exists "Students can view active courses" on public.courses;
create policy "Students can view active courses"
  on public.courses for select
  using (status = 'active' or teacher_id = auth.uid());


drop policy if exists "Teachers can manage modules" on public.modules;
create policy "Teachers can manage modules"
  on public.modules for all
  using (
    exists (
      select 1 from public.courses
      where courses.id = modules.course_id
        and courses.teacher_id = auth.uid()
    )
  );

drop policy if exists "Authenticated can view modules" on public.modules;
create policy "Authenticated can view modules"
  on public.modules for select
  using (auth.role() = 'authenticated');

drop policy if exists "Teachers can manage lessons" on public.lessons;
create policy "Teachers can manage lessons"
  on public.lessons for all
  using (
    exists (
      select 1 from public.modules
      join public.courses on courses.id = modules.course_id
      where modules.id = lessons.module_id
        and courses.teacher_id = auth.uid()
    )
  );

drop policy if exists "Authenticated can view lessons" on public.lessons;
create policy "Authenticated can view lessons"
  on public.lessons for select
  using (auth.role() = 'authenticated');


drop policy if exists "Teachers can manage quizzes" on public.quizzes;
create policy "Teachers can manage quizzes"
  on public.quizzes for all
  using (
    exists (
      select 1 from public.courses
      where courses.id = quizzes.course_id
        and courses.teacher_id = auth.uid()
    )
  );

drop policy if exists "Authenticated can view quizzes" on public.quizzes;
create policy "Authenticated can view quizzes"
  on public.quizzes for select
  using (auth.role() = 'authenticated');


drop policy if exists "Teachers can manage questions" on public.questions;
create policy "Teachers can manage questions"
  on public.questions for all
  using (
    exists (
      select 1 from public.quizzes
      join public.courses on courses.id = quizzes.course_id
      where quizzes.id = questions.quiz_id
        and courses.teacher_id = auth.uid()
    )
  );

drop policy if exists "Authenticated can view questions" on public.questions;
create policy "Authenticated can view questions"
  on public.questions for select
  using (auth.role() = 'authenticated');


drop policy if exists "Students can manage their attempts" on public.quiz_attempts;
create policy "Students can manage their attempts"
  on public.quiz_attempts for all
  using (student_id = auth.uid());

drop policy if exists "Teachers can view attempts for their quizzes" on public.quiz_attempts;
create policy "Teachers can view attempts for their quizzes"
  on public.quiz_attempts for select
  using (
    exists (
      select 1 from public.quizzes
      join public.courses on courses.id = quizzes.course_id
      where quizzes.id = quiz_attempts.quiz_id
        and courses.teacher_id = auth.uid()
    )
  );

-- sans ça, le taux de complétion du dashboard admin reste à 0% (getAdminStats ne voit aucune tentative)
drop policy if exists "Admins can view all quiz attempts" on public.quiz_attempts;
create policy "Admins can view all quiz attempts"
  on public.quiz_attempts for select
  using (exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  ));


drop policy if exists "Students can update their enrollments" on public.enrollments;
create policy "Students can update their enrollments"
  on public.enrollments for update
  using (student_id = auth.uid());

drop policy if exists "Admins can view all enrollments" on public.enrollments;
create policy "Admins can view all enrollments"
  on public.enrollments for all
  using (exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  ));

-- sans ça, un formateur ne peut pas lire les inscriptions de ses propres cours :
-- le nombre d'inscrits, le taux de complétion et la liste des étudiants restent à 0/vides.
-- Une policy existante sur courses ("Enrolled students can view course") référence déjà
-- enrollments : une policy enrollments -> courses en sous-requête directe créerait un cycle
-- (42P17 infinite recursion). On passe par une fonction security definer pour le casser.
drop policy if exists "Teachers can view enrollments for their courses" on public.enrollments;

create or replace function public.is_course_teacher(p_course_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.courses
    where courses.id = p_course_id and courses.teacher_id = auth.uid()
  );
$$;

create policy "Teachers can view enrollments for their courses"
  on public.enrollments for select
  using (public.is_course_teacher(enrollments.course_id));


drop policy if exists "Authenticated can view replies" on public.forum_replies;
create policy "Authenticated can view replies"
  on public.forum_replies for select
  using (auth.role() = 'authenticated');

drop policy if exists "Authenticated can post replies" on public.forum_replies;
create policy "Authenticated can post replies"
  on public.forum_replies for insert
  with check (auth.uid() = author_id);


drop policy if exists "Admins can manage all posts" on public.forum_posts;
create policy "Admins can manage all posts"
  on public.forum_posts for all
  using (exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  ));

drop policy if exists "Authors can update their posts" on public.forum_posts;
create policy "Authors can update their posts"
  on public.forum_posts for update
  using (author_id = auth.uid());

drop policy if exists "Authors can delete their posts" on public.forum_posts;
create policy "Authors can delete their posts"
  on public.forum_posts for delete
  using (author_id = auth.uid());


drop policy if exists "Admins can manage badges" on public.badges;
create policy "Admins can manage badges"
  on public.badges for all
  using (exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  ));


drop policy if exists "Admins can manage certificates" on public.certificates;
create policy "Admins can manage certificates"
  on public.certificates for all
  using (exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  ));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, full_name, role, avatar_url, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    coalesce(new.raw_user_meta_data->>'avatar', upper(substring(coalesce(new.raw_user_meta_data->>'name', new.email), 1, 2))),
    'active'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.users.full_name),
    role = coalesce(excluded.role, public.users.role);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- semaine 4 : sans cette policy, un étudiant qui termine un cours ne peut pas recevoir
-- son certificat (l'insert est bloqué par RLS, silencieusement côté app)
drop policy if exists "Students can earn their certificates" on public.certificates;
create policy "Students can earn their certificates"
  on public.certificates for insert
  with check (student_id = auth.uid());

-- la policy select de schema.sql n'a jamais été appliquée en prod : sans elle, un insert
-- avec .select() (ou upsert) échoue car Postgres doit pouvoir relire la ligne insérée,
-- et l'étudiant ne peut jamais voir ses propres certificats
drop policy if exists "Users can view their certificates" on public.certificates;
create policy "Users can view their certificates"
  on public.certificates for select
  using (student_id = auth.uid());

-- semaine 3 : finition et réecriture du Schéma Supabase générée par ia et detruit pas l'ia -- AiC Study —  j'ai du apprendre le sql pour reprendre ne pas oublier 