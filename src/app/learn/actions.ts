'use server'

import { askCoach, hasGemini, type CoachRequest } from '@/lib/ai'
import { FieldError, friendlyDbError, requireInt, requireText } from '@/lib/validate'

/**
 * The shape of a coach reply. Mirrors `ActionResult` for the error branch, but
 * carries the plan on success — `ActionResult` itself is a closed union with no
 * room for a payload, so this type lives here.
 */
export type CoachResult =
  | { ok: true; message?: string; plan: string; fromGemini: boolean }
  | { ok: false; message: string; field?: string }

/**
 * A demo-mode curriculum, used when no `GEMINI_API_KEY` is present (or the real
 * call comes back empty). It follows the same "numbered 5 steps, free resources,
 * a portfolio piece, a rupee figure" shape the model is told to produce, so the
 * UI never has to render two different plan formats.
 */
function fallbackPlan(skill: string, goal: string, hours: number): string {
  const target = goal.trim() || 'get paid for it'
  return [
    `1. Get oriented — name the exact thing you are learning.`,
    `   ${skill} is the broad skill; ${target} is the outcome. Spend your first week watching 2-3 hours of the best free walkthrough you can find (YouTube, freeCodeCamp, or the official docs for ${skill}) and writing down the vocabulary it uses. You are not learning ${skill} — you are learning the sub-skills ${target} actually needs.`,
    `   Resources: search "${skill} full course" and "${skill} ${target} tutorial" on YouTube; the official ${skill} site; freeCodeCamp for web skills; NPTEL for the theory-heavy versions.`,
    ``,
    `2. Build the smallest real thing — the single most important step.`,
    `   Ignore the "complete" course for now. Pick one tiny version of ${target} and build it this month. A 3-hour tutorial that ends with a finished thing teaches you more than 30 hours of lecture. At ${hours} hours a week, aim to finish something in 2-3 weeks.`,
    `   Rule of thumb: if you can show one finished piece to a friend who is not a developer or artist, you have learned more than someone who finished a course and built nothing.`,
    ``,
    `3. Practice deliberately — not reactively.`,
    `   Do not fall into tutorial purgatory. For every 1 video you watch, spend 2 hours attempting the thing yourself, then go back to the video only when you are stuck. Keep a "can't do yet" list: each item there is a concrete thing to study next.`,
    ``,
    `4. Ship it where a hirer can see it.`,
    `   Put your finished piece on the internet — GitHub for code, a simple site for design, a shared drive or portfolio for video or writing. A link is worth ten times more than a claim of skill. Then look at GigNest's open gigs and find the one closest to what you just made.`,
    ``,
    `5. Turn it into your first paid gig.`,
    `   List the thing you built as evidence on your profile. Approach the gig that matches it, and price it to land: with ${hours} hours a week of practice and one finished piece, a reasonable first gig pays roughly ₹500-₹2,000 for a small task, and ₹2,000-₹5,000 once you have a repeat client. The first one is about the review, not the money.`,
  ].join('\n')
}

/**
 * Build a learning plan for `skill` from the free Gemini coach. In demo mode
 * (`hasGemini` is false) it falls back to `fallbackPlan` so the route is fully
 * usable without a key. The `prev` arg is the previous state from
 * `useActionState` and is unused — validation and the plan are fresh each time.
 */
export async function coachAction(
  prev: CoachResult | null,
  form: FormData,
): Promise<CoachResult> {
  void prev

  try {
    const skill = requireText(form, 'skill', { label: 'Skill you want to learn', max: 80 })
    const goal = requireText(form, 'goal', { label: 'What you want to be able to do', max: 200 })
    const hours = requireInt(form, 'hours', { label: 'Hours per week', min: 1, max: 40 })

    const req: CoachRequest = { skill, goal, hours }

    if (hasGemini) {
      const plan = await askCoach(req)
      if (plan) return { ok: true, plan, fromGemini: true }
    }

    return { ok: true, plan: fallbackPlan(skill, goal, hours), fromGemini: false }
  } catch (error) {
    if (error instanceof FieldError) {
      return { ok: false, message: error.message, field: error.field }
    }

    // Next uses thrown sentinels for redirect() and notFound() — let them pass.
    if (
      error &&
      typeof error === 'object' &&
      'digest' in error &&
      typeof (error as { digest?: unknown }).digest === 'string' &&
      /NEXT_(REDIRECT|NOT_FOUND|HTTP_ERROR_FALLBACK)/.test((error as { digest: string }).digest)
    ) {
      throw error
    }

    console.error('[learn]', error)
    const message = error instanceof Error ? error.message : 'Something went wrong.'
    return { ok: false, message: friendlyDbError(message) }
  }
}
