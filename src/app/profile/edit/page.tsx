import type { Metadata } from 'next'
import Link from 'next/link'
import { demoSession, requireProfile } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/config'
import { getProfileSkills, getSkills } from '@/lib/queries'
import { Notice } from '@/components/ui/Panel'
import { IconArrowLeft } from '@/components/ui/Icons'
import { EditProfileForm } from './EditProfileForm'

export const metadata: Metadata = {
  title: 'Edit profile',
  description: 'Update your name, bio and skills.',
}

export default async function EditProfilePage() {
  // See demoSession(): with no database this page would only ever redirect, and
  // it is one of the pages worth showing off.
  const { userId, profile } = isSupabaseConfigured
    ? await requireProfile('/profile/edit')
    : demoSession()

  const [skills, mySkills] = await Promise.all([
    getSkills(),
    profile.role === 'student' ? getProfileSkills(userId) : Promise.resolve([]),
  ])

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-[14px] text-dim transition-colors hover:text-cyan"
      >
        <IconArrowLeft className="size-3.5" />
        Dashboard
      </Link>

      <div className="mt-5 space-y-2">
        <p className="eyebrow">Your account</p>
        <h1 className="text-3xl font-semibold tracking-tight text-chalk sm:text-4xl">
          Edit profile
        </h1>
      </div>

      {!isSupabaseConfigured && (
        <div className="mt-6">
          <Notice tone="warn" title="Demo mode">
            This is a seeded sample account. The form validates, but changes cannot be saved
            without a database.
          </Notice>
        </div>
      )}

      <div className="mt-7">
        <EditProfileForm
          profile={profile}
          skills={skills}
          mySkillIds={mySkills.map((s) => s.id)}
        />
      </div>
    </div>
  )
}
