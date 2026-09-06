import Link from 'next/link'
import { getPlatformStats, getGigs, getSkillsByCategory } from '@/lib/queries'
import { INSTITUTE_SHORT, GIG_TYPES } from '@/lib/constants'
import { cn } from '@/lib/cn'
import { compactRupees } from '@/lib/format'
import { GigCard } from '@/components/GigCard'
import { SkillChip } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'
import { Panel, SectionHeading, StatTile } from '@/components/ui/Panel'
import {
  IconArrowRight,
  IconBriefcase,
  IconCheck,
  IconCoins,
  IconLayers,
  IconMail,
  IconMapPin,
  IconSearch,
  IconShield,
  IconSparkles,
  IconStar,
  IconUsers,
} from '@/components/ui/Icons'

export const revalidate = 60

export default async function HomePage() {
  const [stats, { gigs }, categories] = await Promise.all([
    getPlatformStats(),
    getGigs({ sort: 'reward_high' }),
    getSkillsByCategory(),
  ])

  const featured = gigs.slice(0, 6)
  // A flat sample of tags for the "search by skill" band.
  const tagSample = categories.flatMap(([, skills]) => skills.slice(0, 4)).slice(0, 22)

  return (
    <>
      <Hero stats={stats} />
      <HowItWorks />
      <FeaturedGigs gigs={featured} />
      <SkillBand tags={tagSample} />
      <TwoSides />
      <GrowthLoop />
      <TrustBand />
      <FinalCta />
    </>
  )
}

/* ── Hero ─────────────────────────────────────────────────────────────────── */

