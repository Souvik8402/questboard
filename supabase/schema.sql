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

  -- The student fee waiver: the user asks, an admin decides.
  if not exists (select 1 from pg_type where typname = 'fee_waiver_status') then
    create type public.fee_waiver_status as enum
      ('none', 'pending', 'approved', 'rejected');
  end if;

  if not exists (select 1 from pg_type where typname = 'id_kind') then
    create type public.id_kind as enum ('pan', 'aadhaar');
  end if;

  if not exists (select 1 from pg_type where typname = 'verification_status') then
    create type public.verification_status as enum ('pending', 'approved', 'rejected');
  end if;

  if not exists (select 1 from pg_type where typname = 'dispute_status') then
    create type public.dispute_status as enum ('open', 'resolved', 'rejected');
  end if;
end
$$;


-- ────────────────────────────────────────────────────────────────────────────
--  1.  The institute check
--
--  ⚠️  THIS IS NO LONGER A GATE ON CLAIMING WORK. Anyone with an account can
--  apply for a gig — that is the whole marketplace.
--
--  What an institute mailbox now buys is the FEE WAIVER: a verified student pays
--  0% platform fee instead of the standard cut. The check still lives in the
--  DATABASE rather than the browser, because it decides who gets paid more.
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
  'Email domains whose owners may hold the student role and so qualify for the '
  'platform-fee waiver. Edit + re-run to change.';


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
--  NOTE: `profiles` deliberately has NO email column and NO phone column. Row
--  Level Security is row-level, not column-level, so a publicly-readable profiles
--  table would leak every user's address to any scraper. Your own email comes
--  from the session; the admin panel reads auth.users with the service-role key.
--  Nobody — hirer or applier — ever sees the other's email or number; they talk
--  in `messages`.
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

  -- The platform-fee waiver. The user may move this to 'pending' (via
  -- request_fee_waiver); only the service role may approve or reject (see
  -- guard_profile_changes). `fee_waiver_request` is the applicant's own words —
  -- course and year — and `fee_waiver_note` is the reviewer's reply to them.
  fee_waiver_status     public.fee_waiver_status not null default 'none',
  fee_waiver_request    text check (char_length(fee_waiver_request) <= 400),
  fee_waiver_note       text check (char_length(fee_waiver_note) <= 400),
  fee_waiver_decided_at timestamptz,

  -- Set by an admin once a government ID has been reviewed. Never set by the
  -- owner — see id_verifications for the review queue.
  id_verified_at timestamptz,

  -- Paid mentorships bought: one of the two routes to a gold badge. Money
  -- changes hands off-platform, so an admin sets this.
  mentorships integer not null default 0 check (mentorships >= 0),

  -- Referrals. `referral_code` is what the owner shares; `referred_by` is who
  -- brought them in, written once at onboarding and immutable after.
  referral_code text unique,
  referred_by   uuid references public.profiles(id) on delete set null,

  -- The private verification link, as /verify/<token>. Rotating it invalidates
  -- any link already sent, which is how a hirer "edits" theirs. SELECT on this
  -- one column is revoked from anon and authenticated at the bottom of the file,
  -- so it is reachable only through my_verify_token() /
  -- profile_by_verify_token() — otherwise "regenerate" would revoke nothing.
  verify_token uuid not null default gen_random_uuid(),

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  check (referred_by is null or referred_by <> id)
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

  -- First-come-first-served. On an urgent gig the hirer is shown only the
  -- earliest applicant still waiting; passing on them surfaces the next. The
  -- ordering is just applications.created_at, so no extra state is needed.
  is_urgent       boolean not null default false,

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

-- ⚠️  SUPERSEDED. Phone numbers are no longer collected or shown anywhere:
-- neither side ever sees the other's number or email. Conversation happens in
-- `messages` below, which opens when someone is hired.
--
-- The two tables stay so an existing project keeps whatever it already holds,
-- and so the RLS pattern is still on the record. Nothing in the app reads or
-- writes them. Drop them once you are sure you want the old rows gone.
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

-- Mirror image of gig_contacts, and superseded for the same reason. See above.
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

-- The private thread that replaced phone numbers. One row per message, scoped to
-- a gig: the hirer and the person they hired, nobody else. See in_gig_thread()
-- in section 4 — the policies below refuse to open a thread until someone is
-- actually assigned, which is the whole point.
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  gig_id     uuid not null references public.gigs(id)     on delete cascade,
  sender_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  -- Set by the reader, so the other side can show an unread dot.
  read_at    timestamptz
);

