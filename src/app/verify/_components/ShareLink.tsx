'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Notice, Panel } from '@/components/ui/Panel'
import { IconCheck, IconCopy, IconShield } from '@/components/ui/Icons'
import type { ActionResult } from '@/lib/types'
import { regenerateVerifyLink } from '../actions'

/**
 * Your own verification link, with a copy button and a Regenerate.
 *
 * This is the part of item 4 that makes the link *editable*: regenerating writes
 * a new uuid into `profiles.verify_token`, and the old URL stops resolving on the
 * next request. So a link pasted into the wrong WhatsApp group can be taken back
 * — which is only true because the column is unreadable through the API (see the
 * `revoke select (verify_token)` in schema.sql). If the token could be fetched,
 * rotating it would revoke nothing.
 */
export function ShareLink({ url, demo }: { url: string; demo: boolean }) {
  const [copied, setCopied] = useState(false)
  const [result, setResult] = useState<ActionResult | null>(null)
  const [pending, startTransition] = useTransition()

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access can be refused (an insecure origin, or a policy). Say
      // so rather than flashing a tick that did nothing.
      setResult({ ok: false, message: 'Your browser blocked the clipboard — select the link and copy it by hand.' })
    }
  }

  function regenerate() {
    startTransition(async () => {
      setResult(await regenerateVerifyLink())
    })
  }

  return (
    <Panel className="p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl border border-line bg-black/[0.03] text-cyan">
          <IconShield className="size-4.5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-chalk">Your verification link</h2>
          <p className="mt-1 text-[14px] leading-relaxed text-mist">
            Send this to anyone who wants proof of who you are — a hirer before you take their
            gig, an applier before you take theirs. It opens the ID form directly, with no
            account needed at the other end.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <code className="hud min-w-0 flex-1 truncate rounded-xl border border-line bg-black/[0.03] px-3.5 py-2.5 text-[13px] text-mist">
          {url}
        </code>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={copy}>
            {copied ? <IconCheck className="size-3.5" /> : <IconCopy className="size-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={regenerate}
            disabled={pending}
          >
            {pending ? 'Working…' : 'Regenerate'}
          </Button>
        </div>
      </div>

      <p className="mt-2.5 text-xs leading-relaxed text-dim">
        Regenerating kills the old URL immediately. Anyone still holding it gets a &ldquo;link no
        longer valid&rdquo; page, so it is worth doing if you ever paste it somewhere public.
      </p>

      {result && (
        <Notice tone={result.ok ? 'success' : 'error'} className="mt-4">
          {result.message}
        </Notice>
      )}

      {demo && (
        <Notice tone="warn" title="Demo mode" className="mt-4">
          This is the seeded token, so Regenerate cannot write a new one — but the link itself
          works: open it to see what the person you send it to would see.
        </Notice>
      )}
    </Panel>
  )
}
