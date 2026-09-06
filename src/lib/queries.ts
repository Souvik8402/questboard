import { GIGS_PER_PAGE } from './constants'
import { isSupabaseConfigured } from './config'
import type { ApplierStats } from './badges'
import {
  DEMO_GIGS,
  DEMO_ME,
  DEMO_REVIEWS,
  DEMO_SKILLS,
  DEMO_STATS,
  DEMO_VERIFY_TOKEN,
  demoApplicantsFor,
  demoApplicationsFor,
  demoApplierStats,
  demoDisputesFor,
  demoProfileById,
  demoGigById,
  demoGigsAssignedTo,
  demoGigsPostedBy,
  demoReferralCount,
  demoSuggestedAppliers,
  demoThreadMessages,
  demoThreads,
  demoVerificationsFor,
} from './demo-data'
import { createClient } from './supabase/server'
import type {
  Application,
  ApplicationWithRelations,
  Dispute,
  Message,
  MessageWithSender,
  PlatformStats,
  PublicProfile,
  Gig,
  GigFilters,
  GigWithRelations,
  Review,
  Skill,
  Thread,
  Verification,
} from './types'

/**
 * Every read the app performs, in one place.
 *
 * Each function checks `isSupabaseConfigured` and falls back to the demo
 * dataset, so pages never have to care which mode they're in.
 */

const GIG_SELECT = `
  id, hirer_id, title, description, gig_type, status, reward_amount,
  estimated_hours, deadline, is_remote, location_label, lat, lng,
  assigned_to, views, is_flagged, is_urgent, application_count,
  created_at, updated_at,
  hirer:profiles!gigs_hirer_id_fkey (
    id, full_name, avatar_url, role, rating, rating_count, department, year,
    id_verified_at
  ),
  gig_skills ( skill:skills ( id, slug, name, category ) )
`

/** Shape PostgREST actually hands back for GIG_SELECT. */
interface RawGig extends Gig {
  application_count: number
  hirer: PublicProfile | PublicProfile[] | null
  gig_skills: { skill: Skill | null }[] | null
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function normalizeGig(row: RawGig): GigWithRelations {
  const { gig_skills, hirer, ...gig } = row
  return {
    ...gig,
    hirer: one(hirer),
    skills: (gig_skills ?? [])
      .map((qs) => qs.skill)
      .filter((s): s is Skill => Boolean(s))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }
}

// ── Skills ──────────────────────────────────────────────────────────────────

export async function getSkills(): Promise<Skill[]> {
  if (!isSupabaseConfigured) return DEMO_SKILLS

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('skills')
    .select('id, slug, name, category')
    .order('category')
    .order('name')

  if (error || !data) return DEMO_SKILLS
  return data as Skill[]
}

/** Skills grouped by category, for the tag picker. */
export async function getSkillsByCategory(): Promise<[string, Skill[]][]> {
  const skills = await getSkills()
  const groups = new Map<string, Skill[]>()
  for (const skill of skills) {
    const list = groups.get(skill.category) ?? []
    list.push(skill)
    groups.set(skill.category, list)
  }
  return [...groups.entries()]
}

// ── Stats ───────────────────────────────────────────────────────────────────

export async function getPlatformStats(): Promise<PlatformStats> {
  if (!isSupabaseConfigured) return DEMO_STATS

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('platform_stats')
    if (error || !data) return DEMO_STATS
    return data as PlatformStats
  } catch {
    return DEMO_STATS
  }
}

// ── Gig board ─────────────────────────────────────────────────────────────

export interface GigPage {
  gigs: GigWithRelations[]
  total: number
  page: number
  pageCount: number
}

