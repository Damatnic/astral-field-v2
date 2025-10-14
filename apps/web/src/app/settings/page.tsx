import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/layout'
import { prisma } from '@/lib/database/prisma'
import { SettingsForm } from '@/components/settings/settings-form'

async function getUserSettings(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      preferences: true
    }
  })

  return user
}

export default async function SettingsPage() {
  const session = await auth()
  
  if (!session) {
    redirect('/auth/signin')
  }

  const userData = await getUserSettings(session.user.id)

  if (!userData) {
    redirect('/auth/signin')
  }

  // Transform user data to match SettingsForm interface
  const user = {
    ...userData,
    preferences: userData.preferences ? {
      emailNotifications: userData.preferences.emailUpdates,
      pushNotifications: false, // Not in current schema
      theme: userData.preferences.theme,
      timezone: 'UTC', // Default value
      favoriteTeam: null // Not in current schema
    } : null
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 pt-16 lg:pt-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-gray-400 mt-2">
            Manage your account preferences and notification settings
          </p>
        </div>

        <SettingsForm user={user} />
      </div>
    </DashboardLayout>
  )
}