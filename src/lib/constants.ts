import type { GigSort, GigStatus, GigType, UserRole } from './types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  The institute gate
 *
 *  Keep this list in sync with `public.institute_domains()` in
 *  supabase/schema.sql. The database is the authority — this copy exists only
 *  so the UI can explain itself before a round trip.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const INSTITUTE_DOMAINS = ['itbhu.ac.in'] as const

export const INSTITUTE_NAME = 'IIT (BHU) Varanasi'
export const INSTITUTE_SHORT = 'IIT BHU'

/**
 * Mirrors the SQL: exact domain match, or any subdomain of it.
 * `x@itbhu.ac.in` ✓   `x@student.itbhu.ac.in` ✓   `x@notitbhu.ac.in` ✗
 */
export function isInstituteEmail(email?: string | null): boolean {
  if (!email) return false
  const host = email.trim().toLowerCase().split('@')[1]
  if (!host) return false
  return INSTITUTE_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))
}

/** IIT BHU main gate, Varanasi — the default map centre. */
export const CAMPUS_CENTER = { lat: 25.2677, lng: 82.9913 } as const
export const CAMPUS_ZOOM = 14

export const GIG_TYPES: {
  value: GigType
  label: string
  blurb: string
}[] = [
  { value: 'one_time', label: 'One-off', blurb: 'A single task with a clear finish line' },
  { value: 'weekly', label: 'Weekly', blurb: 'Recurring work, a few hours each week' },
  { value: 'monthly', label: 'Monthly', blurb: 'A month-long engagement' },
  { value: 'part_time', label: 'Part-time', blurb: 'Ongoing, fixed hours' },
  { value: 'internship', label: 'Internship', blurb: 'Structured, longer term, resume-worthy' },
]

export const GIG_TYPE_LABEL: Record<GigType, string> = Object.fromEntries(
  GIG_TYPES.map((t) => [t.value, t.label]),
) as Record<GigType, string>

export const GIG_STATUS_LABEL: Record<GigStatus, string> = {
  open: 'Open',
  assigned: 'Assigned',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

/** Same order as the `gig_status` enum in schema.sql. */
export const GIG_STATUSES = Object.keys(GIG_STATUS_LABEL) as GigStatus[]

export const ROLE_LABEL: Record<UserRole, string> = {
  student: 'Student',
  hirer: 'Hirer',
  admin: 'Admin',
}

export const SORT_OPTIONS: { value: GigSort; label: string }[] = [
  { value: 'recent', label: 'Newest first' },
  { value: 'reward_high', label: 'Highest reward' },
  { value: 'reward_low', label: 'Lowest reward' },
  { value: 'deadline', label: 'Closing soonest' },
]

export const GIGS_PER_PAGE = 12

/**
 * Reward tiers drive the colour of the ring on a gig card — a quick visual
 * read of "how big is this job".
 */
export const REWARD_TIERS = [
  { min: 0, label: 'Bronze', tier: 'bronze' as const },
  { min: 1000, label: 'Silver', tier: 'silver' as const },
  { min: 5000, label: 'Gold', tier: 'gold' as const },
  { min: 15000, label: 'Legendary', tier: 'legendary' as const },
]

export type RewardTier = (typeof REWARD_TIERS)[number]['tier']

export function rewardTier(amount: number): RewardTier {
  let out: RewardTier = 'bronze'
  for (const t of REWARD_TIERS) if (amount >= t.min) out = t.tier
  return out
}

export const DEPARTMENTS = [
  'Ceramic Engineering',
  'Chemical Engineering',
  'Civil Engineering',
  'Computer Science & Engineering',
  'Electrical Engineering',
  'Electronics Engineering',
  'Mechanical Engineering',
  'Metallurgical Engineering',
  'Mining Engineering',
  'Pharmaceutical Engineering',
  'Architecture, Planning & Design',
  'Biochemical Engineering',
  'Biomedical Engineering',
  'Materials Science',
  'Mathematics & Computing',
  'Engineering Physics',
  'Chemistry',
  'Physics',
  'Mathematical Sciences',
  'Humanities & Social Sciences',
  'Other',
]