export async function getGigs(filters: GigFilters = {}): Promise<GigPage> {
  const page = Math.max(1, filters.page ?? 1)

  if (!isSupabaseConfigured) return demoGigPage(filters, page)

  const supabase = await createClient()

  let query = supabase
    .from('gigs')
    .select(GIG_SELECT, { count: 'exact' })
    .eq('status', 'open')
    .eq('is_flagged', false)

  // Skill filter runs as a separate lookup rather than an inner join: joining
  // with `gig_skills!inner` would prune the embedded skill list down to just
  // the matched tags, and the cards need to show all of them.
  if (filters.skills?.length) {
    const { data: matches } = await supabase
      .from('gig_skills')
      .select('gig_id')
      .in('skill_id', filters.skills)
      .limit(1000)

    const ids = [...new Set((matches ?? []).map((m) => m.gig_id as string))]
    if (ids.length === 0) return { gigs: [], total: 0, page: 1, pageCount: 0 }
    query = query.in('id', ids)
  }

  if (filters.q) {
    query = query.textSearch('search_tsv', filters.q, {
      type: 'websearch',
      config: 'english',
    })
  }
  if (filters.types?.length) query = query.in('gig_type', filters.types)
  if (filters.minReward !== undefined) query = query.gte('reward_amount', filters.minReward)
  if (filters.maxReward !== undefined) query = query.lte('reward_amount', filters.maxReward)
  if (filters.remoteOnly) query = query.eq('is_remote', true)
  if (filters.urgentOnly) query = query.eq('is_urgent', true)

  switch (filters.sort) {
    case 'reward_high':
      query = query.order('reward_amount', { ascending: false })
      break
    case 'reward_low':
      query = query.order('reward_amount', { ascending: true })
      break
    case 'deadline':
      query = query.order('deadline', { ascending: true, nullsFirst: false })
      break
    default:
      query = query.order('created_at', { ascending: false })
  }

  const from = (page - 1) * GIGS_PER_PAGE
  const { data, count, error } = await query.range(from, from + GIGS_PER_PAGE - 1)

  if (error) {
    console.error('[getGigs]', error.message)
    return { gigs: [], total: 0, page, pageCount: 0 }
  }

  const total = count ?? 0
  return {
    gigs: (data as unknown as RawGig[]).map(normalizeGig),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / GIGS_PER_PAGE)),
  }
}

/** Same filters as the live query, applied in JS over the demo dataset. */
function demoGigPage(filters: GigFilters, page: number): GigPage {
  let list = DEMO_GIGS.filter((q) => q.status === 'open' && !q.is_flagged)

  if (filters.q) {
    const needle = filters.q.toLowerCase()
    const words = needle.split(/\s+/).filter(Boolean)
    list = list.filter((q) => {
      const haystack = `${q.title} ${q.description} ${q.location_label ?? ''} ${q.skills
        .map((s) => s.name)
        .join(' ')}`.toLowerCase()
      return words.every((w) => haystack.includes(w))
    })
  }
  if (filters.skills?.length) {
    const wanted = new Set(filters.skills)
    list = list.filter((q) => q.skills.some((s) => wanted.has(s.id)))
  }
  if (filters.types?.length) {
    const wanted = new Set(filters.types)
    list = list.filter((q) => wanted.has(q.gig_type))
  }
  if (filters.minReward !== undefined) {
    list = list.filter((q) => q.reward_amount >= filters.minReward!)
  }
  if (filters.maxReward !== undefined) {
    list = list.filter((q) => q.reward_amount <= filters.maxReward!)
  }
  if (filters.remoteOnly) list = list.filter((q) => q.is_remote)
  if (filters.urgentOnly) list = list.filter((q) => q.is_urgent)

  const sorted = [...list]
  switch (filters.sort) {
    case 'reward_high':
      sorted.sort((a, b) => b.reward_amount - a.reward_amount)
      break
    case 'reward_low':
      sorted.sort((a, b) => a.reward_amount - b.reward_amount)
      break
    case 'deadline':
      sorted.sort((a, b) => {
        if (!a.deadline) return 1
        if (!b.deadline) return -1
        return a.deadline.localeCompare(b.deadline)
      })
      break
    default:
      sorted.sort((a, b) => b.created_at.localeCompare(a.created_at))
  }

  const from = (page - 1) * GIGS_PER_PAGE
  return {
    gigs: sorted.slice(from, from + GIGS_PER_PAGE),
    total: sorted.length,
    page,
    pageCount: Math.max(1, Math.ceil(sorted.length / GIGS_PER_PAGE)),
  }
}

