'use server'

import { revalidatePath } from 'next/cache'
import { requireSession } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/config'
import { DEPARTMENTS } from '@/lib/constants'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/types'
import {
  FieldError,
  intList,
  optionalText,
  requireEnum,
  requireText,
  runAction,
  text,
} from '@/lib/validate'

/**
 * Edit an existing profile.
 *
 * Deliberately cannot change `role`: switching between hirer and student runs
 * through /onboarding, which is where the institute-email check lives. Keeping
 * one path for that means one place to get it right.
 */
export async function updateProfile(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  return runAction(async () => {
    if (!isSupabaseConfigured) {
      throw new FieldError(
        'Demo mode — no database connected, so profile changes cannot be saved. Add your Supabase keys to .env.local.',
      )
    }

    const session = await requireSession('/profile/edit')
    const profile = session.profile
    if (!profile?.onboarded_at) {
      throw new FieldError('Finish onboarding first.')
    }

    const fullName = requireText(form, 'full_name', { label: 'Name', min: 2, max: 80 })
    const bio = optionalText(form, 'bio', { label: 'Bio', max: 600 })

    let department: string | null = profile.department
    let year: number | null = profile.year
    let skillIds: number[] | null = null

    if (profile.role === 'student') {
      department = requireEnum(
        form,
        'department',
        DEPARTMENTS as unknown as readonly string[],
        'department',
      )

      const parsedYear = Number(text(form, 'year'))
      if (!Number.isInteger(parsedYear) || parsedYear < 1 || parsedYear > 5) {
        throw new FieldError('Pick your year of study.', 'year')
      }
      year = parsedYear

      skillIds = intList(form, 'skills', 8)
      if (skillIds.length === 0) {
        throw new FieldError('Keep at least one skill — it is how hirers find you.', 'skills')
      }
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        bio,
        department,
        year,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.userId)

    if (error) throw new FieldError(error.message)

    // Replace the tag set wholesale — simpler and safer than diffing, and the
    // rows are tiny.
    if (skillIds) {
      await supabase.from('profile_skills').delete().eq('profile_id', session.userId)
      const { error: skillError } = await supabase
        .from('profile_skills')
        .insert(skillIds.map((skill_id) => ({ profile_id: session.userId, skill_id })))
      if (skillError) throw new FieldError(skillError.message, 'skills')
    }

    revalidatePath('/', 'layout')
    revalidatePath(`/profile/${session.userId}`)
    revalidatePath('/dashboard')

    return { ok: true, message: 'Profile updated.' }
  })
}
