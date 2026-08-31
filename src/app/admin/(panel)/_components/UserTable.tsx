'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import type { AdminUser } from '@/lib/admin-queries'
import { ROLE_LABEL } from '@/lib/constants'
import { relativeTime } from '@/lib/format'
import type { ActionResult } from '@/lib/types'
import { Avatar } from '@/components/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Notice, Panel } from '@/components/ui/Panel'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { IconSearch, IconShield } from '@/components/ui/Icons'
import { setUserBanned } from '../../actions'

type Filter = 'all' | 'student' | 'hirer' | 'banned' | 'incomplete'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Everyone' },
  { value: 'student', label: 'Students' },
  { value: 'hirer', label: 'Hirers' },
  { value: 'banned', label: 'Suspended' },
  { value: 'incomplete', label: 'Never onboarded' },
]

export function UserTable({ users }: { users: AdminUser[] }) {
  const [result, act] = useActionState<ActionResult | null, FormData>(setUserBanned, null)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const shown = users.filter((u) => {
    if (filter === 'banned' && !u.is_banned) return false
    if (filter === 'incomplete' && u.onboarded_at) return false
    if ((filter === 'student' || filter === 'hirer') && u.role !== filter) return false
    if (!q) return true
    return (
      (u.full_name ?? '').toLowerCase().includes(q) ||
      (u.email ?? '').toLowerCase().includes(q) ||
      (u.department ?? '').toLowerCase().includes(q)
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
            placeholder="Search name, email or department…"
            className="w-full rounded-xl border border-line bg-ink/70 py-2 pl-10 pr-3.5 text-[13px] text-chalk outline-none transition-colors placeholder:text-dimmer hover:border-[#2c344a] focus:border-cyan/60"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                filter === f.value
                  ? 'border-cyan/45 bg-cyan/15 text-cyan'
                  : 'border-line bg-white/[0.03] text-mist hover:border-cyan/30 hover:text-chalk'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {result && (
        <Notice tone={result.ok ? 'success' : 'error'}>{result.message}</Notice>
      )}

      <Panel className="divide-y divide-line/70 p-0">
        {shown.length === 0 && (
          <p className="px-4 py-10 text-center text-[13px] text-dim">
            No account matches that.
          </p>
        )}

        {shown.map((user) => (
          <div key={user.id} className="flex flex-wrap items-center gap-3 p-4">
            <Avatar name={user.full_name} src={user.avatar_url} size="md" />

            <div className="min-w-[180px] flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/profile/${user.id}`}
                  className="text-[13.5px] font-medium text-chalk hover:text-cyan"
                >
                  {user.full_name ?? 'Unnamed'}
                </Link>
                <Badge tone={user.role === 'student' ? 'cyan' : 'violet'}>
                  {ROLE_LABEL[user.role]}
                </Badge>
                {user.is_banned && <Badge tone="rose">Suspended</Badge>}
                {!user.onboarded_at && <Badge tone="amber">Not onboarded</Badge>}
              </div>
              <p className="hud mt-1 truncate text-[11.5px] text-dim">
                {user.email ?? 'email unavailable'}
              </p>
              {(user.department || user.year) && (
                <p className="mt-0.5 text-[11.5px] text-dimmer">
                  {user.department}
                  {user.department && user.year ? ' · ' : ''}
                  {user.year ? `Year ${user.year}` : ''}
                </p>
              )}
            </div>

            <div className="hud flex shrink-0 gap-4 text-[11.5px] text-dim">
              <span title="Quests posted">
                <span className="text-chalk">{user.quests_posted}</span> posted
              </span>
              <span title="Applications sent">
                <span className="text-chalk">{user.applications_sent}</span> applied
              </span>
              <span title="Average rating">
                <span className="text-amber">
                  {user.rating_count ? user.rating.toFixed(1) : '—'}
                </span>{' '}
                ★
              </span>
            </div>

            <div className="shrink-0 text-right text-[11px] text-dimmer">
              <p>joined {relativeTime(user.created_at)}</p>
              {user.last_sign_in_at && <p>seen {relativeTime(user.last_sign_in_at)}</p>}
            </div>

            <form action={act} className="shrink-0">
              <input type="hidden" name="user_id" value={user.id} />
              <input type="hidden" name="banned" value={user.is_banned ? 'false' : 'true'} />
              <SubmitButton
                size="sm"
                variant={user.is_banned ? 'secondary' : 'danger'}
                pendingLabel="…"
              >
                {user.is_banned ? (
                  'Restore'
                ) : (
                  <>
                    <IconShield className="size-3.5" />
                    Suspend
                  </>
                )}
              </SubmitButton>
            </form>
          </div>
        ))}
      </Panel>

      <p className="text-[11.5px] text-dim">
        Showing {shown.length} of {users.length}. Suspending keeps the account and its history —
        every write is refused while the flag is set.
      </p>
    </div>
  )
}
