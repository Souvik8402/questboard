'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useState } from 'react'
import { GIG_TYPES } from '@/lib/constants'
import { compactRupees } from '@/lib/format'
import type { ActionResult, Skill } from '@/lib/types'
import { Field, Input, InputWithPrefix, Select, Textarea } from '@/components/ui/Field'
import { Notice, Panel } from '@/components/ui/Panel'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { IconBolt, IconLock, IconWifi } from '@/components/ui/Icons'
import { MapPicker } from '@/components/MapPicker'
import { TagPicker } from '@/components/TagPicker'
import { createGig } from './actions'

/** Rewards people actually accept, by type — anchors the number for hirers. */
const REWARD_HINTS: Record<string, string> = {
  one_time: 'Typical one-off: ₹500 – ₹8,000 depending on scope.',
  weekly: 'Typical weekly: ₹1,500 – ₹6,000 per week — quote the weekly figure.',
  monthly: 'Typical monthly: ₹4,000 – ₹20,000 — quote the monthly figure.',
  part_time: 'Typical part-time: ₹5,000 – ₹15,000 a month for 8–12 h a week.',
  internship: 'Typical stipend: ₹5,000 – ₹25,000 a month.',
}

export function NewGigForm({ skills }: { skills: Skill[] }) {
  const router = useRouter()
  const [result, action] = useActionState<ActionResult | null, FormData>(createGig, null)

  const [gigType, setGigType] = useState('one_time')
  const [isRemote, setIsRemote] = useState(false)
  const [reward, setReward] = useState('')

  // The action returns a destination rather than redirecting itself, so the
  // success notice gets a beat on screen before we navigate.
  useEffect(() => {
    if (result?.ok && result.redirectTo) {
      const to = result.redirectTo
      const t = setTimeout(() => router.push(to), 900)
      return () => clearTimeout(t)
    }
  }, [result, router])

  const fieldError = (name: string) =>
    result && !result.ok && result.field === name ? result.message : undefined
  const generalError = result && !result.ok && !result.field ? result.message : undefined

  const rewardNumber = Number(reward.replace(/[^\d]/g, ''))

  if (result?.ok) {
    return (
      <Notice tone="success" title="Gig posted">
        {result.message} Taking you to it…
      </Notice>
    )
  }

  return (
    <form action={action} className="space-y-5">
      {/* ── What ─────────────────────────────────────────────────────────── */}
      <Panel className="space-y-5 p-6">
        <div>
          <h2 className="text-base font-semibold text-chalk">The work</h2>
          <p className="mt-1 text-[14px] text-mist">
            Write it the way you would explain it to a friend. Vague posts get vague applicants.
          </p>
        </div>

        <Field
          label="Title"
          htmlFor="title"
          required
          error={fieldError('title')}
          hint="6–120 characters. Lead with the outcome, not the job title."
        >
          <Input
            id="title"
            name="title"
            required
            minLength={6}
            maxLength={120}
            placeholder="Rebuild our café website before the Diwali rush"
          />
        </Field>

        <Field
          label="Brief"
          htmlFor="description"
          required
          error={fieldError('description')}
          hint="20–4000 characters. What exists today, what you want, what “done” looks like."
        >
          <Textarea
            id="description"
            name="description"
            required
            minLength={20}
            maxLength={4000}
            className="min-h-40"
            placeholder={
              'We are a 30-seat café just outside the campus gate. Our current site is a single JPEG of the menu from 2019.\n\nWe want a proper responsive page: menu with prices, photo gallery, opening hours and a WhatsApp order button. Design is already done in Figma — we just need someone to build it and deploy it.'
            }
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type" htmlFor="gig_type" required error={fieldError('gig_type')}>
            <Select
              id="gig_type"
              name="gig_type"
              value={gigType}
              onChange={(e) => setGigType(e.target.value)}
            >
              {GIG_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label} — {t.blurb}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Reward"
            htmlFor="reward_amount"
            required
            error={fieldError('reward_amount')}
            hint={REWARD_HINTS[gigType]}
          >
            <InputWithPrefix
              prefix="₹"
              id="reward_amount"
              name="reward_amount"
              type="text"
              inputMode="numeric"
              required
              value={reward}
              onChange={(e) => setReward(e.target.value)}
              placeholder="6500"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Estimated hours"
            htmlFor="estimated_hours"
            error={fieldError('estimated_hours')}
            hint={
              rewardNumber > 0 ? 'Optional — but it lets students see the implied hourly rate.' : 'Optional.'
            }
          >
            <Input
              id="estimated_hours"
              name="estimated_hours"
              type="number"
              step="0.5"
              min="0.5"
              placeholder="14"
            />
          </Field>

          <Field
            label="Deadline"
            htmlFor="deadline"
            error={fieldError('deadline')}
            hint="Optional. Gigs under 48 hours out get flagged as urgent."
          >
            <Input id="deadline" name="deadline" type="datetime-local" />
          </Field>
        </div>
      </Panel>

      {/* ── Where ────────────────────────────────────────────────────────── */}
      <Panel className="space-y-5 p-6">
        <div>
          <h2 className="text-base font-semibold text-chalk">Where</h2>
          <p className="mt-1 text-[14px] text-mist">
            Students filter hard on distance. A pin roughly doubles your applicants.
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-black/[0.02] p-3.5 transition-colors hover:border-[#bfb9b0]">
          <input
            type="checkbox"
            name="is_remote"
            checked={isRemote}
            onChange={(e) => setIsRemote(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-line bg-ink accent-cyan"
          />
          <span className="space-y-0.5">
            <span className="flex items-center gap-1.5 text-[14px] font-medium text-chalk">
              <IconWifi className="size-3.5" />
              This can be done remotely
            </span>
            <span className="block text-xs leading-relaxed text-dim">
              No pin needed. Remote gigs do not appear in the map view.
            </span>
          </span>
        </label>

        {!isRemote && (
          <>
            <Field
              label="Location"
              htmlFor="location_label"
              error={fieldError('location_label')}
              hint="A landmark beats a full address — “Limbdi Corner, IIT BHU”, “Ravindrapuri Colony”."
            >
              <Input
                id="location_label"
                name="location_label"
                maxLength={160}
                placeholder="Limbdi Corner, IIT BHU"
              />
            </Field>

            <Field label="Drop a pin" hint="Optional. Click the map, drag the pin, or use your location.">
              <MapPicker />
            </Field>
          </>
        )}
      </Panel>

      {/* ── Who ──────────────────────────────────────────────────────────── */}
      <Panel className="space-y-5 p-6">
        <div>
          <h2 className="text-base font-semibold text-chalk">Who you need</h2>
          <p className="mt-1 text-[14px] text-mist">
            Tags are how people find you. Pick the ones that are genuinely required — over-tagging
            brings the wrong applicants.
          </p>
        </div>

        {fieldError('skills') && <Notice tone="error">{fieldError('skills')}</Notice>}

        <TagPicker
          skills={skills}
          max={8}
          label="Skill tags (at least one)"
          hint="Anyone browsing the board can filter by these."
        />
      </Panel>

      {/* ── How you decide (item 11) ─────────────────────────────────────── */}
      <Panel className="space-y-5 p-6">
        <div>
          <h2 className="text-base font-semibold text-chalk">How you pick someone</h2>
          <p className="mt-1 text-[14px] leading-relaxed text-mist">
            By default you see everyone who applied and choose whenever you like. Tick the box below
            if you need this done now.
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-black/[0.02] p-3.5 transition-colors hover:border-[#bfb9b0]">
          <input
            type="checkbox"
            name="is_urgent"
            className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-line bg-ink accent-cyan"
          />
          <span className="space-y-0.5">
            <span className="flex items-center gap-1.5 text-[14px] font-medium text-chalk">
              <IconBolt className="size-3.5" />
              Urgent — first come, first served
            </span>
            <span className="block text-xs leading-relaxed text-dim">
              Applicants queue in the order they arrive and you review the earliest one first. You
              still approve every hire: pass on someone and the next in line appears straight away.
              The gig also gets an Urgent badge on the board.
            </span>
          </span>
        </label>
      </Panel>

      {/* ── How you talk (item 5) ────────────────────────────────────────── */}
      <Panel className="space-y-3 p-6">
        <h2 className="text-base font-semibold text-chalk">How they reach you</h2>
        <p className="inline-flex items-start gap-1.5 text-[14px] leading-relaxed text-mist">
          <IconLock className="mt-0.5 size-3.5 shrink-0 text-cyan" />
          <span>
            You do not enter a phone number or an email anywhere on GigNest, and neither does
            anyone applying. The moment you hire someone, a{' '}
            <span className="text-chalk">private thread</span> opens between the two of you in your
            inbox. It cannot be edited or deleted, which is what makes it useful if a dispute is
            ever raised.
          </span>
        </p>
      </Panel>

      {generalError && <Notice tone="error">{generalError}</Notice>}

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton size="lg" pendingLabel="Posting…">
          Post gig{rewardNumber > 0 ? ` · ${compactRupees(rewardNumber)}` : ''}
        </SubmitButton>
        <p className="text-[13px] text-dim">
          You can cancel or edit it any time from your dashboard.
        </p>
      </div>
    </form>
  )
}
