import { hasServiceRole, isSupabaseConfigured } from './config'
import { DEMO_PROFILES, DEMO_QUESTS, DEMO_REVIEWS } from './demo-data'
import { createAdminClient } from './supabase/admin'
import type { PublicProfile, QuestStatus, Review, UserRole } from './types'

/**
 * Admin-only reads.
 *
 * These use the service-role client, so RLS does not apply — that is the point:
 * the admin needs to see across every user, including the one column ordinary
 * queries can never touch (`auth.users.email`).
 *
 * Nothing here is importable from a client component: `createAdminClient()`
 * throws if `window` exists.
 */

export interface AdminUser {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  department: string | null
  year: number | null
  rating: number
  rating_count: number
  is_banned: boolean
  onboarded_at: string | null
  created_at: string
  last_sign_in_at: string | null
  quests_posted: number
  applications_sent: number
}

export interface AdminQuest {
  id: string
  title: string
  status: QuestStatus
  quest_type: string
  reward_amount: number
  is_remote: boolean
  location_label: string | null
  views: number
  created_at: string
  hirer_id: string
  hirer_name: string | null
  application_count: number
}

/**
 * A review plus the person it is about. The public `Review` type only embeds the
 * reviewer, because a profile page already knows whose reviews it is showing —
 * the admin list has no such context, so it needs both sides.
 */
export interface AdminReview extends Review {
  reviewee: PublicProfile | null
}

export interface AdminStats {
  users: number
  students: number
  hirers: number
  banned: number
  quests: number
  open: number
  completed: number
  cancelled: number
  applications: number
  accepted: number
  reviews: number
  reward_pool: number
  completed_value: number
}

/** True when the admin panel can actually reach the database. */
export const adminDataAvailable = isSupabaseConfigured && hasServiceRole

// ── Demo fallbacks ──────────────────────────────────────────────────────────
// The panel is part of the pitch, so it shows the sample dataset rather than an
// error when there are no keys. Every mutation still refuses.

function demoUsers(): AdminUser[] {
  return DEMO_PROFILES.map((p, i) => {
    const slug = (p.full_name ?? 'user').toLowerCase().replace(/[^a-z]+/g, '.').slice(0, 18)
    return {
      id: p.id,
      email: p.role === 'student' ? `${slug}@itbhu.ac.in` : `${slug}@example.com`,
      full_name: p.full_name,
      avatar_url: p.avatar_url,
      role: p.role,
      department: p.department,
      year: p.year,
      rating: p.rating,
      rating_count: p.rating_count,
      is_banned: false,
      onboarded_at: new Date(Date.now() - (i + 3) * 86_400_000).toISOString(),
      created_at: new Date(Date.now() - (i + 3) * 86_400_000).toISOString(),
      last_sign_in_at: new Date(Date.now() - i * 3_600_000).toISOString(),
      quests_posted: DEMO_QUESTS.filter((q) => q.hirer_id === p.id).length,
      applications_sent: p.role === 'student' ? p.rating_count : 0,
    }
  })
}

function demoQuests(): AdminQuest[] {
  return DEMO_QUESTS.map((q) => ({
    id: q.id,
    title: q.title,
    status: q.status,
    quest_type: q.quest_type,
    reward_amount: q.reward_amount,
    is_remote: q.is_remote,
    location_label: q.location_label,
    views: q.views,
    created_at: q.created_at,
    hirer_id: q.hirer_id,
    hirer_name: q.hirer?.full_name ?? null,
    application_count: q.application_count ?? 0,
  }))
}

function demoStats(): AdminStats {
  const quests = DEMO_QUESTS
  return {
    users: DEMO_PROFILES.length,
    students: DEMO_PROFILES.filter((p) => p.role === 'student').length,
    hirers: DEMO_PROFILES.filter((p) => p.role === 'hirer').length,
    banned: 0,
    quests: quests.length,
    open: quests.filter((q) => q.status === 'open').length,
    completed: quests.filter((q) => q.status === 'completed').length,
    cancelled: quests.filter((q) => q.status === 'cancelled').length,
    applications: quests.reduce((n, q) => n + (q.application_count ?? 0), 0),
    accepted: quests.filter((q) => q.status !== 'open' && q.status !== 'cancelled').length,
    reviews: DEMO_REVIEWS.length,
    reward_pool: quests
      .filter((q) => q.status === 'open')
      .reduce((n, q) => n + q.reward_amount, 0),
    completed_value: quests
      .filter((q) => q.status === 'completed')
      .reduce((n, q) => n + q.reward_amount, 0),
  }
}

// ── Real reads ──────────────────────────────────────────────────────────────

