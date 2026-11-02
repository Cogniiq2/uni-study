-- Learning progress. One row per (user, item). Content itself never lives in the database.

create table if not exists public.item_state (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  uid        text        not null,              -- "course/module/item"
  srs        jsonb       not null,              -- serialized FSRS card
  due        timestamptz not null,
  updated_at timestamptz not null,
  primary key (user_id, uid)
);
create index if not exists item_state_due_idx on public.item_state (user_id, due);

create table if not exists public.review_log (
  id          bigint generated always as identity primary key,
  user_id     uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  uid         text        not null,
  grade       smallint    not null check (grade between 1 and 4),
  score       real,                               -- 0..1 for auto/self-graded exercises
  mode        text        not null check (mode in ('learn', 'review', 'exam')),
  duration_ms integer,
  created_at  timestamptz not null default now()
);
create index if not exists review_log_user_time_idx on public.review_log (user_id, created_at desc);

alter table public.item_state enable row level security;
alter table public.review_log enable row level security;

create policy "own item_state: select" on public.item_state for select to authenticated using ((select auth.uid()) = user_id);
create policy "own item_state: insert" on public.item_state for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own item_state: update" on public.item_state for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own item_state: delete" on public.item_state for delete to authenticated using ((select auth.uid()) = user_id);

create policy "own review_log: select" on public.review_log for select to authenticated using ((select auth.uid()) = user_id);
create policy "own review_log: insert" on public.review_log for insert to authenticated with check ((select auth.uid()) = user_id);
