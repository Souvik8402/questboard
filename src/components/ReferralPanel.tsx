'use client'

import { useState } from 'react'
import { LoyaltyBadge } from '@/components/ui/Badge'
import { IconCopy, IconGift } from '@/components/ui/Icons'
import { Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'

/**
 * Item 9: the share-your-code card. One component so the dashboard, the profile
 * page and the landing page all produce the same link.
 *
 * The link points at /login?ref=<code>. The signup UI passes that code into
 * options.data, the handle_new_user() trigger resolves it back to a profile id
 * and stamps referred_by — once, at insert. When that count reaches 1 the
 * referrer earns the loyalty badge.
 */
export function ReferralPanel({
  code,
  referralCount,
  shareUrl,
  showBadgeOnProfile,
}: {
  code: string | null
  referralCount: number
  shareUrl: string
  showBadgeOnProfile?: boolean
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Old browsers / non-secure context. Select the text instead.
      const el = document.getElementById('referral-link')
      if (el) {
        const range = document.createRange()
        range.selectNodeContents(el)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)
      }
    }
  }

  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-chalk">
          <IconGift className="size-4 text-violet" />
          Refer a friend
        </p>
        {referralCount > 0 && (
          <span className="inline-flex shrink-0 items-center gap-2">
            <LoyaltyBadge />
            <span className="hud text-[12px] text-dimmer">
              {referralCount} {referralCount === 1 ? 'referral' : 'referrals'}
            </span>
          </span>
        )}
      </div>

      <p className="mt-2 text-[13.5px] leading-relaxed text-mist">
        Anyone who signs up through your link earns you the loyalty badge — no purchase, no quota,
        just people who joined because you introduced them. Share it on WhatsApp, in your group chat,
        anywhere.
      </p>

      {code ? (
        <div className="mt-4 flex items-center gap-2">
          <code
            id="referral-link"
            className="hud flex-1 truncate rounded-lg border border-line bg-black/[0.03] px-3 py-2.5 text-[13px] text-chalk"
            title={shareUrl}
          >
            {shareUrl}
          </code>
          <Button type="button" variant="secondary" size="sm" onClick={copy}>
            <IconCopy className="size-3.5" />
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      ) : (
        <p className="mt-4 text-[13px] text-dim">Your share link is not set up yet.</p>
      )}

      {showBadgeOnProfile && (
        <p className="mt-3 text-[12.5px] text-dim">
          The badge also shows on your public profile.
        </p>
      )}
    </Panel>
  )
}