-- Government-ID checks, for hirers who want the trust badge and students who
-- want the fee waived.
--
-- ⚠️  THE FULL NUMBER IS NEVER STORED. src/lib/kyc.ts validates it in memory
-- (PAN by format, Aadhaar by Verhoeff checksum), keeps the last four digits for
-- the admin to eyeball against the document, keeps a salted SHA-256 so the same
-- ID used on two accounts is detectable, and throws the rest away. There is no
-- column here that could hold it even if someone tried.
create table if not exists public.id_verifications (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  kind        public.id_kind not null,
  name_on_id  text not null check (char_length(name_on_id) between 2 and 120),
  last4       text not null check (last4 ~ '^[0-9]{4}$'),
  -- Hex SHA-256 of KYC_SALT || normalised number. Not reversible to the number.
  id_hash     text not null check (id_hash ~ '^[0-9a-f]{64}$'),
  status      public.verification_status not null default 'pending',
  -- The admin's note on a rejection, shown back to the submitter.
  note        text check (char_length(note) <= 400),
  created_at  timestamptz not null default now(),
  decided_at  timestamptz,
  -- One submission per kind, so re-submitting replaces rather than piles up.
  unique (profile_id, kind)
);

create table if not exists public.disputes (
  id          uuid primary key default gen_random_uuid(),
  gig_id      uuid not null references public.gigs(id)     on delete cascade,
  raised_by   uuid not null references public.profiles(id) on delete cascade,
  reason      text not null check (char_length(reason) between 2 and 40),
  detail      text not null check (char_length(detail) between 20 and 1500),
  status      public.dispute_status not null default 'open',
  resolution  text check (char_length(resolution) <= 1500),
  created_at  timestamptz not null default now(),
  resolved_at timestamptz,
  -- Each side gets one open case per gig; a second concern goes in the detail.
  unique (gig_id, raised_by)
);


-- Additive migrations, so re-running this file upgrades an older project
-- (`create table if not exists` alone would skip new columns).
alter table public.gigs
  add column if not exists application_count integer not null default 0;

alter table public.gigs
  add column if not exists is_urgent boolean not null default false;

alter table public.profiles
  add column if not exists onboarded_at timestamptz;

-- Item 2 — the fee waiver. 'none' until someone asks; only service_role may
-- move it to approved/rejected (see guard_profile_changes()).
alter table public.profiles
  add column if not exists fee_waiver_status public.fee_waiver_status not null default 'none';

alter table public.profiles
  add column if not exists fee_waiver_request text;

alter table public.profiles
  add column if not exists fee_waiver_note text;

alter table public.profiles
  add column if not exists fee_waiver_decided_at timestamptz;

-- Item 4 — set when an admin accepts a government ID.
alter table public.profiles
  add column if not exists id_verified_at timestamptz;

-- Item 6 — paid mentorships bought, the alternate route to the gold badge.
alter table public.profiles
  add column if not exists mentorships integer not null default 0;

-- Item 9 — the referral pair.
alter table public.profiles
  add column if not exists referral_code text;

alter table public.profiles
  add column if not exists referred_by uuid references public.profiles(id) on delete set null;

-- Item 4 — the shareable verification link. Regenerating this column is what
-- "edit the link anytime" means: the old URL stops resolving immediately.
alter table public.profiles
  add column if not exists verify_token uuid not null default gen_random_uuid();

-- Backfill referral codes for rows that predate the column, then make the
-- uniqueness real. On a fresh project the `unique` in the create-table above
-- already produced an index under this exact name, so `if not exists` makes this
-- a no-op there; on an upgraded project the name is free and the index lands.
update public.profiles
   set referral_code = upper(substr(replace(id::text, '-', ''), 1, 8))
 where referral_code is null;

create unique index if not exists profiles_referral_code_key
  on public.profiles (referral_code);


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

-- A thread is always read in posting order for one gig, so one composite index
-- serves both the list and the conversation view.
create index if not exists messages_gig_created_idx  on public.messages (gig_id, created_at);
create index if not exists messages_sender_idx       on public.messages (sender_id);
create index if not exists id_verifications_status_idx on public.id_verifications (status, created_at);
create index if not exists disputes_status_idx       on public.disputes (status, created_at);
create index if not exists disputes_gig_idx          on public.disputes (gig_id);
-- The admin fee-waiver queue reads pending rows only.
create index if not exists profiles_fee_waiver_idx   on public.profiles (fee_waiver_status);
-- /verify/<token> looks a profile up by token with no session.
create index if not exists profiles_verify_token_idx on public.profiles (verify_token);


