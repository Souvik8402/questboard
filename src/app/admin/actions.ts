'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  ADMIN_COOKIE,
  ADMIN_COOKIE_OPTIONS,
  adminConfigError,
  checkAdminPassword,
  issueAdminToken,
} from '@/lib/admin-session'
import { adminDataAvailable } from '@/lib/admin-queries'
import { GIG_STATUSES } from '@/lib/constants'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ActionResult, GigStatus } from '@/lib/types'
import { FieldError, checkbox, requireEnum, runAction, text } from '@/lib/validate'

const DEMO_MESSAGE =
  'Demo mode — the panel is read-only until SUPABASE_SERVICE_ROLE_KEY is set in .env.local.'

/**
 * Sign in to the admin panel.
 *
 * Rate limiting is deliberately crude: a fixed delay on every attempt, correct
 * or not, so guessing is slow and timing tells an attacker nothing. Good enough
 * for a prototype behind a strong ADMIN_PASSWORD; swap in real admin roles
 * before this handles anything valuable.
 */
export async function adminLogin(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const configError = adminConfigError()
    if (configError) throw new FieldError(configError)

    const password = text(form, 'password')
    if (!password) throw new FieldError('Enter the admin password.', 'password')

    await new Promise((resolve) => setTimeout(resolve, 400))

    if (!(await checkAdminPassword(password))) {
      throw new FieldError('Wrong password.', 'password')
    }

    const token = await issueAdminToken()
    if (!token) throw new FieldError('ADMIN_SECRET is missing, so the session cannot be signed.')

    const jar = await cookies()
    jar.set(ADMIN_COOKIE, token, ADMIN_COOKIE_OPTIONS)

    const rawNext = text(form, 'next')
    const next = rawNext.startsWith('/admin') && !rawNext.startsWith('//') ? rawNext : '/admin'
    redirect(next)
  })
}

export async function adminLogout(): Promise<void> {
  const jar = await cookies()
  jar.delete(ADMIN_COOKIE)
  redirect('/admin/login')
}

/** Ban or unban an account. Banned users keep their data but cannot post or apply. */
export async function setUserBanned(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    if (!adminDataAvailable) throw new FieldError(DEMO_MESSAGE)

    const userId = text(form, 'user_id')
    if (!userId) throw new FieldError('Missing user.')
    const banned = checkbox(form, 'banned')

    const supabase = createAdminClient()
    const { error } = await supabase
      .from('profiles')
      .update({ is_banned: banned, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) throw new FieldError(error.message)

    revalidatePath('/admin')
    revalidatePath(`/profile/${userId}`)

    return {
      ok: true,
      message: banned
        ? 'Account suspended. They can still sign in, but every write is refused.'
        : 'Account restored.',
    }
  })
}

/** Force a gig into another state — for spam, abandoned posts and disputes. */
export async function adminSetGigStatus(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    if (!adminDataAvailable) throw new FieldError(DEMO_MESSAGE)

    const gigId = text(form, 'gig_id')
    if (!gigId) throw new FieldError('Missing gig.')
    const status = requireEnum(form, 'status', GIG_STATUSES as readonly GigStatus[], 'status')

    const supabase = createAdminClient()
    const { error } = await supabase
      .from('gigs')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', gigId)

    if (error) throw new FieldError(error.message)

    revalidatePath('/admin')
    revalidatePath(`/gigs/${gigId}`)
    revalidatePath('/gigs')

    return { ok: true, message: `Gig moved to ${status.replace('_', ' ')}.` }
  })
}

/**
 * Delete a gig outright. Applications, tags and the contact row go with it
 * via ON DELETE CASCADE — for genuine spam, cancelling is not enough.
 */
export async function adminDeleteGig(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    if (!adminDataAvailable) throw new FieldError(DEMO_MESSAGE)

    const gigId = text(form, 'gig_id')
    if (!gigId) throw new FieldError('Missing gig.')

    const supabase = createAdminClient()
    const { error } = await supabase.from('gigs').delete().eq('id', gigId)
    if (error) throw new FieldError(error.message)

    revalidatePath('/admin')
    revalidatePath('/gigs')
    revalidatePath('/gigs/map')

    return { ok: true, message: 'Gig deleted, along with its applications and tags.' }
  })
}

/** Remove an abusive review. The rating trigger recomputes the profile average. */
export async function adminDeleteReview(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    if (!adminDataAvailable) throw new FieldError(DEMO_MESSAGE)

    const reviewId = text(form, 'review_id')
    if (!reviewId) throw new FieldError('Missing review.')

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId)
      .select('reviewee_id')
      .maybeSingle<{ reviewee_id: string }>()

    if (error) throw new FieldError(error.message)

    revalidatePath('/admin')
    if (data?.reviewee_id) revalidatePath(`/profile/${data.reviewee_id}`)

    return { ok: true, message: 'Review deleted and the rating recalculated.' }
  })
}

