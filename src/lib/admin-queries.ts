import { hasServiceRole, isSupabaseConfigured } from './config'
import {
  DEMO_DISPUTES,
  DEMO_GIGS,
  DEMO_PROFILES,
  DEMO_REVIEWS,
  DEMO_VERIFICATIONS,
  DEMO_WAIVERS,
} from './demo-data'
import { createAdminClient } from './supabase/admin'
import type {
  Dispute,
  FeeWaiverStatus,
  GigStatus,
  GigWithRelations,
  PublicProfile,
  Review,
  UserRole,
  Verification,
} from './types'

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
  gigs_posted: number
  applications_sent: number
}

export interface AdminGig {
  id: string
  title: string
  status: GigStatus
  gig_type: string
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
  gigs: number
  open: number
  completed: number
  cancelled: number
  applications: number
  accepted: number
  reviews: number
  reward_pool: number
  completed_value: number
  /** Work sitting in a queue: pending waivers, pending IDs, open disputes. */
  waivers_pending: number
  ids_pending: number
  disputes_open: number
}

/**
 * A submitted ID plus who submitted it, and the email the account signed up with.
 *
 * The email is the whole reason this queue needs the service-role client: matching
 * "ANAND KUMAR SETH" on a PAN to an account is guesswork without it, and no
 * ordinary query can read `auth.users.email`.
 *
 * What is deliberately *not* here: the ID number. It was never stored — see
 * src/lib/kyc.ts. An admin sees the name, the type, and four digits, which is
 * enough to compare against a card held up on a video call and not enough to be
 * worth stealing.
 */
export interface AdminVerification extends Verification {
  profile: PublicProfile | null
  email: string | null
}

/** One row of the fee-waiver queue (item 2). */
export interface AdminWaiver {
  profile: PublicProfile | null
  /** Checked by eye against the institute domain — that is what the waiver is for. */
  email: string | null
  status: FeeWaiverStatus
  /** The applicant's own words: course, year, roll number. */
  request: string | null
  /** The reviewer's reply, once there is one. */
  note: string | null
  requested_at: string | null
  decided_at: string | null
}

export interface AdminDispute extends Dispute {
  gig: GigWithRelations | null
  raiser: PublicProfile | null
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
      gigs_posted: DEMO_GIGS.filter((q) => q.hirer_id === p.id).length,
      applications_sent: p.role === 'student' ? p.rating_count : 0,
    }
  })
}

