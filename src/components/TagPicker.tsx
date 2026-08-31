'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/cn'
import type { Skill } from '@/lib/types'
import { IconSearch, IconX } from '@/components/ui/Icons'

/**
 * Searchable multi-select over the skill catalogue.
 *
 * Selections are mirrored into hidden inputs named `name`, so the surrounding
 * Server Action reads them straight off FormData with `intList(form, 'skills')`.
 */
export function TagPicker({
  skills,
  name = 'skills',
  defaultSelected = [],
  max = 8,
  label = 'Skill tags',
  hint,
}: {
  skills: Skill[]
  name?: string
  defaultSelected?: number[]
  max?: number
  label?: string
  hint?: string
}) {
  const [selected, setSelected] = useState<number[]>(defaultSelected.slice(0, max))
  const [query, setQuery] = useState('')

  const byId = useMemo(() => new Map(skills.map((s) => [s.id, s])), [skills])

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase()
    const map = new Map<string, Skill[]>()
    for (const s of skills) {
      if (q && !s.name.toLowerCase().includes(q) && !s.category.toLowerCase().includes(q)) continue
      const list = map.get(s.category)
      if (list) list.push(s)
      else map.set(s.category, [s])
    }
    return [...map.entries()]
  }, [skills, query])

  const full = selected.length >= max

  function toggle(id: number) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= max ? prev : [...prev, id],
    )
  }

  return (
    <div className="space-y-3">
      {selected.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}

      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium text-chalk">{label}</span>
        <span className={cn('hud text-[11px]', full ? 'text-amber' : 'text-dim')}>
          {selected.length}/{max}
        </span>
      </div>

      {/* Chosen tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 rounded-xl border border-cyan/20 bg-cyan/[0.04] p-2.5">
          {selected.map((id) => {
            const skill = byId.get(id)
            if (!skill) return null
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 rounded-lg border border-cyan/45 bg-cyan/15 px-2 py-1 text-[11.5px] font-medium text-cyan"
              >
                {skill.name}
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  aria-label={`Remove ${skill.name}`}
                  className="-mr-0.5 grid size-3.5 place-items-center rounded-sm opacity-70 hover:opacity-100"
                >
                  <IconX className="size-2.5" strokeWidth={3} />
                </button>
              </span>
            )
          })}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-dim" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search skills — react, tabla, autocad, german…"
          className="w-full rounded-xl border border-line bg-ink/70 py-2.5 pl-10 pr-3.5 text-sm text-chalk outline-none transition-colors placeholder:text-dimmer hover:border-[#2c344a] focus:border-cyan/60 focus:ring-2 focus:ring-cyan/15"
        />
      </div>

      {/* Catalogue */}
      <div className="max-h-72 space-y-4 overflow-y-auto rounded-xl border border-line bg-ink/40 p-3.5">
        {grouped.length === 0 && (
          <p className="py-6 text-center text-[13px] text-dim">
            No skill matches “{query}”. Try a broader word.
          </p>
        )}
        {grouped.map(([category, list]) => (
          <div key={category} className="space-y-2">
            <p className="eyebrow">{category}</p>
            <div className="flex flex-wrap gap-1.5">
              {list.map((s) => {
                const on = selected.includes(s.id)
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggle(s.id)}
                    disabled={!on && full}
                    className={cn(
                      'rounded-lg border px-2 py-1 text-[11.5px] font-medium transition-colors',
                      on
                        ? 'border-cyan/45 bg-cyan/15 text-cyan'
                        : 'border-line bg-white/[0.03] text-mist hover:border-cyan/30 hover:text-chalk',
                      !on && full && 'cursor-not-allowed opacity-40 hover:border-line hover:text-mist',
                    )}
                  >
                    {s.name}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {hint && <p className="text-xs leading-relaxed text-dim">{hint}</p>}
    </div>
  )
}
