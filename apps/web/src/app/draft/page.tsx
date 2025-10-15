'use client'

/**
 * Draft Page - Rebuilt
 * Modern draft interface
 */

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ModernLayout } from '@/components/layout/modern-layout'
import { PageHeader } from '@/components/ui/page-header'
import { ModernCard, ModernCardContent, ModernCardHeader, ModernCardTitle } from '@/components/ui/modern-card'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingState } from '@/components/ui/loading-state'
import { Users, Clock, Trophy, Loader2 } from 'lucide-react'

interface DraftData {
  team: {
    id: string
    name: string
    league: {
      name: string
      draft: {
        status: string
        currentRound: number
        currentPick: number
      } | null
    }
  } | null
}

export default function DraftPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [draftData, setDraftData] = useState<DraftData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated' && session?.user?.id) {
      loadDraftData()
    }
  }, [status, session, router])

  const loadDraftData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/draft?userId=${session?.user?.id}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch draft data')
      }
      
      const data = await response.json()
      setDraftData(data)
    } catch (err) {
      console.error('Error loading draft data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load draft data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <ModernLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)] text-slate-400">
          <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
          <p className="ml-4 text-lg">Loading draft room...</p>
        </div>
      </ModernLayout>
    )
  }

  if (error || !draftData?.team) {
    return (
      <ModernLayout>
        <div className="p-6 lg:p-8 space-y-6 pt-16 lg:pt-8">
          <PageHeader
            title="Draft Room"
            description="Live draft interface for your fantasy league"
            icon={Trophy}
            breadcrumbs={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Draft Room' },
            ]}
          />

          <EmptyState
            icon={Trophy}
            title="Draft Not Available"
            description="No active draft found for your league"
            action={{
              label: "Go to Dashboard",
              onClick: () => router.push('/dashboard'),
            }}
          />
        </div>
      </ModernLayout>
    )
  }

  const { team } = draftData
  const isDraftActive = team.league.draft?.status === 'active'

  return (
    <ModernLayout>
      <div className="p-6 lg:p-8 space-y-6 pt-16 lg:pt-8">
        <PageHeader
          title="Draft Room"
          description="Live draft interface for your fantasy league"
          icon={Trophy}
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Draft Room' },
          ]}
        />

        {/* Draft Status */}
        <ModernCard variant={isDraftActive ? "gradient" : "solid"}>
          <ModernCardHeader>
            <ModernCardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2 text-blue-400" />
              Draft Status
            </ModernCardTitle>
          </ModernCardHeader>
          <ModernCardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                <div className="text-2xl font-bold text-blue-400">
                  {team.league.draft?.currentRound || '—'}
                </div>
                <div className="text-sm text-slate-400">Current Round</div>
              </div>
              <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                <div className="text-2xl font-bold text-green-400">
                  {team.league.draft?.currentPick || '—'}
                </div>
                <div className="text-sm text-slate-400">Current Pick</div>
              </div>
              <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                <div className={`text-2xl font-bold ${
                  isDraftActive ? 'text-green-400' : 'text-slate-400'
                }`}>
                  {team.league.draft?.status?.toUpperCase() || 'NOT STARTED'}
                </div>
                <div className="text-sm text-slate-400">Status</div>
              </div>
            </div>
          </ModernCardContent>
        </ModernCard>

        {/* Draft Interface */}
        {isDraftActive ? (
          <ModernCard>
            <ModernCardHeader>
              <ModernCardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2 text-purple-400" />
                Live Draft
              </ModernCardTitle>
            </ModernCardHeader>
            <ModernCardContent>
              <EmptyState
                icon={Trophy}
                title="Draft in Progress"
                description="The live draft interface will be available when it's your turn to pick"
                action={{
                  label: "View Available Players",
                  onClick: () => router.push('/players'),
                }}
              />
            </ModernCardContent>
          </ModernCard>
        ) : (
          <EmptyState
            icon={Clock}
            title="Draft Not Started"
            description="Your league draft hasn't started yet. Check back when the commissioner begins the draft."
            action={{
              label: "Prepare for Draft",
              onClick: () => router.push('/players'),
            }}
          />
        )}
      </div>
    </ModernLayout>
  )
}