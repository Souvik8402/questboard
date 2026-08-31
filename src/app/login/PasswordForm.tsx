'use client'

import { useActionState } from 'react'
import { signInAction, signUpAction } from './actions'
import type { ActionResult } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { Notice } from '@/components/ui/Panel'

/**
 * Email + password, for hirers. Two modes on one component so switching between
 * sign-in and sign-up doesn't cost a page load.
 */
export function PasswordForm({ mode, next }: { mode: 'signin' | 'signup'; next: string }) {
  const action = mode === 'signup' ? signUpAction : signInAction
  const [state, submit, pending] = useActionState<ActionResult | null, FormData>(action, null)

  const errorFor = (field: string) =>
    state && !state.ok && state.field === field ? state.message : undefined
  const generalError = state && !state.ok && !state.field ? state.message : undefined

  return (
    <form action={submit} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      {state?.ok && state.message && <Notice tone="success">{state.message}</Notice>}
      {generalError && <Notice tone="error">{generalError}</Notice>}

      {mode === 'signup' && (
        <Field label="Your name" required error={errorFor('full_name')} htmlFor="full_name">
          <Input
            id="full_name"
            name="full_name"
            autoComplete="name"
            placeholder="Ramesh Gupta"
            required
            maxLength={80}
          />
        </Field>
      )}

      <Field
        label="Email"
        required
        error={errorFor('email')}
        htmlFor="email"
        hint={mode === 'signup' ? 'Any email works for hiring — institute addresses use Google.' : undefined}
      >
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          maxLength={255}
        />
      </Field>

      <Field
        label="Password"
        required
        error={errorFor('password')}
        htmlFor="password"
        hint={mode === 'signup' ? 'At least 8 characters.' : undefined}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          placeholder="••••••••"
          required
          minLength={mode === 'signup' ? 8 : 6}
          maxLength={128}
        />
      </Field>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending
          ? mode === 'signup'
            ? 'Creating account…'
            : 'Signing in…'
          : mode === 'signup'
            ? 'Create hirer account'
            : 'Sign in'}
      </Button>
    </form>
  )
}
