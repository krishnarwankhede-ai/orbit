create table if not exists public.learner_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  profile jsonb not null,
  progress jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.learner_state enable row level security;

drop policy if exists "Learners can manage their own state" on public.learner_state;
create policy "Learners can manage their own state"
  on public.learner_state
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on public.learner_state to authenticated;
grant usage on schema public to authenticated;

create table if not exists public.learner_plan (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  plan text not null check (plan in ('monthly', 'yearly', 'lifetime')),
  status text not null check (status in ('active', 'past_due', 'cancelled', 'refunded')),
  provider text not null default 'razorpay',
  order_id text,
  payment_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists learner_plan_payment_id_key
  on public.learner_plan (payment_id)
  where payment_id is not null;

alter table public.learner_plan enable row level security;

drop policy if exists "Learners can read their own plan" on public.learner_plan;
create policy "Learners can read their own plan"
  on public.learner_plan
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Learners can save their own plan" on public.learner_plan;
create policy "Learners can save their own plan"
  on public.learner_plan
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Learners can update their own plan" on public.learner_plan;
create policy "Learners can update their own plan"
  on public.learner_plan
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on public.learner_plan to authenticated;

-- Which skills each learner started in which calendar month. The free plan teaches one a month,
-- Pro is unlimited. Deliberately has no policies: RLS with none means a learner's own key can
-- neither read nor rewrite this table, only Orbit's server (service role) records a skill start.
create table if not exists public.learner_skill (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  month text not null,
  skill_key text not null,
  created_at timestamptz not null default now(),
  constraint learner_skill_one_row_per_skill_month unique (user_id, month, skill_key)
);

create index if not exists learner_skill_by_month
  on public.learner_skill (user_id, month);

alter table public.learner_skill enable row level security;

-- The one-time 30-day Pro trial for every new account. Only `started_at` is stored: the 30 days are
-- counted from it on each read, so there is no expiry column that could drift out of sync. Orbit's
-- server writes the row on the learner's first signed-in request and never touches it again. Like
-- learner_skill it deliberately has no policies, so a learner's own key can neither start, extend
-- nor erase a trial - only the service role can.
create table if not exists public.learner_trial (
  user_id uuid primary key references auth.users (id) on delete cascade,
  started_at timestamptz not null default now()
);

alter table public.learner_trial enable row level security;