/** Every open gig that has coordinates — used by the map view. */
export async function getMappableGigs(
  filters: GigFilters = {},
): Promise<GigWithRelations[]> {
  const { gigs } = await getGigs({ ...filters, page: 1 })
  return gigs.filter((q) => q.lat !== null && q.lng !== null)
}

// ── Single gig ────────────────────────────────────────────────────────────

export async function getGig(id: string): Promise<GigWithRelations | null> {
  if (!isSupabaseConfigured) return demoGigById(id)

  const supabase = await createClient()
  const { data, error } = await supabase.from('gigs').select(GIG_SELECT).eq('id', id).maybeSingle()

  if (error || !data) return null
  return normalizeGig(data as unknown as RawGig)
}

// ── Applications ────────────────────────────────────────────────────────────
/*
 * `getGigContact()` used to live here, handing a phone number to the hirer and
 * the person they hired. It is gone: nobody sees a phone number or an email on
 * this platform any more, either side. The two sides talk in `messages`, which
 * opens on assignment — see getThread() below.
 */

const APPLICATION_SELECT = `
  id, gig_id, student_id, cover_note, status, created_at,
  student:profiles!applications_student_id_fkey (
    id, full_name, avatar_url, role, rating, rating_count, department, year,
    id_verified_at
  )
`

interface RawApplication extends Application {
  student: PublicProfile | PublicProfile[] | null
}

function normalizeApplication(row: RawApplication): ApplicationWithRelations {
  const { student, ...application } = row
  return { ...application, student: one(student) }
}

/**
 * Applicants for a gig. RLS means only the gig owner gets rows back.
 *
 * Ordered oldest-first, which is what the urgent first-come-first-served queue
 * in ApplicantList needs; the ordinary list reverses it for display.
 */
export async function getGigApplications(
  gigId: string,
): Promise<ApplicationWithRelations[]> {
  if (!isSupabaseConfigured) return demoApplicantsFor(gigId)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('applications')
    .select(APPLICATION_SELECT)
    .eq('gig_id', gigId)
    .order('created_at', { ascending: true })

  if (error || !data) return []

  const rows = (data as unknown as RawApplication[]).map(normalizeApplication)

  // Attach each applicant's skills so the hirer can judge fit without a click.
  const ids = rows.map((r) => r.student_id)
  if (ids.length === 0) return rows

  const { data: tags } = await supabase
    .from('profile_skills')
    .select('profile_id, skill:skills ( id, slug, name, category )')
    .in('profile_id', ids)

  const byProfile = new Map<string, Skill[]>()
  for (const row of (tags ?? []) as unknown as {
    profile_id: string
    skill: Skill | null
  }[]) {
    if (!row.skill) continue
    const list = byProfile.get(row.profile_id) ?? []
    list.push(row.skill)
    byProfile.set(row.profile_id, list)
  }

  return rows.map((r) => ({ ...r, student_skills: byProfile.get(r.student_id) ?? [] }))
}

export async function getMyApplicationFor(
  gigId: string,
  userId: string,
): Promise<ApplicationWithRelations | null> {
  if (!isSupabaseConfigured) return null

  const supabase = await createClient()
  const { data } = await supabase
    .from('applications')
    .select(APPLICATION_SELECT)
    .eq('gig_id', gigId)
    .eq('student_id', userId)
    .maybeSingle()

  if (!data) return null
  return normalizeApplication(data as unknown as RawApplication)
}

/** A student's own applications, newest first, with the gig embedded. */
export async function getMyApplications(userId: string): Promise<ApplicationWithRelations[]> {
  if (!isSupabaseConfigured) return demoApplicationsFor(userId)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('applications')
    .select(
      `id, gig_id, student_id, cover_note, status, created_at,
       gig:gigs!applications_gig_id_fkey ( ${GIG_SELECT} )`,
    )
    .eq('student_id', userId)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return (data as unknown as (Application & { gig: RawGig | RawGig[] | null })[]).map(
    (row) => {
      const { gig, ...application } = row
      const raw = one(gig)
      return {
        ...application,
        student: null,
        gig: raw ? normalizeGig(raw) : undefined,
      }
    },
  )
}

// ── Dashboard lists ─────────────────────────────────────────────────────────