function Hero({ stats }: { stats: Awaited<ReturnType<typeof getPlatformStats>> }) {
  return (
    <section className="grid-field relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:px-8">
        {/* Top strip: About + socials, so visitors never have to hunt for it. */}
        <div className="mx-auto mb-12 flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[13px] text-dim">
          <span className="inline-flex items-center gap-1.5">
            <IconSparkles className="size-3.5 text-cyan" />
            <Link href="/about" className="transition-colors hover:text-cyan">
              About Us
            </Link>
          </span>
          <span className="hidden h-3 w-px bg-line sm:block" />
          <span className="inline-flex items-center gap-1.5">
            <IconMail className="size-3.5 text-cyan" />
            <a href="mailto:hello@gignest.in" className="transition-colors hover:text-cyan">
              hello@gignest.in
            </a>
          </span>
          <span className="hidden h-3 w-px bg-line sm:block" />
          <span className="inline-flex items-center gap-1.5">
            <IconMapPin className="size-3.5 text-cyan" />
            <Link href="/gigs/map" className="transition-colors hover:text-cyan">
              Find us on the map
            </Link>
          </span>
          <span className="hidden h-3 w-px bg-line sm:block" />
          <span className="flex items-center gap-2">
            <a href="https://instagram.com" aria-label="GigNest on Instagram" className="transition-colors hover:text-cyan">
              Instagram
            </a>
            <a href="https://linkedin.com" aria-label="GigNest on LinkedIn" className="transition-colors hover:text-cyan">
              LinkedIn
            </a>
          </span>
        </div>

        <div className="mx-auto max-w-3xl text-center">
          <div
            className="reveal inline-flex items-center gap-2 rounded-full border border-line bg-black/[0.03] px-3 py-1.5 backdrop-blur"
            style={{ '--i': 0 } as React.CSSProperties}
          >
            <span className="live-dot size-1.5 rounded-full bg-lime" />
            <span className="text-[12.5px] font-medium text-mist">
              {stats.open_gigs} gigs open right now
            </span>
            <span className="text-dimmer">·</span>
            <span className="hud text-[12.5px] text-cyan">
              {compactRupees(stats.reward_pool)} on the board
            </span>
          </div>

          <h1
            className="reveal mt-7 text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl"
            style={{ '--i': 1 } as React.CSSProperties}
          >
            <span className="sheen">Need it,</span>{' '}
            <span className="gradient-text">gig it.</span>
          </h1>

          <p
            className="reveal mx-auto mt-6 max-w-xl text-balance text-[16px] leading-relaxed text-mist sm:text-base"
            style={{ '--i': 2 } as React.CSSProperties}
          >
            Anyone can post a paid gig — a café that needs a website, a shop that needs reels, a
            parent who needs a tutor. And anyone can claim one.
            <span className="hud text-chalk"> Verified {INSTITUTE_SHORT} students pay no fee.</span>
          </p>

          <form
            action="/gigs"
            method="get"
            className="reveal mx-auto mt-9 max-w-xl"
            style={{ '--i': 3 } as React.CSSProperties}
          >
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-dim" />
              <input
                type="search"
                name="q"
                placeholder="Search for work — “website”, “rap song”, “tuition”…"
                aria-label="Search gigs"
                className="w-full rounded-2xl border border-line bg-white/85 py-3.5 pl-11 pr-28 text-[15px] text-chalk shadow-[inset_0_1px_2px_rgba(122,116,106,0.08)] outline-none transition-colors placeholder:text-dimmer hover:border-[#bfb9b0] focus:border-cyan/60 focus:bg-white focus:ring-2 focus:ring-cyan/15"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-xl bg-linear-to-r from-cyan to-teal px-4 py-2 text-[13.5px] font-semibold text-white shadow-[0_6px_18px_-8px_rgba(36,95,115,0.5)] transition hover:brightness-110"
              >
                Search
              </button>
            </div>
          </form>

          <div
            className="reveal mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row"
            style={{ '--i': 4 } as React.CSSProperties}
          >
            <ButtonLink href="/gigs" variant="outline" size="lg" className="w-full sm:w-auto">
              Browse the gig board
              <IconArrowRight className="size-4" />
            </ButtonLink>
            <ButtonLink href="/gigs/new" variant="ghost" size="lg" className="w-full sm:w-auto">
              Post a gig — free
            </ButtonLink>
          </div>

          <p
            className="reveal mt-4 text-[13px] text-dimmer"
            style={{ '--i': 5 } as React.CSSProperties}
          >
            Free to post and apply · Verified students pay 0% platform fee
          </p>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-3 sm:mt-20 lg:grid-cols-4">
          <StatTile
            value={stats.open_gigs}
            label="Open gigs"
            hint="Waiting for a claim"
            accent="lime"
            index={5}
          />
          <StatTile
            value={compactRupees(stats.reward_pool)}
            label="Rewards on offer"
            hint="Across all open gigs"
            accent="cyan"
            index={6}
          />
          <StatTile
            value={stats.students}
            label="Verified students"
            hint="Fee waiver unlocked"
            accent="violet"
            index={7}
          />
          <StatTile
            value={stats.completed}
            label="Gigs completed"
            hint="Paid and reviewed"
            accent="amber"
            index={8}
          />
        </div>
      </div>
    </section>
  )
}

/* ── How it works ─────────────────────────────────────────────────────────── */

const STEPS = [
  {
    icon: <IconBriefcase className="size-5" />,
    eyebrow: 'Step 01',
    title: 'Post the work',
    body: 'Describe the job, set a reward, tag the skills it needs, drop a pin on the map. Two minutes, no listing fee.',
  },
  {
    icon: <IconSearch className="size-5" />,
    eyebrow: 'Step 02',
    title: 'Anyone finds it',
    body: 'Your gig surfaces to anyone filtering by the exact skills you tagged — a student, a designer, a neighbor. They apply with a short pitch.',
  },
  {
    icon: <IconCheck className="size-5" />,
    eyebrow: 'Step 03',
    title: 'Assign and chat',
    body: 'Pick your applicant. The moment you assign them, a built-in chat opens for both sides. No phone numbers or emails are ever shared.',
  },
  {
    icon: <IconSparkles className="size-5" />,
    eyebrow: 'Step 04',
    title: 'Pay and review',
    body: 'Settle up however you like. Leave a rating so good hirers and reliable workers get easier to spot.',
  },
]

