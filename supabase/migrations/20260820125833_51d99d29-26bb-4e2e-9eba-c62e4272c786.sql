create table if not exists public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('bug','confusing','idea','praise','other')),
  message text not null check (char_length(message) between 5 and 2000),
  page_path text,
  account_type text,
  status text not null default 'open' check (status in ('open','triaged','resolved')),
  created_at timestamptz not null default now()
);

grant select, insert on public.beta_feedback to authenticated;
grant all on public.beta_feedback to service_role;

alter table public.beta_feedback enable row level security;

create policy "Users insert own beta feedback"
  on public.beta_feedback for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users read own beta feedback"
  on public.beta_feedback for select to authenticated
  using (auth.uid() = user_id);

create index if not exists beta_feedback_user_created_idx
  on public.beta_feedback (user_id, created_at desc);