import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/admin-session'
import { adminDataAvailable } from '@/lib/admin-queries'
import { Notice } from '@/components/ui/Panel'
import { IconLogout, IconShield } from '@/components/ui/Icons'
import { adminLogout } from '../actions'

/**
 * Second gate.
 *
 * `src/middleware.ts` already redirects unauthenticated requests to
 * /admin/login. This repeats the check so a matcher typo there cannot expose
 * the panel — the service-role client lives behind this boundary.
 *
 * /admin/login sits outside the (panel) route group precisely so it does not
 * inherit this layout and lock itself out.
 */
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies()
  if (!(await verifyAdminToken(jar.get(ADMIN_COOKIE)?.value))) {
    redirect('/admin/login')
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-amber/30 bg-amber/10 text-amber">
            <IconShield className="size-4.5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-chalk">Admin panel</h1>
            <p className="text-[12px] text-dim">
              Service-role access · bypasses row-level security
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/" className="text-[13px] text-dim transition-colors hover:text-cyan">
            View site
          </Link>
          <form action={adminLogout}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white/[0.03] px-3 py-1.5 text-[12.5px] text-mist transition-colors hover:border-rose/35 hover:text-rose"
            >
              <IconLogout className="size-3.5" />
              Lock panel
            </button>
          </form>
        </div>
      </div>

      {!adminDataAvailable && (
        <div className="mt-5">
          <Notice tone="warn" title="Read-only demo data">
            The panel is showing the built-in sample dataset. Set{' '}
            <span className="hud">SUPABASE_SERVICE_ROLE_KEY</span> in{' '}
            <span className="hud">.env.local</span> to read and moderate your real project.
          </Notice>
        </div>
      )}

      <div className="mt-6">{children}</div>
    </div>
  )
}
