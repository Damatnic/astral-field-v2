'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ModernLayout } from '@/components/layout/modern-layout'
import { PageHeader } from '@/components/ui/page-header'
import { Trophy, Loader2, Users, Clock, Target } from 'lucide-react'

export default function MockDraftPage() {
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
      <ModernLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)] text-slate-400">
          <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
        </div>
      </ModernLayout>
    )
  }

  const draftOptions = [
    { teams: 8, rounds: 15, duration: '~30 min' },
    { teams: 10, rounds: 15, duration: '~40 min' },
    { teams: 12, rounds: 15, duration: '~50 min' }
  ]

  return (
    <ModernLayout>
      <div className="p-6 lg:p-8 space-y-6 pt-16 lg:pt-8">
        <PageHeader
          title="Mock Draft"
          description="Practice your draft strategy with AI opponents"
          icon={Trophy}
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Mock Draft' },
          ]}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {draftOptions.map((option) => (
            <div key={option.teams} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 hover:border-blue-500/50 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <Users className="w-8 h-8 text-blue-400" />
                <h3 className="text-xl font-bold text-white">{option.teams} Teams</h3>
              </div>
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-slate-300">
                  <Target className="w-4 h-4" />
                  <span>{option.rounds} Rounds</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Clock className="w-4 h-4" />
                  <span>{option.duration}</span>
                </div>
              </div>
              <button
                onClick={() => router.push(`/draft?mock=true&teams=${option.teams}`)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                Start Draft
              </button>
            </div>
          ))}
        </div>

        <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-3">How It Works</h3>
          <ul className="space-y-2 text-slate-300">
            <li>• AI opponents draft based on player rankings and team needs</li>
            <li>• Practice different draft positions and strategies</li>
            <li>• Get real-time draft grades and recommendations</li>
            <li>• Review your draft results and learn from AI analysis</li>
          </ul>
        </div>
      </div>
    </ModernLayout>
  )
}