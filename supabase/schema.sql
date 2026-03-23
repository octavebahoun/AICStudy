-- AiC Study — Schéma Supabase générée par ia 

create extension if not exists "uuid-ossp";

-- ── Users (profil public lié à auth.users) ──────────────────
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  role text not null default 'student' check (role in ('admin', 'teacher', 'student')),
  status text not null default 'active' check (status in ('active', 'inactive', 'suspended')),
  created_at timestamptz default now()
);

-- ── Courses ──────────────────────────────────────────────────
create table public.courses (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  category text,
  level text default 'beginner' check (level in ('beginner', 'intermediate', 'advanced')),
  duration text,
  thumbnail text,
  color text default '#3B82F6',
  teacher_id uuid references public.users(id) on delete set null,
  status text default 'draft' check (status in ('draft', 'pending', 'active', 'archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Modules ──────────────────────────────────────────────────
create table public.modules (
  id uuid default uuid_generate_v4() primary key,
  course_id uuid references public.courses(id) on delete cascade not null,
  title text not null,
  "order" int not null default 1,
  created_at timestamptz default now()
);

-- ── Lessons ──────────────────────────────────────────────────
create table public.lessons (
  id uuid default uuid_generate_v4() primary key,
  module_id uuid references public.modules(id) on delete cascade not null,
  title text not null,
  content text,
  duration text,
  "order" int not null default 1,
  type text default 'text' check (type in ('text', 'video', 'pdf')),
  created_at timestamptz default now()
);

-- ── Enrollments ──────────────────────────────────────────────
create table public.enrollments (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.users(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete cascade not null,
  enrolled_at timestamptz default now(),
  completed_at timestamptz,
  unique(student_id, course_id)
);

-- ── Lesson Progress ──────────────────────────────────────────
create table public.lesson_progress (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.users(id) on delete cascade not null,
  lesson_id uuid references public.lessons(id) on delete cascade not null,
  completed boolean default false,
  completed_at timestamptz,
  unique(student_id, lesson_id)
);

-- ── Quizzes ──────────────────────────────────────────────────
create table public.quizzes (
  id uuid default uuid_generate_v4() primary key,
  course_id uuid references public.courses(id) on delete cascade not null,
  title text not null,
  passing_score int default 70,
  time_limit int default 30,
  attempts text default 'unlimited',
  created_at timestamptz default now()
);

-- ── Questions ────────────────────────────────────────────────
create table public.questions (
  id uuid default uuid_generate_v4() primary key,
  quiz_id uuid references public.quizzes(id) on delete cascade not null,
  text text not null,
  options jsonb not null,
  correct_index int not null,
  explanation text,
  "order" int default 1
);

-- ── Quiz Attempts ────────────────────────────────────────────
create table public.quiz_attempts (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.users(id) on delete cascade not null,
  quiz_id uuid references public.quizzes(id) on delete cascade not null,
  answers jsonb,
  score int,
  passed boolean default false,
  created_at timestamptz default now()
);

-- ── Forum Posts ──────────────────────────────────────────────
create table public.forum_posts (
  id uuid default uuid_generate_v4() primary key,
  course_id uuid references public.courses(id) on delete set null,
  author_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  content text not null,
  pinned boolean default false,
  created_at timestamptz default now()
);

-- ── Forum Replies ────────────────────────────────────────────
create table public.forum_replies (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.forum_posts(id) on delete cascade not null,
  author_id uuid references public.users(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

-- ── Badges ───────────────────────────────────────────────────
create table public.badges (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  icon text,
  description text,
  color text default '#3B82F6',
  condition_type text,
  condition_value int
);

-- ── User Badges ──────────────────────────────────────────────
create table public.user_badges (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  badge_id uuid references public.badges(id) on delete cascade not null,
  earned_at timestamptz default now(),
  unique(user_id, badge_id)
);

-- ── Certificates ─────────────────────────────────────────────
create table public.certificates (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references public.users(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete cascade not null,
  score int,
  issued_at timestamptz default now(),
  unique(student_id, course_id)
);

-- ── Row Level Security ────────────────────────────────────────
alter table public.users enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.forum_posts enable row level security;
alter table public.forum_replies enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.certificates enable row level security;

-- Policies de base (à affiner selon vos besoins)
create policy "Users can view their own profile" on public.users for select using (auth.uid() = id);
create policy "Admins can view all users" on public.users for all using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));
create policy "Anyone can view active courses" on public.courses for select using (status = 'active');
create policy "Teachers can manage their courses" on public.courses for all using (teacher_id = auth.uid());
create policy "Students can view their enrollments" on public.enrollments for select using (student_id = auth.uid());
create policy "Students can enroll" on public.enrollments for insert with check (student_id = auth.uid());
create policy "Anyone can view forum posts" on public.forum_posts for select using (true);
create policy "Authenticated users can post" on public.forum_posts for insert with check (auth.uid() = author_id);
create policy "Anyone can view badges" on public.badges for select using (true);
create policy "Users can view their badges" on public.user_badges for select using (user_id = auth.uid());
create policy "Users can view their certificates" on public.certificates for select using (student_id = auth.uid());
