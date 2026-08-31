'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import type { AdminReview } from '@/lib/admin-queries'
import { relativeTime } from '@/lib/format'
import type { ActionResult } from '@/lib/types'
import { Avatar } from '@/components/Avatar'
import { StarRating } from '@/components/StarRating'
import { EmptyState, Notice, Panel } from '@/components/ui/Panel'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { IconStar } from '@/components/ui/Icons'
import { adminDeleteReview } from '../../actions'

export function ReviewList({ reviews }: { reviews: AdminReview[] }) {
  const [result, act] = useActionState<ActionResult | null, FormData>(adminDeleteReview, null)

  if (reviews.length === 0) {
    return (
      <EmptyState
        icon={<IconStar className="size-5" />}
        title="No reviews yet"
        blurb="Reviews appear once a quest is marked complete and one side rates the other."
      />
    )
  }

  return (
    <div className="space-y-3">
      {result && <Notice tone={result.ok ? 'success' : 'error'}>{result.message}</Notice>}

      <Panel className="divide-y divide-line/70 p-0">
        {reviews.map((review) => (
          <div key={review.id} className="flex flex-wrap items-start gap-3 p-4">
            <Avatar name={review.reviewer?.full_name} src={review.reviewer?.avatar_url} size="sm" />

            <div className="min-w-[200px] flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/profile/${review.reviewer_id}`}
                  className="text-[13px] font-medium text-chalk hover:text-cyan"
                >
                  {review.reviewer?.full_name ?? 'Someone'}
                </Link>
                <span className="text-[11.5px] text-dimmer">rated</span>
                <Link
                  href={`/profile/${review.reviewee_id}`}
                  className="text-[13px] font-medium text-chalk hover:text-cyan"
                >
                  {review.reviewee?.full_name ?? 'their counterparty'}
                </Link>
                <StarRating value={review.rating} size="sm" />
                <span className="text-[11px] text-dimmer">{relativeTime(review.created_at)}</span>
              </div>

              {review.comment ? (
                <p className="mt-1.5 text-[13px] leading-relaxed text-mist">{review.comment}</p>
              ) : (
                <p className="mt-1.5 text-[12.5px] italic text-dimmer">No comment left.</p>
              )}

              <Link
                href={`/quests/${review.quest_id}`}
                className="mt-1.5 inline-block text-[11.5px] text-dim hover:text-cyan"
              >
                View the quest →
              </Link>
            </div>

            <form action={act} className="shrink-0">
              <input type="hidden" name="review_id" value={review.id} />
              <SubmitButton size="sm" variant="danger" pendingLabel="…">
                Remove
              </SubmitButton>
            </form>
          </div>
        ))}
      </Panel>

      <p className="text-[11.5px] text-dim">
        Removing a review re-runs the rating trigger, so the profile average updates immediately.
      </p>
    </div>
  )
}
