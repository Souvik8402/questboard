import type { Metadata } from 'next'
import Link from 'next/link'
import { demoSession, qualifiesForWaiver, requireProfile } from '@/lib/auth'
import { isSupabaseConfigured, siteUrl } from '@/lib/config'
import { DISPUTE_SLA_LABEL, ID_KIND_LABEL, INSTITUTE_NAME } from '@/lib/constants'
import { relativeTime } from '@/lib/format'
import { maskId } from '@/lib/kyc'
import { getMyVerifications, getMyVerifyToken } from '@/lib/queries'
import { VerificationPill } from '@/components/ui/Badge'
import { IconIdCard, IconScale, IconShield } from '@/components/ui/Icons'
import { Notice, Panel } from '@/components/ui/Panel'
import { IdForm } from './_components/IdForm'
import { ShareLink } from './_components/ShareLink'
import { WaiverForm } from './_components/WaiverForm'

export const metadata: Metadata = {
  title: 'Verification',
  description:
    'Prove who you are with a PAN or Aadhaar, share a verification link, and ask for the student fee waiver.',
  robots: { index: false, follow: false },
}

/*
 * One screen for "prove who you are". It carries three things that all answer the
 * same question from different sides:
 *
 *   · the link you send someone else, so they can check you (item 4)
 *   · your own ID, submitted masked, for an admin to check (item 4)
 *   · the student fee waiver, which is the *only* thing an institute email now
 *     unlocks (item 2)
 *
 * Nothing here is a gate on using GigNest. An unverified account can post and
 * apply exactly like a verified one — what verification buys is that other people
 * can see it, which is the whole trust story.
 */
export default async function VerifyPage() {
  const session = isSupabaseConfigured ? await requireProfile('/verify') : demoSession()
  const { userId, profile } = session

  const [token, verifications] = await Promise.all([
    getMyVerifyToken(),
    getMyVerifications(userId),
  ])

  const url = token ? `${siteUrl()}/verify/${token}` : null

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:py-16">
      <div className="space-y-3">
        <p className="eyebrow">Trust &amp; safety</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          <span className="text-chalk">Prove who </span>
          <span className="gradient-text">you are</span>
        </h1>
        <p className="max-w-2xl text-[16px] leading-relaxed text-mist">
          Money changes hands between people who have never met. Verification is how you stop
          being a stranger — and it cuts both ways, so you can ask the other side for theirs
          before you commit.
        </p>
      </div>

      {!isSupabaseConfigured && (
        <Notice tone="warn" title="Demo mode" className="mt-6">
          Signed in as a sample account, <span className="hud">{session.email}</span>. The
          validation on the ID form is real — try an invalid PAN and watch it refuse — but nothing
          is saved.
        </Notice>
      )}

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <IdForm />

          {verifications.length > 0 && (
            <Panel className="p-5 sm:p-6">
              <h2 className="text-base font-semibold text-chalk">What you have submitted</h2>
              <ul className="mt-4 space-y-3">
                {verifications.map((v) => (
                  <li
                    key={v.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-line bg-black/[0.02] px-3.5 py-3"
                  >
                    <IconIdCard className="size-4 shrink-0 text-dim" />
                    <span className="text-[14px] font-medium text-chalk">
                      {ID_KIND_LABEL[v.kind]}
                    </span>
                    <span className="hud text-[13px] tracking-wider text-mist">
                      {maskId(v.kind, v.last4)}
                    </span>
                    <span className="text-[13px] text-dim">
                      {v.decided_at
                        ? `decided ${relativeTime(v.decided_at)}`
                        : `sent ${relativeTime(v.created_at)}`}
                    </span>
                    <VerificationPill status={v.status} />
                    {v.note && (
                      <p className="w-full text-[13px] leading-relaxed text-mist">
                        Admin note: {v.note}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-3.5 text-xs leading-relaxed text-dim">
                The name and the last four digits are all that is on this list because they are all
                that exists. Re-submitting the same kind of ID replaces the row above rather than
                queueing a second one.
              </p>
            </Panel>
          )}
        </div>

        <div className="space-y-5">
          {url ? (
            <ShareLink url={url} demo={!isSupabaseConfigured} />
          ) : (
            <Notice tone="error" title="No link yet">
              Your account has no verification token. That happens if the profile row predates the
              column — run <code className="hud">supabase/schema.sql</code> again; the{' '}
              <code className="hud">alter table … add column if not exists</code> block backfills
              it.
            </Notice>
          )}

          <WaiverForm
            status={profile.fee_waiver_status}
            note={profile.fee_waiver_note}
            eligible={qualifiesForWaiver(session)}
          />

          <Panel className="p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold text-chalk">
              <IconShield className="size-4 text-teal" />
              What this does and does not prove
            </h2>
            <ul className="mt-3 space-y-2.5 text-[13.5px] leading-relaxed text-mist">
              <li>
                <span className="font-medium text-chalk">It proves</span> a real, named person put
                a real ID number behind this account, and that an admin looked at it. That is
                enough to make impersonation expensive.
              </li>
              <li>
                <span className="font-medium text-chalk">It does not prove</span> the number is
                genuinely theirs — that needs an Aadhaar authentication licence or a KYC provider,
                which the README explains in full. Read a badge as &ldquo;checked by hand&rdquo;,
                not as &ldquo;checked by UIDAI&rdquo;.
              </li>
              <li>
                <span className="font-medium text-chalk">If it goes wrong anyway</span>, either
                side can raise a dispute from the gig page. Average resolution:{' '}
                {DISPUTE_SLA_LABEL}.{' '}
                <Link
                  href="/about"
                  className="text-cyan underline decoration-cyan/40 hover:decoration-cyan"
                >
                  How that works
                </Link>
                .
              </li>
            </ul>
          </Panel>

          <div className="flex items-start gap-2.5 px-1 text-[13px] leading-relaxed text-dim">
            <IconScale className="mt-0.5 size-3.5 shrink-0" />
            <span>
              {INSTITUTE_NAME} students: the fee waiver is checked against your institute address,
              not against your ID. You can have one without the other.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
