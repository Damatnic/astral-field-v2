'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { 
  Settings, 
  Users, 
  Clock, 
  Shuffle,
  Play,
  ArrowLeft,
  AlertTriangle,
  Zap
} from 'lucide-react'
import { useDraftStore } from '@/stores/draftStore'
import { useLeagueStore } from '@/stores/leagueStore'
import { useAuthStore } from '@/stores/authStore'
import draftService from '@/services/api/draftService'

const draftSetupSchema = z.object({
  type: z.enum(['snake', 'auction']),
  rounds: z.number().min(10).max(20),
  pickTimeLimit: z.number().min(30).max(300),
  allowTrades: z.boolean(),
  autoPickEnabled: z.boolean(),
})

type DraftSetupData = z.infer<typeof draftSetupSchema>

interface DraftSetupProps {
  leagueId: string
  onDraftCreated: () => void
}

export default function DraftSetup({ leagueId, onDraftCreated }: DraftSetupProps) {
  const router = useRouter()
  const { user } = useAuthStore()
  const { currentLeague, teams } = useLeagueStore()
  const { createDraft, isLoading, error, clearError } = useDraftStore()
  
  const [draftOrder, setDraftOrder] = useState<string[]>([])
  const [isRandomizing, setIsRandomizing] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<DraftSetupData>({
    resolver: zodResolver(draftSetupSchema),
    defaultValues: {
      type: 'snake',
      rounds: 16,
      pickTimeLimit: 90,
      allowTrades: false,
      autoPickEnabled: true,
    },
  })

  const draftType = watch('type')

  useEffect(() => {
    if (teams.length > 0) {
      setDraftOrder(teams.map(team => team.id))
    }
  }, [teams])

  useEffect(() => {
    if (currentLeague && user?.id !== currentLeague.commissioner_id) {
      router.push(`/leagues/${leagueId}`)
    }
  }, [currentLeague, user, leagueId, router])

  const randomizeDraftOrder = async () => {
    setIsRandomizing(true)
    
    // Simulate randomization with animation
    const shuffleCount = 20
    const shuffleInterval = 100
    
    for (let i = 0; i < shuffleCount; i++) {
      setTimeout(() => {
        setDraftOrder(prev => [...prev].sort(() => Math.random() - 0.5))
        
        if (i === shuffleCount - 1) {
          setIsRandomizing(false)
        }
      }, i * shuffleInterval)
    }
  }

  const moveDraftOrder = (fromIndex: number, toIndex: number) => {
    const newOrder = [...draftOrder]
    const [movedItem] = newOrder.splice(fromIndex, 1)
    newOrder.splice(toIndex, 0, movedItem)
    setDraftOrder(newOrder)
  }

  const onSubmit = async (data: DraftSetupData) => {
    clearError()
    
    const settings = {
      ...data,
      draftOrder,
    }
    
    const success = await createDraft(leagueId, settings)
    if (success) {
      onDraftCreated()
    }
  }

  const getTeamName = (teamId: string) => {
    const team = teams.find(t => t.id === teamId)
    return team?.team_name || 'Unknown Team'
  }

  const getTeamUser = (teamId: string) => {
    const team = teams.find(t => t.id === teamId)
    return (team as any)?.users?.username || 'Unknown User'
  }

  if (!currentLeague || user?.id !== currentLeague.commissioner_id) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400 mb-4">Only the league commissioner can set up the draft.</p>
          <button
            onClick={() => router.push(`/leagues/${leagueId}`)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Back to League
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center">
            <button
              onClick={() => router.push(`/leagues/${leagueId}`)}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors mr-4"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center">
                <Settings className="h-8 w-8 text-blue-500 mr-3" />
                Draft Setup
              </h1>
              <p className="text-gray-400 mt-1">Configure your draft settings and order</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Draft Settings */}
          <section className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
              <Zap className="h-5 w-5 text-yellow-500 mr-2" />
              Draft Settings
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Draft Type */}
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-3">
                  Draft Type
                </label>
                <div className="space-y-2">
                  <label className="flex items-start">
                    <input
                      {...register('type')}
                      type="radio"
                      value="snake"
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 bg-gray-700"
                    />
                    <div className="ml-3">
                      <div className="text-sm font-medium text-white">Snake Draft</div>
                      <div className="text-xs text-gray-400">Draft order reverses each round (1-12, 12-1, 1-12...)</div>
                    </div>
                  </label>
                  <label className="flex items-start">
                    <input
                      {...register('type')}
                      type="radio"
                      value="auction"
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 bg-gray-700"
                    />
                    <div className="ml-3">
                      <div className="text-sm font-medium text-white">Auction Draft</div>
                      <div className="text-xs text-gray-400">Bid on players with budget (Coming Soon)</div>
                    </div>
                  </label>
                </div>
                {errors.type && (
                  <p className="mt-1 text-sm text-red-400">{errors.type.message}</p>
                )}
              </div>

              {/* Rounds */}
              <div>
                <label htmlFor="rounds" className="block text-sm font-medium text-gray-200 mb-2">
                  Number of Rounds
                </label>
                <select
                  {...register('rounds', { valueAsNumber: true })}
                  className="block w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 11 }, (_, i) => i + 10).map(num => (
                    <option key={num} value={num}>{num} rounds</option>
                  ))}
                </select>
                {errors.rounds && (
                  <p className="mt-1 text-sm text-red-400">{errors.rounds.message}</p>
                )}
              </div>

              {/* Pick Time Limit */}
              <div>
                <label htmlFor="pickTimeLimit" className="block text-sm font-medium text-gray-200 mb-2">
                  Pick Time Limit
                </label>
                <select
                  {...register('pickTimeLimit', { valueAsNumber: true })}
                  className="block w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={60}>1 minute</option>
                  <option value={90}>1.5 minutes</option>
                  <option value={120}>2 minutes</option>
                  <option value={180}>3 minutes</option>
                  <option value={300}>5 minutes</option>
                </select>
                {errors.pickTimeLimit && (
                  <p className="mt-1 text-sm text-red-400">{errors.pickTimeLimit.message}</p>
                )}
              </div>

              {/* Options */}
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    {...register('autoPickEnabled')}
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
                  />
                  <span className="ml-2 text-sm text-gray-200">Enable auto-pick when time expires</span>
                </label>

                <label className="flex items-center">
                  <input
                    {...register('allowTrades')}
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
                  />
                  <span className="ml-2 text-sm text-gray-200">Allow trades during draft</span>
                </label>
              </div>
            </div>
          </section>

          {/* Draft Order */}
          <section className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <Users className="h-5 w-5 text-green-500 mr-2" />
                Draft Order
              </h2>
              <button
                type="button"
                onClick={randomizeDraftOrder}
                disabled={isRandomizing}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center"
              >
                <Shuffle className={`h-4 w-4 mr-2 ${isRandomizing ? 'animate-spin' : ''}`} />
                Randomize
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {draftOrder.map((teamId, index) => (
                <motion.div
                  key={teamId}
                  layout
                  className="flex items-center p-3 bg-gray-700 rounded-lg border border-gray-600"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">{getTeamName(teamId)}</p>
                    <p className="text-sm text-gray-400">{getTeamUser(teamId)}</p>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      type="button"
                      onClick={() => index > 0 && moveDraftOrder(index, index - 1)}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-white disabled:opacity-50"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => index < draftOrder.length - 1 && moveDraftOrder(index, index + 1)}
                      disabled={index === draftOrder.length - 1}
                      className="p-1 text-gray-400 hover:text-white disabled:opacity-50"
                    >
                      ↓
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {draftType === 'snake' && (
              <div className="mt-4 p-3 bg-blue-600/20 border border-blue-600/30 rounded-lg">
                <p className="text-blue-300 text-sm">
                  <strong>Snake Draft:</strong> Round 1 goes 1→{teams.length}, Round 2 goes {teams.length}→1, and so on.
                </p>
              </div>
            )}
          </section>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
                <span className="text-red-400">{error}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.push(`/leagues/${leagueId}`)}
              className="px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || teams.length === 0}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating Draft...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Create Draft
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}