export async function getAdminStats(): Promise<AdminStats> {
  if (!adminDataAvailable) return demoStats()

  const supabase = createAdminClient()

  const [profiles, quests, applications, reviews] = await Promise.all([
    supabase.from('profiles').select('role, is_banned'),
    supabase.from('quests').select('status, reward_amount'),
    supabase.from('applications').select('status'),
    supabase.from('reviews').select('id', { count: 'exact', head: true }),
  ])

  const p = (profiles.data ?? []) as { role: UserRole; is_banned: boolean }[]
  const q = (quests.data ?? []) as { status: QuestStatus; reward_amount: number }[]
  const a = (applications.data ?? []) as { status: string }[]

  return {
    users: p.length,
    students: p.filter((x) => x.role === 'student').length,
    hirers: p.filter((x) => x.role === 'hirer').length,
    banned: p.filter((x) => x.is_banned).length,
    quests: q.length,
    open: q.filter((x) => x.status === 'open').length,
    completed: q.filter((x) => x.status === 'completed').length,
    cancelled: q.filter((x) => x.status === 'cancelled').length,
    applications: a.length,
    accepted: a.filter((x) => x.status === 'accepted').length,
    reviews: reviews.count ?? 0,
    reward_pool: q.filter((x) => x.status === 'open').reduce((n, x) => n + x.reward_amount, 0),
    completed_value: q
      .filter((x) => x.status === 'completed')
      .reduce((n, x) => n + x.reward_amount, 0),
  }
}

interface AuthUserRow {
  id: string
  email?: string
  last_sign_in_at?: string
  created_at: string
}

export async function getAdminUsers(limit = 60): Promise<AdminUser[]> {
  if (!adminDataAvailable) return demoUsers()

  const supabase = createAdminClient()

  const [{ data: profiles }, { data: authList }, { data: questRows }, { data: appRows }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select(
          'id, full_name, avatar_url, role, department, year, rating, rating_count, is_banned, onboarded_at, created_at',
        )
        .order('created_at', { ascending: false })
        .limit(limit),
      // The only place emails are read. listUsers is paginated; one page of 200
      // is plenty for a prototype, and the join below tolerates misses.
      supabase.auth.admin.listUsers({ page: 1, perPage: 200 }),
      supabase.from('quests').select('hirer_id'),
      supabase.from('applications').select('student_id'),
    ])

  const emails = new Map<string, AuthUserRow>()
  for (const u of (authList?.users ?? []) as unknown as AuthUserRow[]) emails.set(u.id, u)

  const questCount = new Map<string, number>()
  for (const row of (questRows ?? []) as { hirer_id: string }[]) {
    questCount.set(row.hirer_id, (questCount.get(row.hirer_id) ?? 0) + 1)
  }

  const appCount = new Map<string, number>()
  for (const row of (appRows ?? []) as { student_id: string }[]) {
    appCount.set(row.student_id, (appCount.get(row.student_id) ?? 0) + 1)
  }

  type ProfileRow = Omit<
    AdminUser,
    'email' | 'last_sign_in_at' | 'quests_posted' | 'applications_sent'
  >

  return ((profiles ?? []) as unknown as ProfileRow[]).map((row) => ({
    ...row,
    email: emails.get(row.id)?.email ?? null,
    last_sign_in_at: emails.get(row.id)?.last_sign_in_at ?? null,
    quests_posted: questCount.get(row.id) ?? 0,
    applications_sent: appCount.get(row.id) ?? 0,
  }))
}

export async function getAdminQuests(limit = 60): Promise<AdminQuest[]> {
  if (!adminDataAvailable) return demoQuests()

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('quests')
    .select(
      `id, title, status, quest_type, reward_amount, is_remote, location_label, views,
       created_at, hirer_id,
       hirer:profiles!quests_hirer_id_fkey ( full_name ),
       applications ( id )`,
    )
    .order('created_at', { ascending: false })
    .limit(limit)

  type Row = Omit<AdminQuest, 'hirer_name' | 'application_count'> & {
    hirer: { full_name: string | null } | { full_name: string | null }[] | null
    applications: { id: string }[] | null
  }

  return ((data ?? []) as unknown as Row[]).map((row) => {
    const hirer = Array.isArray(row.hirer) ? row.hirer[0] : row.hirer
    return {
      ...row,
      hirer_name: hirer?.full_name ?? null,
      application_count: row.applications?.length ?? 0,
    }
  })
}

export async function getAdminReviews(limit = 20): Promise<AdminReview[]> {
  if (!adminDataAvailable) {
    return DEMO_REVIEWS.map((r) => ({
      ...r,
      reviewee: DEMO_PROFILES.find((p) => p.id === r.reviewee_id) ?? null,
    }))
  }

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('reviews')
    .select(
      `id, quest_id, reviewer_id, reviewee_id, rating, comment, created_at,
       reviewer:profiles!reviews_reviewer_id_fkey (
         id, full_name, avatar_url, role, rating, rating_count, department, year
       ),
       reviewee:profiles!reviews_reviewee_id_fkey (
         id, full_name, avatar_url, role, rating, rating_count, department, year
       )`,
    )
    .order('created_at', { ascending: false })
    .limit(limit)

  type Row = Review & {
    reviewer: PublicProfile | PublicProfile[] | null
    reviewee: PublicProfile | PublicProfile[] | null
  }
  const first = (v: PublicProfile | PublicProfile[] | null) =>
    Array.isArray(v) ? (v[0] ?? null) : v

  return ((data ?? []) as unknown as Row[]).map((row) => ({
    ...row,
    reviewer: first(row.reviewer),
    reviewee: first(row.reviewee),
  }))
}
