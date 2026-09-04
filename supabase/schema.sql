-- ============================================================================
--  GigNest — schema
--  IIT BHU part-time work marketplace
--
--  HOW TO RUN
--    Supabase dashboard → SQL Editor → New query → paste this whole file → Run.
--    Then do the same with `seed.sql`.
--
--  This file is idempotent: running it twice is safe and does not drop data.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
--  0.  Enums
-- ────────────────────────────────────────────────────────────────────────────

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('student', 'hirer', 'admin');
  end if;

  if not exists (select 1 from pg_type where typname = 'gig_type') then
    create type public.gig_type as enum
      ('one_time', 'weekly', 'monthly', 'part_time', 'internship');
  end if;

  if not exists (select 1 from pg_type where typname = 'gig_status') then
    create type public.gig_status as enum
      ('open', 'assigned', 'in_progress', 'completed', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'application_status') then
    create type public.application_status as enum
      ('pending', 'accepted', 'rejected', 'withdrawn');
  end if;
end
$$;


-- ────────────────────────────────────────────────────────────────────────────
--  1.  The institute gate
--
--  This is the heart of the product rule: only a real institute mailbox may
--  hold the `student` role, and only a `student` may claim a gig.
--
--  It lives in the DATABASE, not the browser, so a hand-crafted API call
--  cannot get around it.
--
--  ▸ To allow another domain later, edit the array below and re-run the file.
--    Subdomains are matched automatically (foo@student.itbhu.ac.in passes).
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.institute_domains()
returns text[]
language sql
immutable
as $$
  select array['itbhu.ac.in']::text[];
$$;

comment on function public.institute_domains() is
  'Email domains whose owners may hold the student role. Edit + re-run to change.';


create or replace function public.is_institute_email(p_uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public, auth
as $$
  select exists (
    select 1
    from auth.users u
    cross join unnest(public.institute_domains()) as d(domain)
    where u.id = p_uid
      and split_part(lower(trim(u.email)), '@', 2) <> ''
      and (
            split_part(lower(trim(u.email)), '@', 2) = d.domain
         or split_part(lower(trim(u.email)), '@', 2) like ('%.' || d.domain)
      )
  );
$$;

comment on function public.is_institute_email(uuid) is
  'True when the auth user''s email belongs to an institute domain. SECURITY '
  'DEFINER because RLS cannot otherwise read auth.users.';


-- ────────────────────────────────────────────────────────────────────────────
--  2.  Tables
--
--  NOTE: `profiles` deliberately has NO email column. Row Level Security is
--  row-level, not column-level, so a publicly-readable profiles table would
--  leak every student's address to any scraper. Your own email comes from the
--  session; the admin panel reads auth.users with the service-role key.
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  avatar_url    text,
  role          public.user_role not null default 'hirer',
  department    text,
  year          smallint check (year between 1 and 5),
  bio           text check (char_length(bio) <= 600),
  rating        numeric(3,2) not null default 0,
  rating_count  integer not null default 0,
  is_banned     boolean not null default false,
  -- Set when the user finishes /onboarding. NULL means "still needs to pick a
  -- role", which is how the auth callback knows where to send them.
  onboarded_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.skills (
  id        serial primary key,
  slug      text not null unique,
  name      text not null,
  category  text not null default 'General'
);

create table if not exists public.profile_skills (
  profile_id uuid    not null references public.profiles(id) on delete cascade,
  skill_id   integer not null references public.skills(id)   on delete cascade,
  primary key (profile_id, skill_id)
);

create table if not exists public.gigs (
  id              uuid primary key default gen_random_uuid(),
  hirer_id        uuid not null references public.profiles(id) on delete cascade,
  title           text not null check (char_length(title) between 6 and 120),
  description     text not null check (char_length(description) between 20 and 4000),
  gig_type      public.gig_type   not null default 'one_time',
  status          public.gig_status not null default 'open',
  reward_amount   integer not null check (reward_amount >= 0 and reward_amount <= 10000000),
  estimated_hours numeric(5,1) check (estimated_hours > 0),
  deadline        timestamptz,
  is_remote       boolean not null default false,
  location_label  text,
  lat             double precision check (lat between  -90 and  90),
  lng             double precision check (lng between -180 and 180),
  assigned_to     uuid references public.profiles(id) on delete set null,
  views           integer not null default 0,
  is_flagged      boolean not null default false,

  -- Denormalised counter maintained by trigger. Needed because the RLS policy
  -- on `applications` correctly hides other people's rows — so a live
  -- count(*) would read 0 for every visitor and "6 applicants" could never be
  -- shown on a public card.
  application_count integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- Full-text search vector. Title matches outrank location, which outranks
  -- body text. The 2-arg to_tsvector is IMMUTABLE, which a generated column
  -- requires (the 1-arg form is only STABLE and will be rejected).
  search_tsv tsvector generated always as (
      setweight(to_tsvector('english', coalesce(title, '')),          'A')
   || setweight(to_tsvector('english', coalesce(location_label, '')), 'B')
   || setweight(to_tsvector('english', coalesce(description, '')),    'C')
  ) stored
);

create table if not exists public.gig_skills (
  gig_id uuid    not null references public.gigs(id) on delete cascade,
  skill_id integer not null references public.skills(id) on delete cascade,
  primary key (gig_id, skill_id)
);

-- Hirer's phone number. A SEPARATE TABLE so RLS can hide it row-wise: the
-- board shows the gig but simply returns no contact row until you're hired.
create table if not exists public.gig_contacts (
  gig_id    uuid primary key references public.gigs(id) on delete cascade,
  phone       text not null check (phone ~ '^[0-9+][0-9 ()+-]{7,19}$'),
  alt_contact text check (char_length(alt_contact) <= 160)
);

create table if not exists public.applications (
  id         uuid primary key default gen_random_uuid(),
  gig_id   uuid not null references public.gigs(id)   on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  cover_note text not null check (char_length(cover_note) between 10 and 1500),
  status     public.application_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (gig_id, student_id)
);

-- Mirror image of gig_contacts: the applicant's number, revealed to the
-- hirer only once that application is accepted.
create table if not exists public.application_contacts (
  application_id uuid primary key references public.applications(id) on delete cascade,
  phone          text not null check (phone ~ '^[0-9+][0-9 ()+-]{7,19}$')
);

create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  gig_id    uuid not null references public.gigs(id)   on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewee_id uuid not null references public.profiles(id) on delete cascade,
  rating      smallint not null check (rating between 1 and 5),
  comment     text check (char_length(comment) <= 800),
  created_at  timestamptz not null default now(),
  unique (gig_id, reviewer_id),
  check (reviewer_id <> reviewee_id)
);


