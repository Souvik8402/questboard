'use client'

import { useActionState, useState } from 'react'
import { cn } from '@/lib/cn'
import { DEPARTMENTS } from '@/lib/constants'
import type { ActionResult, Profile, Skill } from '@/lib/types'
import { TagPicker } from '@/components/TagPicker'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { Notice } from '@/components/ui/Panel'
import { IconBriefcase, IconCheck, IconLock, IconUsers } from '@/components/ui/Icons'
import { completeOnboarding } from './actions'

const YEARS = [1, 2, 3, 4, 5]

export function OnboardingForm({
  profile,
  email,
  eligible,
  skills,
  next,
  presetRole,
}: {
  profile: Profile
  email: string | null
  eligible: boolean
  skills: Skill[]
  next: string
  presetRole: 'student' | 'hirer'
}) {
  const [role, setRole] = useState<'student' | 'hirer'>(presetRole)
  const [state, submit, pending] = useActionState<ActionResult | null, FormData>(
    completeOnboarding,
    null,
  )

  const errorFor = (field: string) =>
    state && !state.ok && state.field === field ? state.message : undefined
  const generalError = state && !state.ok && !state.field ? state.message : undefined

  return (
    <form action={submit} className="space-y-7">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="role" value={role} />

      {generalError && <Notice tone="error">{generalError}</Notice>}

      {/* ── Role ─────────────────────────────────────────────────────────── */}
      <fieldset className="space-y-3">
        <legend className="text-[13px] font-medium text-chalk">
          What are you here to do?
          <span className="ml-1 text-rose/80">*</span>
        </legend>

        <div className="grid gap-3 sm:grid-cols-2">
          <RoleCard
            active={role === 'student'}
            disabled={!eligible}
            onClick={() => eligible && setRole('student')}
            icon={<IconUsers className="size-5" />}
            title="Take on gigs"
            blurb={
              eligible
                ? 'Find paid work that matches your skills. Verified student account.'
                : 'Needs an @itbhu.ac.in Google sign-in. Your current email is not eligible.'
            }
            badge={eligible ? 'Verified · eligible' : 'Locked'}
            tone="violet"
          />
          <RoleCard
            active={role === 'hirer'}
            onClick={() => setRole('hirer')}
            icon={<IconBriefcase className="size-5" />}
            title="Post gigs and hire"
            blurb="Advertise work and pick from applicants. Open to everyone."
            badge="Always available"
            tone="cyan"
          />
        </div>

        {errorFor('role') && <p className="text-xs text-rose">{errorFor('role')}</p>}

        {!eligible && (
          <Notice tone="info">
            You are signed in as <span className="hud">{email ?? 'an unknown address'}</span>. Only{' '}
            <span className="hud">@itbhu.ac.in</span> accounts can claim gigs — that restriction is
            enforced in the database, not just here. You can still post as many gigs as you like.
          </Notice>
        )}
      </fieldset>

      <div className="hairline" />

      {/* ── Identity ─────────────────────────────────────────────────────── */}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" required error={errorFor('full_name')} htmlFor="full_name">
          <Input
            id="full_name"
            name="full_name"
            defaultValue={profile.full_name ?? ''}
            placeholder="Aarav Sharma"
            required
            maxLength={80}
            autoComplete="name"
          />
        </Field>

        <Field label="Signed in as" hint="Comes from your sign-in and cannot be edited here.">
          <Input value={email ?? '—'} readOnly disabled className="hud" />
        </Field>
      </div>

      {/* ── Student extras ───────────────────────────────────────────────── */}
      {role === 'student' && (
        <div className="space-y-5 rounded-xl border border-violet/20 bg-violet/[0.04] p-5">
          <p className="eyebrow">Student details</p>

          <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
            <Field label="Department" required error={errorFor('department')} htmlFor="department">
              <Select
                id="department"
                name="department"
                defaultValue={profile.department ?? ''}
                required
              >
                <option value="" disabled>
                  Select your department
                </option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Year" required error={errorFor('year')} htmlFor="year">
              <Select id="year" name="year" defaultValue={profile.year?.toString() ?? ''} required>
                <option value="" disabled>
                  Year
                </option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div>
            <TagPicker
              skills={skills}
              max={8}
              label="Your skills"
              hint="Pick up to 8. These decide which gigs surface for you — and which students a hirer finds when they filter."
            />
            {errorFor('skills') && <p className="mt-2 text-xs text-rose">{errorFor('skills')}</p>}
          </div>
        </div>
      )}

      <Field
        label="Short bio"
        hint={
          role === 'student'
            ? 'Two lines on what you are good at. Hirers read this before accepting.'
            : 'Optional. Who you are and what kind of work you usually post.'
        }
        error={errorFor('bio')}
        htmlFor="bio"
      >
        <Textarea
          id="bio"
          name="bio"
          defaultValue={profile.bio ?? ''}
          maxLength={600}
          rows={3}
          placeholder={
            role === 'student'
              ? 'Third-year CSE. I build React frontends and shoot short-form video. Two years of Technex design work.'
              : 'I run a café near Assi Ghat and hire students for design, social media and event help.'
          }
        />
      </Field>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" size="lg" disabled={pending} className="sm:w-auto">
          {pending ? 'Saving…' : role === 'student' ? 'Start claiming gigs' : 'Start posting gigs'}
        </Button>
        <p className="text-[12px] text-dim">You can change all of this later from your profile.</p>
      </div>
    </form>
  )
}

function RoleCard({
  active,
  disabled,
  onClick,
  icon,
  title,
  blurb,
  badge,
  tone,
}: {
  active: boolean
  disabled?: boolean
  onClick: () => void
  icon: React.ReactNode
  title: string
  blurb: string
  badge: string
  tone: 'violet' | 'cyan'
}) {
  const accent =
    tone === 'violet'
      ? { ring: 'border-violet/55 bg-violet/[0.08]', icon: 'text-violet', chip: 'text-violet' }
      : { ring: 'border-cyan/55 bg-cyan/[0.08]', icon: 'text-cyan', chip: 'text-cyan' }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        'relative rounded-xl border p-4 text-left transition-all',
        active ? accent.ring : 'border-line bg-white/[0.02]',
        disabled
          ? 'cursor-not-allowed opacity-55'
          : !active && 'hover:border-[#2f3852] hover:bg-white/[0.045]',
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn('mt-0.5 shrink-0', active ? accent.icon : 'text-mist')}>
          {disabled ? <IconLock className="size-5" /> : icon}
        </span>
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-chalk">{title}</p>
            {active && <IconCheck className={cn('size-3.5', accent.icon)} />}
          </div>
          <p className="text-[12.5px] leading-relaxed text-mist">{blurb}</p>
          <p
            className={cn(
              'hud text-[10.5px] uppercase tracking-wider',
              disabled ? 'text-dimmer' : active ? accent.chip : 'text-dim',
            )}
          >
            {badge}
          </p>
        </div>
      </div>
    </button>
  )
}