export async function getGigsPostedBy(userId: string): Promise<GigWithRelations[]> {
  if (!isSupabaseConfigured) return demoGigsPostedBy(userId)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('gigs')
    .select(GIG_SELECT)
    .eq('hirer_id', userId)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return (data as unknown as RawGig[]).map(normalizeGig)
}

export async function getGigsAssignedTo(userId: string): Promise<GigWithRelations[]> {
  if (!isSupabaseConfigured) return demoGigsAssignedTo(userId)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('gigs')
    .select(GIG_SELECT)
    .eq('assigned_to', userId)
    .order('updated_at', { ascending: false })

  if (error || !data) return []
  return (data as unknown as RawGig[]).map(normalizeGig)
}

// ── Profiles ────────────────────────────────────────────────────────────────

export async function getPublicProfile(id: string): Promise<PublicProfile | null> {
  if (!isSupabaseConfigured) return demoProfileById(id)

  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, role, rating, rating_count, department, year, id_verified_at')
    .eq('id', id)
    .maybeSingle()

  return (data as PublicProfile | null) ?? null
}

export async function getProfileBio(id: string): Promise<string | null> {
  if (!isSupabaseConfigured) {
    return 'Third-year student. Builds web things, shoots film photos on weekends, and has run the registration desk at two fests.'
  }

  const supabase = await createClient()
  const { data } = await supabase.from('profiles').select('bio').eq('id', id).maybeSingle()
  return (data?.bio as string | undefined) ?? null
}

