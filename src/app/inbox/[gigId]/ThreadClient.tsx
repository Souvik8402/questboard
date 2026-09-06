'use client'

import { useEffect, useRef, useState } from 'react'
import { relativeTime } from '@/lib/format'
import type { ActionResult, MessageWithSender, PublicProfile } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Notice } from '@/components/ui/Panel'
import { IconLock, IconSend } from '@/components/ui/Icons'
import { Avatar } from '@/components/Avatar'
import { sendMessage } from '@/app/gigs/[id]/actions'

/**
 * The conversation itself (item 5).
 *
 * Holds the messages in state so a sent message appears immediately rather than
 * after a round trip. With Supabase keys present it calls the `sendMessage`
 * server action and the row is written for real; in demo mode there is nowhere
 * to write to, so it appends locally and says so plainly instead of pretending.
 */
export function ThreadClient({
  gigId,
  viewerId,
  me,
  initial,
  demo,
  closed,
}: {
  gigId: string
  viewerId: string
  me: PublicProfile | null
  initial: MessageWithSender[]
  demo: boolean
  /** Gig is finished or cancelled — the thread stays readable, not writable. */
  closed: boolean
}) {
  const [messages, setMessages] = useState<MessageWithSender[]>(initial)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [echoed, setEchoed] = useState(false)
  const [pending, setPending] = useState(false)

  const scroller = useRef<HTMLDivElement>(null)

  /*
   * A revalidation after a successful send brings back the server's own copy of
   * the thread. Take it only when it is genuinely longer than what we have, so a
   * re-render can never wipe a local echo that has nowhere to be saved.
   */
  useEffect(() => {
    setMessages((prev) => (initial.length > prev.length ? initial : prev))
  }, [initial])

  // Scroll inside the list rather than the page, so opening a thread does not
  // yank the gig header off screen.
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length])

  async function submit(form: FormData) {
    const body = String(form.get('body') ?? '').trim()
    if (!body) return

    setPending(true)
    setError(null)

    const echo: MessageWithSender = {
      id: `local-${Date.now()}`,
      gig_id: gigId,
      sender_id: viewerId,
      body,
      created_at: new Date().toISOString(),
      read_at: null,
      sender: me,
    }

    if (demo) {
      setMessages((prev) => [...prev, echo])
      setDraft('')
      setEchoed(true)
      setPending(false)
      return
    }

    const result: ActionResult = await sendMessage(null, form)
    if (result.ok) {
      setMessages((prev) => [...prev, echo])
      setDraft('')
    } else {
      setError(result.message)
    }
    setPending(false)
  }

  return (
    <div className="space-y-4">
      <div
        ref={scroller}
        className="glass max-h-[58vh] space-y-4 overflow-y-auto p-4 sm:p-5"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <p className="py-8 text-center text-[13.5px] text-dim">
            No messages yet. Open with what you need and when — it saves a day of back and forth.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === viewerId
            return (
              <div
                key={m.id}
                className={`flex items-end gap-2.5 ${mine ? 'flex-row-reverse' : ''}`}
              >
                <Avatar name={m.sender?.full_name} src={m.sender?.avatar_url} size="sm" />
                <div className={`max-w-[78%] ${mine ? 'text-right' : ''}`}>
                  <div
                    className={
                      mine
                        ? 'rounded-2xl rounded-br-md border border-cyan/25 bg-cyan/[0.08] px-3.5 py-2.5 text-left'
                        : 'rounded-2xl rounded-bl-md border border-line bg-black/[0.03] px-3.5 py-2.5'
                    }
                  >
                    <p className="whitespace-pre-line text-[14px] leading-relaxed text-chalk">
                      {m.body}
                    </p>
                  </div>
                  <p className="mt-1 px-1 text-[11.5px] text-dimmer">
                    {mine ? 'You' : (m.sender?.full_name?.split(' ')[0] ?? 'Them')} ·{' '}
                    {relativeTime(m.created_at)}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      {echoed && (
        <Notice tone="warn" title="Demo mode">
          Your message is showing here in the browser only — there is no database connected, so
          nothing was saved and the other side cannot see it. Add your Supabase keys to{' '}
          <span className="hud">.env.local</span> and this same composer writes a real row.
        </Notice>
      )}

      {error && <Notice tone="error">{error}</Notice>}

      {closed ? (
        <p className="text-[12.5px] leading-relaxed text-dim">
          This gig is closed, so the thread is read-only. It stays here as the record of what was
          agreed.
        </p>
      ) : (
        <form action={submit} className="space-y-2.5">
          <input type="hidden" name="gigId" value={gigId} />
          <textarea
            name="body"
            required
            minLength={1}
            maxLength={2000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask a question, confirm a time, or share a link…"
            className="min-h-24 w-full resize-y rounded-xl border border-line bg-white/80 px-3.5 py-2.5 text-sm leading-relaxed text-chalk shadow-[inset_0_1px_2px_rgba(122,116,106,0.08)] outline-none transition-colors placeholder:text-dimmer hover:border-[#bfb9b0] focus:border-cyan/60 focus:bg-white focus:ring-2 focus:ring-cyan/15"
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" size="sm" disabled={pending || draft.trim().length === 0}>
              {pending ? (
                <span className="size-3.5 animate-spin rounded-full border-2 border-current/25 border-t-current" />
              ) : (
                <IconSend className="size-3.5" />
              )}
              {pending ? 'Sending…' : 'Send'}
            </Button>
            <span className="inline-flex items-center gap-1.5 text-[12px] text-dim">
              <IconLock className="size-3" />
              {draft.length}/2000 · nobody else can read this thread
            </span>
          </div>
        </form>
      )}
    </div>
  )
}
