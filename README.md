# QuestBoard

Paid work around Varanasi, posted by anyone, claimed only by verified
**IIT (BHU) Varanasi** students.

Anyone can post a quest — a café that needs a website, a parent who needs a physics
tutor, a lab that needs 1,200 forms digitised. Only someone signed in with an
`@itbhu.ac.in` Google account can apply for one. That asymmetry is the product, so it
is enforced in the database rather than in the browser (see
[The student gate](#the-student-gate)).

Built as a prototype for a startup idea weekend.

---

## Run it right now (no setup)

```bash
npm install
```

```bash
npm run dev
```

Open <http://localhost:3000>. With no Supabase keys present the app boots in **demo
mode**: 16 seeded quests, 12 accounts, a working board, filters, map, dashboard and
admin panel — all reading a built-in dataset. Every write refuses politely instead of
crashing.

Demo mode exists for two reasons: you can see the whole thing seconds after cloning,
and if campus wifi dies mid-pitch the demo still runs.

| What | Where |
|---|---|
| Landing page | `/` |
| Quest board, search + tag filters | `/quests` |
| Map view | `/quests/map` |
| Quest detail, apply / accept / complete | `/quests/<id>` |
| Post a quest | `/quests/new` |
| Role-aware dashboard | `/dashboard` |
| Public profile | `/profile/<id>` |
| Edit profile | `/profile/edit` |
| Sign-up role picker (see the lock) | `/onboarding` and `/onboarding?as=outsider` |
| Admin panel | `/admin` — password from `ADMIN_PASSWORD` |

`/onboarding?as=outsider` is the one worth showing on stage: same screen signed in
with a Gmail address, and the "Take on quests" option locks itself.

The admin password in demo mode is whatever you set as `ADMIN_PASSWORD` in
`.env.local`. **Change it before you demo in public.**

---

## Going live — the four things only you can do

Everything below needs your own accounts. Roughly 20 minutes end to end.

### 1. Supabase project

1. Create a project at <https://supabase.com/dashboard> (free tier is enough).
   Pick the **Singapore** or **Mumbai** region — it is the closest to Varanasi.
2. SQL Editor → New query → paste all of [`supabase/schema.sql`](supabase/schema.sql)
   → Run. This creates the tables, enums, triggers, RLS policies and the search index.
3. New query again → paste [`supabase/seed.sql`](supabase/seed.sql) → Run. This inserts
   the ~60 skill tags. Do this second; it depends on the schema.
4. Project Settings → API. Copy three values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ server-only, see below

Re-running `schema.sql` is safe — it drops and recreates. That also **wipes your
data**, so stop doing it once you have real accounts.

### 2. Google sign-in

Google is the only way to become a student, because it is the only flow that proves
someone actually owns an institute mailbox.

1. <https://console.cloud.google.com> → create a project → **APIs & Services →
   OAuth consent screen**. External, fill in the app name, add your own email as a
   test user. You do not need Google's verification for a prototype.
2. **Credentials → Create credentials → OAuth client ID → Web application**.
3. Authorised redirect URI — paste exactly this, with your project ref:
   ```
   https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback
   ```
   That is Supabase's URL, not yours. Supabase then bounces the user to
   `/auth/callback` in this app.
4. Copy the Client ID and Client Secret into Supabase → **Authentication →
   Providers → Google** → enable → paste → Save.
5. Supabase → **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000` (and your Vercel URL once deployed)
   - Redirect URLs: add `http://localhost:3000/auth/callback` and
     `https://your-app.vercel.app/auth/callback`

Google will happily sign in *any* Google account, including personal Gmail. That is
fine and intended — those accounts become hirers. The `@itbhu.ac.in` check happens
after sign-in, in Postgres.

### 3. Fill `.env.local`

```bash
cp .env.local.example .env.local
```

Then edit it. Every key is documented in the file. Generate the admin cookie secret
with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Restart `npm run dev` afterwards — Next.js reads env files at boot. Demo mode
switches off the moment the two `NEXT_PUBLIC_SUPABASE_*` keys are present.

### 4. GitHub → Vercel

```bash
git remote add origin https://github.com/YOUR-USER/questboard.git
```

```bash
git push -u origin main
```

Then <https://vercel.com/new> → import the repo → framework auto-detects as Next.js
→ **add the same environment variables** from `.env.local` before the first deploy,
with `NEXT_PUBLIC_SITE_URL` set to your real Vercel URL. Deploy.

Afterwards, go back and add your Vercel URL to both Supabase URL Configuration
fields and to the Google OAuth client. Sign-in fails with a redirect-mismatch error
until you do.

`.env.local` is gitignored. If you ever paste the service-role key into a committed
file, rotate it in Supabase immediately — it bypasses every security policy in the
database.

---

## How it works

### The student gate

The rule is "only `@itbhu.ac.in` can claim work". A prototype usually enforces that by
hiding a button, which anyone can defeat with `curl`. Here it holds at three layers,
and the browser is the least important one:

1. **Postgres trigger** on `profiles` — refuses to save `role = 'student'` unless the
   matching `auth.users.email` is an institute address. A hostile client can send any
   JSON it likes; the database rejects it.
2. **RLS policy** on `applications` — `INSERT` requires the caller's own profile to be
   a student. Combined with (1), only real institute mailboxes can ever apply.
3. **`requireStudent()`** in [`src/lib/auth.ts`](src/lib/auth.ts) — server-side page
   guard. This one exists purely so people get a helpful page instead of a Postgres
   error.

Domain matching lives in one place, [`src/lib/constants.ts`](src/lib/constants.ts):

```ts
export const INSTITUTE_DOMAINS = ['itbhu.ac.in'] as const
```

Exact match or any subdomain (`@student.itbhu.ac.in` passes, `@notitbhu.ac.in` does
not). The SQL mirrors it — change one, change both.

**Students can also post quests.** Only claiming is restricted. A third-year hiring a
junior to help with a fest is exactly the kind of thing this should allow.

### Phone numbers are revealed, not hidden

RLS is row-level, not column-level, so a phone number sitting in a `quests` row could
only be hidden in the UI — useless. They live in separate tables instead:

| Table | Holds | Readable by |
|---|---|---|
| `quest_contacts` | the hirer's number | the hirer, and students whose application was **accepted** |
| `application_contacts` | the applicant's number | the applicant, and the hirer **once accepted** |

Before acceptance, the database returns no row at all. After acceptance, both sides
appear at once. Nothing to leak, because nothing was ever sent.

### Skill tags and search

`quests.search_tsv` is a generated `tsvector` over title, description and location
with a GIN index. Tag filtering is OR — "quests matching any of my skills" — which is
the right default for a job board. The dashboard reuses it to surface quests matching
a student's own tags.

### Admin panel

`ADMIN_PASSWORD` → a Server Action does a constant-time compare → sets an
HMAC-signed, `httpOnly` cookie (`ADMIN_SECRET`, 8-hour expiry) →
[`src/middleware.ts`](src/middleware.ts) guards `/admin/*`, and the
`(panel)` route-group layout checks again so a matcher typo cannot expose it.
`/admin/login` sits outside that group so it does not lock itself out.

Admin reads use the service-role key, which bypasses RLS. That client is created only
in [`src/lib/supabase/admin.ts`](src/lib/supabase/admin.ts), behind a runtime guard so
it can never be bundled for the browser.

Every login attempt takes a fixed 400 ms whether the password is right or wrong, so
guessing is slow and timing reveals nothing. It is still a shared password — swap in
real admin roles before this holds anything valuable.

---

## Stack

Next.js 15 App Router · React 19 · TypeScript (strict) · Tailwind v4 ·
Supabase (Postgres + Auth + RLS) · Leaflet + OpenStreetMap.

All mutations are Server Actions with hand-rolled validation in
[`src/lib/validate.ts`](src/lib/validate.ts) — there are no public API routes to
secure. Maps use Leaflet rather than Google Maps: no API key, no credit card.

```bash
npm run typecheck
```

```bash
npm run build
```

---

## Known limits

- **No payment rail.** Rewards are integer rupees and money changes hands off-platform.
  Escrow is a post-weekend problem.
- **No messaging.** Contact reveal on acceptance is the whole comms story.
- **Aadhaar / "trusted hirer" verification is not built** — deliberately deferred.
  The natural home for it is a `profiles.verified_at` column plus a badge in
  [`src/components/ui/Badge.tsx`](src/components/ui/Badge.tsx).
- **Admin auth is a shared password**, not per-user roles.
- Re-running `schema.sql` wipes data.
