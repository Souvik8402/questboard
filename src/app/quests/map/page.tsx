import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { QUEST_TYPE_LABEL, rewardTier, REWARD_TIERS } from '@/lib/constants'
import { formatRupees } from '@/lib/format'
import { getMappableQuests, getSkills } from '@/lib/queries'
import { parseFilters, type Params } from '@/lib/search-params'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState, Panel } from '@/components/ui/Panel'
import { IconMapPin, IconWifi } from '@/components/ui/Icons'
import { MapLoader } from '@/components/MapLoader'
import { FilterBar } from '../_components/FilterBar'

export const metadata: Metadata = {
  title: 'Quest map',
  description:
    'Every quest around IIT (BHU) Varanasi plotted on a map — find paid work within walking distance.',
}

export default async function QuestMapPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams
  const filters = parseFilters(params)

  const [quests, skills] = await Promise.all([getMappableQuests(filters), getSkills()])

  // Remote quests have no coordinates, so they can never appear on the map.
  // Say so rather than letting them silently vanish from the count.
  const remoteHidden = filters.remoteOnly

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="eyebrow">Geo view</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            <span className="text-chalk">Quests </span>
            <span className="gradient-text">near you</span>
          </h1>
          <p className="max-w-xl text-[14.5px] leading-relaxed text-mist">
            Everything with a location, pinned. Colour tells you the reward tier — click a pin to
            open the quest.
          </p>
        </div>
        <ButtonLink href="/quests/new" variant="outline" size="sm">
          Post a quest
        </ButtonLink>
      </div>

      <div className="mt-8">
        <Suspense fallback={<div className="h-32" />}>
          <FilterBar skills={skills} filters={filters} total={quests.length} basePath="/quests/map" />
        </Suspense>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {quests.length === 0 ? (
            <EmptyState
              icon={<IconMapPin className="size-5" />}
              title={remoteHidden ? 'Remote quests have no map pin' : 'Nothing to plot yet'}
              blurb={
                remoteHidden
                  ? 'You filtered to remote-only work, which by definition happens anywhere. Switch to list view to see it.'
                  : 'No quest matching these filters has coordinates attached. Try clearing a filter, or browse the list.'
              }
              action={
                <ButtonLink href="/quests" variant="secondary" size="sm">
                  Open list view
                </ButtonLink>
              }
            />
          ) : (
            <MapLoader quests={quests} />
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-[11.5px] text-dim">
            <span className="uppercase tracking-wider text-dimmer">Reward tier</span>
            {REWARD_TIERS.map((t) => (
              <span key={t.tier} className="inline-flex items-center gap-1.5">
                <span className={`quest-pin tier-${t.tier} !size-3`}>
                  <i className="!size-2.5" />
                </span>
                {t.label}
              </span>
            ))}
            <span className="ml-auto inline-flex items-center gap-1.5">
              <IconWifi className="size-3.5" />
              Remote quests aren&apos;t pinned
            </span>
          </div>
        </div>

        <Panel className="max-h-[min(70dvh,620px)] overflow-y-auto p-0" glow={false}>
          <div className="sticky top-0 z-1 border-b border-line bg-panel/95 px-4 py-3 backdrop-blur">
            <p className="text-[13px] font-semibold text-chalk">
              {quests.length} pinned {quests.length === 1 ? 'quest' : 'quests'}
            </p>
            <p className="mt-0.5 text-[11.5px] text-dim">Sorted the same way as the board.</p>
          </div>
          <ul className="divide-y divide-line/70">
            {quests.map((q) => (
              <li key={q.id}>
                <Link
                  href={`/quests/${q.id}`}
                  className="block px-4 py-3 transition-colors hover:bg-white/[0.035]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="line-clamp-2 text-[13px] font-medium leading-snug text-chalk">
                      {q.title}
                    </p>
                    <span
                      className={`hud shrink-0 text-[12.5px] tier-${rewardTier(q.reward_amount)}`}
                      style={{ color: 'var(--tier)' }}
                    >
                      {formatRupees(q.reward_amount)}
                    </span>
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-[11.5px] text-dim">
                    <IconMapPin className="size-3" />
                    <span className="truncate">{q.location_label ?? 'Location on request'}</span>
                    <span className="text-dimmer">· {QUEST_TYPE_LABEL[q.quest_type]}</span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  )
}
