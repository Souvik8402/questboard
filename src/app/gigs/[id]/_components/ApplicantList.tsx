'use client'

import { useActionState } from 'react'
import { earnedBadge, type ApplierStats } from '@/lib/badges'
import { relativeTime } from '@/lib/format'
import type { ActionResult, ApplicationWithRelations, GigStatus } from '@/lib/types'
import {
  AchievementBadge,
  ApplicationPill,
  Badge,
  SkillChip,
  VerifiedBadge,
} from '@/components/ui/Badge'
import { Notice, Panel } from '@/components/ui/Panel'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { UserChip } from '@/components/Avatar'
import { IconBolt, IconCheck, IconX } from '@/components/ui/Icons'
import { acceptApplicant, rejectApplicant } from '../actions'

/**
 * Hirer's view of who applied. Only the gig owner ever gets rows here —
 * the RLS SELECT policy on `applications` returns nothing to anyone else.
 *
 * Two modes:
 *
 *  • ordinary gig — every applicant at once, newest first, decide in any order.
 *  • urgent gig  — first-come-first-served. Only the *earliest* applicant still
 *    waiting is shown; passing on them surfaces the next. The hirer still
 *    approves, so urgency changes which applicant is presented, never whether a
 *    human said yes. No extra server action is needed for this: `rejectApplicant`
 *    marks that row rejected and the next one becomes the earliest on re-render.
 */
export function ApplicantList({
  gigId,
  status,
  isUrgent,
  applications,
  stats,
}: {
  gigId: string
  status: GigStatus
  isUrgent: boolean
  applications: ApplicationWithRelations[]
  /** Badge counts per applicant id, so a hirer can weigh experience inline. */
  stats: Record<string, ApplierStats>
}) {
  const [result, act] = useActionState<ActionResult | null, FormData>(async (prev, form) => {
    const intent = form.get('intent')
    return intent === 'accept' ? acceptApplicant(prev, form) : rejectApplicant(prev, form)
  }, null)

  // `applications` arrives oldest-first, which is the queue order.
  const pending = applications.filter((a) => a.status === 'pending')
  const decided = applications.filter((a) => a.status !== 'pending')
  const canDecide = status === 'open'
  const queueMode = isUrgent && canDecide && pending.length > 0

  // In queue mode only the head of the line is on screen.
  const shown = queueMode
    ? pending.slice(0, 1)
    : [...pending].reverse().concat([...decided].reverse())
  const waiting = queueMode ? pending.length - 1 : 0

  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-chalk">
          Applicants{' '}
          <span className="hud text-sm text-dim">
            {applications.length > 0 ? `· ${applications.length}` : ''}
          </span>
        </h2>
        {isUrgent && canDecide && (
          <Badge tone="rose" title="First-come-first-served: you review the earliest applicant first">
            <IconBolt className="size-3.5" />
            Urgent queue
          </Badge>
        )}
        {!canDecide && applications.length > 0 && (
          <span className="text-[12.5px] text-dim">Gig closed to new decisions</span>
        )}
      </div>

      {applications.length === 0 ? (
        <p className="mt-3 text-[14px] leading-relaxed text-mist">
          No applications yet. Gigs with a clear scope and an honest reward usually get their
          first one within a day.
        </p>
      ) : (
        <>
          {queueMode && (
            <p className="mt-3 text-[13.5px] leading-relaxed text-mist">
              You marked this urgent, so applicants are reviewed in the order they arrived. Below
              is the first in line. Pass, and the next one appears here straight away.
            </p>
          )}

          {result && (
            <div className="mt-3">
              <Notice tone={result.ok ? 'success' : 'error'}>{result.message}</Notice>
            </div>
          )}

          <ul className="mt-4 space-y-3">
            {shown.map((application, i) => {
              const applicant = application.student
              const badge = applicant ? earnedBadge(stats[applicant.id] ?? empty) : null

              return (
                <li
                  key={application.id}
                  className={
                    queueMode
                      ? 'rounded-xl border border-cyan/35 bg-cyan/[0.05] p-4'
                      : 'rounded-xl border border-line bg-black/[0.02] p-4'
                  }
                >
                  {queueMode && i === 0 && (
                    <p className="eyebrow mb-3 text-cyan">First in queue</p>
                  )}

                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <UserChip
                      profile={applicant}
                      size="md"
                      meta={
                        applicant?.department
                          ? `${applicant.department}${
                              applicant.year ? ` · Year ${applicant.year}` : ''
                            }`
                          : undefined
                      }
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      {badge && <AchievementBadge tier={badge} />}
                      {applicant?.id_verified_at && <VerifiedBadge label="ID verified" />}
                      <ApplicationPill status={application.status} />
                      <span className="text-[12px] text-dimmer">
                        {relativeTime(application.created_at)}
                      </span>
                    </div>
                  </div>

                  <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed text-mist">
                    {application.cover_note}
                  </p>

                  {application.student_skills && application.student_skills.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {application.student_skills.slice(0, 6).map((skill) => (
                        <SkillChip key={skill.id} name={skill.name} />
                      ))}
                    </div>
                  )}

                  {canDecide && application.status === 'pending' && (
                    <form action={act} className="mt-4 flex flex-wrap items-center gap-2">
                      <input type="hidden" name="gigId" value={gigId} />
                      <input type="hidden" name="applicationId" value={application.id} />
                      <SubmitButton name="intent" value="accept" size="sm">
                        <IconCheck className="size-3.5" />
                        Hire {applicant?.full_name?.split(' ')[0] ?? 'them'}
                      </SubmitButton>
                      <SubmitButton name="intent" value="reject" size="sm" variant="ghost">
                        <IconX className="size-3.5" />
                        {queueMode ? 'Pass' : 'Decline'}
                      </SubmitButton>
                      <span className="text-[12px] text-dimmer">
                        Hiring auto-declines everyone else and opens a private thread with them.
                      </span>
                    </form>
                  )}
                </li>
              )
            })}
          </ul>

          {waiting > 0 && (
            <p className="mt-3 text-[13px] text-dim">
              <span className="hud">{waiting}</span> {waiting === 1 ? 'person is' : 'people are'}{' '}
              waiting behind them.
            </p>
          )}
        </>
      )}
    </Panel>
  )
}

const empty: ApplierStats = { completed: 0, mentorships: 0, referrals: 0 }
