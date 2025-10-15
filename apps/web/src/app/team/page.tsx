'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ModernLayout } from '@/components/layout/modern-layout'
import { Users } from 'lucide-react'
import { toast } from 'sonner'
import { DragDropLineupEditor } from '@/components/lineup/drag-drop-lineup-editor'

export default function TeamPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [teamData, setTeamData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated' && session?.user?.id) {
      loadTeamData()
    }
  }, [status, session, router])

  const loadTeamData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/teams?userId=${session?.user?.id}`)
      if (!response.ok) throw new Error('Failed to fetch team data')
      const data = await response.json()
      setTeamData(data)
    } catch (err) {
      console.error('Error loading team data:', err)
      toast.error('Failed to load team data')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveLineup = async (roster: any[]) => {
    try {
      const response = await fetch('/api/teams/lineup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: teamData?.id,
          roster: roster.map(p => ({
            playerId: p.id,
            isStarter: p.isStarter
          }))
        })
      })

      if (!response.ok) throw new Error('Failed to save lineup')
      
      toast.success('Lineup saved successfully!')
      await loadTeamData()
    } catch (err) {
      console.error('Error saving lineup:', err)
      toast.error('Failed to save lineup')
    }
  }

  if (loading) {
    return (
      <ModernLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </ModernLayout>
    )
  }

  if (!teamData) {
    return (
      <ModernLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <Users className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">No Team Found</h2>
            <p className="text-slate-400">Unable to load team data</p>
          </div>
        </div>
      </ModernLayout>
    )
  }

  const rosterForEditor = teamData.roster?.map((r: any) => ({
    id: r.player.id,
    name: r.player.name,
    position: r.player.position,
    team: r.player.team || r.player.nflTeam,
    fantasyPoints: r.player.fantasyPoints || 0,
    projectedPoints: r.player.projectedPoints || 0,
    isStarter: r.isStarter,
    status: r.player.status || 'ACTIVE'
  })) || []

  const totalPoints = rosterForEditor
    .filter((p: any) => p.isStarter)
    .reduce((sum: number, p: any) => sum + (p.fantasyPoints || 0), 0)

  const projectedPoints = rosterForEditor
    .filter((p: any) => p.isStarter)
    .reduce((sum: number, p: any) => sum + (p.projectedPoints || 0), 0)

  return (
    <ModernLayout currentWeek={teamData.league?.currentWeek}>
      <div className="p-4 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{teamData.name}</h1>
              <p className="text-slate-400">Manage your lineup</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-4">
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
              <p className="text-xs text-slate-400 mb-1">Starting Points</p>
              <p className="text-xl font-bold text-white">{totalPoints.toFixed(1)}</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
              <p className="text-xs text-slate-400 mb-1">Projected</p>
              <p className="text-xl font-bold text-white">{projectedPoints.toFixed(1)}</p>
            </div>
          </div>
        </div>

        {/* Drag-Drop Lineup Editor */}
        <DragDropLineupEditor
          roster={rosterForEditor}
          onSave={handleSaveLineup}
          rosterSettings={{
            positions: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF'],
            benchSize: 6
          }}
        />
      </div>
    </ModernLayout>
  )
}

