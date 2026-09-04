import Link from 'next/link'
import { getPlatformStats, getGigs, getSkillsByCategory } from '@/lib/queries'
import { INSTITUTE_NAME, INSTITUTE_SHORT, GIG_TYPES } from '@/lib/constants'
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
  IconMapPin,
  IconSearch,
  IconShield,
  IconSparkles,
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
        <div className="mx-auto max-w-3xl text-center">
          <div
            className="reveal inline-flex items-center gap-2 rounded-full border border-line bg-white/[0.03] px-3 py-1.5 backdrop-blur"
            style={{ '--i': 0 } as React.CSSProperties}
          >
            <span className="live-dot size-1.5 rounded-full bg-lime" />
            <span className="text-[11.5px] font-medium text-mist">
              {stats.open_gigs} gigs open right now
            </span>
            <span className="text-dimmer">·</span>
            <span className="hud text-[11.5px] text-cyan">
              {compactRupees(stats.reward_pool)} on the board
            </span>
          </div>

          <h1
            className="reveal mt-7 text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl"
            style={{ '--i': 1 } as React.CSSProperties}
          >
            <span className="sheen">Work worth doing,</span>
            <br />
            <span className="text-chalk">claimed by </span>
            <span className="gradient-text">{INSTITUTE_SHORT} students</span>
          </h1>

          <p
            className="reveal mx-auto mt-6 max-w-xl text-balance text-[15px] leading-relaxed text-mist sm:text-base"
            style={{ '--i': 2 } as React.CSSProperties}
          >
            Anyone can post a paid gig — a café that needs a website, a shop that needs reels, a
            parent who needs a tutor. Only verified{' '}
            <span className="hud text-chalk">@itbhu.ac.in</span> students can claim one.
          </p>

          <div
            className="reveal mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
            style={{ '--i': 3 } as React.CSSProperties}
          >
            <ButtonLink href="/gigs" size="lg" className="w-full sm:w-auto">
              Browse the gig board
              <IconArrowRight className="size-4" />
            </ButtonLink>
            <ButtonLink href="/gigs/new" variant="outline" size="lg" className="w-full sm:w-auto">
              Post a gig — free
            </ButtonLink>
          </div>

          <p
            className="reveal mt-4 text-[12px] text-dimmer"
            style={{ '--i': 4 } as React.CSSProperties}
          >
            No listing fee · No commission · Payment settled directly between you
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
            hint={`${INSTITUTE_SHORT} email confirmed`}
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
    title: 'Students find it',
    body: 'Your gig surfaces to students filtering by the exact skills you tagged. They apply with a short pitch.',
  },
  {
    icon: <IconCheck className="size-5" />,
    eyebrow: 'Step 03',
    title: 'Accept and connect',
    body: 'Pick your applicant. Phone numbers unlock for both sides the moment you accept — not before.',
  },
  {
    icon: <IconSparkles className="size-5" />,
    eyebrow: 'Step 04',
    title: 'Pay and review',
    body: 'Settle up however you like. Leave a rating so good hirers and reliable students get easier to spot.',
  },
]

function HowItWorks() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="How it works"
        title="From posting to paid, in four steps"
        blurb="Built to be fast enough that hiring a student feels easier than asking around."
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
              <span className="hud text-[11px] tracking-widest text-dimmer">{s.eyebrow}</span>
            </div>
            <h3 className="text-[15px] font-semibold text-chalk">{s.title}</h3>
            <p className="text-[13px] leading-relaxed text-mist">{s.body}</p>
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
              className="inline-flex items-center gap-1 rounded-lg border border-cyan/30 bg-cyan/[0.08] px-2 py-1 text-[11.5px] font-medium text-cyan transition-colors hover:bg-cyan/15"
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
              <p className="eyebrow">For students</p>
              <h3 className="text-lg font-semibold text-chalk">Earn with what you already know</h3>
            </div>
          </div>
          <ul className="space-y-2.5">
            {[
              'Sign in with your @itbhu.ac.in Google account — verification is instant',
              'Filter gigs by skill, reward, type and how far they are from campus',
              'Apply with a short pitch; the hirer sees your rating and past reviews',
              'Take one-off errands between classes or a month-long internship',
            ].map((line) => (
              <li key={line} className="flex gap-2.5 text-[13.5px] leading-relaxed text-mist">
                <IconCheck className="mt-0.5 size-4 shrink-0 text-lime" />
                {line}
              </li>
            ))}
          </ul>
          <div className="mt-auto flex flex-wrap gap-2 pt-1">
            <ButtonLink href="/login" size="sm">
              Verify with institute email
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
              'No institute email needed to hire; you just cannot claim gigs',
              'Set your own reward. No commission, no listing fee, no middleman',
              'Applicants are verified students, so you know who you are talking to',
            ].map((line) => (
              <li key={line} className="flex gap-2.5 text-[13.5px] leading-relaxed text-mist">
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
            className="reveal rounded-xl border border-line bg-white/[0.02] p-4"
            style={{ '--i': i } as React.CSSProperties}
          >
            <p className="text-[13px] font-semibold text-chalk">{t.label}</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-dim">{t.blurb}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ── Trust ────────────────────────────────────────────────────────────────── */

const TRUST = [
  {
    icon: <IconShield className="size-5" />,
    title: 'Verification in the database, not the UI',
    body: `Only an @itbhu.ac.in Google sign-in can hold the student role. The rule is enforced by a Postgres trigger and row-level security, so a tampered browser still cannot claim a gig.`,
  },
  {
    icon: <IconMapPin className="size-5" />,
    title: 'Contacts stay private until you accept',
    body: 'Phone numbers live in separate, access-controlled tables. The hirer sees the student’s number and the student sees the hirer’s only after an application is accepted.',
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
        title="Exclusive means enforced"
        blurb={`Being ${INSTITUTE_NAME}-only is the whole product. It is built to hold up under someone trying to get around it.`}
        align="center"
      />
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {TRUST.map((t, i) => (
          <Panel
            key={t.title}
            className="reveal space-y-3 p-6"
            style={{ '--i': i } as React.CSSProperties}
          >
            <span className="grid size-10 place-items-center rounded-xl border border-line bg-white/[0.04] text-cyan">
              {t.icon}
            </span>
            <h3 className="text-[14.5px] font-semibold text-chalk">{t.title}</h3>
            <p className="text-[13px] leading-relaxed text-mist">{t.body}</p>
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
        <p className="mx-auto mt-4 max-w-lg text-balance text-[15px] leading-relaxed text-mist">
          Free to post, free to apply. Sign in with your institute email and the board opens up.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ButtonLink href="/login" size="lg" className="w-full sm:w-auto">
            Sign in as a student
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
