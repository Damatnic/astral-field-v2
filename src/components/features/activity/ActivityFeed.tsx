'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Activity,
  ArrowRightLeft,
  Users,
  Target,
  Trophy,
  Zap,
  TrendingUp,
  Clock,
  User
} from 'lucide-react'
import { useLiveStore } from '@/stores/liveStore'
import { useLeagueStore } from '@/stores/leagueStore'
import { useAuthStore } from '@/stores/authStore'

export interface ActivityEvent {
  id: string
  type: 'trade' | 'waiver' | 'lineup' | 'draft' | 'score' | 'achievement' | 'news'
  title: string
  description: string
  teamName?: string
  playerName?: string
  timestamp: string
  priority: 'low' | 'normal' | 'high'
  data?: Record<string, unknown>
  iconType: string
}

interface ActivityFeedProps {
  leagueId: string
  teamId?: string
  limit?: number
  showFilters?: boolean
  compact?: boolean
}

export default function ActivityFeed({ 
  leagueId, 
  teamId, 
  limit = 50, 
  showFilters = true,
  compact = false 
}: ActivityFeedProps) {
  const { user } = useAuthStore()
  const { teams } = useLeagueStore()
  const { connect, subscribeToLeague, subscribeToTeam } = useLiveStore()
  
  const [activities, setActivities] = useState<ActivityEvent[]>([])
  const [filteredActivities, setFilteredActivities] = useState<ActivityEvent[]>([])
  const [activeFilters, setActiveFilters] = useState<string[]>(['all'])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<string>('')

  const filterOptions = [
    { key: 'all', label: 'All Activity', icon: Activity },
    { key: 'trade', label: 'Trades', icon: ArrowRightLeft },
    { key: 'waiver', label: 'Waivers', icon: Target },
    { key: 'lineup', label: 'Lineups', icon: Users },
    { key: 'score', label: 'Scoring', icon: TrendingUp },
    { key: 'draft', label: 'Draft', icon: Zap },
    { key: 'achievement', label: 'Achievements', icon: Trophy }
  ]

  useEffect(() => {
    loadActivityFeed()
    setupRealTimeUpdates()
  }, [leagueId, teamId])

  useEffect(() => {
    applyFilters()
  }, [activities, activeFilters])

  const loadActivityFeed = async () => {
    setIsLoading(true)
    
    try {
      // In a real app, this would fetch from an API
      const mockActivities = generateMockActivities()
      setActivities(mockActivities)
      setLastUpdate(new Date().toISOString())
    } catch (error) {
      console.error('Error loading activity feed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const setupRealTimeUpdates = async () => {
    try {
      await connect()
      await subscribeToLeague(leagueId)
      
      if (teamId) {
        await subscribeToTeam(teamId)
      }
    } catch (error) {
      console.error('Error setting up real-time updates:', error)
    }
  }

  const generateMockActivities = (): ActivityEvent[] => {
    const now = Date.now()
    const mockData: ActivityEvent[] = []
    
    // Recent trades
    mockData.push({
      id: '1',
      type: 'trade',
      title: 'Trade Completed',
      description: 'Lightning Bolts traded Cooper Kupp to Thunder Cats for Travis Kelce',
      teamName: 'Lightning Bolts',
      playerName: 'Cooper Kupp',
      timestamp: new Date(now - 1800000).toISOString(), // 30 min ago
      priority: 'high',
      iconType: 'trade',
      data: { players: ['Cooper Kupp', 'Travis Kelce'] }
    })

    // Waiver claims
    mockData.push({
      id: '2',
      type: 'waiver',
      title: 'Waiver Claim Successful',
      description: 'Dream Team successfully claimed Puka Nacua for $23',
      teamName: 'Dream Team',
      playerName: 'Puka Nacua',
      timestamp: new Date(now - 3600000).toISOString(), // 1 hour ago
      priority: 'normal',
      iconType: 'waiver',
      data: { bidAmount: 23 }
    })

    // Big scoring plays
    mockData.push({
      id: '3',
      type: 'score',
      title: 'Touchdown Alert!',
      description: 'Josh Allen just scored a 47-yard rushing TD (+10.7 pts)',
      playerName: 'Josh Allen',
      timestamp: new Date(now - 900000).toISOString(), // 15 min ago
      priority: 'high',
      iconType: 'score',
      data: { points: 10.7, playType: 'rushing TD' }
    })

    // Lineup changes
    mockData.push({
      id: '4',
      type: 'lineup',
      title: 'Lineup Updated',
      description: 'Gridiron Gladiators started Christian McCaffrey over Saquon Barkley',
      teamName: 'Gridiron Gladiators',
      timestamp: new Date(now - 7200000).toISOString(), // 2 hours ago
      priority: 'low',
      iconType: 'lineup',
      data: { playerIn: 'Christian McCaffrey', playerOut: 'Saquon Barkley' }
    })

    // Achievements
    mockData.push({
      id: '5',
      type: 'achievement',
      title: 'New Achievement!',
      description: 'Touchdown Titans scored 150+ points for 3 consecutive weeks',
      teamName: 'Touchdown Titans',
      timestamp: new Date(now - 10800000).toISOString(), // 3 hours ago
      priority: 'normal',
      iconType: 'achievement',
      data: { achievement: 'Hot Streak', streak: 3 }
    })

    // Add more mock activities
    for (let i = 6; i <= 20; i++) {
      const types = ['trade', 'waiver', 'lineup', 'score', 'achievement']
      const type = types[Math.floor(Math.random() * types.length)] as ActivityEvent['type']
      const hoursAgo = Math.floor(Math.random() * 48) + 1
      
      mockData.push({
        id: i.toString(),
        type,
        title: `Mock ${type} event`,
        description: `This is a simulated ${type} activity from ${hoursAgo} hours ago`,
        timestamp: new Date(now - (hoursAgo * 3600000)).toISOString(),
        priority: 'low',
        iconType: type
      })
    }

    return mockData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  const applyFilters = () => {
    if (activeFilters.includes('all')) {
      setFilteredActivities(activities.slice(0, limit))
    } else {
      const filtered = activities
        .filter(activity => activeFilters.includes(activity.type))
        .slice(0, limit)
      setFilteredActivities(filtered)
    }
  }

  const toggleFilter = (filterKey: string) => {
    if (filterKey === 'all') {
      setActiveFilters(['all'])
    } else {
      const newFilters = activeFilters.filter(f => f !== 'all')
      if (activeFilters.includes(filterKey)) {
        const updated = newFilters.filter(f => f !== filterKey)
        setActiveFilters(updated.length === 0 ? ['all'] : updated)
      } else {
        setActiveFilters([...newFilters, filterKey])
      }
    }
  }

  const getIcon = (activity: ActivityEvent) => {
    switch (activity.iconType) {
      case 'trade': return <ArrowRightLeft className="h-4 w-4" />
      case 'waiver': return <Target className="h-4 w-4" />
      case 'lineup': return <Users className="h-4 w-4" />
      case 'score': return <TrendingUp className="h-4 w-4" />
      case 'draft': return <Zap className="h-4 w-4" />
      case 'achievement': return <Trophy className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  const getIconColor = (activity: ActivityEvent) => {
    switch (activity.iconType) {
      case 'trade': return 'text-blue-400 bg-blue-900/30'
      case 'waiver': return 'text-green-400 bg-green-900/30'
      case 'lineup': return 'text-purple-400 bg-purple-900/30'
      case 'score': return 'text-yellow-400 bg-yellow-900/30'
      case 'draft': return 'text-orange-400 bg-orange-900/30'
      case 'achievement': return 'text-pink-400 bg-pink-900/30'
      default: return 'text-gray-400 bg-gray-900/30'
    }
  }

  const getPriorityBorder = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500'
      case 'normal': return 'border-l-blue-500'
      default: return 'border-l-gray-600'
    }
  }

  const getTimeAgo = (timestamp: string) => {
    const now = new Date()
    const then = new Date(timestamp)
    const diffMs = now.getTime() - then.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return then.toLocaleDateString()
  }

  return (
    <div className={`${compact ? '' : 'bg-gray-800 rounded-lg border border-gray-700'}`}>
      {!compact && (
        <div className="p-4 border-b border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <Activity className="h-5 w-5 text-blue-500 mr-2" />
              <h2 className="text-lg font-semibold text-white">League Activity</h2>
            </div>
            {lastUpdate && (
              <div className="flex items-center text-xs text-gray-400">
                <Clock className="h-3 w-3 mr-1" />
                Updated {getTimeAgo(lastUpdate)}
              </div>
            )}
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((option) => {
                const Icon = option.icon
                const isActive = activeFilters.includes(option.key)
                
                return (
                  <button
                    key={option.key}
                    onClick={() => toggleFilter(option.key)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <Icon className="h-3 w-3 mr-1" />
                    {option.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div className={`${compact ? 'space-y-2' : 'p-4'} max-h-96 overflow-y-auto`}>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No recent activity</p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredActivities.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-start space-x-3 p-3 rounded-lg border-l-2 transition-colors hover:bg-gray-700/50 ${
                  compact ? 'bg-gray-800' : 'bg-gray-750'
                } ${getPriorityBorder(activity.priority)}`}
              >
                <div className={`p-2 rounded-full ${getIconColor(activity)}`}>
                  {getIcon(activity)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className={`font-medium text-white ${compact ? 'text-sm' : ''}`}>
                        {activity.title}
                      </h4>
                      <p className={`text-gray-400 mt-1 ${compact ? 'text-xs' : 'text-sm'}`}>
                        {activity.description}
                      </p>
                    </div>
                    
                    <div className={`text-gray-500 ml-2 flex-shrink-0 ${compact ? 'text-xs' : 'text-sm'}`}>
                      {getTimeAgo(activity.timestamp)}
                    </div>
                  </div>
                  
                  {activity.teamName && (
                    <div className="flex items-center mt-2">
                      <User className="h-3 w-3 text-gray-500 mr-1" />
                      <span className="text-xs text-gray-500">{activity.teamName}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {!compact && filteredActivities.length > 0 && (
        <div className="p-4 border-t border-gray-700 text-center">
          <button
            onClick={loadActivityFeed}
            className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
          >
            Load More Activity
          </button>
        </div>
      )}
    </div>
  )
}

// Compact version for dashboard/sidebar use
export function CompactActivityFeed({ leagueId, teamId }: { leagueId: string; teamId?: string }) {
  return (
    <ActivityFeed
      leagueId={leagueId}
      teamId={teamId}
      limit={5}
      showFilters={false}
      compact={true}
    />
  )
}