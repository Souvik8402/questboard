import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { ADMIN_COOKIE, adminConfigError, verifyAdminToken } from '@/lib/admin-session'
import { Notice, Panel } from '@/components/ui/Panel'
import { IconArrowLeft, IconLock, IconShield } from '@/components/ui/Icons'
import { AdminLoginForm } from './AdminLoginForm'

export const metadata: Metadata = {
  title: 'Admin',
  description: 'Password-gated moderation panel.',
  robots: { index: false, follow: false },
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams

  // Already unlocked? Skip the form.
  const jar = await cookies()
  if (await verifyAdminToken(jar.get(ADMIN_COOKIE)?.value)) {
    redirect(next?.startsWith('/admin') ? next : '/admin')
  }

  const configError = adminConfigError()
  const safeNext = next?.startsWith('/admin') && !next.startsWith('//') ? next : '/admin'

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 self-start text-[13px] text-dim transition-colors hover:text-cyan"
      >
        <IconArrowLeft className="size-3.5" />
        Back to QuestBoard
      </Link>

      <Panel className="mt-5 p-7" glow>
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-amber/30 bg-amber/10 text-amber">
            <IconShield className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-chalk">Admin panel</h1>
            <p className="text-[12.5px] text-dim">Moderation and platform stats</p>
          </div>
        </div>

        <div className="mt-6">
          {configError ? (
            <Notice tone="warn" title="Not configured yet">
              {configError}
              <span className="mt-2 block text-[12px] leading-relaxed">
                Add both <span className="hud">ADMIN_PASSWORD</span> and a 16-character{' '}
                <span className="hud">ADMIN_SECRET</span> to <span className="hud">.env.local</span>,
                then restart the dev server.
              </span>
            </Notice>
          ) : (
            <AdminLoginForm next={safeNext} />
          )}
        </div>

        <p className="mt-6 flex items-start gap-2 border-t border-line pt-5 text-[11.5px] leading-relaxed text-dim">
          <IconLock className="mt-0.5 size-3.5 shrink-0" />
          <span>
            The session is an HMAC-signed, httpOnly cookie valid for 8 hours — page JavaScript
            cannot read it, and it cannot be forged without <span className="hud">ADMIN_SECRET</span>
            . A password gate is the prototype stand-in for real admin roles.
          </span>
        </p>
      </Panel>
    </div>
  )
}
