'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { useLeagueStore } from '@/stores/leagueStore'
import { useDraftStore } from '@/stores/draftStore'
import DraftRoom from '@/components/features/draft/DraftRoom'
import DraftSetup from '@/components/features/draft/DraftSetup'

export default function DraftPage() {
  const router = useRouter()
  const params = useParams()
  const { user, checkAuth } = useAuthStore()
  const { selectLeague } = useLeagueStore()
  const { draftState } = useDraftStore()
  const leagueId = params?.id as string
  const [showSetup, setShowSetup] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (!user) {
      router.push('/auth/login')
      return
    }

    if (leagueId) {
      selectLeague(leagueId)
    }
  }, [user, leagueId, router, selectLeague])

  useEffect(() => {
    // Determine if we should show setup or draft room
    if (draftState === null) {
      setShowSetup(true)
    } else {
      setShowSetup(false)
    }
  }, [draftState])

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!leagueId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Invalid League</h2>
          <p className="text-gray-400 mb-4">League ID not found</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return showSetup ? (
    <DraftSetup 
      leagueId={leagueId} 
      onDraftCreated={() => setShowSetup(false)} 
    />
  ) : (
    <DraftRoom leagueId={leagueId} />
  )
}