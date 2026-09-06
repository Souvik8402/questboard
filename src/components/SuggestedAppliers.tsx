import Link from 'next/link'
import { cn } from '@/lib/cn'
import type { PublicProfile, Skill } from '@/lib/types'
import { Avatar } from '@/components/Avatar'
import { SkillChip, VerifiedBadge } from '@/components/ui/Badge'
import { EmptyState, Panel } from '@/components/ui/Panel'
import { IconSparkles, IconUsers } from '@/components/ui/Icons'

export interface Suggestion {
  profile: PublicProfile
  shared: Skill[]
}

/**
 * Suggested appliers (item 7).
 *
 * A hirer's profile and dashboard both answer the same question — who around here
 * can do the kind of thing I keep posting? The match is tag overlap between the
 * hirer's own gigs and people's profile skills, ranked by how many tags they share
 * and then by rating (`getSuggestedAppliers` in queries.ts).
 *
 * Deliberately not a "hire" button: there is no way to contact someone off a gig,
 * by design (item 5). The only route to them is to post work they can apply to,
 * which is what the footer says.
 */
export function SuggestedAppliers({
  suggestions,
  /** Shown to the hirer themselves, rather than to a visitor looking at them. */
  own = false,
  className,
}: {
  suggestions: Suggestion[]
  own?: boolean
  className?: string
}) {
  if (suggestions.length === 0) {
    return own ? (
      <EmptyState
        icon={<IconUsers className="size-5" />}
        title="No suggestions yet"
        blurb="Post a gig with a few tags on it and this fills up with people who carry those tags."
      />
    ) : null
  }

  return (
    <Panel className={cn('p-5', className)}>
      <p className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-chalk">
        <IconSparkles className="size-4 text-cyan" />
        {own ? 'People who match your gigs' : 'Appliers they tend to want'}
      </p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-dim">
        Matched on the tags {own ? 'you keep posting' : 'this hirer keeps posting'}.
      </p>

      <ul className="mt-4 space-y-3.5">
        {suggestions.map(({ profile, shared }) => {
          // De-duplicated because someone can carry the same tag through several
          // of the hirer's gigs, and the count is the ranking signal, not the list.
          const tags = [...new Map(shared.map((s) => [s.id, s])).values()].slice(0, 3)

          return (
            <li key={profile.id} className="flex items-start gap-3">
              <Avatar name={profile.full_name} src={profile.avatar_url} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Link
                    href={`/profile/${profile.id}`}
                    className="truncate text-[13.5px] font-medium text-chalk hover:text-cyan"
                  >
                    {profile.full_name ?? 'Someone'}
                  </Link>
                  {profile.id_verified_at && <VerifiedBadge label="Verified" />}
                </div>
                <p className="hud mt-0.5 text-[11.5px] text-dimmer">
                  {profile.rating_count > 0
                    ? `★ ${profile.rating.toFixed(1)} · ${profile.rating_count}`
                    : 'no reviews yet'}
                  {profile.department ? ` · ${profile.department}` : ''}
                </p>
                {tags.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {tags.map((s) => (
                      <SkillChip key={s.id} name={s.name} href={`/gigs?skills=${s.id}`} />
                    ))}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <p className="mt-4 border-t border-line pt-3 text-[12.5px] leading-relaxed text-dim">
        Nobody&rsquo;s phone number or email is on GigNest. Post a gig with these tags and they can
        apply — a private thread opens the moment you hire someone.
      </p>
    </Panel>
  )
}
