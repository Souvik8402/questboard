'use client'

import { useActionState } from 'react'
import { DEPARTMENTS } from '@/lib/constants'
import type { ActionResult, Profile, Skill } from '@/lib/types'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { Notice, Panel } from '@/components/ui/Panel'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { TagPicker } from '@/components/TagPicker'
import { updateProfile } from './actions'

export function EditProfileForm({
  profile,
  skills,
  mySkillIds,
}: {
  profile: Profile
  skills: Skill[]
  mySkillIds: number[]
}) {
  const [result, action] = useActionState<ActionResult | null, FormData>(updateProfile, null)
  const isStudent = profile.role === 'student'

  const fieldError = (name: string) =>
    result && !result.ok && result.field === name ? result.message : undefined
  const generalError = result && !result.ok && !result.field ? result.message : undefined

  return (
    <form action={action} className="space-y-5">
      {result?.ok && (
        <Notice tone="success" title="Saved">
          {result.message} Your public profile reflects it immediately.
        </Notice>
      )}

      <Panel className="space-y-5 p-6">
        <div>
          <h2 className="text-base font-semibold text-chalk">About you</h2>
          <p className="mt-1 text-[14px] text-mist">
            This is what the other side sees before they decide to work with you.
          </p>
        </div>

        <Field label="Name" htmlFor="full_name" required error={fieldError('full_name')}>
          <Input
            id="full_name"
            name="full_name"
            required
            minLength={2}
            maxLength={80}
            defaultValue={profile.full_name ?? ''}
          />
        </Field>

        <Field
          label="Bio"
          htmlFor="bio"
          error={fieldError('bio')}
          hint={
            isStudent
              ? 'Up to 600 characters. Name things you have actually shipped or run — specifics beat adjectives.'
              : 'Up to 600 characters. Who you are and what kind of work you usually need. Students read this before applying.'
          }
        >
          <Textarea
            id="bio"
            name="bio"
            maxLength={600}
            className="min-h-32"
            defaultValue={profile.bio ?? ''}
            placeholder={
              isStudent
                ? 'Third-year Mechanical. Built the fest registration site last year, comfortable with React and Figma, and I answer messages fast.'
                : 'I run a café just outside the Lanka gate. I hire students for design, photography and occasional web work.'
            }
          />
        </Field>
      </Panel>

      {isStudent && (
        <>
          <Panel className="space-y-5 p-6">
            <div>
              <h2 className="text-base font-semibold text-chalk">At the institute</h2>
              <p className="mt-1 text-[14px] text-mist">
                Hirers use this to judge fit — a fourth-year Civil student reads differently on a
                site-survey gig.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Department" htmlFor="department" required error={fieldError('department')}>
                <Select id="department" name="department" defaultValue={profile.department ?? ''}>
                  <option value="" disabled>
                    Select department
                  </option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Year of study" htmlFor="year" required error={fieldError('year')}>
                <Select id="year" name="year" defaultValue={profile.year ? String(profile.year) : ''}>
                  <option value="" disabled>
                    Select year
                  </option>
                  {[1, 2, 3, 4, 5].map((y) => (
                    <option key={y} value={y}>
                      Year {y}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </Panel>

          <Panel className="space-y-5 p-6">
            <div>
              <h2 className="text-base font-semibold text-chalk">Your skills</h2>
              <p className="mt-1 text-[14px] text-mist">
                Your dashboard surfaces gigs matching these tags, so keep them honest — wrong tags
                mean wrong gigs.
              </p>
            </div>

            {fieldError('skills') && <Notice tone="error">{fieldError('skills')}</Notice>}

            <TagPicker
              skills={skills}
              defaultSelected={mySkillIds}
              max={8}
              label="Skill tags (at least one)"
            />
          </Panel>
        </>
      )}

      <Panel className="p-5">
        <p className="text-[14px] font-medium text-chalk">Account type</p>
        <p className="mt-1 text-[13.5px] leading-relaxed text-mist">
          You are set up as a{' '}
          <span className="text-chalk">{isStudent ? 'student' : 'hirer'}</span>. Switching roles
          re-checks your email against the institute domain, so it happens in{' '}
          <a href="/onboarding" className="text-cyan underline hover:text-chalk">
            onboarding
          </a>{' '}
          rather than here.
        </p>
      </Panel>

      {generalError && <Notice tone="error">{generalError}</Notice>}

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
        <a href={`/profile/${profile.id}`} className="text-[14px] text-dim hover:text-cyan">
          View public profile
        </a>
      </div>
    </form>
  )
}
