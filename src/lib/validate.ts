import type { ActionResult } from './types'

/**
 * Small hand-rolled form validation.
 *
 * Deliberately not a schema library: the rules here are few, and the error
 * messages want to be specific and friendly. Every rule mirrors a CHECK
 * constraint in schema.sql so the database is still the final authority.
 */

export class FieldError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message)
    this.name = 'FieldError'
  }
}

export function text(form: FormData, key: string): string {
  const value = form.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

export function checkbox(form: FormData, key: string): boolean {
  const value = form.get(key)
  return value === 'on' || value === 'true' || value === '1'
}

export function requireText(
  form: FormData,
  key: string,
  opts: { label: string; min?: number; max?: number },
): string {
  const value = text(form, key)
  const { label, min = 1, max = 10_000 } = opts

  if (!value) throw new FieldError(`${label} is required.`, key)
  if (value.length < min) {
    throw new FieldError(`${label} needs at least ${min} characters — you have ${value.length}.`, key)
  }
  if (value.length > max) {
    throw new FieldError(`${label} must be under ${max} characters — you have ${value.length}.`, key)
  }
  return value
}

export function optionalText(
  form: FormData,
  key: string,
  opts: { label: string; max?: number },
): string | null {
  const value = text(form, key)
  if (!value) return null
  if (opts.max && value.length > opts.max) {
    throw new FieldError(`${opts.label} must be under ${opts.max} characters.`, key)
  }
  return value
}

export function requireInt(
  form: FormData,
  key: string,
  opts: { label: string; min?: number; max?: number },
): number {
  const raw = text(form, key).replace(/[,\s₹]/g, '')
  if (!raw) throw new FieldError(`${opts.label} is required.`, key)

  const value = Number(raw)
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new FieldError(`${opts.label} must be a whole number.`, key)
  }
  if (opts.min !== undefined && value < opts.min) {
    throw new FieldError(`${opts.label} must be at least ${opts.min}.`, key)
  }
  if (opts.max !== undefined && value > opts.max) {
    throw new FieldError(`${opts.label} cannot exceed ${opts.max}.`, key)
  }
  return value
}

export function optionalNumber(
  form: FormData,
  key: string,
  opts: { label: string; min?: number; max?: number },
): number | null {
  const raw = text(form, key)
  if (!raw) return null

  const value = Number(raw)
  if (!Number.isFinite(value)) throw new FieldError(`${opts.label} must be a number.`, key)
  if (opts.min !== undefined && value < opts.min) {
    throw new FieldError(`${opts.label} must be at least ${opts.min}.`, key)
  }
  if (opts.max !== undefined && value > opts.max) {
    throw new FieldError(`${opts.label} cannot exceed ${opts.max}.`, key)
  }
  return value
}

export function requireEnum<T extends string>(
  form: FormData,
  key: string,
  allowed: readonly T[],
  label: string,
): T {
  const value = text(form, key)
  if (!allowed.includes(value as T)) {
    throw new FieldError(`Pick a valid ${label}.`, key)
  }
  return value as T
}

/** Collapse whitespace so "98765  43210" and "98765 43210" store identically. */
export function normalizePhone(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

/**
 * Matches the CHECK constraint on gig_contacts.phone, plus a digit-count
 * sanity check so "+++++++++" is rejected.
 */
export function requirePhone(form: FormData, key: string, label = 'Phone number'): string {
  const value = normalizePhone(text(form, key))
  if (!value) throw new FieldError(`${label} is required.`, key)

  if (!/^[0-9+][0-9 ()+-]{7,19}$/.test(value)) {
    throw new FieldError(
      `${label} looks off. Use digits, spaces, +, - or brackets — e.g. +91 98765 43210.`,
      key,
    )
  }

  const digits = value.replace(/\D/g, '')
  if (digits.length < 10 || digits.length > 13) {
    throw new FieldError(`${label} should have 10 to 13 digits (found ${digits.length}).`, key)
  }
  return value
}

/** Multi-value field from a checkbox group, coerced to positive ints. */
export function intList(form: FormData, key: string, max = 50): number[] {
  const out = new Set<number>()
  for (const raw of form.getAll(key)) {
    if (typeof raw !== 'string') continue
    for (const part of raw.split(',')) {
      const n = Number(part.trim())
      if (Number.isInteger(n) && n > 0) out.add(n)
    }
  }
  return [...out].slice(0, max)
}

export function optionalDate(form: FormData, key: string, label: string): string | null {
  const raw = text(form, key)
  if (!raw) return null

  const d = new Date(raw)
  if (!Number.isFinite(d.getTime())) throw new FieldError(`${label} is not a valid date.`, key)
  if (d.getTime() < Date.now() - 86_400_000) {
    throw new FieldError(`${label} is in the past.`, key)
  }
  return d.toISOString()
}

/**
 * Wraps a Server Action body so a thrown FieldError becomes a tidy
 * `{ ok: false, message, field }` for the form to render, while genuine bugs
 * still get logged server-side.
 */
export async function runAction(fn: () => Promise<ActionResult>): Promise<ActionResult> {
  try {
    return await fn()
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

    console.error('[action]', error)
    const message = error instanceof Error ? error.message : 'Something went wrong.'
    return { ok: false, message: friendlyDbError(message) }
  }
}

/** Turn the rawest Postgres errors into something a human can act on. */
export function friendlyDbError(message: string): string {
  if (/claim gigs|institute/i.test(message)) return message
  if (/duplicate key|already exists/i.test(message)) {
    return 'You have already done that.'
  }
  if (/violates row-level security/i.test(message)) {
    return "You do not have permission to do that. If you just signed up, finish your profile first."
  }
  if (/no longer open/i.test(message)) return 'That gig is no longer open.'
  return message
}
