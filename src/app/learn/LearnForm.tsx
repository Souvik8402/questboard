'use client'

import { useActionState } from 'react'
import { coachAction, type CoachResult } from './actions'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { Notice } from '@/components/ui/Panel'
import { IconSparkles } from '@/components/ui/Icons'

/**
 * The free skill coach. Three inputs, one server action that builds a 5-step
 * plan — from Gemini when a key is configured, from a built-in curriculum in
 * demo mode. The two render identically so the route never looks broken.
 */
export function LearnForm() {
  const [state, submit, pending] = useActionState<CoachResult | null, FormData>(coachAction, null)

  const errorFor = (field: string) =>
    state && !state.ok && state.field === field ? state.message : undefined
  const generalError = state && !state.ok && !state.field ? state.message : undefined

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      {/* ── Inputs ─────────────────────────────────────────────────────────── */}
      <form action={submit} className="space-y-4">
        <Field
          label="Skill you want to learn"
          required
          error={errorFor('skill')}
          htmlFor="skill"
          hint="One skill at a time. “React”, “spoken French”, “video editing”."
        >
          <Input
            id="skill"
            name="skill"
            placeholder="React"
            required
            maxLength={80}
          />
        </Field>

        <Field
          label="What you want to be able to do"
          required
          error={errorFor('goal')}
          htmlFor="goal"
          hint="The outcome, not the syllabus. “Build a landing page for a café”, “take calls from tourists”."
        >
          <Textarea
            id="goal"
            name="goal"
            placeholder="Build a booking page for a small shop"
            required
            maxLength={200}
          />
        </Field>

        <Field
          label="Hours you can give it each week"
          required
          error={errorFor('hours')}
          htmlFor="hours"
          hint="Be honest — a 3-hour plan beats a 20-hour plan you never start."
        >
          <Input
            id="hours"
            name="hours"
            type="number"
            inputMode="numeric"
            min={1}
            max={40}
            defaultValue={5}
            placeholder="5"
            required
          />
        </Field>

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          <IconSparkles className="size-4" />
          {pending ? 'Making your plan…' : 'Build my plan'}
        </Button>

        {generalError && <Notice tone="error">{generalError}</Notice>}
        {state?.ok && (
          <p className="text-xs leading-relaxed text-dim">
            The plan is saved here in this conversation — copy it somewhere before you leave.
          </p>
        )}
      </form>

      {/* ── Result ─────────────────────────────────────────────────────────── */}
      <div className="min-h-[22rem]">
        {!state ? (
          <div className="glass flex h-full min-h-[22rem] flex-col items-center justify-center gap-3 rounded-card p-8 text-center">
            <span className="grid size-12 place-items-center rounded-2xl border border-cyan/25 bg-cyan/10 text-cyan">
              <IconSparkles className="size-5" />
            </span>
            <p className="text-[15px] font-medium text-chalk">Your plan lands here</p>
            <p className="max-w-xs text-[13.5px] leading-relaxed text-mist">
              Fill in the three boxes and hit build. You’ll get a 5-step path with free
              resources and a real rupees figure.
            </p>
          </div>
        ) : state.ok ? (
          <div className="space-y-3">
            <Notice tone={state.fromGemini ? 'success' : 'warn'}>
              {state.fromGemini
                ? 'From the live AI coach.'
                : 'Demo mode — the AI key is not set, so this is the built-in plan you would get until you add GEMINI_API_KEY.'}
            </Notice>
            <div className="glass rounded-card p-6">
              <pre className="whitespace-pre-wrap rounded-xl bg-void/60 p-5 font-sans text-[14px] leading-relaxed text-mist">
                {state.plan}
              </pre>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
