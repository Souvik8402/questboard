'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/cn'
import { GIG_TYPES, SORT_OPTIONS } from '@/lib/constants'
import { compactRupees } from '@/lib/format'
import type { GigFilters, Skill } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { IconBolt, IconLayers, IconSearch, IconWifi, IconX } from '@/components/ui/Icons'

const REWARD_PRESETS = [
  { label: 'Any', min: undefined, max: undefined },
  { label: 'Under ₹1k', min: undefined, max: 999 },
  { label: '₹1k–5k', min: 1000, max: 5000 },
  { label: '₹5k–15k', min: 5000, max: 15000 },
  { label: '₹15k+', min: 15000, max: undefined },
]

/**
 * Filter panel for the gig board.
 *
 * It is a real `<form method="get">`, so submitting rewrites the URL and the
 * server re-renders the board. Everything is therefore shareable and works
 * without JS; the router.push in `apply()` just makes it feel instant.
 */
export function FilterBar({
  skills,
  filters,
  total,
  basePath = '/gigs',
}: {
  skills: Skill[]
  filters: GigFilters
  total: number
  basePath?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [q, setQ] = useState(filters.q ?? '')
  const [selectedSkills, setSelectedSkills] = useState<number[]>(filters.skills ?? [])
  const [types, setTypes] = useState<string[]>(filters.types ?? [])
  const [remote, setRemote] = useState(Boolean(filters.remoteOnly))
  const [urgent, setUrgent] = useState(Boolean(filters.urgentOnly))
  const [reward, setReward] = useState<{ min?: number; max?: number }>({
    min: filters.minReward,
    max: filters.maxReward,
  })
  const [skillQuery, setSkillQuery] = useState('')
  const [open, setOpen] = useState(false)

  // Keep local state honest if the URL changes underneath us (back button).
  useEffect(() => {
    setQ(filters.q ?? '')
    setSelectedSkills(filters.skills ?? [])
    setTypes(filters.types ?? [])
    setRemote(Boolean(filters.remoteOnly))
    setUrgent(Boolean(filters.urgentOnly))
    setReward({ min: filters.minReward, max: filters.maxReward })
  }, [filters])

  const activeCount =
    (q ? 1 : 0) + selectedSkills.length + types.length + (remote ? 1 : 0) + (urgent ? 1 : 0) + (reward.min || reward.max ? 1 : 0)

  const byId = useMemo(() => new Map(skills.map((s) => [s.id, s])), [skills])

  const skillMatches = useMemo(() => {
    const needle = skillQuery.trim().toLowerCase()
    if (!needle) return skills.slice(0, 0)
    return skills
      .filter((s) => s.name.toLowerCase().includes(needle) || s.category.toLowerCase().includes(needle))
      .slice(0, 12)
  }, [skills, skillQuery])

  /** Push the current local state into the URL. */
  function apply(next?: {
    q?: string
    skills?: number[]
    types?: string[]
    remote?: boolean
    urgent?: boolean
    min?: number
    max?: number
    sort?: string
  }) {
    const sp = new URLSearchParams()
    const text = next?.q ?? q
    const s = next?.skills ?? selectedSkills
    const t = next?.types ?? types
    const r = next?.remote ?? remote
    const u = next?.urgent ?? urgent
    const mn = next && 'min' in next ? next.min : reward.min
    const mx = next && 'max' in next ? next.max : reward.max
    const sort = next?.sort ?? searchParams.get('sort') ?? ''

    if (text.trim()) sp.set('q', text.trim())
    if (s.length) sp.set('skills', s.join(','))
    if (t.length) sp.set('types', t.join(','))
    if (r) sp.set('remote', '1')
    if (u) sp.set('urgent', '1')
    if (mn) sp.set('min', String(mn))
    if (mx) sp.set('max', String(mx))
    if (sort && sort !== 'recent') sp.set('sort', sort)

    const query = sp.toString()
    router.push(query ? `${basePath}?${query}` : basePath, { scroll: false })
  }

  function toggleSkill(id: number) {
    const next = selectedSkills.includes(id)
      ? selectedSkills.filter((x) => x !== id)
      : [...selectedSkills, id]
    setSelectedSkills(next)
    apply({ skills: next })
  }

  function toggleType(value: string) {
    const next = types.includes(value) ? types.filter((x) => x !== value) : [...types, value]
    setTypes(next)
    apply({ types: next })
  }

  const currentSort = searchParams.get('sort') ?? 'recent'
  const otherView = basePath === '/gigs' ? '/gigs/map' : '/gigs'
  const otherViewLabel = basePath === '/gigs' ? 'Map view' : 'List view'
  const otherViewQuery = searchParams.toString()

  return (
    <div className="space-y-3">
      {/* Row 1: search + sort + view switch */}
      <form
        method="get"
        action={basePath}
        onSubmit={(e) => {
          e.preventDefault()
          apply()
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        {/* Non-text filters ride along as hidden inputs for the no-JS path. */}
        {selectedSkills.length > 0 && <input type="hidden" name="skills" value={selectedSkills.join(',')} />}
        {types.length > 0 && <input type="hidden" name="types" value={types.join(',')} />}
        {remote && <input type="hidden" name="remote" value="1" />}
        {urgent && <input type="hidden" name="urgent" value="1" />}
        {reward.min ? <input type="hidden" name="min" value={reward.min} /> : null}
        {reward.max ? <input type="hidden" name="max" value={reward.max} /> : null}
        {currentSort !== 'recent' && <input type="hidden" name="sort" value={currentSort} />}

        <div className="relative flex-1">
          <IconSearch className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-dim" />
          <input
            type="search"
            name="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search gigs — “website”, “tuition ravindrapuri”, “reels”…"
            aria-label="Search gigs"
            className="w-full rounded-xl border border-line bg-white/80 py-3 pl-11 pr-4 text-sm text-chalk outline-none transition-colors placeholder:text-dimmer hover:border-[#bfb9b0] focus:border-cyan/60 focus:ring-2 focus:ring-cyan/15"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={currentSort}
            onChange={(e) => apply({ sort: e.target.value })}
            aria-label="Sort gigs"
            className="rounded-xl border border-line bg-white/80 px-3.5 py-3 text-[14px] text-chalk outline-none transition-colors hover:border-[#bfb9b0] focus:border-cyan/60"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <Button type="submit" className="px-5">
            Search
          </Button>

          <Link
            href={otherViewQuery ? `${otherView}?${otherViewQuery}` : otherView}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-line bg-black/[0.02] px-3.5 text-[14px] font-medium text-chalk transition-colors hover:border-cyan/40 hover:bg-black/[0.06]"
          >
            <IconLayers className="size-4" />
            <span className="hidden sm:inline">{otherViewLabel}</span>
          </Link>
        </div>
      </form>

      {/* Row 2: quick filters */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[13px] font-medium transition-colors',
            activeCount > 0
              ? 'border-cyan/40 bg-cyan/10 text-cyan'
              : 'border-line bg-black/[0.03] text-mist hover:text-chalk',
          )}
        >
          Filters
          {activeCount > 0 && <span className="hud">· {activeCount}</span>}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={cn('size-3 transition-transform', open && 'rotate-180')}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {GIG_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => toggleType(t.value)}
            className={cn(
              'rounded-lg border px-2.5 py-1.5 text-[13px] font-medium transition-colors',
              types.includes(t.value)
                ? 'border-violet/45 bg-violet/12 text-violet'
                : 'border-line bg-black/[0.03] text-mist hover:border-violet/30 hover:text-chalk',
            )}
          >
            {t.label}
          </button>
        ))}

        <button
          type="button"
          onClick={() => {
            const next = !remote
            setRemote(next)
            apply({ remote: next })
          }}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[13px] font-medium transition-colors',
            remote
              ? 'border-teal/45 bg-teal/12 text-teal'
              : 'border-line bg-black/[0.03] text-mist hover:border-teal/30 hover:text-chalk',
          )}
        >
          <IconWifi className="size-3.5" />
          Remote
        </button>

        <button
          type="button"
          onClick={() => {
            const next = !urgent
            setUrgent(next)
            apply({ urgent: next })
          }}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[13px] font-medium transition-colors',
            urgent
              ? 'border-rose/45 bg-rose/12 text-rose'
              : 'border-line bg-black/[0.03] text-mist hover:border-rose/30 hover:text-chalk',
          )}
        >
          <IconBolt className="size-3.5" />
          Urgent
        </button>

        <span className="ml-auto hud text-[12.5px] text-dim">
          {total} {total === 1 ? 'gig' : 'gigs'}
        </span>

        {activeCount > 0 && (
          <Link
            href={basePath}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[13px] text-dim transition-colors hover:text-rose"
          >
            <IconX className="size-3" />
            Clear
          </Link>
        )}
      </div>

      {/* Selected skills, always visible so they can't be forgotten */}
      {selectedSkills.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[12px] uppercase tracking-wider text-dimmer">Skills:</span>
          {selectedSkills.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => toggleSkill(id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan/45 bg-cyan/15 px-2 py-1 text-[12.5px] font-medium text-cyan hover:bg-cyan/25"
            >
              {byId.get(id)?.name ?? `#${id}`}
              <IconX className="size-2.5" strokeWidth={3} />
            </button>
          ))}
        </div>
      )}

      {/* Expanded panel: skill search + reward band */}
      {open && (
        <div className="grid gap-5 rounded-xl border border-line bg-white/70 p-4 sm:grid-cols-2">
          <div className="space-y-2.5">
            <p className="eyebrow">Filter by skill</p>
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-dim" />
              <input
                type="search"
                value={skillQuery}
                onChange={(e) => setSkillQuery(e.target.value)}
                placeholder="Type a skill — react, tabla, autocad…"
                className="w-full rounded-lg border border-line bg-white/80 py-2 pl-9 pr-3 text-[14px] text-chalk outline-none placeholder:text-dimmer focus:border-cyan/60"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {skillMatches.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSkill(s.id)}
                  className={cn(
                    'rounded-lg border px-2 py-1 text-[12.5px] font-medium transition-colors',
                    selectedSkills.includes(s.id)
                      ? 'border-cyan/45 bg-cyan/15 text-cyan'
                      : 'border-line bg-black/[0.03] text-mist hover:border-cyan/30 hover:text-chalk',
                  )}
                >
                  {s.name}
                </button>
              ))}
              {skillQuery.trim() && skillMatches.length === 0 && (
                <p className="text-[13px] text-dim">No skill matches “{skillQuery}”.</p>
              )}
              {!skillQuery.trim() && (
                <p className="text-[13px] text-dim">
                  Start typing to see matching tags. {skills.length} tags available.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2.5">
            <p className="eyebrow">Reward</p>
            <div className="flex flex-wrap gap-1.5">
              {REWARD_PRESETS.map((p) => {
                const active = reward.min === p.min && reward.max === p.max
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setReward({ min: p.min, max: p.max })
                      apply({ min: p.min, max: p.max })
                    }}
                    className={cn(
                      'rounded-lg border px-2.5 py-1.5 text-[13px] font-medium transition-colors',
                      active
                        ? 'border-amber/45 bg-amber/12 text-amber'
                        : 'border-line bg-black/[0.03] text-mist hover:border-amber/30 hover:text-chalk',
                    )}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
            {(reward.min || reward.max) && (
              <p className="hud text-[12.5px] text-dim">
                Showing {reward.min ? compactRupees(reward.min) : '₹0'} –{' '}
                {reward.max ? compactRupees(reward.max) : 'no cap'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
