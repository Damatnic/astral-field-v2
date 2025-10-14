'use client'

/**
 * Matchups Page - Elite Matchup Center
 * Live head-to-head battles with real-time updates
 */

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { MatchupCenterLive } from '@/components/matchup/matchup-center-live'
import { Trophy, Loader2, Activity } from 'lucide-react'
import { toast } from 'sonner'

export default function MatchupsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [matchupData, setMatchupData] = useState<any>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      loadMatchupData()
    }
  }, [status, router])

  const loadMatchupData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/matchups?userId=${session?.user?.id}`)
      
      if (response.ok) {
        const data = await response.json()
        setMatchupData(data)
      } else {
        // Use mock data for demonstration
        setMatchupData({
          myTeam: { name: 'My Team', score: 87.3, projected: 112.5 },
          opponent: { name: 'Rival Squad', score: 94.1, projected: 108.2 },
          winProbability: 45,
          momentum: -15
        })
      }
    } catch (error) {
      console.error('Error loading matchup:', error)
      toast.error('Failed to load matchup data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)] text-slate-400">
          <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
          <p className="ml-4 text-lg">Loading matchup...</p>
        </div>
      </DashboardLayout>
    )
  }

  // Mock player battles data
  const mockBattles = [
    {
      position: 'QB',
      myPlayer: { id: '1', name: 'Josh Allen', team: 'BUF', points: 24.5, projected: 22.0 },
      oppPlayer: { id: '2', name: 'Patrick Mahomes', team: 'KC', points: 21.3, projected: 23.5 }
    },
    {
      position: 'RB1',
      myPlayer: { id: '3', name: 'Christian McCaffrey', team: 'SF', points: 18.2, projected: 20.0 },
      oppPlayer: { id: '4', name: 'Saquon Barkley', team: 'PHI', points: 22.5, projected: 18.5 }
    },
    {
      position: 'RB2',
      myPlayer: { id: '5', name: 'Breece Hall', team: 'NYJ', points: 12.5, projected: 15.0 },
      oppPlayer: { id: '6', name: 'Derrick Henry', team: 'TEN', points: 16.8, projected: 14.0 }
    }
  ]

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 pt-16 lg:pt-8">
        <PageHeader
          title="Live Matchup"
          description="Head-to-head battle with real-time updates"
          icon={Activity}
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Matchups' },
          ]}
        />

        {matchupData ? (
          <MatchupCenterLive
            myTeam={matchupData.myTeam}
            opponent={matchupData.opponent}
            battles={mockBattles}
            winProbability={matchupData.winProbability}
            momentum={matchupData.momentum}
          />
        ) : (
          <EmptyState
            icon={Trophy}
            title="No Active Matchup"
            description="Your matchup will appear here during game weeks"
          />
        )}
      </div>
    </DashboardLayout>
  )
}