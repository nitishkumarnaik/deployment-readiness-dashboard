# Going live: accounts, real feed and leaderboards

Today the app is **local-first**: everything is stored on the phone, and the Community tab runs on a clearly labelled *preview community* of sample members. That lets you ship, test and screenshot the full experience before any server exists.

This document is the plan for turning the community real. The suggested stack is **Supabase** (Postgres + Auth + Row Level Security + Realtime), which fits Expo well and has a free tier. Any Postgres backend with auth works the same way.

## 1. What changes in the app

| Area | Now (preview) | Live |
|---|---|---|
| Identity | Local profile | Sign in with Apple / Google / email (Supabase Auth) |
| Trackers, entries, spaces | AsyncStorage | Still local-first; synced in the background |
| Feed | Your posts + generated sample posts | `posts` from people you follow, newest first |
| Props, comments | Stored locally | `props`, `comments` tables; Realtime updates |
| Leaderboards | Sample standings + you | SQL function over public trackers, last 7 days |
| Challenges | Local join + progress | `challenge_joins`; progress computed from entries |

The UI already reads everything through `src/lib/feed.ts`, `src/lib/challenges.ts` and the reducer, so the swap is mostly a data layer: replace `samplePosts` / `sampleStanding` with queries, and add a sync queue for local writes.

## 2. Schema (Postgres)

```sql
-- Profiles (one per auth user)
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  handle text unique not null check (handle ~ '^[a-z0-9._]{2,24}$'),
  name text not null default '',
  emoji text not null default '🙂',
  created_at timestamptz not null default now()
);

create type tracker_kind as enum ('check', 'count', 'duration');

create table trackers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  name text not null,
  emoji text not null,
  segment text not null check (segment in ('fitness','study','research','ideation','focus','sleep','custom')),
  kind tracker_kind not null,
  target numeric not null check (target > 0),
  visibility text not null default 'public' check (visibility in ('public','private')),
  sort_order int not null default 0,
  archived boolean not null default false,
  created_on date not null default current_date
);

create table entries (
  id uuid primary key default gen_random_uuid(),
  tracker_id uuid not null references trackers on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  date_key date not null,
  amount numeric not null check (amount > 0),
  at timestamptz not null default now(),
  source text not null default 'tap'
);
create index on entries (tracker_id, date_key);

create table posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  tracker_id uuid references trackers on delete set null,
  tracker_name text not null,
  emoji text not null,
  segment text not null,
  date_key date not null,
  headline text not null,
  streak int not null default 0,
  caption text check (char_length(caption) <= 200),
  week smallint[] not null default '{}',
  auto boolean not null default false,
  created_at timestamptz not null default now()
);
create index on posts (user_id, created_at desc);
-- one automatic post per tracker per day
create unique index posts_auto_unique on posts (tracker_id, date_key) where auto;

create table props (
  post_id uuid references posts on delete cascade,
  user_id uuid references profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 280),
  created_at timestamptz not null default now()
);

create table follows (
  follower_id uuid references profiles on delete cascade,
  followee_id uuid references profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create table challenge_joins (
  user_id uuid references profiles on delete cascade,
  challenge_id text not null,
  tracker_id uuid references trackers on delete cascade,
  joined_on date not null default current_date,
  primary key (user_id, challenge_id)
);

-- Moderation (required by the App Store for user-generated content)
create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles on delete cascade,
  post_id uuid references posts on delete cascade,
  comment_id uuid references comments on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);
create table blocks (
  blocker_id uuid references profiles on delete cascade,
  blocked_id uuid references profiles on delete cascade,
  primary key (blocker_id, blocked_id)
);
```

Spaces and blocks (the folder boards) stay **private** to their owner; sync them with two owner-only tables shaped like `src/lib/types.ts` (`spaces`, `space_blocks`).

## 3. Row Level Security

