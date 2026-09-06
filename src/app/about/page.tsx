import type { Metadata } from 'next'
import Link from 'next/link'
import { GIG_TYPES, INSTITUTE_NAME, INSTITUTE_SHORT } from '@/lib/constants'
import { ButtonLink } from '@/components/ui/Button'
import { Panel, SectionHeading } from '@/components/ui/Panel'
import {
  IconArrowRight,
  IconBolt,
  IconCoins,
  IconMail,
  IconMapPin,
  IconShield,
  IconSparkles,
  IconStar,
  IconUsers,
} from '@/components/ui/Icons'

export const metadata: Metadata = {
  title: 'About',
  description:
    'What GigNest is, why it exists, and how it is kept safe. Paid work around Varanasi, posted by anyone, claimed by anyone.',
}

const VALUES = [
  {
    icon: <IconSparkles className="size-5" />,
    title: 'Open to everyone',
    body: `No institute address needed to post or apply. A confirmed ${INSTITUTE_SHORT} email only unlocks the fee waiver — it never gates a job.`,
  },
  {
    icon: <IconShield className="size-5" />,
    title: 'Trust held in the database',
    body: 'Student status, identity checks and id-verified badges are enforced by Postgres triggers and row-level security, not by hiding buttons in the browser.',
  },
  {
    icon: <IconCoins className="size-5" />,
    title: 'Money stays yours',
    body: 'Rewards are agreed between the two sides and settled off-platform. We never hold the money, and the platform fee only ever applies to a hire.',
  },
  {
    icon: <IconStar className="size-5" />,
    title: 'Reputation is earned',
    body: 'Both sides review each other after a gig completes, and ratings are computed by the database from those reviews — you cannot write your own track record.',
  },
]

const CATEGORIES = GIG_TYPES.map((t) => t).slice(0, 4)

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Masthead */}
      <section className="mx-auto max-w-3xl text-center">
        <p className="eyebrow">About GigNest</p>
        <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          <span className="text-chalk">The gig board local to </span>
          <span className="gradient-text">{INSTITUTE_NAME}</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-balance text-[16.5px] leading-relaxed text-mist">
          GigNest started as a weekend prototype: a place where anyone around campus —
          a café that needs a website, a parent who needs a tuition, a lab that needs
          forms digitised — could post paid work, and anyone with an account could
          claim it. No résumé, no agency, no cold email. Just a pin on a map, a reward,
          and the person who can actually do it.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <ButtonLink href="/gigs" size="lg">
            Browse the board
            <IconArrowRight className="size-4" />
          </ButtonLink>
          <ButtonLink href="/gigs/new" variant="outline" size="lg">
            Post a gig
          </ButtonLink>
        </div>
      </section>

      {/* Quick facts */}
      <section className="mx-auto mt-14 grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { k: 'Free', v: 'to post and to apply' },
          { k: '0%', v: 'platform fee for verified students' },
          { k: 'Anywhere, anytime', v: 'one-off to month-long' },
          { k: 'In the app', v: 'chat, never a phone number' },
        ].map((f) => (
          <div
            key={f.k}
            className="rounded-xl border border-line bg-black/[0.02] p-4 text-center"
          >
            <p className="text-lg font-semibold text-chalk">{f.k}</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-dim">{f.v}</p>
          </div>
        ))}
      </section>

      {/* Why it exists */}
      <section className="mx-auto mt-20 max-w-3xl">
        <SectionHeading
          eyebrow="Why"
          title="The gap it fills"
          blurb={`A student has the skill but not the outlet; a shopkeeper has the task but not the connection. The chat app you already use is full of "anyone know someone who does X?" — this is the answer to that, with a reward, a deadline and a rating attached. Because it is local, a gig is a real errand between classes, not a race against a global marketplace.`}
          align="left"
        />
        <Panel className="grid-field relative mt-6 overflow-hidden p-6 sm:p-8">
          <p className="text-[15px] leading-relaxed text-mist">
            The loop we are trying to break: <em>no experience, no job — no job, no experience.</em>{' '}
            The cheapest point to break it is a small paid job you can get today, which
            becomes the proof you are missing tomorrow. That is why micro-gigs, ratings
            and a public profile matter more than a big splash page.
          </p>
        </Panel>
      </section>

      {/* Values */}
      <section className="mx-auto mt-20">
        <SectionHeading
          eyebrow="How it is run"
          title="Open to anyone, trusted by everyone"
          align="center"
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {VALUES.map((v, i) => (
            <Panel
              key={v.title}
              glow
              className="reveal flex gap-4 p-6"
              style={{ '--i': i } as React.CSSProperties}
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-cyan/25 bg-cyan/10 text-cyan">
                {v.icon}
              </span>
              <div className="space-y-1.5">
                <h3 className="text-[16px] font-semibold text-chalk">{v.title}</h3>
                <p className="text-[14px] leading-relaxed text-mist">{v.body}</p>
              </div>
            </Panel>
          ))}
        </div>
      </section>

      {/* What people post */}
      <section className="mx-auto mt-20 max-w-4xl">
        <SectionHeading
          eyebrow="On the board right now"
          title="Everything from a reels shoot to a weekend of tuition"
          align="center"
        />
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((t) => (
            <Link
              key={t.value}
              href={`/gigs?types=${t.value}`}
              className="group rounded-xl border border-line bg-black/[0.02] p-4 transition-colors hover:border-cyan/40"
            >
              <p className="text-[14.5px] font-semibold text-chalk">{t.label}</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-dim">{t.blurb}</p>
              <span className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-medium text-cyan">
                See them
                <IconArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Founders / contact */}
      <section className="mx-auto mt-20 max-w-3xl">
        <Panel className="p-8 text-center sm:p-10">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl border border-cyan/25 bg-cyan/10 text-cyan">
            <IconUsers className="size-5" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-chalk">
            Made for a campus, by people on it
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[14.5px] leading-relaxed text-mist">
            Built as a prototype for a startup idea weekend. If you want to say hi, ask a
            question, or point out something that should work differently, the inbox is open.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[14px]">
            <a
              href="mailto:hello@gignest.in"
              className="inline-flex items-center gap-1.5 text-chalk transition-colors hover:text-cyan"
            >
              <IconMail className="size-4 text-cyan" />
              hello@gignest.in
            </a>
            <Link
              href="/gigs/map"
              className="inline-flex items-center gap-1.5 text-chalk transition-colors hover:text-cyan"
            >
              <IconMapPin className="size-4 text-cyan" />
              Find us on the map
            </Link>
            <span className="inline-flex items-center gap-1.5 text-chalk">
              <IconBolt className="size-4 text-cyan" />
              {INSTITUTE_NAME}, Varanasi
            </span>
          </div>
        </Panel>
      </section>
    </div>
  )
}
