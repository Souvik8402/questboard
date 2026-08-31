'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/config'
import { QUEST_TYPES } from '@/lib/constants'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult, QuestType } from '@/lib/types'
import {
  FieldError,
  checkbox,
  intList,
  optionalDate,
  optionalNumber,
  optionalText,
  requireEnum,
  requireInt,
  requirePhone,
  requireText,
  runAction,
} from '@/lib/validate'

const TYPE_VALUES = QUEST_TYPES.map((t) => t.value) as QuestType[]

/**
 * Post a quest.
 *
 * Anyone signed in may post — the exclusivity is on *claiming*, not offering.
 * A phone number is mandatory, but it lands in `quest_contacts`, which RLS
 * keeps hidden until the hirer accepts an applicant.
 */
export async function createQuest(_prev: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    if (!isSupabaseConfigured) {
      throw new FieldError(
        'Demo mode — no database connected, so the quest cannot be saved. Add your Supabase keys to .env.local to make this live.',
      )
    }

    const session = await getSession()
    if (!session) throw new FieldError('Sign in first — your session may have expired.')
    if (!session.profile?.onboarded_at) {
      throw new FieldError('Finish setting up your profile before posting.')
    }
    if (session.profile.is_banned) {
      throw new FieldError('Your account is suspended, so you cannot post.')
    }

    const title = requireText(form, 'title', { label: 'Title', min: 6, max: 120 })
    const description = requireText(form, 'description', {
      label: 'Description',
      min: 20,
      max: 4000,
    })
    const questType = requireEnum(form, 'quest_type', TYPE_VALUES, 'quest type')
    const reward = requireInt(form, 'reward_amount', {
      label: 'Reward',
      min: 0,
      max: 10_000_000,
    })
    const estimatedHours = optionalNumber(form, 'estimated_hours', {
      label: 'Estimated hours',
      min: 0.5,
      max: 9999,
    })
    const deadline = optionalDate(form, 'deadline', 'Deadline')
    const isRemote = checkbox(form, 'is_remote')
    const locationLabel = optionalText(form, 'location_label', {
      label: 'Location',
      max: 160,
    })
    const lat = optionalNumber(form, 'lat', { label: 'Latitude', min: -90, max: 90 })
    const lng = optionalNumber(form, 'lng', { label: 'Longitude', min: -180, max: 180 })
    const skills = intList(form, 'skills', 8)
    const phone = requirePhone(form, 'phone')
    const altContact = optionalText(form, 'alt_contact', { label: 'Alternate contact', max: 160 })

    if (!isRemote && !locationLabel && lat === null) {
      throw new FieldError(
        'Say where the work happens — a landmark is enough — or tick “remote”.',
        'location_label',
      )
    }
    if (skills.length === 0) {
      throw new FieldError('Pick at least one skill tag so the right students find this.', 'skills')
    }

    const supabase = await createClient()

    const { data: quest, error } = await supabase
      .from('quests')
      .insert({
        hirer_id: session.userId,
        title,
        description,
        quest_type: questType,
        reward_amount: reward,
        estimated_hours: estimatedHours,
        deadline,
        is_remote: isRemote,
        location_label: locationLabel,
        // A pin only makes sense for on-site work.
        lat: isRemote ? null : lat,
        lng: isRemote ? null : lng,
      })
      .select('id')
      .single<{ id: string }>()

    if (error) throw new Error(error.message)

    // Tags and the phone number are separate inserts. If either fails the quest
    // still exists, so report it instead of pretending everything worked.
    const [{ error: skillError }, { error: contactError }] = await Promise.all([
      supabase
        .from('quest_skills')
        .insert(skills.map((skillId) => ({ quest_id: quest.id, skill_id: skillId }))),
      supabase
        .from('quest_contacts')
        .insert({ quest_id: quest.id, phone, alt_contact: altContact }),
    ])

    revalidatePath('/quests')
    revalidatePath('/quests/map')
    revalidatePath('/dashboard')
    revalidatePath('/')

    if (skillError || contactError) {
      return {
        ok: true,
        message: `Quest posted, but ${
          skillError ? 'the skill tags' : 'your phone number'
        } could not be saved. Edit the quest from your dashboard to fix it.`,
        redirectTo: `/quests/${quest.id}`,
      }
    }

    return {
      ok: true,
      message: 'Quest posted. Students matching your tags will see it immediately.',
      redirectTo: `/quests/${quest.id}`,
    }
  })
}
