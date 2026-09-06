'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/config'
import { digestId } from '@/lib/kyc-hash'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult, IdKind } from '@/lib/types'
import { FieldError, requireEnum, requireText, runAction, text } from '@/lib/validate'

/*
 * Verification (item 4). Three actions: submit an ID, rotate the share link, ask
 * for the student fee waiver (item 2).
 *
 * The rule the whole file exists to keep: the ID number itself never reaches the
 * database. `digestId()` (in `@/lib/kyc-hash`, server-only) validates it in
 * memory and returns only the last four digits and a salted hash; `raw` goes out
 * of scope on the next line and is never logged, revalidated, or put in an error
 * message.
 */

const DEMO_MESSAGE =
  'Demo mode — no database connected, so nothing can be saved. The validation above is real, though: the number was checked and then discarded.'

const KINDS: IdKind[] = ['pan', 'aadhaar']

/**
 * Submit a PAN or Aadhaar for review.
 *
 * Works with or without a session: signed in it verifies you, and via a
 * `/verify/[token]` link it verifies whoever owns that token — which is the point
 * of the link, since a hirer gets sent one before they have thought about
 * accounts.
 */
export async function submitId(_prev: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const kind = requireEnum(form, 'kind', KINDS, 'ID type')
    const nameOnId = requireText(form, 'name_on_id', {
      label: 'Name as printed on the ID',
      min: 2,
      max: 120,
    })

    // Validate before anything else, so a bad number fails identically whether
    // or not a database is connected — and so demo mode still shows the error.
    const { last4, hash } = digestId(kind, text(form, 'id_number'))

    if (!isSupabaseConfigured) throw new FieldError(DEMO_MESSAGE)

    const token = text(form, 'token')
    const supabase = await createClient()

    let profileId: string
    if (token) {
      const { data } = await supabase.rpc('profile_by_verify_token', { p_token: token })
      const row = Array.isArray(data) ? data[0] : data
      if (!row) {
        throw new FieldError(
          'That verification link is no longer valid — the person who sent it has regenerated theirs. Ask them for a fresh one.',
        )
      }
      profileId = (row as { id: string }).id
    } else {
      const session = await getSession()
      if (!session) {
        throw new FieldError('Sign in first, or open the verification link you were sent.')
      }
      profileId = session.userId
    }

    // One row per (profile, kind): re-submitting after a rejection replaces the
    // old attempt rather than stacking up a queue of them.
    const { error } = await supabase.from('id_verifications').upsert(
      {
        profile_id: profileId,
        kind,
        name_on_id: nameOnId,
        last4,
        id_hash: hash,
        status: 'pending',
        note: null,
        decided_at: null,
      },
      { onConflict: 'profile_id,kind' },
    )

    if (error) {
      if (error.code === '42501') {
        throw new FieldError(
          'That submission was refused. An ID that has already been approved cannot be replaced — ask an admin if something on it needs changing.',
        )
      }
      throw new Error(error.message)
    }

    revalidatePath('/verify')
    revalidatePath('/admin')

    return {
      ok: true,
      message: `${kind === 'pan' ? 'PAN' : 'Aadhaar'} ending ${last4} submitted. An admin reviews it by hand — we kept the last four digits and a one-way hash, and threw the number itself away.`,
    }
  })
}

/**
 * Rotate the share link. This is the "editable anytime" part of item 4: the old
 * URL stops resolving the moment this runs, so a link sent to the wrong person
 * can be taken back.
 */
export async function regenerateVerifyLink(): Promise<ActionResult> {
  return runAction(async () => {
    if (!isSupabaseConfigured) throw new FieldError(DEMO_MESSAGE)

    const session = await getSession()
    if (!session) throw new FieldError('Sign in first — your session may have expired.')

    // The RPC keys off auth.uid() rather than taking an id, so there is no
    // parameter that could rotate somebody else's token.
    const supabase = await createClient()
    const { error } = await supabase.rpc('rotate_verify_token')
    if (error) throw new Error(error.message)

    revalidatePath('/verify')
    return {
      ok: true,
      message: 'New link ready. The previous one stopped working just now.',
    }
  })
}

/**
 * Ask for the student fee waiver (item 2).
 *
 * All this can do is move the status to 'pending'. The trigger in schema.sql
 * refuses anything else from a user, and it also refuses `role='student'` without
 * an institute mailbox — which is what makes the role a usable marker for who may
 * even ask.
 */
export async function requestFeeWaiver(_prev: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const note = requireText(form, 'note', {
      label: 'Which course and year',
      min: 10,
      max: 400,
    })

    if (!isSupabaseConfigured) throw new FieldError(DEMO_MESSAGE)

    const session = await getSession()
    if (!session) throw new FieldError('Sign in first — your session may have expired.')
    if (!session.profile?.onboarded_at) {
      throw new FieldError('Finish setting up your profile first.')
    }
    if (session.profile.fee_waiver_status === 'approved') {
      throw new FieldError('Your waiver is already approved — you pay no platform fee.')
    }

    const supabase = await createClient()
    // `fee_waiver_note` is service-role-only, so the request itself carries the
    // course details in a normal message to the admin queue instead.
    const { error } = await supabase.rpc('request_fee_waiver', { p_note: note })

    if (error) {
      if (error.code === '42501') {
        throw new FieldError(
          'Only an account with a verified institute address can ask for the waiver. Signing in with your @itbhu.ac.in Google account is the quickest fix — and note this only affects the fee, never your ability to apply for gigs.',
        )
      }
      throw new Error(error.message)
    }

    revalidatePath('/verify')
    revalidatePath('/dashboard')
    revalidatePath('/admin')

    return {
      ok: true,
      message:
        'Waiver requested. An admin checks it against your institute address — until then the standard fee applies, and you can keep applying for gigs either way.',
    }
  })
}