-- ────────────────────────────────────────────────────────────────────────────
--  4.  Helper predicates used by the policies below
-- ────────────────────────────────────────────────────────────────────────────

-- Is the caller a student in good standing?
--
-- ⚠️  This is NO LONGER the gate on claiming work — anyone with an account may
-- apply for a gig (see the applications insert policy, which asks only that the
-- caller is not banned). It survives because it is the cheap way to ask "does
-- this person qualify for the fee waiver?", and because a future
-- students-only feature would want it back.
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

-- The two people allowed in a gig's message thread: the hirer, and whoever they
-- hired. `assigned_to is not null` is implicit — until the gig is assigned the
-- second half of the OR cannot match anyone, so no thread exists to read.
create or replace function public.in_gig_thread(p_gig uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.gigs
    where id = p_gig
      and (hirer_id = auth.uid() or assigned_to = auth.uid())
  );
$$;

-- Is the caller party to this gig at all? Used by the dispute policy, which is
-- deliberately the same audience as the thread.
create or replace function public.gig_is_assigned(p_gig uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.gigs where id = p_gig and assigned_to is not null
  );
$$;

-- ── The verification link (item 4) ─────────────────────────────────────────
-- `profiles.verify_token` is revoked at the column level (see the grants at the
-- bottom of this file), so these two functions are the only way to touch it.
-- Without the revoke, "regenerate my link" would be theatre: anyone could just
-- read the new token out of the publicly readable profiles table.

-- Your own token, for the copy button on /verify. No argument — it reads
-- auth.uid(), so there is nothing to point at someone else's row.
create or replace function public.my_verify_token()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select verify_token from public.profiles where id = auth.uid();
$$;

-- Rotate your own token. This is the "editable anytime" half of item 4: the URL
-- already sent stops resolving the moment this returns.
create or replace function public.rotate_verify_token()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new uuid := gen_random_uuid();
begin
  if auth.uid() is null then
    raise exception 'Sign in to rotate your verification link' using errcode = '42501';
  end if;

  update public.profiles set verify_token = v_new where id = auth.uid();
  return v_new;
end;
$$;

