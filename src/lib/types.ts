/**
 * Shared domain types. These mirror `supabase/schema.sql` exactly — if you
 * change a column there, change it here.
 */

export type UserRole = 'student' | 'hirer' | 'admin'

export type QuestType =
  | 'one_time'
  | 'weekly'
  | 'monthly'
  | 'part_time'
  | 'internship'

export type QuestStatus =
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

export interface Quest {
  id: string
  hirer_id: string
  title: string
  description: string
  quest_type: QuestType
  status: QuestStatus
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

export interface QuestWithRelations extends Quest {
  hirer: PublicProfile | null
  skills: Skill[]
  application_count?: number
}

export interface Application {
  id: string
  quest_id: string
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
  quest?: QuestWithRelations
}

export interface Review {
  id: string
  quest_id: string
  reviewer_id: string
  reviewee_id: string
  rating: number
  comment: string | null
  created_at: string
  reviewer?: PublicProfile | null
}

export interface PlatformStats {
  open_quests: number
  total_quests: number
  students: number
  hirers: number
  reward_pool: number
  completed: number
}

/** Filters driving the quest board. All optional. */
export interface QuestFilters {
  q?: string
  skills?: number[]
  types?: QuestType[]
  minReward?: number
  maxReward?: number
  remoteOnly?: boolean
  sort?: QuestSort
  page?: number
}

export type QuestSort = 'recent' | 'reward_high' | 'reward_low' | 'deadline'

/** Uniform return shape for every Server Action. */
export type ActionResult =
  | { ok: true; message?: string; redirectTo?: string }
  | { ok: false; message: string; field?: string }
