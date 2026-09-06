'use server'

import { redirect } from 'next/navigation'
import { isSupabaseConfigured, siteUrl } from '@/lib/config'
import { isInstituteEmail } from '@/lib/constants'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/types'
import { FieldError, requireText, runAction, text } from '@/lib/validate'

function safeNext(raw: string): string {
  // Only allow same-origin paths, so ?next= can't become an open redirect.
  return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/dashboard'
}

function demoRefusal(): ActionResult {
  return {
    ok: false,
    message:
      'Sign-in is disabled in demo mode. Add your Supabase keys to .env.local, then restart the dev server.',
  }
}

/** Email + password sign-in. Hirers only in practice — students use Google. */
export async function signInAction(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    if (!isSupabaseConfigured) return demoRefusal()

    const email = requireText(form, 'email', { label: 'Email', max: 255 }).toLowerCase()
    const password = requireText(form, 'password', { label: 'Password', min: 6, max: 128 })
    const next = safeNext(text(form, 'next'))

    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      throw new FieldError(
        /invalid login/i.test(error.message)
          ? 'That email and password combination did not match. Check both, or sign in with Google.'
          : error.message,
        'password',
      )
    }

    redirect(next)
  })
}

/**
 * Email + password sign-up.
 *
 * Institute addresses are pushed to Google on purpose: the database will refuse
 * to give an unverified address the student role anyway, so letting someone
 * register `x@itbhu.ac.in` with a password would only produce a dead-end
 * account that can post but never claim.
 */
export async function signUpAction(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    if (!isSupabaseConfigured) return demoRefusal()

    const fullName = requireText(form, 'full_name', { label: 'Name', min: 2, max: 80 })
    const email = requireText(form, 'email', { label: 'Email', max: 255 }).toLowerCase()
    const password = requireText(form, 'password', { label: 'Password', min: 8, max: 128 })
    const next = safeNext(text(form, 'next'))
    // Optional referral code from a shared link. Only letters/digits make it in —
    // anything else falls to null, and the DB looks the code up so an unknown or
    // self-referral is ignored rather than errored.
    const ref = text(form, 'ref')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '')
      .slice(0, 16)

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      throw new FieldError('That does not look like a valid email address.', 'email')
    }

    if (isInstituteEmail(email)) {
      throw new FieldError(
        'Institute addresses must sign in with Google — that is what verifies you as a student. Use the Google button above.',
        'email',
      )
    }

    const supabase = await createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, ...(ref ? { ref } : {}) },
        emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })

    if (error) {
      throw new FieldError(
        /already registered/i.test(error.message)
          ? 'An account with that email already exists — sign in instead.'
          : error.message,
        'email',
      )
    }

    // With "Confirm email" on in Supabase there is no session yet.
    if (!data.session) {
      return {
        ok: true,
        message: `Almost there — we sent a confirmation link to ${email}. Click it, then come back and sign in.`,
      }
    }

    redirect('/onboarding')
  })
}
