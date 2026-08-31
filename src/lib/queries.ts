import { QUESTS_PER_PAGE } from './constants'
import { isSupabaseConfigured } from './config'
import {
  DEMO_QUESTS,
  DEMO_REVIEWS,
  DEMO_SKILLS,
  DEMO_STATS,
  demoApplicationsFor,
  demoProfileById,
  demoQuestById,
  demoQuestsAssignedTo,
  demoQuestsPostedBy,
} from './demo-data'
import { createClient } from './supabase/server'
import type {
  Application,
  ApplicationWithRelations,
  PlatformStats,
  PublicProfile,
  Quest,
  QuestFilters,
  QuestWithRelations,
  Review,
  Skill,
} from './types'

/**
 * Every read the app performs, in one place.
 *
 * Each function checks `isSupabaseConfigured` and falls back to the demo
 * dataset, so pages never have to care which mode they're in.
 */

const QUEST_SELECT = `
  id, hirer_id, title, description, quest_type, status, reward_amount,
  estimated_hours, deadline, is_remote, location_label, lat, lng,
  assigned_to, views, is_flagged, application_count, created_at, updated_at,
  hirer:profiles!quests_hirer_id_fkey (
    id, full_name, avatar_url, role, rating, rating_count, department, year
  ),
  quest_skills ( skill:skills ( id, slug, name, category ) )
`

/** Shape PostgREST actually hands back for QUEST_SELECT. */
interface RawQuest extends Quest {
  application_count: number
  hirer: PublicProfile | PublicProfile[] | null
  quest_skills: { skill: Skill | null }[] | null
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function normalizeQuest(row: RawQuest): QuestWithRelations {
  const { quest_skills, hirer, ...quest } = row
  return {
    ...quest,
    hirer: one(hirer),
    skills: (quest_skills ?? [])
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

// ── Quest board ─────────────────────────────────────────────────────────────

export interface QuestPage {
  quests: QuestWithRelations[]
  total: number
  page: number
  pageCount: number
}

export async function getQuests(filters: QuestFilters = {}): Promise<QuestPage> {
  const page = Math.max(1, filters.page ?? 1)

  if (!isSupabaseConfigured) return demoQuestPage(filters, page)

  const supabase = await createClient()

  let query = supabase
    .from('quests')
    .select(QUEST_SELECT, { count: 'exact' })
    .eq('status', 'open')
    .eq('is_flagged', false)

  // Skill filter runs as a separate lookup rather than an inner join: joining
  // with `quest_skills!inner` would prune the embedded skill list down to just
  // the matched tags, and the cards need to show all of them.
  if (filters.skills?.length) {
    const { data: matches } = await supabase
      .from('quest_skills')
      .select('quest_id')
      .in('skill_id', filters.skills)
      .limit(1000)

    const ids = [...new Set((matches ?? []).map((m) => m.quest_id as string))]
    if (ids.length === 0) return { quests: [], total: 0, page: 1, pageCount: 0 }
    query = query.in('id', ids)
  }

  if (filters.q) {
    query = query.textSearch('search_tsv', filters.q, {
      type: 'websearch',
      config: 'english',
    })
  }
  if (filters.types?.length) query = query.in('quest_type', filters.types)
  if (filters.minReward !== undefined) query = query.gte('reward_amount', filters.minReward)
  if (filters.maxReward !== undefined) query = query.lte('reward_amount', filters.maxReward)
  if (filters.remoteOnly) query = query.eq('is_remote', true)

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

  const from = (page - 1) * QUESTS_PER_PAGE
  const { data, count, error } = await query.range(from, from + QUESTS_PER_PAGE - 1)

  if (error) {
    console.error('[getQuests]', error.message)
    return { quests: [], total: 0, page, pageCount: 0 }
  }

  const total = count ?? 0
  return {
    quests: (data as unknown as RawQuest[]).map(normalizeQuest),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / QUESTS_PER_PAGE)),
  }
}

/** Same filters as the live query, applied in JS over the demo dataset. */
function demoQuestPage(filters: QuestFilters, page: number): QuestPage {
  let list = DEMO_QUESTS.filter((q) => q.status === 'open' && !q.is_flagged)

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
    list = list.filter((q) => wanted.has(q.quest_type))
  }
  if (filters.minReward !== undefined) {
    list = list.filter((q) => q.reward_amount >= filters.minReward!)
  }
  if (filters.maxReward !== undefined) {
    list = list.filter((q) => q.reward_amount <= filters.maxReward!)
  }
  if (filters.remoteOnly) list = list.filter((q) => q.is_remote)

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

  const from = (page - 1) * QUESTS_PER_PAGE
  return {
    quests: sorted.slice(from, from + QUESTS_PER_PAGE),
    total: sorted.length,
    page,
    pageCount: Math.max(1, Math.ceil(sorted.length / QUESTS_PER_PAGE)),
  }
}

/** Every open quest that has coordinates — used by the map view. */
export async function getMappableQuests(
  filters: QuestFilters = {},
): Promise<QuestWithRelations[]> {
  const { quests } = await getQuests({ ...filters, page: 1 })
  return quests.filter((q) => q.lat !== null && q.lng !== null)
}

