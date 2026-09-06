import type { IdKind } from './types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Government ID capture — PAN and Aadhaar
 *
 *  THE RULE THIS FILE EXISTS TO ENFORCE: the full number never reaches the
 *  database. It is validated in memory, reduced to its last four digits plus a
 *  salted SHA-256, and then dropped. An admin reviewing the queue sees
 *  "•••• 4321" and nothing more; the hash exists only so the same ID used on two
 *  accounts can be spotted.
 *
 *  What that buys and what it does not:
 *
 *    ✓  a real format/checksum check, so typos and made-up numbers bounce
 *    ✓  a reviewable audit trail with almost nothing worth stealing in it
 *    ✗  proof the number belongs to the person who typed it
 *
 *  Only UIDAI-authorised routes prove ownership. README → "Verifying a hirer
 *  with PAN and Aadhaar" spells out how to add one.
 *
 *  This module is pure and safe to import in the browser. The salted-hash half
 *  lives in `kyc-hash.ts` because it needs `node:crypto` and `process.env`.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Five letters, four digits, one letter — e.g. ABCDE1234F. */
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/

export function normalizePan(raw: string): string {
  return raw.replace(/[\s-]/g, '').toUpperCase()
}

export function isValidPan(raw: string): boolean {
  return PAN_RE.test(normalizePan(raw))
}

/**
 * The fourth character of a PAN encodes the holder type. 'P' is an individual;
 * a hirer posting as a business will legitimately have 'C', 'F', 'H' or 'T'.
 * Informational only — we do not reject on it.
 */
export function panHolderType(raw: string): string | null {
  const pan = normalizePan(raw)
  if (!PAN_RE.test(pan)) return null
  return (
    {
      P: 'Individual',
      C: 'Company',
      H: 'Hindu Undivided Family',
      F: 'Partnership firm',
      A: 'Association of persons',
      T: 'Trust',
      B: 'Body of individuals',
      L: 'Local authority',
      J: 'Artificial juridical person',
      G: 'Government',
    }[pan[3]] ?? null
  )
}

export function normalizeAadhaar(raw: string): string {
  return raw.replace(/\D/g, '')
}

/*
 * Verhoeff checksum — the scheme UIDAI uses for the twelfth digit of an Aadhaar
 * number. It catches every single-digit error and every adjacent transposition,
 * which is exactly the class of mistake someone typing twelve digits makes.
 * The three tables below are the standard dihedral-group-of-order-10 ones.
 */
const D_TABLE = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
]

const P_TABLE = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
]

function verhoeffValid(digits: string): boolean {
  let c = 0
  const reversed = digits.split('').reverse()
  for (let i = 0; i < reversed.length; i++) {
    c = D_TABLE[c][P_TABLE[i % 8][Number(reversed[i])]]
  }
  return c === 0
}

export function isValidAadhaar(raw: string): boolean {
  const digits = normalizeAadhaar(raw)
  if (digits.length !== 12) return false
  // UIDAI never issues a number starting 0 or 1, which rules out 000000000000
  // and other sequences that happen to satisfy the checksum.
  if (digits[0] === '0' || digits[0] === '1') return false
  return verhoeffValid(digits)
}

// ── What we keep ────────────────────────────────────────────────────────────

export function last4(raw: string): string {
  const cleaned = raw.replace(/[\s-]/g, '')
  return cleaned.slice(-4)
}

/** "•••• •••• 4321" for Aadhaar, "••••••4321" for a PAN. */
export function maskId(kind: IdKind, tail: string): string {
  return kind === 'aadhaar' ? `•••• •••• ${tail}` : `••••••${tail}`
}
