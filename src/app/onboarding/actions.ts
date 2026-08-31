'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/config'
import { DEPARTMENTS } from '@/lib/constants'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult, UserRole } from '@/lib/types'
import {
  FieldError,
  intList,
  optionalText,
  requireEnum,
  requireText,
  runAction,
  text,
} from '@/lib/validate'

const ROLES = ['student', 'hirer'] as const

/**
 * Finish setting up a profile: role, name, and the student extras.
 *
 * The `role = 'student'` branch is *not* trusted here. `guard_profile_changes()`
 * in Postgres re-checks the caller's email against the institute domains and
 * raises 42501 if it doesn't match, so a forged form field gets a database error
 * rather than a student account.
 */
export async function completeOnboarding(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    if (!isSupabaseConfigured) {
      return {
        ok: false,
        message: 'Demo mode — profiles cannot be saved. Add your Supabase keys to .env.local.',
      }
    }

    const session = await requireSession('/onboarding')
    const role: UserRole = requireEnum(form, 'role', ROLES, 'account type')
    const fullName = requireText(form, 'full_name', { label: 'Name', min: 2, max: 80 })
    const bio = optionalText(form, 'bio', { label: 'Bio', max: 600 })

    let department: string | null = null
    let year: number | null = null
    let skillIds: number[] = []

    if (role === 'student') {
      // Belt-and-braces: the UI hides this option, the database enforces it.
      if (!session.isStudentEligible) {
        throw new FieldError(
          'Your email is not an institute address, so the student role is not available. You can still hire.',
          'role',
        )
      }

      department = requireEnum(form, 'department', DEPARTMENTS as unknown as readonly string[], 'department')

      const rawYear = text(form, 'year')
      const parsedYear = Number(rawYear)
      if (!Number.isInteger(parsedYear) || parsedYear < 1 || parsedYear > 5) {
        throw new FieldError('Pick your year of study.', 'year')
      }
      year = parsedYear

      skillIds = intList(form, 'skills', 8)
      if (skillIds.length === 0) {
        throw new FieldError('Pick at least one skill — this is how hirers find you.', 'skills')
      }
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('profiles')
      .update({
        role,
        full_name: fullName,
        bio,
        department,
        year,
        onboarded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.userId)

    if (error) {
      // The institute-gate exception surfaces here; it is already human-readable.
      throw new FieldError(error.message, /institute|claim quests/i.test(error.message) ? 'role' : undefined)
    }

    if (role === 'student') {
      await supabase.from('profile_skills').delete().eq('profile_id', session.userId)
      if (skillIds.length > 0) {
        const { error: skillError } = await supabase
          .from('profile_skills')
          .insert(skillIds.map((skill_id) => ({ profile_id: session.userId, skill_id })))
        if (skillError) throw new FieldError(skillError.message, 'skills')
      }
    }

    revalidatePath('/', 'layout')

    const rawNext = text(form, 'next')
    const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard'
    redirect(next)
  })
}
