'use client'

import { useActionState, useState } from 'react'
import { Field, Input, RadioCard } from '@/components/ui/Field'
import { Notice, Panel } from '@/components/ui/Panel'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { IconIdCard, IconLock } from '@/components/ui/Icons'
import { isValidAadhaar, isValidPan, normalizeAadhaar, normalizePan } from '@/lib/kyc'
import type { ActionResult, IdKind } from '@/lib/types'
import { submitId } from '../actions'

/**
 * The masked ID capture.
 *
 * Two things are worth knowing before editing this file:
 *
 * 1. The number is *never* a controlled value that gets sent anywhere but the
 *    action. There is no draft in localStorage, no query string, no analytics.
 * 2. The validity check below is a duplicate of `digestId()` on the server —
 *    duplicated deliberately, so a typo is caught before the number leaves the
 *    browser at all. The server check is the one that counts.
 *
 * `token` is set when this renders on /verify/[token], i.e. for someone who has
 * no account and is filling the form from a link a counterparty sent them.
 */
export function IdForm({ token }: { token?: string }) {
  const [result, action] = useActionState<ActionResult | null, FormData>(submitId, null)
  const [kind, setKind] = useState<IdKind>('pan')
  const [number, setNumber] = useState('')

  if (result?.ok) {
    return (
      <Notice tone="success" title="Sent for review">
        {result.message}
      </Notice>
    )
  }

  const fieldError = (name: string) =>
    result && !result.ok && result.field === name ? result.message : undefined
  const generalError = result && !result.ok && !result.field ? result.message : undefined

  // Empty is neither valid nor invalid — say nothing until there is something to
  // judge, so the field does not shout at you on the first keystroke.
  const looksValid =
    number.trim().length === 0
      ? null
      : kind === 'pan'
        ? isValidPan(number)
        : isValidAadhaar(number)

  const tail = looksValid
    ? (kind === 'pan' ? normalizePan(number) : normalizeAadhaar(number)).slice(-4)
    : null

  return (
    <Panel className="p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl border border-line bg-black/[0.03] text-cyan">
          <IconIdCard className="size-4.5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-chalk">Verify with a government ID</h2>
          <p className="mt-1 text-[14px] leading-relaxed text-mist">
            One ID is enough. An admin checks the name against your profile by hand, usually the
            same day, and then a{' '}
            <span className="font-medium text-teal">Verified</span> badge appears on your profile
            and on everything you post.
          </p>
        </div>
      </div>

      <form action={action} className="mt-5 space-y-4">
        {token && <input type="hidden" name="token" value={token} />}

        <Field label="Which ID" required>
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Radios rather than a select: two options, and each needs a line of
                explanation that a dropdown has nowhere to put. The `onChange` is
                only so the number field below can follow along. */}
            <RadioCard
              name="kind"
              value="pan"
              label="PAN card"
              blurb="Ten characters, e.g. ABCDE1234F. Fastest to check."
              defaultChecked
              onChange={() => setKind('pan')}
            />
            <RadioCard
              name="kind"
              value="aadhaar"
              label="Aadhaar"
              blurb="Twelve digits. We keep the last four and nothing else."
              onChange={() => setKind('aadhaar')}
            />
          </div>
        </Field>

        <Field
          label="Name exactly as printed on the ID"
          htmlFor="name_on_id"
          required
          error={fieldError('name_on_id')}
          hint="If this does not match your profile name, say why in your first message to the admin — a nickname on the account is fine, a different person is not."
        >
          <Input
            id="name_on_id"
            name="name_on_id"
            required
            minLength={2}
            maxLength={120}
            autoComplete="off"
            placeholder="ADITI RAGHAVAN"
          />
        </Field>

        <Field
          label={kind === 'pan' ? 'PAN number' : 'Aadhaar number'}
          htmlFor="id_number"
          required
          error={
            fieldError('id_number') ??
            (looksValid === false
              ? kind === 'pan'
                ? 'Five letters, four digits, one letter — check it again.'
                : 'Twelve digits, and the checksum has to work out. Check it again.'
              : undefined)
          }
          hint={
            looksValid && tail
              ? `Looks right. Only ••••${tail} and a one-way hash will be stored.`
              : 'Typed here and thrown away — the number itself is never written to the database.'
          }
        >
          <Input
            id="id_number"
            name="id_number"
            required
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            inputMode={kind === 'pan' ? 'text' : 'numeric'}
            placeholder={kind === 'pan' ? 'ABCDE1234F' : '2345 6789 0123'}
            className="hud tracking-wider"
          />
        </Field>

        {generalError && <Notice tone="error">{generalError}</Notice>}

        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton pendingLabel="Sending…" disabled={looksValid === false}>
            Submit for review
          </SubmitButton>
          <span className="inline-flex items-start gap-1.5 text-[12.5px] leading-relaxed text-dim">
            <IconLock className="mt-0.5 size-3 shrink-0" />
            Stored: your name, the ID type, the last four digits, a salted hash. Not stored: the
            number, a scan, or a photo.
          </span>
        </div>
      </form>
    </Panel>
  )
}
