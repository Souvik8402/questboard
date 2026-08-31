import { QuestCardSkeleton } from '@/components/QuestCard'

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-2">
        <p className="eyebrow">Live board</p>
        <div className="h-9 w-72 animate-pulse rounded bg-white/[0.06]" />
      </div>
      <div className="mt-8 h-12 animate-pulse rounded-xl bg-white/[0.04]" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <QuestCardSkeleton key={i} index={i} />
        ))}
      </div>
    </div>
  )
}
