'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { IconGoogle } from '@/components/ui/Icons'

/**
 * Google is the only sign-in that can produce a *student*, because it's the only
 * flow that proves the person owns the institute mailbox. Hirers may use it too.
 */
export function GoogleButton({
  next,
  label = 'Continue with Google',
  disabled,
}: {
  next?: string
  label?: string
  disabled?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function signIn() {
    setBusy(true)
    setError(null)
    try {
      const supabase = createClient()
      const callback = new URL('/auth/callback', window.location.origin)
      if (next) callback.searchParams.set('next', next)

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callback.toString(),
          queryParams: { prompt: 'select_account' },
        },
      })
      if (error) throw error
      // On success the browser is navigating away; keep the spinner up.
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not reach Google sign-in. Check your Supabase Google provider setup.',
      )
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        onClick={signIn}
        disabled={busy || disabled}
        variant="secondary"
        size="lg"
        className="w-full"
      >
        {busy ? (
          <>
            <Spinner />
            Redirecting to Google…
          </>
        ) : (
          <>
            <IconGoogle className="size-4.5" />
            {label}
          </>
        )}
      </Button>
      {error && <p className="text-xs leading-relaxed text-rose">{error}</p>}
    </div>
  )
}

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 animate-spin" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" fill="none" opacity="0.25" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