-- Additive migrations, so re-running this file upgrades an older project
-- (`create table if not exists` alone would skip new columns).
alter table public.gigs
  add column if not exists application_count integer not null default 0;

alter table public.profiles
  add column if not exists onboarded_at timestamptz;


-- ────────────────────────────────────────────────────────────────────────────
--  3.  Indexes
-- ────────────────────────────────────────────────────────────────────────────

create index if not exists gigs_search_idx        on public.gigs using gin (search_tsv);
create index if not exists gigs_status_created_idx on public.gigs (status, created_at desc);
create index if not exists gigs_reward_idx        on public.gigs (reward_amount desc);
create index if not exists gigs_hirer_idx         on public.gigs (hirer_id);
create index if not exists gigs_assigned_idx      on public.gigs (assigned_to);
create index if not exists gig_skills_skill_idx   on public.gig_skills (skill_id);
create index if not exists applications_student_idx on public.applications (student_id);
create index if not exists applications_gig_idx   on public.applications (gig_id);
create index if not exists reviews_reviewee_idx     on public.reviews (reviewee_id);


-- ────────────────────────────────────────────────────────────────────────────
--  4.  Helper predicates used by the policies below
-- ────────────────────────────────────────────────────────────────────────────

-- Is the caller a student in good standing? This is the gate on claiming work.
create or replace function public.is_active_student()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'student' and is_banned = false
  );
$$;

-- Defaults to TRUE (i.e. "treat as banned") when no profile exists, so a
-- half-finished signup cannot post.
create or replace function public.actor_is_banned()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select is_banned from public.profiles where id = auth.uid()), true);
$$;

create or replace function public.owns_gig(p_gig uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.gigs where id = p_gig and hirer_id = auth.uid()
  );
$$;

create or replace function public.has_accepted_application(p_gig uuid, p_student uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.applications
    where gig_id = p_gig and student_id = p_student and status = 'accepted'
  );
$$;


