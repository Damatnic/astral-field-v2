'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface CreateLeagueFormProps {
  userId: string
}

export function CreateLeagueForm({ userId }: CreateLeagueFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    maxTeams: 12,
    isPublic: true,
    draftDate: '',
    scoringType: 'standard'
  })
  const [creating, setCreating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('League name is required')
      return
    }

    setCreating(true)
    try {
      const response = await fetch('/api/leagues/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          maxTeams: parseInt(formData.maxTeams.toString())
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create league')
      }

      const result = await response.json()
      toast.success('League created successfully!')
      router.push(`/leagues?created=${result.league.id}`)
    } catch (error) {
      toast.error('Failed to create league. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Basic Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                League Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your league name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe your league (optional)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Maximum Teams
              </label>
              <select
                value={formData.maxTeams}
                onChange={(e) => setFormData({ ...formData, maxTeams: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={8}>8 Teams</option>
                <option value={10}>10 Teams</option>
                <option value={12}>12 Teams</option>
                <option value={14}>14 Teams</option>
                <option value={16}>16 Teams</option>
              </select>
            </div>
          </div>
        </div>

        {/* League Settings */}
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-6">League Settings</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Scoring Type
              </label>
              <select
                value={formData.scoringType}
                onChange={(e) => setFormData({ ...formData, scoringType: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="standard">Standard</option>
                <option value="ppr">PPR (Point Per Reception)</option>
                <option value="half-ppr">Half PPR</option>
                <option value="super-flex">Super Flex</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Draft Date (Optional)
              </label>
              <input
                type="datetime-local"
                value={formData.draftDate}
                onChange={(e) => setFormData({ ...formData, draftDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to schedule the draft later
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-white">Public League</h3>
                <p className="text-sm text-gray-400">Allow anyone to join your league</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Roster Configuration */}
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Roster Configuration</h2>
          
          <div className="bg-slate-700/50 rounded-lg p-4">
            <h3 className="font-medium text-white mb-3">Standard Fantasy Lineup</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-300">Quarterback (QB):</span>
                  <span className="text-white">1</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Running Back (RB):</span>
                  <span className="text-white">2</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Wide Receiver (WR):</span>
                  <span className="text-white">2</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Tight End (TE):</span>
                  <span className="text-white">1</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-300">Flex (RB/WR/TE):</span>
                  <span className="text-white">1</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Kicker (K):</span>
                  <span className="text-white">1</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Defense (DEF):</span>
                  <span className="text-white">1</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Bench:</span>
                  <span className="text-white">6</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={creating}
            size="lg"
          >
            {creating ? 'Creating League...' : 'Create League'}
          </Button>
        </div>
      </form>
    </div>
  )
}