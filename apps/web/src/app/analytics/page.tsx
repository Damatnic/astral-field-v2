'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ModernLayout } from '@/components/layout/modern-layout'
import { BarChart3 } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function AnalyticsPage() {
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

  const weeklyData = [
    { week: 'W1', points: 125.3, projected: 120.5 },
    { week: 'W2', points: 142.8, projected: 135.2 },
    { week: 'W3', points: 118.5, projected: 128.0 },
    { week: 'W4', points: 156.2, projected: 145.5 },
    { week: 'W5', points: 138.7, projected: 140.2 },
    { week: 'W6', points: 147.3, projected: 142.8 },
    { week: 'W7', points: 132.9, projected: 138.5 },
    { week: 'W8', points: 149.4, projected: 148.2 }
  ]

  const positionBreakdown = [
    { position: 'QB', points: 245.8 },
    { position: 'RB', points: 312.5 },
    { position: 'WR', points: 385.2 },
    { position: 'TE', points: 142.3 },
    { position: 'K', points: 85.7 },
    { position: 'DEF', points: 95.4 }
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
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-600 rounded-lg">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Team Analytics</h1>
            <p className="text-slate-400">Performance insights and trends</p>
          </div>
        </div>

        {/* Weekly Performance */}
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <h2 className="text-xl font-bold text-white mb-6">Weekly Performance</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="week" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Line type="monotone" dataKey="points" stroke="#3b82f6" strokeWidth={3} name="Actual" />
                <Line type="monotone" dataKey="projected" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" name="Projected" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Position Breakdown */}
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <h2 className="text-xl font-bold text-white mb-6">Points by Position</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={positionBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="position" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Bar dataKey="points" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </ModernLayout>
  )
}