-- ────────────────────────────────────────────────────────────────────────────
--  5.  Triggers
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Everything a user must NOT be able to do to their own profile row, in one
-- place. RLS lets them UPDATE their row; this decides what they may change.
create or replace function public.guard_profile_changes()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_is_service boolean := coalesce(auth.role()::text, '') = 'service_role';
begin
  -- (a) the institute gate
  if new.role = 'student' and not public.is_institute_email(new.id) then
    raise exception
      'Only a verified % address can claim gigs. Sign in with your institute Google account.',
      array_to_string(public.institute_domains(), ' / ')
      using errcode = '42501';
  end if;

  -- (b) nobody promotes themselves to admin
  if new.role = 'admin'
     and (tg_op = 'INSERT' or coalesce(old.role::text, '') <> 'admin')
     and not v_is_service then
    raise exception 'The admin role can only be granted with the service key'
      using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' then
    -- (c) nobody un-bans themselves
    if new.is_banned <> old.is_banned and not v_is_service then
      raise exception 'Ban state is administered server-side only'
        using errcode = '42501';
    end if;

    -- (d) nobody hand-writes their own star rating
    if (new.rating <> old.rating or new.rating_count <> old.rating_count)
       and not v_is_service then
      raise exception 'Ratings are computed from reviews, not set directly'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

-- Create the profile row the moment Supabase creates the auth user. Everyone
-- lands as `hirer`; /onboarding promotes eligible users to `student`, which is
-- where guard_profile_changes() gets its say.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, role)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      initcap(replace(split_part(new.email, '@', 1), '.', ' '))
    ),
    new.raw_user_meta_data ->> 'avatar_url',
    'hirer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Banning a hirer should not leave live gigs pointing at them.
create or replace function public.on_profile_banned()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_banned and not coalesce(old.is_banned, false) then
    update public.gigs
       set status = 'cancelled', updated_at = now()
     where hirer_id = new.id
       and status in ('open', 'assigned', 'in_progress');
  end if;
  return new;
end;
$$;

-- profiles.rating is a cache of reviews. Recompute on any change.
create or replace function public.recompute_profile_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target uuid := coalesce(new.reviewee_id, old.reviewee_id);
begin
  update public.profiles p
     set rating = coalesce(
           (select round(avg(r.rating)::numeric, 2) from public.reviews r
             where r.reviewee_id = v_target), 0),
         rating_count = (select count(*) from public.reviews r
                          where r.reviewee_id = v_target)
   where p.id = v_target;
  return null;
end;
$$;

-- gigs.application_count is likewise a cache, for the reason given on the
-- column. Recount rather than +/- 1 so it self-heals if it ever drifts.
create or replace function public.recount_gig_applications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gig uuid := coalesce(new.gig_id, old.gig_id);
begin
  update public.gigs q
     set application_count = (
           select count(*) from public.applications a
            where a.gig_id = v_gig
              and a.status <> 'withdrawn'
         )
   where q.id = v_gig;
  return null;
end;
$$;

drop trigger if exists trg_profiles_touch          on public.profiles;
drop trigger if exists trg_profiles_guard          on public.profiles;
drop trigger if exists trg_profiles_banned         on public.profiles;
drop trigger if exists trg_gigs_touch            on public.gigs;
drop trigger if exists trg_reviews_rating          on public.reviews;
drop trigger if exists trg_applications_recount    on public.applications;
drop trigger if exists on_auth_user_created        on auth.users;

create trigger trg_profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();

create trigger trg_profiles_guard
  before insert or update on public.profiles
  for each row execute function public.guard_profile_changes();

create trigger trg_profiles_banned
  after update of is_banned on public.profiles
  for each row execute function public.on_profile_banned();

create trigger trg_gigs_touch
  before update on public.gigs
  for each row execute function public.touch_updated_at();

create trigger trg_reviews_rating
  after insert or update or delete on public.reviews
  for each row execute function public.recompute_profile_rating();

create trigger trg_applications_recount
  after insert or update or delete on public.applications
  for each row execute function public.recount_gig_applications();

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ────────────────────────────────────────────────────────────────────────────
--  6.  Row Level Security
--
--  Every table is locked by default and opened deliberately. Read the
--  gig_contacts / application_contacts policies together — they are the
--  two halves of "contact details appear only after you're hired".
-- ────────────────────────────────────────────────────────────────────────────

alter table public.profiles             enable row level security;
alter table public.skills               enable row level security;
alter table public.profile_skills       enable row level security;
alter table public.gigs               enable row level security;
alter table public.gig_skills         enable row level security;
alter table public.gig_contacts       enable row level security;
alter table public.applications         enable row level security;
alter table public.application_contacts enable row level security;
alter table public.reviews              enable row level security;