```sql
alter table profiles enable row level security;
alter table trackers enable row level security;
alter table entries enable row level security;
alter table posts enable row level security;
alter table props enable row level security;
alter table comments enable row level security;
alter table follows enable row level security;
alter table challenge_joins enable row level security;
alter table reports enable row level security;
alter table blocks enable row level security;

-- Profiles: anyone signed in can read; you edit your own.
create policy "read profiles" on profiles for select to authenticated using (true);
create policy "edit own profile" on profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Trackers: yours, or other people's public ones.
create policy "read trackers" on trackers for select to authenticated using (user_id = auth.uid() or visibility = 'public');
create policy "write own trackers" on trackers for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Entries are private. Leaderboards read them through a security-definer function.
create policy "own entries" on entries for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Posts: readable unless the author blocked you or you blocked them.
create policy "read posts" on posts for select to authenticated using (
  not exists (select 1 from blocks b where (b.blocker_id = auth.uid() and b.blocked_id = posts.user_id)
                                        or (b.blocker_id = posts.user_id and b.blocked_id = auth.uid()))
);
create policy "write own posts" on posts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "read props" on props for select to authenticated using (true);
create policy "give own props" on props for insert to authenticated with check (user_id = auth.uid());
create policy "remove own props" on props for delete to authenticated using (user_id = auth.uid());

create policy "read comments" on comments for select to authenticated using (true);
create policy "write own comments" on comments for insert to authenticated with check (user_id = auth.uid());
create policy "delete own comments" on comments for delete to authenticated using (user_id = auth.uid());

create policy "read follows" on follows for select to authenticated using (true);
create policy "own follows" on follows for all to authenticated using (follower_id = auth.uid()) with check (follower_id = auth.uid());

create policy "own joins" on challenge_joins for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "file reports" on reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "own blocks" on blocks for all to authenticated using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
```

## 4. Leaderboard function

Consistency = share of the last 7 full days (ending yesterday) on which each public tracker in the segment hit its target, averaged per user. The app's `consistency()` in `src/lib/trackers.ts` also counts today once it is met; using full days on the server keeps the board stable during the day.

```sql
create or replace function segment_leaderboard(p_segment text, p_today date default current_date)
returns table (user_id uuid, handle text, name text, emoji text, consistency numeric)
language sql stable security definer set search_path = public as $$
  with days as (
    select generate_series(p_today - 7, p_today - 1, interval '1 day')::date as d
  ),
  per_tracker as (
    select t.user_id, t.id,
           count(*) filter (where coalesce(e.total, 0) >= t.target)::numeric
             / nullif(count(*), 0) as rate
    from trackers t
    join days on days.d >= t.created_on
    left join (
      select tracker_id, date_key, sum(amount) as total from entries group by 1, 2
    ) e on e.tracker_id = t.id and e.date_key = days.d
    where t.segment = p_segment and t.visibility = 'public' and not t.archived
    group by t.user_id, t.id
  )
  select p.id, p.handle, p.name, p.emoji, round(avg(rate), 3)
  from per_tracker pt join profiles p on p.id = pt.user_id
  group by p.id
  order by 5 desc nulls last
  limit 100;
$$;
```

Show friends-only and global tabs by filtering on `follows` in the client query or a second function.

## 5. Sync strategy (keeps the app instant)

1. Keep the reducer as the source of truth on the device.
2. Every action that changes trackers, entries, posts, props, comments or follows also goes into a persisted **outbox** (AsyncStorage) with a client-generated UUID.
3. A sync worker flushes the outbox when online (upserts are idempotent thanks to the UUIDs) and pulls changes since the last sync timestamp.
4. Feed, comments and props use Supabase Realtime subscriptions while the Community tab is open.
5. Conflicts: entries are append-only; for trackers and spaces, the last write wins on `updated_at`.

## 6. Store rules you must meet when the community goes live

- **User-generated content (Apple guideline 1.2):** a way to report posts and comments, to block users, filtering of objectionable content, and published contact info. The `reports` and `blocks` tables above cover the data side; add Report and Block to the post and profile menus.
- **Account deletion (Apple 5.1.1(v)):** if users can create an account, they must be able to delete it from inside the app. Cascade deletes in the schema handle the data.
- **Sign in with Apple (Apple 4.8):** required if you offer Google or other third-party sign-in on iOS.
- **Privacy labels / Data safety:** update both. Once accounts exist you collect at least name/handle, user content and identifiers. Keep entries private by default, and never use health-related data for ads.
- **Google Play:** User Generated Content policy (reporting and blocking), and the account-deletion request link in the Data safety form.