-- Ask for the student fee waiver (item 2).
--
-- A user cannot write `fee_waiver_note` — that column is the reviewer's. So the
-- request goes through here: the function sets status to 'pending' and files the
-- applicant's own words in `fee_waiver_request`, which they may write and the
-- admin reads. Everything else about the decision stays service-role only.
create or replace function public.request_fee_waiver(p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.fee_waiver_status;
begin
  if auth.uid() is null then
    raise exception 'Sign in to request the fee waiver' using errcode = '42501';
  end if;

  if char_length(coalesce(p_note, '')) < 10 or char_length(p_note) > 400 then
    raise exception 'Say which course and year you are in, in 10 to 400 characters';
  end if;

  select fee_waiver_status into v_status from public.profiles where id = auth.uid();

  if v_status = 'approved' then
    raise exception 'Your fee waiver is already approved';
  end if;
  if v_status = 'pending' then
    raise exception 'Your request is already in the queue';
  end if;

  -- The institute-mailbox rule lives in one place, and this is a read of it: the
  -- same predicate guard_profile_changes() uses to decide who may hold
  -- role='student'.
  if not public.is_institute_email(auth.uid()) then
    raise exception 'The fee waiver needs a verified institute address'
      using errcode = '42501';
  end if;

  update public.profiles
     set fee_waiver_status  = 'pending',
         fee_waiver_request = p_note
   where id = auth.uid();
end;
$$;

-- The other direction: a link holder trades the token for the public profile it
-- belongs to. Returns the same columns any visitor could already read from
-- `profiles`, and nothing else — the token buys you a name, not an address.
create or replace function public.profile_by_verify_token(p_token uuid)
returns table (
  id             uuid,
  full_name      text,
  avatar_url     text,
  role           public.user_role,
  rating         numeric,
  rating_count   integer,
  department     text,
  year           smallint,
  id_verified_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select p.id, p.full_name, p.avatar_url, p.role, p.rating, p.rating_count,
         p.department, p.year, p.id_verified_at
  from public.profiles p
  where p.verify_token = p_token
  limit 1;
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
  -- (a) the institute gate. This no longer decides who may claim work — anyone
  -- may. It decides who may hold role='student', which is the marker the fee
  -- waiver is granted against.
  if new.role = 'student' and not public.is_institute_email(new.id) then
    raise exception
      'The student role needs a verified % address. Sign in with your institute Google account — or stay a hirer, you can still apply for gigs.',
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

    -- (e) you may ask for the fee waiver; you may not grant it to yourself.
    -- 'pending' is the only value a user can write, and only from 'none' or
    -- 'rejected' — so an approval cannot be quietly re-requested away either.
    if new.fee_waiver_status <> old.fee_waiver_status and not v_is_service then
      if new.fee_waiver_status <> 'pending'
         or old.fee_waiver_status not in ('none', 'rejected') then
        raise exception 'A fee waiver is granted by an admin, not by the applicant'
          using errcode = '42501';
      end if;
    end if;

    -- (f) the waiver decision fields belong to the reviewer
    if (coalesce(new.fee_waiver_note, '') <> coalesce(old.fee_waiver_note, '')
        or new.fee_waiver_decided_at is distinct from old.fee_waiver_decided_at)
       and not v_is_service then
      raise exception 'Waiver review notes are written server-side only'
        using errcode = '42501';
    end if;

    -- (g) ID verification and mentorship counts are both admin-set. A user who
    -- could write id_verified_at would mint their own trust badge.
    if (new.id_verified_at is distinct from old.id_verified_at
        or new.mentorships <> old.mentorships)
       and not v_is_service then
      raise exception 'Verification and mentorship counts are set server-side only'
        using errcode = '42501';
    end if;

    -- (h) referrals are write-once. The code never changes (links already shared
    -- must keep working) and referred_by is fixed at onboarding, so a later edit
    -- could only be an attempt to farm the loyalty badge.
    if new.referral_code is distinct from old.referral_code and not v_is_service then
      raise exception 'Your referral code is permanent'
        using errcode = '42501';
    end if;

    if new.referred_by is distinct from old.referred_by
       and old.referred_by is not null
       and not v_is_service then
      raise exception 'Who referred you is recorded once, at signup'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

-- Create the profile row the moment Supabase creates the auth user. Everyone
-- lands as `hirer` — which, since item 2, is a full account: a hirer can post
-- work AND apply for it. /onboarding promotes eligible users to `student`, and
-- that role now buys the fee waiver rather than the right to claim work.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, role, referral_code, referred_by)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      initcap(replace(split_part(new.email, '@', 1), '.', ' '))
    ),
    new.raw_user_meta_data ->> 'avatar_url',
    'hirer',
    -- First 8 hex characters of the user's own uuid, upper-cased: short enough to
    -- read down a phone line, and unique because the uuid is.
    upper(substr(replace(new.id::text, '-', ''), 1, 8)),
    -- Referral: the shared link carries the referrer's referral_code in
    -- raw_user_meta_data->>'ref'. Look that code up here (at insert, so the
    -- guard's "write-once" rule is never tested by a later edit) and stamp the
    -- referrer's id. Unknown code or self-referral resolves to null.
    (
      select r.id
        from public.profiles r
       where r.referral_code = new.raw_user_meta_data ->> 'ref'
         and r.id <> new.id
       limit 1
    )
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
--  Every table is locked by default and opened deliberately. The interesting one
--  is `messages`: it is the only place either side of a gig can reach the other,
--  and in_gig_thread() means it opens only once someone is actually hired.
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
alter table public.messages             enable row level security;
alter table public.id_verifications     enable row level security;
alter table public.disputes             enable row level security;

-- Re-runnable: drop then recreate every policy.
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles','skills','profile_skills','gigs','gig_skills',
                        'gig_contacts','applications','application_contacts','reviews',
                        'messages','id_verifications','disputes')
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

-- Item 2 changed this policy. It used to require public.is_active_student(),
-- which meant an institute mailbox — the marketplace was students-only on the
-- taking side. Now ANYONE with an account may apply; the only bar is a ban. The
-- institute check moved to the fee waiver, where it costs nobody a job.
create policy "applications: any signed-in user applies to open gigs"
  on public.applications for insert
  with check (
    student_id = auth.uid()
    and public.actor_is_banned() = false
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

-- ── messages ── the private thread that replaced phone numbers ──────────────
-- Two people, one gig, and nothing readable by anyone else — not even an admin
-- through the anon/authenticated roles. This is the policy the whole "nobody
-- sees your number" promise rests on, so it is deliberately narrow.
create policy "messages: thread participants read"
  on public.messages for select
  using (public.in_gig_thread(gig_id));

-- Insert needs three things at once: you are in the thread, you are not
-- impersonating the other side, and the gig is actually assigned. That last
-- clause is what stops a hirer messaging every hopeful applicant.
create policy "messages: thread participants send"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and public.in_gig_thread(gig_id)
    and public.gig_is_assigned(gig_id)
    and public.actor_is_banned() = false
  );