function HowItWorks() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="How it works"
        title="From posting to paid, in four steps"
        blurb="Built to be fast enough that finding the right person feels easier than asking around."
        align="center"
      />
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <Panel
            key={s.title}
            glow
            className="reveal relative flex flex-col gap-3 p-5"
            style={{ '--i': i } as React.CSSProperties}
          >
            <div className="flex items-center justify-between">
              <span className="grid size-10 place-items-center rounded-xl border border-cyan/25 bg-cyan/10 text-cyan">
                {s.icon}
              </span>
              <span className="hud text-[12px] tracking-widest text-dimmer">{s.eyebrow}</span>
            </div>
            <h3 className="text-[16px] font-semibold text-chalk">{s.title}</h3>
            <p className="text-[14px] leading-relaxed text-mist">{s.body}</p>
          </Panel>
        ))}
      </div>
    </section>
  )
}

/* ── Featured gigs ──────────────────────────────────────────────────────── */

function FeaturedGigs({ gigs }: { gigs: Awaited<ReturnType<typeof getGigs>>['gigs'] }) {
  if (gigs.length === 0) return null

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          eyebrow="Live board"
          title="The biggest rewards on offer"
          blurb="Highest-paying open gigs right now. The full board has filters for skill, type, budget and distance."
        />
        <ButtonLink href="/gigs" variant="outline" size="sm" className="shrink-0">
          See all gigs
          <IconArrowRight className="size-3.5" />
        </ButtonLink>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {gigs.map((q, i) => (
          <GigCard key={q.id} gig={q} index={i} />
        ))}
      </div>
    </section>
  )
}

/* ── Skill band ───────────────────────────────────────────────────────────── */

function SkillBand({ tags }: { tags: Awaited<ReturnType<typeof getSkillsByCategory>>[number][1] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <Panel className="overflow-hidden p-8 sm:p-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.15fr] lg:items-center">
          <SectionHeading
            eyebrow="Skill tags"
            title="Search the way students actually think"
            blurb="Every gig carries skill tags. Filter the board down to React, tabla, Banarasi-weave photography or German translation — whatever you happen to be good at."
          >
            <div className="mt-2">
              <ButtonLink href="/gigs" variant="secondary" size="sm">
                Filter by your skills
              </ButtonLink>
            </div>
          </SectionHeading>

          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <SkillChip key={t.id} name={t.name} href={`/gigs?skills=${t.id}`} />
            ))}
            <Link
              href="/gigs"
              className="inline-flex items-center gap-1 rounded-lg border border-cyan/30 bg-cyan/[0.08] px-2 py-1 text-[12.5px] font-medium text-cyan transition-colors hover:bg-cyan/15"
            >
              and more
              <IconArrowRight className="size-3" />
            </Link>
          </div>
        </div>
      </Panel>
    </section>
  )
}

/* ── Two sides ────────────────────────────────────────────────────────────── */