-- Re-runnable: drop then recreate every policy.
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles','skills','profile_skills','gigs','gig_skills',
                        'gig_contacts','applications','application_contacts','reviews')
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end
$$;

-- ── profiles ───────────────────────────────────────────────────────────────
-- Public by design: a marketplace needs to show who is offering the work.
-- Safe because the table holds no email and no phone number.
create policy "profiles: public read"
  on public.profiles for select using (true);

create policy "profiles: insert own"
  on public.profiles for insert with check (auth.uid() = id);

create policy "profiles: update own"
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- ── skills ─────────────────────────────────────────────────────────────────
-- The tag vocabulary is read-only to users; curated via the seed file / admin.
create policy "skills: public read"
  on public.skills for select using (true);

-- ── profile_skills ─────────────────────────────────────────────────────────
create policy "profile_skills: public read"
  on public.profile_skills for select using (true);

create policy "profile_skills: manage own"
  on public.profile_skills for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ── gigs ─────────────────────────────────────────────────────────────────
create policy "gigs: public read unless flagged"
  on public.gigs for select
  using (is_flagged = false or hirer_id = auth.uid());

-- Anyone signed in and not banned may post. Note this is NOT restricted to
-- role='hirer' — a student hiring a junior is a feature, not a bug.
create policy "gigs: signed-in users post"
  on public.gigs for insert
  with check (auth.uid() = hirer_id and public.actor_is_banned() = false);

create policy "gigs: owner edits"
  on public.gigs for update
  using (hirer_id = auth.uid()) with check (hirer_id = auth.uid());

create policy "gigs: owner deletes"
  on public.gigs for delete using (hirer_id = auth.uid());

-- ── gig_skills ───────────────────────────────────────────────────────────
create policy "gig_skills: public read"
  on public.gig_skills for select using (true);

create policy "gig_skills: owner manages"
  on public.gig_skills for all
  using (public.owns_gig(gig_id)) with check (public.owns_gig(gig_id));

-- ── gig_contacts ── the hirer's phone number ─────────────────────────────
create policy "gig_contacts: owner or hired student reads"
  on public.gig_contacts for select
  using (
       public.owns_gig(gig_id)
    or public.has_accepted_application(gig_id, auth.uid())
  );

create policy "gig_contacts: owner writes"
  on public.gig_contacts for all
  using (public.owns_gig(gig_id)) with check (public.owns_gig(gig_id));

-- ── applications ───────────────────────────────────────────────────────────
create policy "applications: applicant and gig owner read"
  on public.applications for select
  using (student_id = auth.uid() or public.owns_gig(gig_id));

-- THE gate. is_active_student() can only be true for an institute mailbox,
-- because guard_profile_changes() refuses to write role='student' otherwise.
create policy "applications: students apply to open gigs"
  on public.applications for insert
  with check (
    student_id = auth.uid()
    and public.is_active_student()
    and exists (
      select 1 from public.gigs q
      where q.id = gig_id
        and q.status = 'open'
        and q.hirer_id <> auth.uid()   -- no applying to your own posting
    )
  );

create policy "applications: applicant withdraws"
  on public.applications for update
  using (student_id = auth.uid())
  with check (student_id = auth.uid() and status in ('pending', 'withdrawn'));

create policy "applications: gig owner decides"
  on public.applications for update
  using (public.owns_gig(gig_id)) with check (public.owns_gig(gig_id));

-- ── application_contacts ── the student's phone number ─────────────────────
create policy "application_contacts: applicant always, hirer after accept"
  on public.application_contacts for select
  using (
    exists (
      select 1 from public.applications a
      where a.id = application_id
        and (
             a.student_id = auth.uid()
          or (public.owns_gig(a.gig_id) and a.status = 'accepted')
        )
    )
  );

create policy "application_contacts: applicant writes own"
  on public.application_contacts for all
  using (
    exists (select 1 from public.applications a
            where a.id = application_id and a.student_id = auth.uid())
  )
  with check (
    exists (select 1 from public.applications a
            where a.id = application_id and a.student_id = auth.uid())
  );

-- ── reviews ────────────────────────────────────────────────────────────────
create policy "reviews: public read"
  on public.reviews for select using (true);

