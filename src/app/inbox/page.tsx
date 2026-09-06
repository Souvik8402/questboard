import type { Metadata } from 'next'
import Link from 'next/link'
import { demoSession, requireProfile } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/config'
import { GIG_STATUS_LABEL } from '@/lib/constants'
import { relativeTime } from '@/lib/format'
import { getThreads } from '@/lib/queries'
import { StatusPill } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState, Panel } from '@/components/ui/Panel'
import { IconChat, IconLock, IconSearch } from '@/components/ui/Icons'
import { Avatar } from '@/components/Avatar'

export const metadata: Metadata = {
  title: 'Inbox',
  description:
    'Your private gig threads. No phone numbers, no email addresses — everything stays on GigNest.',
}

/**
 * The inbox (item 5).
 *
 * One thread per gig, and a thread only exists once someone has been hired —
 * that is enforced by the `messages` RLS policy in schema.sql, not just by this
 * page. It is what lets the rest of the site promise that no phone number or
 * email address ever changes hands: this is the only channel.
 */
export default async function InboxPage() {
  const { userId, profile } = isSupabaseConfigured
    ? await requireProfile('/inbox')
    : demoSession()

  const threads = await getThreads(userId)
  const unread = threads.reduce((sum, t) => sum + t.unread, 0)

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <p className="eyebrow">Private threads</p>
          <h1 className="text-2xl font-semibold tracking-tight text-chalk sm:text-3xl">
            Inbox
            {unread > 0 && (
              <span className="ml-2.5 align-middle text-[13px] font-medium text-cyan">
                {unread} unread
              </span>
            )}
          </h1>
          <p className="max-w-xl text-[14.5px] leading-relaxed text-mist">
            A thread opens the moment someone is hired — one per gig, for the two of you only.
          </p>
        </div>
        <ButtonLink href="/gigs" variant="secondary" size="sm">
          <IconSearch className="size-3.5" />
          Find more work
        </ButtonLink>
      </div>

      <p className="mt-5 inline-flex items-start gap-2 rounded-xl border border-line bg-black/[0.02] px-4 py-3 text-[13px] leading-relaxed text-mist">
        <IconLock className="mt-0.5 size-3.5 shrink-0 text-cyan" />
        <span>
          Nobody on GigNest sees a phone number or an email address, on either side. Keep the
          conversation here: messages cannot be edited or deleted, so if a dispute is ever raised
          an admin can read exactly what was agreed.
        </span>
      </p>

      {threads.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<IconChat className="size-5" />}
            title="No threads yet"
            blurb={`Threads open when a hire happens — either you hire someone for a gig you posted, or a hirer picks you. Nothing to read until then, ${profile.full_name?.split(' ')[0] ?? 'yet'}.`}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <ButtonLink href="/gigs" size="sm">
                  Browse gigs
                </ButtonLink>
                <ButtonLink href="/gigs/new" variant="secondary" size="sm">
                  Post a gig
                </ButtonLink>
              </div>
            }
          />
        </div>
      ) : (
        <ul className="mt-6 space-y-2.5">
          {threads.map(({ gig, counterparty, last_message, unread: n }) => {
            const iAmHirer = gig.hirer_id === userId
            const mine = last_message?.sender_id === userId

            return (
              <li key={gig.id}>
                <Link href={`/inbox/${gig.id}`} className="block">
                  <Panel
                    className={`flex items-start gap-3.5 p-4 transition-colors hover:border-cyan/30 ${
                      n > 0 ? 'border-cyan/25 bg-cyan/[0.03]' : ''
                    }`}
                  >
                    <div className="relative shrink-0">
                      <Avatar
                        name={counterparty?.full_name}
                        src={counterparty?.avatar_url}
                        size="lg"
                      />
                      {n > 0 && (
                        <span
                          className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-cyan ring-2 ring-void"
                          aria-label={`${n} unread`}
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <p className="truncate text-[15px] font-semibold text-chalk">
                          {counterparty?.full_name ?? 'Someone'}
                        </p>
                        <span className="shrink-0 text-[11.5px] uppercase tracking-wider text-dimmer">
                          {iAmHirer ? 'you hired' : 'hired you'}
                        </span>
                        {last_message && (
                          <span className="ml-auto shrink-0 text-[12px] text-dim">
                            {relativeTime(last_message.created_at)}
                          </span>
                        )}
                      </div>

                      <p className="mt-0.5 truncate text-[13px] text-cyan">{gig.title}</p>

                      <p
                        className={`mt-1.5 line-clamp-2 text-[13.5px] leading-relaxed ${
                          n > 0 ? 'text-chalk' : 'text-mist'
                        }`}
                      >
                        {last_message
                          ? `${mine ? 'You: ' : ''}${last_message.body}`
                          : 'No messages yet — say hello and agree the details.'}
                      </p>

                      <div className="mt-2 flex items-center gap-2">
                        <StatusPill status={gig.status} />
                        <span className="text-[12px] text-dim">
                          {GIG_STATUS_LABEL[gig.status]}
                        </span>
                      </div>
                    </div>
                  </Panel>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