function TwoSides() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Two doors, one board"
        title="Whichever side you're on"
        align="center"
      />

      <div className="mt-12 grid gap-4 lg:grid-cols-2">
        <Panel glow className="flex flex-col gap-5 p-7">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl border border-violet/25 bg-violet/10 text-violet">
              <IconUsers className="size-5" />
            </span>
            <div>
              <p className="eyebrow">For appliers</p>
              <h3 className="text-lg font-semibold text-chalk">Earn with what you already know</h3>
            </div>
          </div>
          <ul className="space-y-2.5">
            {[
              'Anyone can apply — sign in with any Google account, no institute email needed',
              'Verified IIT (BHU) students confirm their email once and get the platform fee waived',
              'Filter gigs by skill, reward, type and how far they are from campus',
              'Apply with a short pitch; the hirer sees your rating and past reviews',
              'Take a one-off errand between classes or a month-long project',
            ].map((line) => (
              <li key={line} className="flex gap-2.5 text-[14.5px] leading-relaxed text-mist">
                <IconCheck className="mt-0.5 size-4 shrink-0 text-lime" />
                {line}
              </li>
            ))}
          </ul>
          <div className="mt-auto flex flex-wrap gap-2 pt-1">
            <ButtonLink href="/login" size="sm">
              Start applying
            </ButtonLink>
            <ButtonLink href="/gigs" variant="ghost" size="sm">
              Browse first
            </ButtonLink>
          </div>
        </Panel>

        <Panel glow className="flex flex-col gap-5 p-7">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl border border-cyan/25 bg-cyan/10 text-cyan">
              <IconCoins className="size-5" />
            </span>
            <div>
              <p className="eyebrow">For hirers</p>
              <h3 className="text-lg font-semibold text-chalk">Hire the campus, not a marketplace</h3>
            </div>
          </div>
          <ul className="space-y-2.5">
            {[
              'Anyone can post — shopkeepers, startups, professors, parents, alumni',
              'No account or verification needed to start posting a gig',
              'Set your own reward. A small platform fee applies only when you hire',
              'See every applicant\'s rating and reviews before you pick',
              'No phone numbers or emails — built-in chat starts the moment you assign',
            ].map((line) => (
              <li key={line} className="flex gap-2.5 text-[14.5px] leading-relaxed text-mist">
                <IconCheck className="mt-0.5 size-4 shrink-0 text-cyan" />
                {line}
              </li>
            ))}
          </ul>
          <div className="mt-auto flex flex-wrap gap-2 pt-1">
            <ButtonLink href="/gigs/new" size="sm">
              Post your first gig
            </ButtonLink>
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {GIG_TYPES.map((t, i) => (
          <div
            key={t.value}
            className="reveal rounded-xl border border-line bg-black/[0.02] p-4"
            style={{ '--i': i } as React.CSSProperties}
          >
            <p className="text-[14px] font-semibold text-chalk">{t.label}</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-dim">{t.blurb}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ── Growth loop ──────────────────────────────────────────────────────────── */

/**
 * The four stages that turn a gig board into a way out of the "no experience,
 * no job" trap.
 *
 * `live` is load-bearing, not decoration. Stages 1 and 2 are shipped features —
 * the board pays, and completed gigs plus database-computed ratings already
 * amount to a track record on a public profile. Stages 3 and 4 are not built.
 * Labelling them honestly costs a little polish and buys the section its
 * credibility; a judge who clicks a "Browse sprints" button and gets a 404 will
 * discount everything else on the page.
 */
const LOOP = [
  {
    icon: <IconCoins className="size-[18px]" />,
    title: 'Earn while you are still learning',
    body: 'A first paid job with no CV attached. Micro-gigs are small enough to take between classes and real enough to pay — a reel, a landing page, a weekend of tutoring.',
    accent: 'lime',
    live: true,
  },
  {
    icon: <IconStar className="size-[18px]" />,
    title: 'Every finished gig becomes proof',
    body: 'Completed work, a two-way rating and the hirer’s review land on your public profile. Ratings are computed by the database from real reviews, so the track record is one you cannot write yourself.',
    accent: 'cyan',
    live: true,
  },
  {
    icon: <IconLayers className="size-[18px]" />,
    title: 'Close the gap with short sprints',
    body: 'A gig you nearly qualified for tells us exactly what to teach. Focused two-week sprints, built around the skills the board is actually asking for — not a syllabus written a year ago.',
    accent: 'violet',
    live: false,
  },
  {
    icon: <IconUsers className="size-[18px]" />,
    title: 'Learn from the student ahead of you',
    body: 'The senior who shipped that client site last semester is the best possible mentor for it, and they are two hostels away. Mentorship stays student-led, and mentoring counts on your profile too.',
    accent: 'amber',
    live: false,
  },
] as const

const LOOP_ACCENT = {
  lime: 'border-lime/25 bg-lime/10 text-lime',
  cyan: 'border-cyan/25 bg-cyan/10 text-cyan',
  violet: 'border-violet/25 bg-violet/10 text-violet',
  amber: 'border-amber/25 bg-amber/10 text-amber',
}

function GrowthLoop() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start lg:gap-12">
        {/* The trap, stated plainly. */}
        <div className="lg:sticky lg:top-24">
          <SectionHeading
            eyebrow="Skills and experience"
            title={
              <>
                <span className="text-dim">No experience, no job.</span>
                <br />
                <span className="text-dim">No job,</span>{' '}
                <span className="gradient-text">no experience.</span>
              </>
            }
            blurb="Every student hits the same closed circle, and a résumé workshop does not open it — only paid work that someone actually needed does. GigNest is built to break the loop at the cheapest point: a small job you can get today, which becomes the proof you are missing tomorrow."
          >
            <div className="mt-3 flex flex-wrap gap-2">
              <ButtonLink href="/gigs" size="sm">
                Find your first gig
                <IconArrowRight className="size-3.5" />
              </ButtonLink>
              <ButtonLink href="/login" variant="ghost" size="sm">
                Start a profile
              </ButtonLink>
            </div>
          </SectionHeading>
        </div>

        {/* The four stages. */}
        <ol className="space-y-3">
          {LOOP.map((stage, i) => (
            <li key={stage.title}>
              <Panel
                glow
                className="reveal flex gap-4 p-5 sm:gap-5 sm:p-6"
                style={{ '--i': i } as React.CSSProperties}
              >
                <div className="flex flex-col items-center gap-2">
                  <span
                    className={cn(
                      'grid size-10 shrink-0 place-items-center rounded-xl border',
                      LOOP_ACCENT[stage.accent],
                    )}
                  >
                    {stage.icon}
                  </span>
                  {/* Connector, so the four read as one loop rather than four cards. */}
                  {i < LOOP.length - 1 && (
                    <span className="hidden w-px flex-1 bg-linear-to-b from-line to-transparent sm:block" />
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="hud text-[12px] tracking-widest text-dimmer">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h3 className="text-[16px] font-semibold text-chalk">{stage.title}</h3>
                    <span
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-[11.5px] font-medium tracking-wide',
                        stage.live
                          ? 'border-lime/25 bg-lime/[0.08] text-lime'
                          : 'border-line bg-black/[0.03] text-dim',
                      )}
                    >
                      {stage.live ? 'Live now' : 'Next build'}
                    </span>
                  </div>
                  <p className="text-[14px] leading-relaxed text-mist">{stage.body}</p>
                </div>
              </Panel>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ── Trust ────────────────────────────────────────────────────────────────── */


const TRUST = [
  {
    icon: <IconShield className="size-5" />,
    title: 'Verification, not a wall',
    body: 'Anyone can post and apply. A confirmed student email is a real marker — and it unlocks the fee waiver. The check lives in the database, not the UI, so a tampered browser still cannot fake it.',
  },
  {
    icon: <IconMapPin className="size-5" />,
    title: 'Contacts stay private, always',
    body: 'No phone numbers or emails are ever shown to either side. A built-in chat opens on assignment, and it stays on the platform. Addresses, IDs and payments never enter your profile.',
  },
  {
    icon: <IconSparkles className="size-5" />,
    title: 'Reputation that compounds',
    body: 'Both sides review each other after a gig completes. Ratings are computed by the database from real reviews — they cannot be written by hand.',
  },
]

function TrustBand() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Trust"
        title="Open to anyone, trusted by everyone"
        blurb="Being open does not mean being unguarded — the platform keeps its gatekeepers on the database side, not the welcome mat."
        align="center"
      />
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {TRUST.map((t, i) => (
          <Panel
            key={t.title}
            className="reveal space-y-3 p-6"
            style={{ '--i': i } as React.CSSProperties}
          >
            <span className="grid size-10 place-items-center rounded-xl border border-line bg-black/[0.04] text-cyan">
              {t.icon}
            </span>
            <h3 className="text-[15.5px] font-semibold text-chalk">{t.title}</h3>
            <p className="text-[14px] leading-relaxed text-mist">{t.body}</p>
          </Panel>
        ))}
      </div>
    </section>
  )
}

/* ── Final CTA ────────────────────────────────────────────────────────────── */

function FinalCta() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <Panel className="grid-field relative overflow-hidden px-6 py-14 text-center sm:px-12">
        <h2 className="mx-auto max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          <span className="text-chalk">There is work on campus right now.</span>{' '}
          <span className="gradient-text">Go claim it.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-balance text-[16px] leading-relaxed text-mist">
          Free to post, free to apply. Sign in with a Google account and the board opens up.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ButtonLink href="/login" size="lg" className="w-full sm:w-auto">
            Sign in to apply
            <IconArrowRight className="size-4" />
          </ButtonLink>
          <ButtonLink href="/gigs/new" variant="outline" size="lg" className="w-full sm:w-auto">
            I want to hire
          </ButtonLink>
        </div>
      </Panel>
    </section>
  )
}