-- You may only review your counterparty, only on a gig you both did, and
-- only once it is complete.
create policy "reviews: participants after completion"
  on public.reviews for insert
  with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from public.gigs q
      where q.id = gig_id
        and q.status = 'completed'
        and (
             (q.hirer_id    = auth.uid() and q.assigned_to = reviewee_id)
          or (q.assigned_to = auth.uid() and q.hirer_id    = reviewee_id)
        )
    )
  );


-- ────────────────────────────────────────────────────────────────────────────
--  7.  State-machine RPCs
--
--  RLS cannot restrict WHICH COLUMNS an update touches, so status transitions
--  go through these instead of a broad UPDATE policy. Each one re-checks the
--  caller's authority itself, because SECURITY DEFINER bypasses RLS.
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.set_gig_status(
  p_gig  uuid,
  p_status public.gig_status
)
returns public.gigs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_q   public.gigs;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  select * into v_q from public.gigs where id = p_gig for update;
  if not found then
    raise exception 'Gig not found' using errcode = 'P0002';
  end if;

  if v_q.hirer_id = v_uid then
    null;  -- the owner may move the gig anywhere
  elsif v_q.assigned_to = v_uid then
    if p_status <> 'in_progress' then
      raise exception 'The assigned student can only mark a gig in progress'
        using errcode = '42501';
    end if;
  else
    raise exception 'You are not part of this gig' using errcode = '42501';
  end if;

  update public.gigs
     set status = p_status, updated_at = now()
   where id = p_gig
  returning * into v_q;

  return v_q;
end;
$$;


-- Accept one applicant: mark them accepted, auto-reject the rest, assign the
-- gig. One transaction so the board can never show two hired students.
create or replace function public.accept_application(p_application uuid)
returns public.gigs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app public.applications;
  v_q   public.gigs;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  select * into v_app from public.applications where id = p_application;
  if not found then
    raise exception 'Application not found' using errcode = 'P0002';
  end if;

  select * into v_q from public.gigs where id = v_app.gig_id for update;

  if v_q.hirer_id <> v_uid then
    raise exception 'Only the gig owner can accept an applicant'
      using errcode = '42501';
  end if;
  if v_q.status <> 'open' then
    raise exception 'This gig is no longer open' using errcode = '22023';
  end if;

  update public.applications set status = 'accepted'  where id = p_application;
  update public.applications set status = 'rejected'
   where gig_id = v_app.gig_id and id <> p_application and status = 'pending';

  update public.gigs
     set status = 'assigned', assigned_to = v_app.student_id, updated_at = now()
   where id = v_app.gig_id
  returning * into v_q;

  return v_q;
end;
$$;


create or replace function public.increment_gig_views(p_gig uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.gigs set views = views + 1 where id = p_gig;
$$;


-- Landing-page counters. SECURITY DEFINER so the numbers are honest even for
-- a signed-out visitor who cannot see flagged rows.
create or replace function public.platform_stats()
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
    'open_gigs',    (select count(*) from public.gigs where status = 'open' and is_flagged = false),
    'total_gigs',   (select count(*) from public.gigs where is_flagged = false),
    'students',       (select count(*) from public.profiles where role = 'student' and is_banned = false),
    'hirers',         (select count(*) from public.profiles where role <> 'student' and is_banned = false),
    'reward_pool',    (select coalesce(sum(reward_amount), 0) from public.gigs where status = 'open' and is_flagged = false),
    'completed',      (select count(*) from public.gigs where status = 'completed')
  );
$$;


-- ────────────────────────────────────────────────────────────────────────────
--  8.  Grants
--
--  RLS decides which ROWS; these decide which TABLES are reachable at all.
-- ──────────────────��─────────────────────────────────────────────────────────

grant usage on schema public to anon, authenticated;

grant select on all tables in schema public to anon, authenticated;

grant insert, update, delete on
  public.profiles,
  public.profile_skills,
  public.gigs,
  public.gig_skills,
  public.gig_contacts,
  public.applications,
  public.application_contacts,
  public.reviews
to authenticated;

grant usage, select on all sequences in schema public to authenticated;

grant execute on function public.set_gig_status(uuid, public.gig_status) to authenticated;
grant execute on function public.accept_application(uuid)                   to authenticated;
grant execute on function public.increment_gig_views(uuid)                to anon, authenticated;
grant execute on function public.platform_stats()                           to anon, authenticated;
grant execute on function public.is_institute_email(uuid)                   to authenticated;
grant execute on function public.institute_domains()                        to anon, authenticated;
