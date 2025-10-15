'use client'

/**
 * Playoffs Page - Elite Playoff Bracket
 * Interactive bracket with real-time updates
 */

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { PageHeader } from '@/components/ui/page-header'
import { PlayoffBracket } from '@/components/playoffs/playoff-bracket'
import { Trophy, Loader2, Crown } from 'lucide-react'

export default function PlayoffsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      setLoading(false)
    }
  }, [status, router])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)] text-slate-400">
          <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
          <p className="ml-4 text-lg">Loading playoffs...</p>
        </div>
      </DashboardLayout>
    )
  }

  // Mock playoff bracket data
  const mockMatchups = [
    // Quarterfinals
    {
      id: 'q1',
      round: 1,
      matchupNumber: 1,
      team1: { id: '1', name: 'Dynasty Warriors', seed: 1, score: 145.3, isWinner: true },
      team2: { id: '8', name: 'Underdogs', seed: 8, score: 132.1, isWinner: false },
      status: 'complete' as const
    },
    {
      id: 'q2',
      round: 1,
      matchupNumber: 2,
      team1: { id: '4', name: 'Power Squad', seed: 4, score: 128.5, isWinner: false },
      team2: { id: '5', name: 'Rising Stars', seed: 5, score: 135.2, isWinner: true },
      status: 'complete' as const
    },
    // Semifinals
    {
      id: 's1',
      round: 2,
      matchupNumber: 1,
      team1: { id: '1', name: 'Dynasty Warriors', seed: 1, score: 152.8, isWinner: true },
      team2: { id: '5', name: 'Rising Stars', seed: 5, score: 148.3, isWinner: false },
      status: 'complete' as const
    },
    // Championship
    {
      id: 'c1',
      round: 3,
      matchupNumber: 1,
      team1: { id: '1', name: 'Dynasty Warriors', seed: 1, score: 165.7, isWinner: true },
      team2: { id: '3', name: 'Championship Squad', seed: 3, score: 158.2, isWinner: false },
      status: 'complete' as const
    }
  ]

  const mockChampion = {
    teamName: 'Dynasty Warriors',
    ownerName: 'John Doe',
    finalScore: 165.7
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 pt-16 lg:pt-8">
        <PageHeader
          title="Playoff Bracket"
          description="Road to the championship"
          icon={Crown}
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Playoffs' },
          ]}
        />

        <PlayoffBracket
          matchups={mockMatchups}
          champion={mockChampion}
        />
      </div>
    </DashboardLayout>
  )
}