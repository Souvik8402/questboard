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

/**
 * Note the absence of `email`. The profiles table is publicly readable, so it
 * holds no contact details at all — see the comment in schema.sql.
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
  created_at: string
  updated_at: string
}

/** The subset of a profile safe (and useful) to show on a card. */
export type PublicProfile = Pick<
  Profile,
  'id' | 'full_name' | 'avatar_url' | 'role' | 'rating' | 'rating_count' | 'department' | 'year'
>

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
  /** Non-null only when RLS let us read it — i.e. own row, or accepted. */
  phone: string | null
  student_skills?: Skill[]
  gig?: GigWithRelations
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
  sort?: GigSort
  page?: number
}

export type GigSort = 'recent' | 'reward_high' | 'reward_low' | 'deadline'

/** Uniform return shape for every Server Action. */
export type ActionResult =
  | { ok: true; message?: string; redirectTo?: string }
  | { ok: false; message: string; field?: string }
