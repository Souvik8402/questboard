import type { Metadata } from 'next'
import Link from 'next/link'
import { LearnForm } from './LearnForm'
import { hasGemini } from '@/lib/ai'
import { Panel, SectionHeading, StatTile } from '@/components/ui/Panel'
import { ButtonLink } from '@/components/ui/Button'
import { IconArrowRight, IconBook, IconBolt, IconCoins, IconSparkles, IconStar } from '@/components/ui/Icons'

export const metadata: Metadata = {
  title: 'Skill coach',
  description:
    'Tell the free GigNest AI coach what you want to learn and how many hours you have — it hands back a five-step plan with free resources and a real rupees figure.',
}

/**
 * Applies to the `coachAction` server action on this route. Gemini is a thinking
 * model and a five-step plan measures 20-25s, comfortably past Vercel's default
 * ceiling — which is why the deployed site returned a half-written plan while
 * localhost was fine. 60s is the most a Hobby project is allowed.
 */
export const maxDuration = 60

export default function LearnPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      {/* Masthead */}
      <section className="mx-auto max-w-3xl text-center">
        <div className="reveal inline-flex items-center gap-2 rounded-full border border-line bg-black/[0.03] px-3 py-1.5 backdrop-blur">
          <IconSparkles className="size-3.5 text-cyan" />
          <span className="text-[12.5px] font-medium text-mist">Free, no sign-in, no credit card</span>
        </div>
        <h1 className="reveal mt-6 text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
          <span className="text-chalk">A coach for the skill that</span>{' '}
          <span className="gradient-text">gets you paid</span>
        </h1>
        <p className="reveal mx-auto mt-5 max-w-2xl text-balance text-[16px] leading-relaxed text-mist">
          GigNest is full of work nobody can do. This is the other half of that loop: tell us
          the skill you want, how much time you can give it, and what you actually want to be
          able to do — you get a five-step plan, the best free resources for it, and a rough
          figure for what that skill earns per gig.
        </p>
      </section>

      {/* The form */}
      <section className="mt-12">
        <Panel className="p-5 sm:p-8">
          <LearnForm />
        </Panel>
      </section>

      {/* Why this exists */}
      <section className="mx-auto mt-20 max-w-7xl">
        <SectionHeading
          eyebrow="Why"
          title="Built around the loop the board is already in"
          blurb="Gigs tell you exactly what the market wants. The coach turns that into the shortest path to it — free resources, a small portfolio piece, and a first customer."
          align="center"
        />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <StatTile value="5" label="staged steps" hint="Orient → build → practice → ship → charge" accent="cyan" index={0} />
          <StatTile value="₹0" label="for the whole plan" hint="Free resources only, ever" accent="lime" index={1} />
          <StatTile value="Real" label="rupees, not vibes" hint="What the skill pays per gig, in numbers" accent="amber" index={2} />
        </div>
      </section>

      {/* How it works + CTA */}
      <section className="mx-auto mt-20 grid gap-4 lg:grid-cols-2">
        <Panel className="flex flex-col gap-3 p-6 sm:p-7">
          <span className="grid size-10 place-items-center rounded-xl border border-cyan/25 bg-cyan/10 text-cyan">
            <IconBolt className="size-5" />
          </span>
          <h3 className="text-[16px] font-semibold text-chalk">Pick the skill the board is asking for</h3>
          <p className="text-[14px] leading-relaxed text-mist">
            Open the gig board, note the skills that keep coming up, and bring one of them
            here. The fastest way to learn is to learn the thing someone is already paying for.
          </p>
          <div className="mt-auto flex flex-wrap gap-2 pt-1">
            <ButtonLink href="/gigs" variant="outline" size="sm">
              See what the board needs
              <IconArrowRight className="size-3.5" />
            </ButtonLink>
          </div>
        </Panel>

        <Panel className="flex flex-col gap-3 p-6 sm:p-7">
          <span className="grid size-10 place-items-center rounded-xl border border-violet/25 bg-violet/10 text-violet">
            <IconBook className="size-5" />
          </span>
          <h3 className="text-[16px] font-semibold text-chalk">Turn the plan into a gig</h3>
          <p className="text-[14px] leading-relaxed text-mist">
            Step five always ends with a portfolio piece and a price. In demo mode the coach
            writes from a built-in plan; with a Gemini key it writes live. Either way it points
            at something you can actually list.
          </p>
          <div className="mt-auto flex flex-wrap gap-2 pt-1">
            <Link href="/gigs/new" className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-cyan transition-colors hover:text-chalk">
              Post a gig, claim the skill back
              <IconArrowRight className="size-3.5" />
            </Link>
          </div>
        </Panel>
      </section>

      {/* Live / demo note */}
      <section className="mx-auto mt-16 max-w-3xl text-center">
        <p className="text-[13px] leading-relaxed text-dim">
          {hasGemini
            ? 'Live — a Gemini key is configured, so plans are written fresh for each request.'
            : 'Demo — GEMINI_API_KEY is not set, so plans come from the built-in curriculum. Add the key to get live, personalised learning paths.'}
        </p>
      </section>
    </div>
  )
}
