/** Display formatting. All of these run on the server, so no hydration risk. */

const rupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export function formatRupees(amount: number): string {
  return rupees.format(amount)
}

/** ₹85,000 → "₹85k", ₹1,50,000 → "₹1.5L" — for tight spaces like stat tiles. */
export function compactRupees(amount: number): string {
  if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(1).replace(/\.0$/, '')}Cr`
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(1).replace(/\.0$/, '')}L`
  if (amount >= 1_000) return `₹${Math.round(amount / 1_000)}k`
  return `₹${amount}`
}

const DIVISIONS: [number, Intl.RelativeTimeFormatUnit][] = [
  [60, 'second'],
  [60, 'minute'],
  [24, 'hour'],
  [7, 'day'],
  [4.34524, 'week'],
  [12, 'month'],
  [Number.POSITIVE_INFINITY, 'year'],
]

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

/** "3 hours ago", "in 2 days" */
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return ''

  let duration = (then - Date.now()) / 1000
  for (const [amount, unit] of DIVISIONS) {
    if (Math.abs(duration) < amount) {
      return relative.format(Math.round(duration), unit)
    }
    duration /= amount
  }
  return ''
}

export interface DeadlineInfo {
  label: string
  /** Under 48 hours out — worth flagging in red. */
  urgent: boolean
  expired: boolean
}

export function deadlineInfo(iso: string | null | undefined): DeadlineInfo | null {
  if (!iso) return null
  const target = new Date(iso).getTime()
  if (!Number.isFinite(target)) return null

  const msLeft = target - Date.now()
  if (msLeft <= 0) return { label: 'Deadline passed', urgent: false, expired: true }

  const hours = msLeft / 3_600_000
  const days = Math.floor(hours / 24)

  let label: string
  if (hours < 1) label = `${Math.max(1, Math.round(msLeft / 60_000))} min left`
  else if (hours < 24) label = `${Math.round(hours)}h left`
  else if (days === 1) label = 'Tomorrow'
  else label = `${days} days left`

  return { label, urgent: hours < 48, expired: false }
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return ''
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Two-letter monogram for the avatar fallback. */
export function initials(name: string | null | undefined): string {
  if (!name) return '??'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '??'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Mask an email for display: "abhinav.cse22@itbhu.ac.in" → "abh•••@itbhu.ac.in" */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return ''
  const [local, host] = email.split('@')
  if (!host) return email
  return `${local.slice(0, 3)}•••@${host}`
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`)
}
