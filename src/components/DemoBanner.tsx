import { isSupabaseConfigured } from '@/lib/config'

/**
 * Only renders when Supabase keys are missing. It's a load-bearing piece of
 * honesty: everything on screen is sample data in that state.
 */
export function DemoBanner() {
  if (isSupabaseConfigured) return null

  return (
    <div className="relative z-40 border-b border-amber/20 bg-amber/[0.07]">
      <div className="mx-auto flex max-w-7xl items-center gap-2.5 px-4 py-2 text-[12px] sm:px-6 lg:px-8">
        <span className="live-dot size-1.5 shrink-0 rounded-full bg-amber" />
        <p className="text-amber/90">
          <span className="font-semibold">Demo mode</span>
          <span className="hidden sm:inline">
            {' '}
            — showing sample quests. Add Supabase keys to <code className="hud">.env.local</code> to
            enable sign-in, posting and applying.
          </span>
          <span className="sm:hidden"> — sample data, sign-in disabled.</span>
        </p>
      </div>
    </div>
  )
}
