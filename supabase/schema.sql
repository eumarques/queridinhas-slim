-- Queridinhas Slim — estrutura do banco no Supabase
-- Como usar: Supabase > SQL Editor > New query > cole este arquivo inteiro > Run.
-- Pode ser executado mais de uma vez (usa "if not exists" / "or replace").
--
-- Segurança: todas as tabelas têm Row Level Security (RLS). Cada usuária só lê e grava
-- as próprias linhas (user_id = auth.uid()). As fotos ficam em um bucket PRIVADO, em uma
-- pasta com o id da usuária, com a mesma regra.

-- ---------------------------------------------------------------------------
-- Perfil (1 linha por usuária)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  age int not null check (age between 12 and 110),
  sex text not null check (sex in ('feminino', 'masculino', 'outro')),
  height_cm int not null check (height_cm between 100 and 250),
  phone text not null default '',
  email text not null default '',
  goal_weight numeric(5, 1) check (goal_weight is null or goal_weight between 30 and 350),
  created_on date not null default current_date,
  consent jsonb,
  food jsonb,
  reminders jsonb,
  updated_at timestamptz not null default now()
);

-- Registros diários (água, refeições, caminhada, humor, check-in)
create table if not exists public.day_logs (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- Medições de peso
create table if not exists public.weights (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  kg numeric(5, 1) not null check (kg between 30 and 350),
  updated_at timestamptz not null default now()
);

-- Aplicações de tirzepatida (TG)
create table if not exists public.applications (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  time text,
  dose text not null,
  site text,
  side_effects text[] not null default '{}',
  note text not null default '',
  updated_at timestamptz not null default now()
);

-- Avaliações a cada 15 dias: medidas corporais + fotos
create table if not exists public.body_checks (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  measures jsonb not null default '{}',
  photos jsonb not null default '{}',
  note text not null default '',
  updated_at timestamptz not null default now()
);

create index if not exists weights_user_day on public.weights (user_id, day);
create index if not exists applications_user_day on public.applications (user_id, day);
create index if not exists body_checks_user_day on public.body_checks (user_id, day);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.day_logs enable row level security;
alter table public.weights enable row level security;
alter table public.applications enable row level security;
alter table public.body_checks enable row level security;

drop policy if exists "perfil proprio" on public.profiles;
create policy "perfil proprio" on public.profiles
  for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "registros proprios" on public.day_logs;
create policy "registros proprios" on public.day_logs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "pesos proprios" on public.weights;
create policy "pesos proprios" on public.weights
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "aplicacoes proprias" on public.applications;
create policy "aplicacoes proprias" on public.applications
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "avaliacoes proprias" on public.body_checks;
create policy "avaliacoes proprias" on public.body_checks
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Fotos: bucket privado, uma pasta por usuária ("<user_id>/arquivo.jpg")
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('progress-photos', 'progress-photos', false, 5242880, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg'];

drop policy if exists "fotos proprias - ler" on storage.objects;
create policy "fotos proprias - ler" on storage.objects
  for select to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "fotos proprias - enviar" on storage.objects;
create policy "fotos proprias - enviar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "fotos proprias - atualizar" on storage.objects;
create policy "fotos proprias - atualizar" on storage.objects
  for update to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "fotos proprias - apagar" on storage.objects;
create policy "fotos proprias - apagar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- Exclusão da conta pela própria usuária (LGPD).
-- Apaga o usuário de auth.users; as tabelas acima são apagadas em cascata.
-- As fotos são removidas pelo app antes de chamar esta função.
-- ---------------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void
language sql
security definer
set search_path = public
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
