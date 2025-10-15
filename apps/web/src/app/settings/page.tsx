'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ModernLayout } from '@/components/layout/modern-layout'
import { SettingsForm } from '@/components/settings/settings-form'
import { Loader2 } from 'lucide-react'

interface UserSettings {
  id: string
  name: string
  email: string
  teamName: string
  avatar: string
  preferences: {
    emailNotifications: boolean
    pushNotifications: boolean
    theme: string
    timezone: string
    favoriteTeam: string | null
  } | null
}

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [userData, setUserData] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated' && session?.user) {
      loadUserSettings()
    }
  }, [status, session, router])

  const loadUserSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/settings?userId=${session?.user?.id}`)
      
      if (!response.ok) {
        throw new Error('Failed to load settings')
      }
      
      const data = await response.json()
      setUserData(data)
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)] text-slate-400">
          <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
          <p className="ml-4 text-lg">Loading settings...</p>
        </div>
      </DashboardLayout>
    )
  }

  const user = userData || {
    id: session?.user?.id || '',
    name: session?.user?.name || '',
    email: session?.user?.email || '',
    teamName: '',
    avatar: '',
    preferences: null
  }

  return (
    <ModernLayout>
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
    </ModernLayout>
  )
}