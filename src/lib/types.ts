/**
 * Shared domain types. These mirror `supabase/schema.sql` exactly — if you
 * change a column there, change it here.
 */

export type UserRole = 'student' | 'hirer' | 'admin'

export type GigType =
  | 'one_time'
  | 'weekly'
  | 'monthly'
  | 'part_time'
  | 'internship'

export type GigStatus =
  | 'open'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn'

/** Where an account is in the student fee-waiver queue. */
export type FeeWaiverStatus = 'none' | 'pending' | 'approved' | 'rejected'

/** The two government IDs the verification flow accepts. */
export type IdKind = 'pan' | 'aadhaar'

export type VerificationStatus = 'pending' | 'approved' | 'rejected'

export type DisputeStatus = 'open' | 'resolved' | 'rejected'

/**
 * Note the absence of `email` and of any phone number. The profiles table is
 * publicly readable, so it holds no contact details at all — see the comment in
 * schema.sql.
 */
export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  department: string | null
  year: number | null
  bio: string | null
  rating: number
  rating_count: number
  is_banned: boolean
  /** Null until the user finishes /onboarding and picks a role. */
  onboarded_at: string | null
  /** The student fee waiver: requested by the user, decided by an admin. */
  fee_waiver_status: FeeWaiverStatus
  fee_waiver_note: string | null
  fee_waiver_decided_at: string | null
  /** Set by an admin once a government ID has been reviewed and accepted. */
  id_verified_at: string | null
  /** Paid mentorships bought — one of the two routes to a gold badge. */
  mentorships: number
  /** Short code the owner shares; `referred_by` is who brought them in. */
  referral_code: string | null
  referred_by: string | null
  /**
   * The private verification link. Rotating this invalidates any link already
   * sent, which is how a hirer "edits" it.
   *
   * Optional because ordinary profile reads do not include it: SELECT on the
   * column is revoked in schema.sql, so it comes back only from
   * `getMyVerifyToken()`. Treat it as absent everywhere else.
   */
  verify_token?: string | null
  created_at: string
  updated_at: string
}

/** The subset of a profile safe (and useful) to show on a card. */
export type PublicProfile = Pick<
  Profile,
  | 'id'
  | 'full_name'
  | 'avatar_url'
  | 'role'
  | 'rating'
  | 'rating_count'
  | 'department'
  | 'year'
  | 'id_verified_at'
> & {
  /**
   * Only present on a profile the signed-in user owns (shown as a share link) or
   * in demo data. Fetching someone else's profile deliberately omits it.
   */
  referral_code?: string | null
}

export interface Skill {
  id: number
  slug: string
  name: string
  category: string
}

export interface Gig {
  id: string
  hirer_id: string
  title: string
  description: string
  gig_type: GigType
  status: GigStatus
  reward_amount: number
  estimated_hours: number | null
  deadline: string | null
  is_remote: boolean
  location_label: string | null
  lat: number | null
  lng: number | null
  assigned_to: string | null
  views: number
  is_flagged: boolean
  /**
   * Urgent gigs are reviewed first-come-first-served: the hirer only ever sees
   * the earliest applicant still waiting, and passing surfaces the next one.
   */
  is_urgent: boolean
  created_at: string
  updated_at: string
}

export interface GigWithRelations extends Gig {
  hirer: PublicProfile | null
  skills: Skill[]
  application_count?: number
}

export interface Application {
  id: string
  gig_id: string
  student_id: string
  cover_note: string
  status: ApplicationStatus
  created_at: string
}

export interface ApplicationWithRelations extends Application {
  student: PublicProfile | null
  student_skills?: Skill[]
  gig?: GigWithRelations
}

/**
 * One line in a gig thread. Threads open when someone is hired — before that
 * there is nothing to talk about and nobody to talk to.
 */
export interface Message {
  id: string
  gig_id: string
  sender_id: string
  body: string
  created_at: string
  read_at: string | null
}

export interface MessageWithSender extends Message {
  sender: PublicProfile | null
}

/** A gig thread as the inbox list shows it. */
export interface Thread {
  gig: GigWithRelations
  /** The other person in the thread, from the viewer's point of view. */
  counterparty: PublicProfile | null
  last_message: Message | null
  unread: number
}

export interface Dispute {
  id: string
  gig_id: string
  raised_by: string
  reason: string
  detail: string
  status: DisputeStatus
  resolution: string | null
  created_at: string
  resolved_at: string | null
}

/**
 * A submitted government ID. `last4` and `id_hash` are all we keep — the full
 * number is validated and then discarded, never stored. See src/lib/kyc.ts.
 */
export interface Verification {
  id: string
  profile_id: string
  kind: IdKind
  name_on_id: string
  last4: string
  status: VerificationStatus
  note: string | null
  created_at: string
  decided_at: string | null
}

export interface Review {
  id: string
  gig_id: string
  reviewer_id: string
  reviewee_id: string
  rating: number
  comment: string | null
  created_at: string
  reviewer?: PublicProfile | null
}

export interface PlatformStats {
  open_gigs: number
  total_gigs: number
  students: number
  hirers: number
  reward_pool: number
  completed: number
}

/** Filters driving the gig board. All optional. */
export interface GigFilters {
  q?: string
  skills?: number[]
  types?: GigType[]
  minReward?: number
  maxReward?: number
  remoteOnly?: boolean
  /** Only gigs on the first-come-first-served queue. */
  urgentOnly?: boolean
  sort?: GigSort
  page?: number
}

export type GigSort = 'recent' | 'reward_high' | 'reward_low' | 'deadline'

/** Uniform return shape for every Server Action. */
export type ActionResult =
  | { ok: true; message?: string; redirectTo?: string }
  | { ok: false; message: string; field?: string }
