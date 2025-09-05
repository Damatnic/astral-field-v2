'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { 
  Trophy, 
  Users, 
  Settings, 
  Calendar,
  ArrowLeft,
  Plus,
  Loader2
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useLeagueStore } from '@/stores/leagueStore'
import leagueService from '@/services/api/leagueService'

const createLeagueSchema = z.object({
  name: z.string().min(3, 'League name must be at least 3 characters'),
  maxTeams: z.number().min(4, 'Minimum 4 teams').max(20, 'Maximum 20 teams'),
  draftDate: z.string().optional(),
  waiverType: z.enum(['FAAB', 'Rolling', 'Reverse']),
  tradeDeadline: z.string(),
  playoffTeams: z.number().min(2).max(8),
})

type CreateLeagueFormData = z.infer<typeof createLeagueSchema>

interface CreateLeagueFormProps {
  onCancel?: () => void
}

export default function CreateLeagueForm({ onCancel }: CreateLeagueFormProps) {
  const router = useRouter()
  const { user } = useAuthStore()
  const { createLeague, isLoading, error, clearError } = useLeagueStore()
  const [step, setStep] = useState(1)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<CreateLeagueFormData>({
    resolver: zodResolver(createLeagueSchema),
    defaultValues: {
      maxTeams: 12,
      waiverType: 'FAAB',
      tradeDeadline: '2024-11-19',
      playoffTeams: 6,
    },
  })

  const maxTeams = watch('maxTeams')

  const onSubmit = async (data: CreateLeagueFormData) => {
    if (!user) return

    clearError()

    const defaultSettings = leagueService.getDefaultSettings()
    const defaultScoring = leagueService.getDefaultScoringSystem()

    const leagueData = {
      name: data.name,
      settings: {
        ...defaultSettings,
        maxTeams: data.maxTeams,
        waiverType: data.waiverType,
        tradeDeadline: data.tradeDeadline,
        playoffWeeks: 3, // 3 playoff weeks
      },
      scoringSystem: defaultScoring,
      draftDate: data.draftDate,
      seasonYear: new Date().getFullYear(),
    }

    const success = await createLeague(user.id, leagueData)
    if (success) {
      router.push('/dashboard')
    }
  }

  const nextStep = () => setStep(step + 1)
  const prevStep = () => setStep(step - 1)

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center mb-8">
        <button
          onClick={onCancel || (() => router.back())}
          className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors mr-4"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white">Create New League</h1>
          <p className="text-gray-400">Set up your fantasy football league</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center mb-8">
        {[1, 2, 3].map((stepNumber) => (
          <div key={stepNumber} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                stepNumber <= step
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-400'
              }`}
            >
              {stepNumber}
            </div>
            {stepNumber < 3 && (
              <div
                className={`w-12 h-0.5 ${
                  stepNumber < step ? 'bg-blue-600' : 'bg-gray-700'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gray-800 rounded-lg border border-gray-700 p-6"
          >
            <div className="flex items-center mb-6">
              <Trophy className="h-6 w-6 text-yellow-500 mr-3" />
              <h2 className="text-xl font-semibold text-white">League Basics</h2>
            </div>

            <div className="space-y-6">
              {/* League Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-200 mb-2">
                  League Name *
                </label>
                <input
                  {...register('name')}
                  type="text"
                  className="block w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="My Awesome League"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
                )}
              </div>

              {/* Max Teams */}
              <div>
                <label htmlFor="maxTeams" className="block text-sm font-medium text-gray-200 mb-2">
                  Number of Teams
                </label>
                <select
                  {...register('maxTeams', { valueAsNumber: true })}
                  className="block w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Array.from({ length: 17 }, (_, i) => i + 4).map(num => (
                    <option key={num} value={num}>{num} Teams</option>
                  ))}
                </select>
                {errors.maxTeams && (
                  <p className="mt-1 text-sm text-red-400">{errors.maxTeams.message}</p>
                )}
              </div>

              {/* Draft Date */}
              <div>
                <label htmlFor="draftDate" className="block text-sm font-medium text-gray-200 mb-2">
                  Draft Date (Optional)
                </label>
                <input
                  {...register('draftDate')}
                  type="datetime-local"
                  className="block w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end mt-8">
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Next
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 2: League Rules */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gray-800 rounded-lg border border-gray-700 p-6"
          >
            <div className="flex items-center mb-6">
              <Settings className="h-6 w-6 text-blue-500 mr-3" />
              <h2 className="text-xl font-semibold text-white">League Rules</h2>
            </div>

            <div className="space-y-6">
              {/* Waiver Type */}
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Waiver System
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'FAAB', label: 'FAAB (Free Agent Acquisition Budget)', desc: 'Bid on players with budget' },
                    { value: 'Rolling', label: 'Rolling List', desc: 'Waiver order changes weekly' },
                    { value: 'Reverse', label: 'Reverse Order', desc: 'Worst teams get priority' },
                  ].map((option) => (
                    <label key={option.value} className="flex items-start">
                      <input
                        {...register('waiverType')}
                        type="radio"
                        value={option.value}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 bg-gray-700"
                      />
                      <div className="ml-3">
                        <div className="text-sm font-medium text-white">{option.label}</div>
                        <div className="text-xs text-gray-400">{option.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Trade Deadline */}
              <div>
                <label htmlFor="tradeDeadline" className="block text-sm font-medium text-gray-200 mb-2">
                  Trade Deadline
                </label>
                <input
                  {...register('tradeDeadline')}
                  type="date"
                  className="block w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Playoff Teams */}
              <div>
                <label htmlFor="playoffTeams" className="block text-sm font-medium text-gray-200 mb-2">
                  Playoff Teams
                </label>
                <select
                  {...register('playoffTeams', { valueAsNumber: true })}
                  className="block w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Array.from({ length: 7 }, (_, i) => i + 2).map(num => (
                    <option key={num} value={num} disabled={num > maxTeams / 2}>
                      {num} teams{num > maxTeams / 2 ? ' (too many for league size)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <button
                type="button"
                onClick={prevStep}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Next
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Review & Create */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gray-800 rounded-lg border border-gray-700 p-6"
          >
            <div className="flex items-center mb-6">
              <Plus className="h-6 w-6 text-green-500 mr-3" />
              <h2 className="text-xl font-semibold text-white">Review & Create</h2>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="font-medium text-white mb-2">League Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Name:</span>
                    <span className="text-white ml-2">{watch('name') || 'Not set'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Teams:</span>
                    <span className="text-white ml-2">{watch('maxTeams')}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Waivers:</span>
                    <span className="text-white ml-2">{watch('waiverType')}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Playoffs:</span>
                    <span className="text-white ml-2">{watch('playoffTeams')} teams</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg p-4">
                <p className="text-sm text-blue-300">
                  <strong>Note:</strong> Additional settings like scoring system and roster configuration 
                  can be customized after creating the league.
                </p>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 mb-6">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="flex justify-between">
              <button
                type="button"
                onClick={prevStep}
                disabled={isLoading}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create League
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </form>
    </div>
  )
}