import { createHash } from 'node:crypto'
import { FieldError } from './validate'
import type { IdKind } from './types'
import {
  isValidAadhaar,
  isValidPan,
  last4,
  normalizeAadhaar,
  normalizePan,
} from './kyc'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  The hashing half of government-ID capture.
 *
 *  Deliberately split out of `kyc.ts` (which is pure and importable in the
 *  browser) into its own module so the `node:crypto` and `process.env` code
 *  below can never be dragged into a client bundle — that was a build error
 *  before the split. This file is server-only: import it from a server action
 *  or route handler, never from a `'use client'` component.
 *
 *  THE RULE THIS FILE EXISTS TO ENFORCE: the full number never reaches the
 *  database. It is validated in memory, reduced to its last four digits plus a
 *  salted SHA-256, and then dropped. An admin reviewing the queue sees
 *  "•••• 4321" and nothing more; the hash exists only so the same ID used on two
 *  accounts can be spotted.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Salted SHA-256 of the normalised number.
 *
 * The salt lives in `KYC_SALT`, server-side only. Without it these hashes are a
 * twelve-digit space — trivially brute-forced — so an unset salt is a real
 * weakness, not a nitpick: it is refused rather than silently defaulted.
 */
export function hashId(kind: IdKind, raw: string): string {
  const salt = process.env.KYC_SALT ?? ''
  if (salt.length < 16) {
    throw new FieldError(
      'KYC_SALT is missing or too short in the environment, so an ID cannot be stored safely. ' +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    )
  }
  const normalized = kind === 'aadhaar' ? normalizeAadhaar(raw) : normalizePan(raw)
  return createHash('sha256').update(`${salt}:${kind}:${normalized}`).digest('hex')
}

/**
 * Validate a submitted ID and reduce it to the two things worth keeping.
 *
 * Callers must not hold on to `raw` afterwards — pass it straight in and let it
 * fall out of scope.
 */
export function digestId(kind: IdKind, raw: string): { last4: string; hash: string } {
  if (kind === 'pan') {
    if (!isValidPan(raw)) {
      throw new FieldError(
        'That is not a valid PAN. The format is five letters, four digits, one letter — e.g. ABCDE1234F.',
        'id_number',
      )
    }
  } else {
    const digits = normalizeAadhaar(raw)
    if (digits.length !== 12) {
      throw new FieldError(
        `An Aadhaar number has 12 digits — you entered ${digits.length}.`,
        'id_number',
      )
    }
    if (!isValidAadhaar(raw)) {
      throw new FieldError(
        'Those 12 digits fail Aadhaar’s checksum, so at least one is wrong. Check them and try again.',
        'id_number',
      )
    }
  }

  return { last4: last4(raw), hash: hashId(kind, raw) }
}