// ── Single quest ────────────────────────────────────────────────────────────

export async function getQuest(id: string): Promise<QuestWithRelations | null> {
  if (!isSupabaseConfigured) return demoQuestById(id)

  const supabase = await createClient()
  const { data, error } = await supabase.from('quests').select(QUEST_SELECT).eq('id', id).maybeSingle()

  if (error || !data) return null
  return normalizeQuest(data as unknown as RawQuest)
}

export interface QuestContact {
  phone: string
  alt_contact: string | null
}

/**
 * Returns null when RLS declined to hand the row over — i.e. the viewer is
 * neither the hirer nor an accepted applicant. That "null" IS the feature.
 */
export async function getQuestContact(questId: string): Promise<QuestContact | null> {
  if (!isSupabaseConfigured) return null

  const supabase = await createClient()
  const { data } = await supabase
    .from('quest_contacts')
    .select('phone, alt_contact')
    .eq('quest_id', questId)
    .maybeSingle()

  return (data as QuestContact | null) ?? null
}

// ── Applications ────────────────────────────────────────────────────────────

const APPLICATION_SELECT = `
  id, quest_id, student_id, cover_note, status, created_at,
  student:profiles!applications_student_id_fkey (
    id, full_name, avatar_url, role, rating, rating_count, department, year
  ),
  application_contacts ( phone )
`

interface RawApplication extends Application {
  student: PublicProfile | PublicProfile[] | null
  application_contacts: { phone: string }[] | { phone: string } | null
}

function normalizeApplication(row: RawApplication): ApplicationWithRelations {
  const { student, application_contacts, ...application } = row
  return {
    ...application,
    student: one(student),
    phone: one(application_contacts)?.phone ?? null,
  }
}

/** Applicants for a quest. RLS means only the quest owner gets rows back. */
export async function getQuestApplications(
  questId: string,
): Promise<ApplicationWithRelations[]> {
  if (!isSupabaseConfigured) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('applications')
    .select(APPLICATION_SELECT)
    .eq('quest_id', questId)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return (data as unknown as RawApplication[]).map(normalizeApplication)
}

export async function getMyApplicationFor(
  questId: string,
  userId: string,
): Promise<ApplicationWithRelations | null> {
  if (!isSupabaseConfigured) return null

  const supabase = await createClient()
  const { data } = await supabase
    .from('applications')
    .select(APPLICATION_SELECT)
    .eq('quest_id', questId)
    .eq('student_id', userId)
    .maybeSingle()

  if (!data) return null
  return normalizeApplication(data as unknown as RawApplication)
}

/** A student's own applications, newest first, with the quest embedded. */
export async function getMyApplications(userId: string): Promise<ApplicationWithRelations[]> {
  if (!isSupabaseConfigured) return demoApplicationsFor(userId)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('applications')
    .select(
      `id, quest_id, student_id, cover_note, status, created_at,
       quest:quests!applications_quest_id_fkey ( ${QUEST_SELECT} )`,
    )
    .eq('student_id', userId)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return (data as unknown as (Application & { quest: RawQuest | RawQuest[] | null })[]).map(
    (row) => {
      const { quest, ...application } = row
      const raw = one(quest)
      return {
        ...application,
        student: null,
        phone: null,
        quest: raw ? normalizeQuest(raw) : undefined,
      }
    },
  )
}

// ── Dashboard lists ─────────────────────────────────────────────────────────

export async function getQuestsPostedBy(userId: string): Promise<QuestWithRelations[]> {
  if (!isSupabaseConfigured) return demoQuestsPostedBy(userId)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('quests')
    .select(QUEST_SELECT)
    .eq('hirer_id', userId)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return (data as unknown as RawQuest[]).map(normalizeQuest)
}

export async function getQuestsAssignedTo(userId: string): Promise<QuestWithRelations[]> {
  if (!isSupabaseConfigured) return demoQuestsAssignedTo(userId)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('quests')
    .select(QUEST_SELECT)
    .eq('assigned_to', userId)
    .order('updated_at', { ascending: false })

  if (error || !data) return []
  return (data as unknown as RawQuest[]).map(normalizeQuest)
}

// ── Profiles ────────────────────────────────────────────────────────────────

export async function getPublicProfile(id: string): Promise<PublicProfile | null> {
  if (!isSupabaseConfigured) return demoProfileById(id)

  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, role, rating, rating_count, department, year')
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
      `id, quest_id, reviewer_id, reviewee_id, rating, comment, created_at,
       reviewer:profiles!reviews_reviewer_id_fkey (
         id, full_name, avatar_url, role, rating, rating_count, department, year
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

/** Has the viewer already reviewed their counterparty on this quest? */
export async function hasReviewed(questId: string, reviewerId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false

  const supabase = await createClient()
  const { data } = await supabase
    .from('reviews')
    .select('id')
    .eq('quest_id', questId)
    .eq('reviewer_id', reviewerId)
    .maybeSingle()

  return Boolean(data)
}
