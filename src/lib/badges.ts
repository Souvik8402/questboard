/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Applier badges
 *
 *  Reputation you can see at a glance, earned by finishing work rather than by
 *  filling in a profile. A hirer skimming an applicant list should be able to
 *  tell a first-timer from someone who has delivered thirty times.
 *
 *  The tier names deliberately match the reward-tier CSS already in
 *  globals.css (`.tier-bronze` / `.tier-silver` / `.tier-gold`), so badges need
 *  no new styles.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type BadgeTier = 'bronze' | 'silver' | 'gold'

/** Paid mentorships that buy a gold badge outright, instead of 30 gigs. */
export const GOLD_MENTORSHIPS = 2

export const BADGE_TIERS: {
  tier: BadgeTier
  label: string
  /** Completed gigs needed. Gold has the mentorship shortcut as well. */
  gigs: number
  blurb: string
}[] = [
  { tier: 'bronze', label: 'Bronze', gigs: 4, blurb: '4 gigs delivered' },
  { tier: 'silver', label: 'Silver', gigs: 10, blurb: '10 gigs delivered' },
  {
    tier: 'gold',
    label: 'Gold',
    gigs: 30,
    blurb: `30 gigs delivered, or ${GOLD_MENTORSHIPS} paid mentorships`,
  },
]

export interface ApplierStats {
  /** Gigs where this person was the assignee and the gig reached `completed`. */
  completed: number
  /** Paid mentorships bought. Set by an admin after payment. */
  mentorships: number
  /** People who signed up on this person's referral link. */
  referrals: number
}

export const EMPTY_STATS: ApplierStats = { completed: 0, mentorships: 0, referrals: 0 }

/**
 * The highest tier earned, or null for someone just starting out.
 *
 * Gold is reachable two ways — thirty delivered gigs, or two paid mentorships —
 * so a strong newcomer who invests in coaching is not stuck behind a year of
 * volume.
 */
export function earnedBadge(stats: ApplierStats): BadgeTier | null {
  if (stats.completed >= 30 || stats.mentorships >= GOLD_MENTORSHIPS) return 'gold'
  if (stats.completed >= 10) return 'silver'
  if (stats.completed >= 4) return 'bronze'
  return null
}

/** What it takes to reach the next tier. Null once gold is held. */
export function nextBadge(
  stats: ApplierStats,
): { tier: BadgeTier; label: string; remaining: number; target: number } | null {
  if (earnedBadge(stats) === 'gold') return null
  for (const t of BADGE_TIERS) {
    if (stats.completed < t.gigs) {
      return {
        tier: t.tier,
        label: t.label,
        remaining: t.gigs - stats.completed,
        target: t.gigs,
      }
    }
  }
  return null
}

/**
 * The referral badge sits outside the tier ladder: it says something about
 * bringing people in, not about delivering work, so it is shown alongside
 * rather than instead of a tier.
 */
export const LOYALTY_BADGE = {
  label: 'Loyalty',
  blurb: 'Brought a friend onto the platform',
} as const

export function hasLoyaltyBadge(stats: ApplierStats): boolean {
  return stats.referrals >= 1
}

export function badgeMeta(tier: BadgeTier) {
  return BADGE_TIERS.find((t) => t.tier === tier)!
}