function demoGigs(): AdminGig[] {
  return DEMO_GIGS.map((q) => ({
    id: q.id,
    title: q.title,
    status: q.status,
    gig_type: q.gig_type,
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
  const gigs = DEMO_GIGS
  return {
    users: DEMO_PROFILES.length,
    students: DEMO_PROFILES.filter((p) => p.role === 'student').length,
    hirers: DEMO_PROFILES.filter((p) => p.role === 'hirer').length,
    banned: 0,
    gigs: gigs.length,
    open: gigs.filter((q) => q.status === 'open').length,
    completed: gigs.filter((q) => q.status === 'completed').length,
    cancelled: gigs.filter((q) => q.status === 'cancelled').length,
    applications: gigs.reduce((n, q) => n + (q.application_count ?? 0), 0),
    accepted: gigs.filter((q) => q.status !== 'open' && q.status !== 'cancelled').length,
    reviews: DEMO_REVIEWS.length,
    reward_pool: gigs
      .filter((q) => q.status === 'open')
      .reduce((n, q) => n + q.reward_amount, 0),
    completed_value: gigs
      .filter((q) => q.status === 'completed')
      .reduce((n, q) => n + q.reward_amount, 0),
    waivers_pending: DEMO_WAIVERS.filter((w) => w.status === 'pending').length,
    ids_pending: DEMO_VERIFICATIONS.filter((v) => v.status === 'pending').length,
    disputes_open: DEMO_DISPUTES.filter((d) => d.status === 'open').length,
  }
}

// ── Real reads ──────────────────────────────────────────────────────────────

export async function getAdminStats(): Promise<AdminStats> {
  if (!adminDataAvailable) return demoStats()

  const supabase = createAdminClient()

  const [profiles, gigs, applications, reviews, waivers, ids, disputes] = await Promise.all([
    supabase.from('profiles').select('role, is_banned'),
    supabase.from('gigs').select('status, reward_amount'),
    supabase.from('applications').select('status'),
    supabase.from('reviews').select('id', { count: 'exact', head: true }),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('fee_waiver_status', 'pending'),
    supabase
      .from('id_verifications')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase.from('disputes').select('id', { count: 'exact', head: true }).eq('status', 'open'),
  ])

  const p = (profiles.data ?? []) as { role: UserRole; is_banned: boolean }[]
  const q = (gigs.data ?? []) as { status: GigStatus; reward_amount: number }[]
  const a = (applications.data ?? []) as { status: string }[]

  return {
    users: p.length,
    students: p.filter((x) => x.role === 'student').length,
    hirers: p.filter((x) => x.role === 'hirer').length,
    banned: p.filter((x) => x.is_banned).length,
    gigs: q.length,
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
    waivers_pending: waivers.count ?? 0,
    ids_pending: ids.count ?? 0,
    disputes_open: disputes.count ?? 0,
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

  const [{ data: profiles }, { data: authList }, { data: gigRows }, { data: appRows }] =
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
      supabase.from('gigs').select('hirer_id'),
      supabase.from('applications').select('student_id'),
    ])

  const emails = new Map<string, AuthUserRow>()
  for (const u of (authList?.users ?? []) as unknown as AuthUserRow[]) emails.set(u.id, u)

  const gigCount = new Map<string, number>()
  for (const row of (gigRows ?? []) as { hirer_id: string }[]) {
    gigCount.set(row.hirer_id, (gigCount.get(row.hirer_id) ?? 0) + 1)
  }

  const appCount = new Map<string, number>()
  for (const row of (appRows ?? []) as { student_id: string }[]) {
    appCount.set(row.student_id, (appCount.get(row.student_id) ?? 0) + 1)
  }

  type ProfileRow = Omit<
    AdminUser,
    'email' | 'last_sign_in_at' | 'gigs_posted' | 'applications_sent'
  >

  return ((profiles ?? []) as unknown as ProfileRow[]).map((row) => ({
    ...row,
    email: emails.get(row.id)?.email ?? null,
    last_sign_in_at: emails.get(row.id)?.last_sign_in_at ?? null,
    gigs_posted: gigCount.get(row.id) ?? 0,
    applications_sent: appCount.get(row.id) ?? 0,
  }))
}

export async function getAdminGigs(limit = 60): Promise<AdminGig[]> {
  if (!adminDataAvailable) return demoGigs()

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('gigs')
    .select(
      `id, title, status, gig_type, reward_amount, is_remote, location_label, views,
       created_at, hirer_id,
       hirer:profiles!gigs_hirer_id_fkey ( full_name ),
       applications ( id )`,
    )
    .order('created_at', { ascending: false })
    .limit(limit)

  type Row = Omit<AdminGig, 'hirer_name' | 'application_count'> & {
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
      `id, gig_id, reviewer_id, reviewee_id, rating, comment, created_at,
       reviewer:profiles!reviews_reviewer_id_fkey (
         id, full_name, avatar_url, role, rating, rating_count, department, year,
         id_verified_at
       ),
       reviewee:profiles!reviews_reviewee_id_fkey (
         id, full_name, avatar_url, role, rating, rating_count, department, year,
         id_verified_at
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

// ── Queues (items 2, 4, 8) ──────────────────────────────────────────────────
/*
 * Three lists of things waiting on a human. They share a shape on purpose: an
 * account, some evidence, and two buttons. The mutations that act on them live in
 * src/app/admin/actions.ts.
 */

/**
 * `auth.users.email` for a set of profile ids.
 *
 * One `listUsers` page of 200 covers a prototype, and every caller tolerates a
 * miss — a row with an unknown email still renders, it just shows an em dash. The
 * alternative, a query per row, would be 20 round trips to save nothing.
 */
async function emailsFor(ids: string[]): Promise<Map<string, string | null>> {
  const wanted = new Set(ids)
  const supabase = createAdminClient()
  const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 })

  const out = new Map<string, string | null>()
  for (const u of (data?.users ?? []) as unknown as AuthUserRow[]) {
    if (wanted.has(u.id)) out.set(u.id, u.email ?? null)
  }
  return out
}

export async function getAdminVerifications(limit = 40): Promise<AdminVerification[]> {
  if (!adminDataAvailable) {
    return DEMO_VERIFICATIONS.map((v) => ({
      ...v,
      email:
        v.profile.role === 'student'
          ? `${(v.profile.full_name ?? 'user').toLowerCase().replace(/[^a-z]+/g, '.')}@itbhu.ac.in`
          : `${(v.profile.full_name ?? 'user').toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`,
    }))
  }

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('id_verifications')
    .select(
      `id, profile_id, kind, name_on_id, last4, status, note, created_at, decided_at,
       profile:profiles!id_verifications_profile_id_fkey (
         id, full_name, avatar_url, role, rating, rating_count, department, year,
         id_verified_at
       )`,
    )
    // Pending first, then most recent — the queue is the point of the screen.
    .order('status', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(limit)

  type Row = Verification & { profile: PublicProfile | PublicProfile[] | null }
  const rows = (data ?? []) as unknown as Row[]
  const emails = await emailsFor(rows.map((r) => r.profile_id))

  return rows
    .map((row) => ({
      ...row,
      profile: Array.isArray(row.profile) ? (row.profile[0] ?? null) : row.profile,
      email: emails.get(row.profile_id) ?? null,
    }))
    .sort((a, b) => rank(a.status) - rank(b.status))
}

/** Pending before decided, so the queue sorts itself however Postgres ordered it. */
function rank(status: string): number {
  return status === 'pending' || status === 'open' ? 0 : 1
}

export async function getAdminWaivers(limit = 40): Promise<AdminWaiver[]> {
  if (!adminDataAvailable) {
    return DEMO_WAIVERS.map((w) => ({
      profile: w.profile,
      email: w.email,
      status: w.status,
      request: 'B.Tech, third year. Happy to bring my ID card to the desk if that is easier.',
      note: w.note,
      requested_at: w.requested_at,
      decided_at: w.status === 'pending' ? null : w.requested_at,
    })).sort((a, b) => rank(a.status) - rank(b.status))
  }

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('profiles')
    .select(
      `id, full_name, avatar_url, role, rating, rating_count, department, year, id_verified_at,
       fee_waiver_status, fee_waiver_request, fee_waiver_note, fee_waiver_decided_at, updated_at`,
    )
    .neq('fee_waiver_status', 'none')
    .order('fee_waiver_decided_at', { ascending: false, nullsFirst: true })
    .limit(limit)

  type Row = PublicProfile & {
    fee_waiver_status: FeeWaiverStatus
    fee_waiver_request: string | null
    fee_waiver_note: string | null
    fee_waiver_decided_at: string | null
    updated_at: string
  }
  const rows = (data ?? []) as unknown as Row[]
  const emails = await emailsFor(rows.map((r) => r.id))

  return rows
    .map((row) => ({
      profile: row,
      email: emails.get(row.id) ?? null,
      status: row.fee_waiver_status,
      request: row.fee_waiver_request,
      note: row.fee_waiver_note,
      // There is no `fee_waiver_requested_at` column; `updated_at` is the closest
      // honest answer and it is only ever used as a rough "how long has this sat
      // here" hint.
      requested_at: row.updated_at,
      decided_at: row.fee_waiver_decided_at,
    }))
    .sort((a, b) => rank(a.status) - rank(b.status))
}

export async function getAdminDisputes(limit = 40): Promise<AdminDispute[]> {
  if (!adminDataAvailable) {
    return [...DEMO_DISPUTES].sort((a, b) => rank(a.status) - rank(b.status))
  }

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('disputes')
    .select(
      `id, gig_id, raised_by, reason, detail, status, resolution, created_at, resolved_at,
       gig:gigs!disputes_gig_id_fkey (
         id, hirer_id, title, description, gig_type, status, reward_amount,
         estimated_hours, deadline, is_remote, location_label, lat, lng,
         assigned_to, views, is_flagged, is_urgent, created_at, updated_at
       ),
       raiser:profiles!disputes_raised_by_fkey (
         id, full_name, avatar_url, role, rating, rating_count, department, year,
         id_verified_at
       )`,
    )
    .order('created_at', { ascending: false })
    .limit(limit)

  type Row = Dispute & {
    gig: Omit<GigWithRelations, 'hirer' | 'skills'> | Omit<GigWithRelations, 'hirer' | 'skills'>[] | null
    raiser: PublicProfile | PublicProfile[] | null
  }

  return ((data ?? []) as unknown as Row[])
    .map((row) => {
      const gig = Array.isArray(row.gig) ? (row.gig[0] ?? null) : row.gig
      return {
        ...row,
        // The admin list shows a title and a reward, not tags or the hirer card,
        // so the embed skips both joins and they are filled in as empty here.
        gig: gig ? { ...gig, hirer: null, skills: [] } : null,
        raiser: Array.isArray(row.raiser) ? (row.raiser[0] ?? null) : row.raiser,
      }
    })
    .sort((a, b) => rank(a.status) - rank(b.status))
}
