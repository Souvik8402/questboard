'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import type { AdminQuest } from '@/lib/admin-queries'
import { QUEST_STATUSES, QUEST_STATUS_LABEL, QUEST_TYPE_LABEL } from '@/lib/constants'
import { formatRupees, relativeTime } from '@/lib/format'
import type { ActionResult, QuestStatus, QuestType } from '@/lib/types'
import { Badge, StatusPill } from '@/components/ui/Badge'
import { Notice, Panel } from '@/components/ui/Panel'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { IconSearch, IconTrash } from '@/components/ui/Icons'
import { adminDeleteQuest, adminSetQuestStatus } from '../../actions'

export function QuestTable({ quests }: { quests: AdminQuest[] }) {
  // One action slot for both mutations; the hidden `intent` picks the branch.
  const [result, act] = useActionState<ActionResult | null, FormData>(async (prev, form) => {
    return form.get('intent') === 'delete'
      ? adminDeleteQuest(prev, form)
      : adminSetQuestStatus(prev, form)
  }, null)

  const [status, setStatus] = useState<QuestStatus | 'all'>('all')
  const [query, setQuery] = useState('')
  const [confirming, setConfirming] = useState<string | null>(null)

  const q = query.trim().toLowerCase()
  const shown = quests.filter((quest) => {
    if (status !== 'all' && quest.status !== status) return false
    if (!q) return true
    return (
      quest.title.toLowerCase().includes(q) ||
      (quest.hirer_name ?? '').toLowerCase().includes(q) ||
      (quest.location_label ?? '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-dim" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, hirer or place…"
            className="w-full rounded-xl border border-line bg-ink/70 py-2 pl-10 pr-3.5 text-[13px] text-chalk outline-none transition-colors placeholder:text-dimmer hover:border-[#2c344a] focus:border-cyan/60"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['all', ...QUEST_STATUSES] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatus(value)}
              className={`rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                status === value
                  ? 'border-cyan/45 bg-cyan/15 text-cyan'
                  : 'border-line bg-white/[0.03] text-mist hover:border-cyan/30 hover:text-chalk'
              }`}
            >
              {value === 'all' ? 'All' : QUEST_STATUS_LABEL[value]}
            </button>
          ))}
        </div>
      </div>

      {result && <Notice tone={result.ok ? 'success' : 'error'}>{result.message}</Notice>}

      <Panel className="divide-y divide-line/70 p-0">
        {shown.length === 0 && (
          <p className="px-4 py-10 text-center text-[13px] text-dim">No quest matches that.</p>
        )}

        {shown.map((quest) => (
          <div key={quest.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-[220px] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={quest.status} />
                  <Badge tone="neutral">
                    {QUEST_TYPE_LABEL[quest.quest_type as QuestType] ?? quest.quest_type}
                  </Badge>
                  {quest.is_remote && <Badge tone="teal">Remote</Badge>}
                </div>
                <Link
                  href={`/quests/${quest.id}`}
                  className="mt-2 block text-[13.5px] font-medium leading-snug text-chalk hover:text-cyan"
                >
                  {quest.title}
                </Link>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 text-[11.5px] text-dim">
                  <span className="hud text-mist">{formatRupees(quest.reward_amount)}</span>
                  <Link href={`/profile/${quest.hirer_id}`} className="hover:text-cyan">
                    {quest.hirer_name ?? 'Unknown hirer'}
                  </Link>
                  <span>{quest.application_count} applied</span>
                  <span>{quest.views} views</span>
                  <span className="text-dimmer">{relativeTime(quest.created_at)}</span>
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <form action={act} className="flex items-center gap-1.5">
                  <input type="hidden" name="intent" value="status" />
                  <input type="hidden" name="quest_id" value={quest.id} />
                  <select
                    name="status"
                    defaultValue={quest.status}
                    className="rounded-lg border border-line bg-ink/70 px-2 py-1.5 text-[12px] text-chalk outline-none transition-colors hover:border-[#2c344a] focus:border-cyan/60"
                  >
                    {QUEST_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {QUEST_STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                  <SubmitButton size="sm" variant="secondary" pendingLabel="…">
                    Set
                  </SubmitButton>
                </form>

                {confirming === quest.id ? (
                  <form action={act} className="flex items-center gap-1.5">
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="quest_id" value={quest.id} />
                    <SubmitButton size="sm" variant="danger" pendingLabel="Deleting…">
                      Confirm delete
                    </SubmitButton>
                    <button
                      type="button"
                      onClick={() => setConfirming(null)}
                      className="text-[12px] text-dim hover:text-chalk"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirming(quest.id)}
                    aria-label="Delete quest"
                    title="Delete quest and its applications"
                    className="grid size-8 place-items-center rounded-lg border border-line text-dim transition-colors hover:border-rose/40 hover:text-rose"
                  >
                    <IconTrash className="size-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </Panel>

      <p className="text-[11.5px] text-dim">
        Showing {shown.length} of {quests.length}. Forcing a status here skips the normal
        transition rules — deleting also removes applications, tags and the stored phone number.
      </p>
    </div>
  )
}