/*
 * ─────────────────────────────────────────────────────────────────────────────
 *  The three queues: IDs (item 4), fee waivers (item 2), disputes (item 8)
 *
 *  All three write columns that RLS makes service-role-only, which is why they
 *  live here rather than in the route that displays them. `guard_profile_changes()`
 *  in schema.sql refuses `fee_waiver_status = 'approved'` and any write to
 *  `id_verified_at` from a normal session, so an admin decision cannot be forged
 *  by the person it is about.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const DECISIONS = ['approved', 'rejected'] as const
type Decision = (typeof DECISIONS)[number]

/**
 * Approve or reject a submitted ID.
 *
 * Approving also stamps `profiles.id_verified_at`, which is what the Verified
 * badge on a profile and on every gig card reads. Rejecting clears it again: an
 * ID that turned out to be somebody else's should not leave a badge behind.
 */
export async function decideVerification(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    if (!adminDataAvailable) throw new FieldError(DEMO_MESSAGE)

    const id = text(form, 'verification_id')
    const profileId = text(form, 'profile_id')
    if (!id || !profileId) throw new FieldError('Missing submission.')

    const decision = requireEnum(form, 'decision', DECISIONS as readonly Decision[], 'decision')
    const note = text(form, 'note').slice(0, 400)

    if (decision === 'rejected' && note.length < 5) {
      throw new FieldError(
        'Say why in a line or two — the person sees this note and needs to know what to fix.',
        'note',
      )
    }

    const now = new Date().toISOString()
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('id_verifications')
      .update({ status: decision, note: note || null, decided_at: now })
      .eq('id', id)

    if (error) throw new FieldError(error.message)

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        id_verified_at: decision === 'approved' ? now : null,
        updated_at: now,
      })
      .eq('id', profileId)

    if (profileError) throw new FieldError(profileError.message)

    revalidatePath('/admin')
    revalidatePath('/verify')
    revalidatePath(`/profile/${profileId}`)
    revalidatePath('/gigs')

    return {
      ok: true,
      message:
        decision === 'approved'
          ? 'Approved. The Verified badge is live on their profile and on every gig they post.'
          : 'Rejected, and your note is on their verification page. Any badge they had is gone.',
    }
  })
}

/** Decide a fee-waiver request (item 2). Approving is what makes the fee ₹0. */
export async function decideWaiver(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    if (!adminDataAvailable) throw new FieldError(DEMO_MESSAGE)

    const profileId = text(form, 'profile_id')
    if (!profileId) throw new FieldError('Missing account.')

    const decision = requireEnum(form, 'decision', DECISIONS as readonly Decision[], 'decision')
    const note = text(form, 'note').slice(0, 400)

    if (decision === 'rejected' && note.length < 5) {
      throw new FieldError('Say why — they can ask again, and they need to know what was missing.', 'note')
    }

    const now = new Date().toISOString()
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('profiles')
      .update({
        fee_waiver_status: decision,
        fee_waiver_note: note || null,
        fee_waiver_decided_at: now,
        updated_at: now,
      })
      .eq('id', profileId)

    if (error) throw new FieldError(error.message)

    revalidatePath('/admin')
    revalidatePath('/verify')
    revalidatePath('/dashboard')

    return {
      ok: true,
      message:
        decision === 'approved'
          ? 'Waiver approved — they now keep the full reward on every gig.'
          : 'Waiver refused, with your note attached. They can ask again.',
    }
  })
}

/**
 * Close a dispute (item 8).
 *
 * `resolved` and `rejected` both end it; the difference is whether anything was
 * done. Either way the resolution text is required, because "we looked at it" with
 * no explanation is worse than no reply — and the published promise is a response
 * within about two hours, which is a promise about this button.
 */
export async function resolveDispute(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    if (!adminDataAvailable) throw new FieldError(DEMO_MESSAGE)

    const id = text(form, 'dispute_id')
    if (!id) throw new FieldError('Missing dispute.')

    const outcome = requireEnum(form, 'outcome', ['resolved', 'rejected'] as const, 'outcome')
    const resolution = text(form, 'resolution')
    if (resolution.length < 10) {
      throw new FieldError(
        'Write the outcome in a sentence or two — both sides read this, and it is the only record of what was decided.',
        'resolution',
      )
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('disputes')
      .update({
        status: outcome,
        resolution: resolution.slice(0, 1000),
        resolved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('gig_id')
      .maybeSingle<{ gig_id: string }>()

    if (error) throw new FieldError(error.message)

    revalidatePath('/admin')
    if (data?.gig_id) revalidatePath(`/gigs/${data.gig_id}`)

    return {
      ok: true,
      message:
        outcome === 'resolved'
          ? 'Closed as resolved. Both sides can read the outcome on the gig page.'
          : 'Closed with no action, and your reasoning is on the gig page.',
    }
  })
}
