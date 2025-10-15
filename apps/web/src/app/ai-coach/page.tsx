'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ModernLayout } from '@/components/layout/modern-layout'
import { Sparkles, Lightbulb, TrendingUp, AlertCircle } from 'lucide-react'

export default function AICoachPage() {
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

  const recommendations = [
    {
      type: 'lineup',
      title: 'Start Patrick Mahomes',
      description: 'Mahomes has a favorable matchup against a bottom-ranked defense',
      impact: '+8.5 projected points',
      confidence: 92
    },
    {
      type: 'waiver',
      title: 'Add Jerome Ford',
      description: 'With Nick Chubb out, Ford is a league-winning pickup',
      impact: 'Potential RB1 value',
      confidence: 85
    },
    {
      type: 'trade',
      title: 'Consider trading Davante Adams',
      description: 'Sell high while his value is at season peak',
      impact: 'Upgrade at RB position',
      confidence: 78
    }
  ]

  if (loading) {
    return (
      <ModernLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </ModernLayout>
    )
  }

  return (
    <ModernLayout>
      <div className="p-4 lg:p-8 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-6 lg:p-8 text-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">AI Coach</h1>
              <p className="text-white/80">Personalized recommendations powered by advanced analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span>AI is analyzing your team...</span>
          </div>
        </div>

        {/* Recommendations */}
        <div className="space-y-4">
          {recommendations.map((rec, idx) => (
            <div
              key={idx}
              className="bg-slate-900 rounded-xl p-6 border border-slate-800 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${
                  rec.type === 'lineup' ? 'bg-blue-500/10' :
                  rec.type === 'waiver' ? 'bg-green-500/10' :
                  'bg-purple-500/10'
                }`}>
                  {rec.type === 'lineup' ? <Lightbulb className="w-6 h-6 text-blue-400" /> :
                   rec.type === 'waiver' ? <TrendingUp className="w-6 h-6 text-green-400" /> :
                   <AlertCircle className="w-6 h-6 text-purple-400" />}
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">{rec.title}</h3>
                      <p className="text-slate-300 text-sm">{rec.description}</p>
                    </div>
                    <span className="text-sm font-medium text-green-400">{rec.impact}</span>
                  </div>

                  {/* Confidence Bar */}
                  <div className="flex items-center gap-3 mt-4">
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                        style={{ width: `${rec.confidence}%` }}
                      />
                    </div>
                    <span className="text-sm text-slate-400">{rec.confidence}% confidence</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ModernLayout>
  )
}

