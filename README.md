# GigNest

Paid work around Varanasi, posted by anyone, claimed by anyone.

Anyone can post a gig — a café that needs a website, a parent who needs a physics
tutor, a lab that needs 1,200 forms digitised. Anyone with an account can apply for
one too; the marketplace does not require an institute address to take part. Students
get a fee waiver, and that is where `@itbhu.ac.in` matters — it is what unlocks the
`student` role and its preferential treatment (see
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
mode**: 16 seeded gigs, 12 accounts, a working board, filters, map, dashboard and
admin panel — all reading a built-in dataset. Every write refuses politely instead of
crashing.

Demo mode exists for two reasons: you can see the whole thing seconds after cloning,
and if campus wifi dies mid-pitch the demo still runs.

| What | Where |
|---|---|
| Landing page | `/` |
| Gig board, search + tag filters | `/gigs` |
| Map view | `/gigs/map` |
| Gig detail, apply / accept / complete | `/gigs/<id>` |
| Post a gig | `/gigs/new` |
| Role-aware dashboard | `/dashboard` |
| Public profile | `/profile/<id>` |
| Edit profile | `/profile/edit` |
| Sign-up role picker (see the lock) | `/onboarding` and `/onboarding?as=outsider` |
| Admin panel | `/admin` — password from `ADMIN_PASSWORD` |

`/onboarding?as=outsider` is the one worth showing on stage: same screen signed in
with a Gmail address, and the "Take on gigs" option locks itself.

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
git remote add origin https://github.com/YOUR-USER/gignest.git
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

The rule is "the `student` role needs an `@itbhu.ac.in` address". Since item 2 the
gate no longer decides who may work — anyone with an account can post *and* apply.
What it still protects is the **fee waiver**, so the check has to hold even against a
hostile client. A prototype usually hides a button, which anyone can defeat with
`curl`. Here it holds at three layers, and the browser is the least important one:

1. **Postgres trigger** on `profiles` — refuses to save `role = 'student'` unless the
   matching `auth.users.email` is an institute address. A hostile client can send any
   JSON it likes; the database rejects it.
2. **`request_fee_waiver()`** in `supabase/schema.sql` — the waiver is only written
   through this function, which refuses to set it `pending` unless the caller's
   `auth.users.email` is an institute address. Non-students keep their account, they
   just don't get the waiver.
3. **`requireStudent()`** in [`src/lib/auth.ts`](src/lib/auth.ts) — server-side page
   guard for waiver screens. This one exists purely so people get a helpful page
   instead of a Postgres error.

Domain matching lives in one place, [`src/lib/constants.ts`](src/lib/constants.ts):

```ts
export const INSTITUTE_DOMAINS = ['itbhu.ac.in'] as const
```

Exact match or any subdomain (`@student.itbhu.ac.in` passes, `@notitbhu.ac.in` does
not). The SQL mirrors it — change one, change both.

**Anyone can apply now.** Item 2 opened the marketplace on the taking side: the
applications insert policy just asks for a signed-in, non-banned account. A third-year
hiring a junior to help with a fest is exactly the kind of thing this should allow —
and the junior does not have to be a student either.

### Verifying a hirer (PAN / Aadhaar)

Anyone can have a Hirers/verified badge, not just students — [item 4]. A hirer who
hosts an admin-approved government ID gets the teal shield on their profile and on
every gig they post.

- The capture screen collects **only the last four characters** of the PAN and a hash
  of the **last four** of the Aadhaar, never the full number. The full number is
  parsed and validated in memory, hashed, then discarded — the salted hash lives in
  `digestId()` in [`src/lib/kyc-hash.ts`](src/lib/kyc-hash.ts), and the submit flow is in
  [`src/app/verify/actions.ts`](src/app/verify/actions.ts).
- An admin reviews the request through the private link the hirer edits on
  `/verify`. Approving stamps `profiles.id_verified_at`, which is what the badge
  reads. Nothing is ever written to the database before an admin says yes.
- The live route to a *trusted* verification is a licensed provider (Signzy, IDfy,
  Karza, Cashfree KYC) or DigiLocker / Aadhaar e-KYC with an OTP — roughly ₹2–₹15 per
  check. That is a paid integration; this build demonstrates the consent, capture and
  storage shape of that flow without calling a provider.

What the badge means, and what it does **not**: it means a human at GigNest looked at
a government ID and accepted it. It does not mean that person is a student, and it
does not vouch for the money changing hands.

### Referrals

Every profile carries a shareable code in the top bar, the dashboard and the
profile page. Sharing it and having a friend sign up earns the `<code>LoyaltyBadge</code>`.
The link is `<code>/login?ref=CODE</code>`.

The chain, end to end:

- The signup UI picks up the `ref` code and passes it into the signup call's
  `options.data` — so it lands in `raw_user_meta_data`, inside the same insert that
  creates the profile.
- The `handle_new_user()` trigger reads that `ref`, looks up the profile whose
  `referral_code` matches, and stamps `referred_by` with the referrer's id — at
  insert time, once. The `guard_profile_changes()` trigger then refuses any later
  edit to `referred_by`, so a referral can't be re-attributed after the fact.
- One count of `referrals` is enough to unlock the loyalty badge, so the fun starts
  early rather than buried under a quota.

One platform note for **Google** signups: the Supabase JS client does not forward
`options.data` through OAuth, so the `ref` rides as a GoTrue `data` query param
instead. That path needs the project's `oauth.allow_oauth_params` setting switched
on — the Google button is wired for it, the password form is not dependent on it.

### No phone or email — chat after assignment

Contact details never appear on a gig or a profile, so there is nothing to reveal and
nothing to scrape. When an applicant is accepted, a private thread opens between the
hirer and the person they hired — nobody else was ever involved, and RLS keeps it that
way. The rows live in a `messages` table scoped to a gig, and `in_gig_thread()` in
`supabase/schema.sql` is the single gate: until someone is actually assigned the
policies return no rows, and once a gig is taken it admits exactly those two people and
nobody can send inside someone else's thread. The inbox is at [`src/app/inbox`](src/app/inbox).

Since onboarding all of this was built around the *absence* of contact info, there is
no fallback, listed number, or "message me" link anywhere — the thread is the only
line of communication after assignment.

### Applier badges

Reputation is earned by delivering, not by filling in a profile. `earnedBadge()` in
[`src/lib/badges.ts`](src/lib/badges.ts) reads an applier's loaded gigs and returns the
highest tier:

- **Bronze** — 4 gigs completed
- **Silver** — 10 gigs completed
- **Gold** — 30 gigs completed, *or* 2 paid mentorships

Gold has the mentorship shortcut so a strong newcomer isn't trapped behind a year of
volume. A hirer skimming an applicant list can tell a first-timer from someone who has
delivered thirty times.

### Suggested appliers

On their own profile a hirer sees a shortlist ("reach anyone?" earlier in the app), so
posting is not a cold pitch. `getSuggestedAppliers()` in
[`src/lib/queries.ts`](src/lib/queries.ts) gathers the skills across every gig the
hirer has posted, ranks people by how many of those tags they share, breaks ties on
rating, and shows the top four. It is deliberately paired to the hirer's own
dashboard "recommended for you" — same signal, pointed the other way.

### Disputes

Either side can raise a dispute on a gig for **72 hours** after the last status
change; each side holds one open case per gig. Opening one pauses nothing — it is a
paper trail, not a hold — and the admin rails all of it through the
[`DisputeQueue`](src/app/admin/(panel)/_components/DisputeQueue.tsx). The published
promise on every panel is that disputes get resolved in **about 2 hours**
(`DISPUTE_SLA_LABEL` in [`src/lib/constants.ts`](src/lib/constants.ts)). Closing a
dispute does not move the gig or the money, so an admin still cancels or adjusts it on
the gigs tab.

### Urgency

A gig whose deadline is under 48 hours away can be flagged **Urgent** (the form
pre-fills it). Urgent gigs get an amber "Urgent" badge on the board and the search
returns only them when the filter is on. Application order for an urgent gig is
oldest-first — the first applicant is the one the hirer reviews — and the gig page
shows each applicant their position in the queue, so the "first come, first served"
promise is visible, not implied.

### Skill tags and search

`gigs.search_tsv` is a generated `tsvector` over title, description and location
with a GIN index. Tag filtering is OR — "gigs matching any of my skills" — which is
the right default for a job board. The dashboard reuses it to surface gigs matching a
person's own tags.

### The free AI skill coach

[`/learn`](src/app/learn/page.tsx) answers the other half of the "no experience, no
job" loop: the gig that tells you what the market wants, and the coach that turns it
into a five-step plan.

- One server action ([`src/app/learn/actions.ts`](src/app/learn/actions.ts)) validates
  a `skill`, a `goal` and `hours` per week, then calls `askCoach()` in
  [`src/lib/ai.ts`](src/lib/ai.ts) — a single HTTPS call to Google Gemini
  (`gemini-3.6-flash`, free tier) with a system prompt that insists on five numbered
  steps, free resources by name, a portfolio piece to show a hirer, and a per-gig
  rupee figure.
- **Server only.** `GEMINI_API_KEY` has no `NEXT_PUBLIC_` prefix, so the key never
  reaches a client bundle. Set it in `.env.local` (and on Vercel). Without it the
  route silently uses a built-in curriculum, so `/learn` is still fully usable in
  demo mode.

Getting a key takes about two minutes and costs nothing: [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
→ create an API key → add `GEMINI_API_KEY` to `.env.local` → restart `npm run dev`.

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

- **No real payment rail.** Rewards are integer rupees and money changes hands
  off-platform. Escrow is a post-weekend problem.
- **Phone and email are never shown on gigs or profiles.** Comms stay inside the
  app: intake via a built-in chat that appears after an applicant is assigned.
- **ID verification is admin-judged, not provider-verified.** PAN/Aadhaar are
  captured masked, hashed and dropped as described above, and an admin reviews the
  submission through the private link — the badge then comes from
  `profiles.id_verified_at`. There is no live KYC provider behind it; the DigiLocker
  / licensed-provider route is the post-weekend integration.
- **The skill coach rides Gemini's free tier** — no rate-limit guarantee, and no
  fallback if the key is absent beyond the built-in plan. That is a deliberate
  trade: free beats reliable for a weekend prototype, and a key costs nothing.
- **Admin auth is a shared password**, not per-user roles.
- Re-running `schema.sql` wipes data.
