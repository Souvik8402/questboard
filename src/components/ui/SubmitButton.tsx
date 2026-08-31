'use client'

import { useFormStatus } from 'react-dom'
import { Button, type ButtonSize, type ButtonVariant } from './Button'
import type { ReactNode } from 'react'

/**
 * Submit button that disables itself while its own form is in flight.
 *
 * `useFormStatus` only reads the *nearest* enclosing form, which is exactly
 * what a list of accept/reject buttons needs — one spinner, not all of them.
 */
export function SubmitButton({
  children,
  pendingLabel,
  variant,
  size,
  className,
  disabled,
  formAction,
  name,
  value,
}: {
  children: ReactNode
  pendingLabel?: string
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  disabled?: boolean
  formAction?: string
  name?: string
  value?: string
}) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={className}
      disabled={pending || disabled}
      formAction={formAction}
      name={name}
      value={value}
    >
      {pending && (
        <span className="size-3.5 animate-spin rounded-full border-2 border-current/25 border-t-current" />
      )}
      {pending ? (pendingLabel ?? children) : children}
    </Button>
  )
}