export async function getProfileSkills(profileId: string): Promise<Skill[]> {
  if (!isSupabaseConfigured) {
    return DEMO_SKILLS.filter((s) =>
      ['web-development', 'frontend', 'photography', 'figma'].includes(s.slug),
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profile_skills')
    .select('skill:skills ( id, slug, name, category )')
    .eq('profile_id', profileId)

  if (error || !data) return []
  return (data as unknown as { skill: Skill | null }[])
    .map((r) => r.skill)
    .filter((s): s is Skill => Boolean(s))
    .sort((a, b) => a.name.localeCompare(b.name))
}

// ── Reviews ─────────────────────────────────────────────────────────────────

export async function getReviewsFor(profileId: string): Promise<Review[]> {
  if (!isSupabaseConfigured) {
    return DEMO_REVIEWS.filter((r) => r.reviewee_id === profileId)
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reviews')
    .select(
      `id, gig_id, reviewer_id, reviewee_id, rating, comment, created_at,
       reviewer:profiles!reviews_reviewer_id_fkey (
         id, full_name, avatar_url, role, rating, rating_count, department, year,
         id_verified_at
       )`,
    )
    .eq('reviewee_id', profileId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error || !data) return []
  return (data as unknown as (Review & { reviewer: PublicProfile | PublicProfile[] | null })[]).map(
    (row) => ({ ...row, reviewer: one(row.reviewer) }),
  )
}

/** Has the viewer already reviewed their counterparty on this gig? */
export async function hasReviewed(gigId: string, reviewerId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false

  const supabase = await createClient()
  const { data } = await supabase
    .from('reviews')
    .select('id')
    .eq('gig_id', gigId)
    .eq('reviewer_id', reviewerId)
    .maybeSingle()

  return Boolean(data)
}

// ── Threads (item 5) ────────────────────────────────────────────────────────
/*
 * The replacement for the old phone-number reveal. Every read here is guarded
 * by the `messages` SELECT policy (in_gig_thread), so a stranger asking for a
 * gig id they are not part of gets an empty array rather than an error.
 */

const PROFILE_FIELDS =
  'id, full_name, avatar_url, role, rating, rating_count, department, year, id_verified_at'

/**
 * Every column of `profiles` a client is allowed to read — which is all of them
 * except `verify_token`.
 *
 * That one is revoked at the column level in schema.sql, because `profiles` is
 * publicly readable and a token anyone can fetch is not a token. Use this list
 * instead of `select('*')`: `*` expands to the revoked column too and the whole
 * query fails with a permission error.
 */
export const PROFILE_ALL_FIELDS =
  'id, full_name, avatar_url, role, department, year, bio, rating, rating_count, ' +
  'is_banned, onboarded_at, fee_waiver_status, fee_waiver_note, fee_waiver_decided_at, ' +
  'id_verified_at, mentorships, referral_code, referred_by, created_at, updated_at'

/** Every message on a gig, oldest first. */
export async function getThreadMessages(
  gigId: string,
  viewerId: string,
): Promise<MessageWithSender[]> {
  if (!isSupabaseConfigured) return demoThreadMessages(gigId, viewerId)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('messages')
    .select(
      `id, gig_id, sender_id, body, created_at, read_at,
       sender:profiles!messages_sender_id_fkey ( ${PROFILE_FIELDS} )`,
    )
    .eq('gig_id', gigId)
    .order('created_at', { ascending: true })
    .limit(200)

  if (error || !data) return []
  return (
    data as unknown as (Message & { sender: PublicProfile | PublicProfile[] | null })[]
  ).map((row) => ({ ...row, sender: one(row.sender) }))
}

/** The viewer's threads — one per gig they hired for or were hired on. */
export async function getThreads(viewerId: string): Promise<Thread[]> {
  if (!isSupabaseConfigured) return demoThreads(viewerId)

  const supabase = await createClient()

  // A thread exists per assigned gig the viewer is on either side of.
  const { data: gigRows } = await supabase
    .from('gigs')
    .select(GIG_SELECT)
    .or(`hirer_id.eq.${viewerId},assigned_to.eq.${viewerId}`)
    .not('assigned_to', 'is', null)
    .order('updated_at', { ascending: false })

  const gigs = ((gigRows ?? []) as unknown as RawGig[]).map(normalizeGig)
  if (gigs.length === 0) return []

  const { data: msgRows } = await supabase
    .from('messages')
    .select('id, gig_id, sender_id, body, created_at, read_at')
    .in(
      'gig_id',
      gigs.map((g) => g.id),
    )
    .order('created_at', { ascending: true })

  const messages = (msgRows ?? []) as Message[]

  const threads = await Promise.all(
    gigs.map(async (gig) => {
      const mine = messages.filter((m) => m.gig_id === gig.id)
      const otherId = gig.hirer_id === viewerId ? gig.assigned_to : gig.hirer_id
      const counterparty =
        gig.hirer_id === viewerId && otherId ? await getPublicProfile(otherId) : gig.hirer

      return {
        gig,
        counterparty,
        last_message: mine[mine.length - 1] ?? null,
        unread: mine.filter((m) => m.sender_id !== viewerId && !m.read_at).length,
      }
    }),
  )

  return threads.sort((a, b) =>
    (b.last_message?.created_at ?? b.gig.updated_at).localeCompare(
      a.last_message?.created_at ?? a.gig.updated_at,
    ),
  )
}

// ── Badges (item 6) ─────────────────────────────────────────────────────────

/** Completed gigs, paid mentorships and referrals — the three badge inputs. */
export async function getApplierStats(userId: string): Promise<ApplierStats> {
  if (!isSupabaseConfigured) return demoApplierStats(userId)

  const supabase = await createClient()

  const [{ count }, { data: profile }, { count: referrals }] = await Promise.all([
    supabase
      .from('gigs')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_to', userId)
      .eq('status', 'completed'),
    supabase.from('profiles').select('mentorships').eq('id', userId).maybeSingle(),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('referred_by', userId),
  ])

  return {
    completed: count ?? 0,
    mentorships: (profile?.mentorships as number | undefined) ?? 0,
    referrals: referrals ?? 0,
  }
}

// ── Suggested appliers (item 7) ─────────────────────────────────────────────

/**
 * People whose skills overlap what this hirer keeps posting about, ranked by
 * how many tags they share and then by rating. Same shape of match as the
 * "recommended for you" block on /dashboard, pointed the other way.
 */
export async function getSuggestedAppliers(
  hirerId: string,
  limit = 4,
): Promise<{ profile: PublicProfile; shared: Skill[] }[]> {
  if (!isSupabaseConfigured) return demoSuggestedAppliers(hirerId, limit)

  const supabase = await createClient()

  const { data: myGigs } = await supabase.from('gigs').select('id').eq('hirer_id', hirerId)
  const gigIds = (myGigs ?? []).map((g) => g.id as string)
  if (gigIds.length === 0) return []

  const { data: tagRows } = await supabase
    .from('gig_skills')
    .select('skill_id')
    .in('gig_id', gigIds)

  const wanted = [...new Set((tagRows ?? []).map((r) => r.skill_id as number))]
  if (wanted.length === 0) return []

  const { data: matches } = await supabase
    .from('profile_skills')
    .select(`profile_id, skill:skills ( id, slug, name, category )`)
    .in('skill_id', wanted)
    .limit(400)

  const shared = new Map<string, Skill[]>()
  for (const row of (matches ?? []) as unknown as {
    profile_id: string
    skill: Skill | null
  }[]) {
    if (!row.skill || row.profile_id === hirerId) continue
    const list = shared.get(row.profile_id) ?? []
    list.push(row.skill)
    shared.set(row.profile_id, list)
  }
  if (shared.size === 0) return []

  const { data: people } = await supabase
    .from('profiles')
    .select(PROFILE_FIELDS)
    .in('id', [...shared.keys()])
    .eq('is_banned', false)

  return ((people ?? []) as unknown as PublicProfile[])
    .map((profile) => ({ profile, shared: shared.get(profile.id) ?? [] }))
    .sort((a, b) => b.shared.length - a.shared.length || b.profile.rating - a.profile.rating)
    .slice(0, limit)
}

// ── Disputes (item 8) ───────────────────────────────────────────────────────

export async function getDisputesFor(gigId: string): Promise<Dispute[]> {
  if (!isSupabaseConfigured) return demoDisputesFor(gigId)

  const supabase = await createClient()
  const { data } = await supabase
    .from('disputes')
    .select('id, gig_id, raised_by, reason, detail, status, resolution, created_at, resolved_at')
    .eq('gig_id', gigId)
    .order('created_at', { ascending: false })

  return (data as Dispute[] | null) ?? []
}

// ── Verification (item 4) ───────────────────────────────────────────────────

/** The viewer's own submitted IDs. Never returns anyone else's — RLS. */
export async function getMyVerifications(userId: string): Promise<Verification[]> {
  if (!isSupabaseConfigured) return demoVerificationsFor(userId)

  const supabase = await createClient()
  const { data } = await supabase
    .from('id_verifications')
    .select('id, profile_id, kind, name_on_id, last4, status, note, created_at, decided_at')
    .eq('profile_id', userId)
    .order('created_at', { ascending: false })

  return (data as Verification[] | null) ?? []
}

/**
 * Resolve a `/verify/[token]` link to the account it belongs to.
 *
 * Goes through an RPC rather than a `where verify_token = …` filter, because the
 * column is revoked from `anon` and `authenticated` — see PROFILE_ALL_FIELDS.
 * The token is the whole credential (it gets pasted into WhatsApp), so it reveals
 * nothing beyond a public profile, and regenerating it on /verify kills the old
 * URL immediately.
 */
export async function getProfileByVerifyToken(token: string): Promise<PublicProfile | null> {
  if (!isSupabaseConfigured) {
    return token === DEMO_VERIFY_TOKEN ? DEMO_ME : null
  }

  const supabase = await createClient()
  const { data } = await supabase.rpc('profile_by_verify_token', { p_token: token })

  const row = Array.isArray(data) ? data[0] : data
  return (row as PublicProfile | undefined) ?? null
}

/**
 * The signed-in user's own share-link token.
 *
 * Takes no argument on purpose: the RPC reads `auth.uid()` itself, so there is no
 * parameter an attacker could point at somebody else's row.
 */
export async function getMyVerifyToken(): Promise<string | null> {
  if (!isSupabaseConfigured) return DEMO_VERIFY_TOKEN

  const supabase = await createClient()
  const { data } = await supabase.rpc('my_verify_token')
  return (data as string | null) ?? null
}

/** How many people signed up with this account's referral code. */
export async function getReferralCount(userId: string): Promise<number> {
  if (!isSupabaseConfigured) return demoReferralCount(userId)

  const supabase = await createClient()
  const { count } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('referred_by', userId)

  return count ?? 0
}
