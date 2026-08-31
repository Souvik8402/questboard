import { type NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE, verifyAdminToken } from './lib/admin-session'
import { updateSession } from './lib/supabase/middleware'

/**
 * Two jobs:
 *   1. gate /admin/* behind the signed admin cookie
 *   2. refresh the Supabase auth token on every request
 *
 * The admin gate is repeated in src/app/admin/layout.tsx — belt and braces, so
 * a matcher mistake here can never expose the panel.
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const authorized = await verifyAdminToken(request.cookies.get(ADMIN_COOKIE)?.value)
    if (!authorized) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      url.search = ''
      if (pathname !== '/admin') url.searchParams.set('next', pathname)
      return NextResponse.redirect(url)
    }
  }

  return updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image files. Auth cookies must be
     * refreshed on real page loads, not on every icon fetch.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)',
  ],
}
