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
