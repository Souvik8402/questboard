'use client'

import { useActionState } from 'react'
import type { ActionResult } from '@/lib/types'
import { Field, Input } from '@/components/ui/Field'
import { Notice } from '@/components/ui/Panel'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { adminLogin } from '../actions'

export function AdminLoginForm({ next }: { next: string }) {
  const [result, action] = useActionState<ActionResult | null, FormData>(adminLogin, null)

  const fieldError = result && !result.ok && result.field === 'password' ? result.message : undefined
  const generalError = result && !result.ok && !result.field ? result.message : undefined

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <Field
        label="Admin password"
        htmlFor="password"
        required
        error={fieldError}
        hint="Set as ADMIN_PASSWORD in .env.local. Attempts are deliberately slow."
      >
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          placeholder="••••••••••••"
        />
      </Field>

      {generalError && <Notice tone="error">{generalError}</Notice>}

      <SubmitButton className="w-full" pendingLabel="Checking…">
        Unlock panel
      </SubmitButton>
    </form>
  )
}
