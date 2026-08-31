import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { cn } from '@/lib/cn'
import { getQuests, getSkills } from '@/lib/queries'
import { filtersToQuery, parseFilters, type Params } from '@/lib/search-params'
import { QuestCard } from '@/components/QuestCard'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Panel'
import { IconSearch } from '@/components/ui/Icons'
import { FilterBar } from './_components/FilterBar'

export const metadata: Metadata = {
  title: 'Quest board',
  description:
    'Every open quest on QuestBoard — filter by skill, type, reward and location. Paid work for IIT BHU students.',
}

export default async function QuestsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams
  const filters = parseFilters(params)

  const [{ quests, total, page, pageCount }, skills] = await Promise.all([
    getQuests(filters),
    getSkills(),
  ])

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="eyebrow">Live board</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            <span className="text-chalk">Find your </span>
            <span className="gradient-text">next quest</span>
          </h1>
          <p className="max-w-xl text-[14.5px] leading-relaxed text-mist">
            Every open posting, newest first. Narrow it with the skill tags you actually have.
          </p>
        </div>
        <ButtonLink href="/quests/new" variant="outline" size="sm">
          Post a quest
        </ButtonLink>
      </div>

      <div className="mt-8">
        <Suspense fallback={<div className="h-32" />}>
          <FilterBar skills={skills} filters={filters} total={total} />
        </Suspense>
      </div>

      {quests.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<IconSearch className="size-5" />}
            title="No quests match those filters"
            blurb="Try clearing a tag or two, widening the reward band, or searching a broader word."
            action={
              <ButtonLink href="/quests" variant="secondary" size="sm">
                Clear all filters
              </ButtonLink>
            }
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quests.map((q, i) => (
            <QuestCard key={q.id} quest={q} index={i} />
          ))}
        </div>
      )}

      {pageCount > 1 && <Pagination page={page} pageCount={pageCount} filters={filters} />}
    </div>
  )
}

function Pagination({
  page,
  pageCount,
  filters,
}: {
  page: number
  pageCount: number
  filters: ReturnType<typeof parseFilters>
}) {
  // Window of at most 5 page numbers around the current page.
  const start = Math.max(1, Math.min(page - 2, pageCount - 4))
  const end = Math.min(pageCount, start + 4)
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i)

  const href = (n: number) => `/quests${filtersToQuery(filters, { page: n > 1 ? n : undefined })}`

  return (
    <nav className="mt-10 flex items-center justify-center gap-1.5" aria-label="Pagination">
      {page > 1 && (
        <Link
          href={href(page - 1)}
          className="rounded-lg border border-line bg-white/[0.02] px-3 py-2 text-[13px] text-mist transition-colors hover:border-cyan/40 hover:text-chalk"
        >
          Previous
        </Link>
      )}
      {pages.map((n) => (
        <Link
          key={n}
          href={href(n)}
          aria-current={n === page ? 'page' : undefined}
          className={cn(
            'hud min-w-9 rounded-lg border px-3 py-2 text-center text-[13px] transition-colors',
            n === page
              ? 'border-cyan/50 bg-cyan/12 text-cyan'
              : 'border-line bg-white/[0.02] text-mist hover:border-cyan/30 hover:text-chalk',
          )}
        >
          {n}
        </Link>
      ))}
      {page < pageCount && (
        <Link
          href={href(page + 1)}
          className="rounded-lg border border-line bg-white/[0.02] px-3 py-2 text-[13px] text-mist transition-colors hover:border-cyan/40 hover:text-chalk"
        >
          Next
        </Link>
      )}
    </nav>
  )
}