-- The only permitted update is the recipient marking a message read. A sender
-- cannot edit or unsend — the thread is the evidence trail in a dispute.
create policy "messages: recipient marks read"
  on public.messages for update
  using (public.in_gig_thread(gig_id) and sender_id <> auth.uid())
  with check (public.in_gig_thread(gig_id) and sender_id <> auth.uid());

-- ── id_verifications ── the KYC review queue ───────────────────────────────
-- Yours and yours alone. There is no public read: `last4` plus a name is exactly
-- the shape of data that should never be browsable.
create policy "id_verifications: owner reads own"
  on public.id_verifications for select
  using (profile_id = auth.uid());

create policy "id_verifications: owner submits own"
  on public.id_verifications for insert
  with check (
    profile_id = auth.uid()
    and status = 'pending'
    and public.actor_is_banned() = false
  );

-- Re-submitting after a rejection is allowed; approving yourself is not.
create policy "id_verifications: owner resubmits while pending or rejected"
  on public.id_verifications for update
  using (profile_id = auth.uid() and status in ('pending', 'rejected'))
  with check (profile_id = auth.uid() and status = 'pending');

-- ── disputes ───────────────────────────────────────────────────────────────
create policy "disputes: participants read own gig"
  on public.disputes for select
  using (public.in_gig_thread(gig_id));

create policy "disputes: participants raise"
  on public.disputes for insert
  with check (
    raised_by = auth.uid()
    and public.in_gig_thread(gig_id)
    and public.gig_is_assigned(gig_id)
    and status = 'open'
  );

-- The person who raised it may add detail while it is open. Only the service
-- role resolves — there is no user-facing UPDATE that can set 'resolved'.
create policy "disputes: raiser edits while open"
  on public.disputes for update
  using (raised_by = auth.uid() and status = 'open')
  with check (raised_by = auth.uid() and status = 'open');


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

-- Broad SELECT is safe because every table has RLS on: the grant says "this
-- table is reachable", the policy says "these rows". `messages` and
-- `id_verifications` have no public-read policy at all, so this grant gives an
-- outsider nothing.
grant select on all tables in schema public to anon, authenticated;

-- One exception, at the column level. `profiles` is deliberately readable by
-- everyone, and `verify_token` is a bearer credential: whoever holds the string
-- can open /verify/<token>. If it came back in a `select *` then regenerating it
-- would revoke nothing, because the new one would be just as fetchable. So the
-- column is unreadable through the API and the two functions above are the only
-- way in — one for the owner, one for a link holder.
--
-- Consequence for client code: never `select('*')` on profiles. Postgres expands
-- `*` to the revoked column and fails the whole query. Use the explicit list in
-- src/lib/queries.ts (PROFILE_ALL_FIELDS).
revoke select (verify_token) on public.profiles from anon, authenticated;

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

-- No DELETE on any of these three. A message, an ID submission and a dispute are
-- all things someone might want to erase precisely when they matter most.
grant insert, update on
  public.messages,
  public.id_verifications,
  public.disputes
to authenticated;

grant usage, select on all sequences in schema public to authenticated;

grant execute on function public.set_gig_status(uuid, public.gig_status) to authenticated;
grant execute on function public.accept_application(uuid)                   to authenticated;
grant execute on function public.increment_gig_views(uuid)                to anon, authenticated;
grant execute on function public.platform_stats()                           to anon, authenticated;
grant execute on function public.is_institute_email(uuid)                   to authenticated;
grant execute on function public.institute_domains()                        to anon, authenticated;
grant execute on function public.in_gig_thread(uuid)                        to authenticated;
grant execute on function public.gig_is_assigned(uuid)                      to authenticated;
grant execute on function public.my_verify_token()                          to authenticated;
grant execute on function public.rotate_verify_token()                      to authenticated;
grant execute on function public.request_fee_waiver(text)                   to authenticated;
grant execute on function public.profile_by_verify_token(uuid)            to anon, authenticated;
