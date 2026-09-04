'use client'

import { useActionState } from 'react'
import { relativeTime } from '@/lib/format'
import type { ActionResult, ApplicationWithRelations, GigStatus } from '@/lib/types'
import { ApplicationPill } from '@/components/ui/Badge'
import { Notice, Panel } from '@/components/ui/Panel'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { UserChip } from '@/components/Avatar'
import { IconCheck, IconPhone, IconX } from '@/components/ui/Icons'
import { acceptApplicant, rejectApplicant } from '../actions'

/**
 * Hirer's view of who applied. Only the gig owner ever gets rows here —
 * the RLS SELECT policy on `applications` returns nothing to anyone else.
 */
export function ApplicantList({
  gigId,
  status,
  applications,
}: {
  gigId: string
  status: GigStatus
  applications: ApplicationWithRelations[]
}) {
  const [result, act] = useActionState<ActionResult | null, FormData>(async (prev, form) => {
    const intent = form.get('intent')
    return intent === 'accept' ? acceptApplicant(prev, form) : rejectApplicant(prev, form)
  }, null)

  const pending = applications.filter((a) => a.status === 'pending')
  const decided = applications.filter((a) => a.status !== 'pending')
  const canDecide = status === 'open'

  return (
    <Panel className="p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-chalk">
          Applicants{' '}
          <span className="hud text-sm text-dim">
            {applications.length > 0 ? `· ${applications.length}` : ''}
          </span>
        </h2>
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
          {result && (
            <div className="mt-3">
              <Notice tone={result.ok ? 'success' : 'error'}>{result.message}</Notice>
            </div>
          )}

          <ul className="mt-4 space-y-3">
            {[...pending, ...decided].map((application) => (
              <li
                key={application.id}
                className="rounded-xl border border-line bg-white/[0.02] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <UserChip
                    profile={application.student}
                    size="md"
                    meta={
                      application.student?.department
                        ? `${application.student.department}${
                            application.student.year ? ` · Year ${application.student.year}` : ''
                          }`
                        : undefined
                    }
                  />
                  <div className="flex items-center gap-2">
                    <ApplicationPill status={application.status} />
                    <span className="text-[12px] text-dimmer">
                      {relativeTime(application.created_at)}
                    </span>
                  </div>
                </div>

                <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed text-mist">
                  {application.cover_note}
                </p>

                {application.phone && (
                  <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-lime/25 bg-lime/[0.07] px-2.5 py-1.5 text-[13.5px] text-lime">
                    <IconPhone className="size-3.5" />
                    <a href={`tel:${application.phone.replace(/\s/g, '')}`} className="hud">
                      {application.phone}
                    </a>
                  </p>
                )}

                {canDecide && application.status === 'pending' && (
                  <form action={act} className="mt-4 flex flex-wrap items-center gap-2">
                    <input type="hidden" name="gigId" value={gigId} />
                    <input type="hidden" name="applicationId" value={application.id} />
                    <SubmitButton name="intent" value="accept" size="sm">
                      <IconCheck className="size-3.5" />
                      Hire {application.student?.full_name?.split(' ')[0] ?? 'them'}
                    </SubmitButton>
                    <SubmitButton name="intent" value="reject" size="sm" variant="ghost">
                      <IconX className="size-3.5" />
                      Decline
                    </SubmitButton>
                    <span className="text-[12px] text-dimmer">
                      Hiring auto-declines everyone else and reveals both phone numbers.
                    </span>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  )
}
