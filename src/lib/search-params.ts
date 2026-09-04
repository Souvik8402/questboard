import { GIG_TYPES, type RewardTier } from './constants'
import type { GigFilters, GigSort, GigType } from './types'

/**
 * The gig board is entirely URL-driven: every filter lives in the query
 * string, so a filtered board is shareable, bookmarkable and server-rendered,
 * and the filter form works with JavaScript switched off.
 */

export type Params = Record<string, string | string[] | undefined>

export function one(params: Params, key: string): string | undefined {
  const value = params[key]
  const first = Array.isArray(value) ? value[0] : value
  return first && first.length > 0 ? first : undefined
}

/** Accepts both repeated keys (`?skills=1&skills=2`) and CSV (`?skills=1,2`). */
export function many(params: Params, key: string): string[] {
  const value = params[key]
  const raw = Array.isArray(value) ? value : value ? [value] : []
  return raw.flatMap((v) => v.split(',')).map((v) => v.trim()).filter(Boolean)
}

const VALID_TYPES = new Set<string>(GIG_TYPES.map((t) => t.value))
const VALID_SORTS = new Set<string>(['recent', 'reward_high', 'reward_low', 'deadline'])

export function parseFilters(params: Params): GigFilters {
  const skills = many(params, 'skills')
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 20)

  const types = many(params, 'types').filter((t): t is GigType => VALID_TYPES.has(t))

  const min = Number(one(params, 'min'))
  const max = Number(one(params, 'max'))
  const page = Number(one(params, 'page'))
  const sortRaw = one(params, 'sort')

  return {
    q: one(params, 'q')?.slice(0, 120),
    skills: skills.length ? skills : undefined,
    types: types.length ? types : undefined,
    minReward: Number.isFinite(min) && min > 0 ? Math.floor(min) : undefined,
    maxReward: Number.isFinite(max) && max > 0 ? Math.floor(max) : undefined,
    remoteOnly: one(params, 'remote') === '1' || one(params, 'remote') === 'on',
    sort: sortRaw && VALID_SORTS.has(sortRaw) ? (sortRaw as GigSort) : 'recent',
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
  }
}

/** Rebuild a query string from filters, with selective overrides. */
export function filtersToQuery(
  filters: GigFilters,
  overrides: Partial<Record<string, string | number | undefined | null>> = {},
): string {
  const sp = new URLSearchParams()

  if (filters.q) sp.set('q', filters.q)
  if (filters.skills?.length) sp.set('skills', filters.skills.join(','))
  if (filters.types?.length) sp.set('types', filters.types.join(','))
  if (filters.minReward) sp.set('min', String(filters.minReward))
  if (filters.maxReward) sp.set('max', String(filters.maxReward))
  if (filters.remoteOnly) sp.set('remote', '1')
  if (filters.sort && filters.sort !== 'recent') sp.set('sort', filters.sort)
  if (filters.page && filters.page > 1) sp.set('page', String(filters.page))

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined || value === null || value === '') sp.delete(key)
    else sp.set(key, String(value))
  }

  const out = sp.toString()
  return out ? `?${out}` : ''
}

/** How many filters are active — drives the "3 filters" badge and Clear button. */
export function activeFilterCount(filters: GigFilters): number {
  let n = 0
  if (filters.q) n++
  if (filters.skills?.length) n += filters.skills.length
  if (filters.types?.length) n += filters.types.length
  if (filters.minReward) n++
  if (filters.maxReward) n++
  if (filters.remoteOnly) n++
  return n
}

/** Map pin colour, keyed off the same reward tiers as the cards. */
export function tierClass(tier: RewardTier): string {
  return `tier-${tier}`
}
