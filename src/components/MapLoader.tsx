'use client'

import dynamic from 'next/dynamic'
import type { QuestWithRelations } from '@/lib/types'

/*
 * `dynamic(..., { ssr: false })` is only legal inside a Client Component, so
 * this thin wrapper exists purely to hold the import. Leaflet reads `window`
 * the moment it is evaluated, which would throw during prerender.
 */
const QuestMap = dynamic(() => import('@/components/QuestMap'), {
  ssr: false,
  loading: () => (
    <div
      className="grid w-full place-items-center rounded-[var(--radius-card)] border border-line bg-ink/60"
      style={{ height: 'min(70dvh, 620px)' }}
    >
      <div className="flex items-center gap-2.5 text-[13px] text-dim">
        <span className="size-3.5 animate-spin rounded-full border-2 border-cyan/30 border-t-cyan" />
        Loading map tiles…
      </div>
    </div>
  ),
})

export function MapLoader({
  quests,
  height,
  focusId,
}: {
  quests: QuestWithRelations[]
  height?: string
  focusId?: string
}) {
  return <QuestMap quests={quests} height={height} focusId={focusId} />
}
