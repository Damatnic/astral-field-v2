'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  SparklesIcon,
  TrophyIcon,
  FireIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  BoltIcon,
  TagIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface Player {
  id: string
  name: string
  position: string
  team: string
  projectedPoints: number
  averagePoints: number
  trend: 'up' | 'down' | 'stable'
  injuryStatus: string
  ownership: number
  adp: number
  aiScore: number
  tags: string[]
  recentNews: string[]
}

interface SearchSuggestion {
  type: 'player' | 'position' | 'team' | 'strategy' | 'situation'
  text: string
  confidence: number
  data?: any
}

interface EnhancedPlayerSearchProps {
  onPlayerSelect?: (player: Player) => void
  teamId?: string
  leagueId?: string
}

export function EnhancedPlayerSearch({ onPlayerSelect, teamId, leagueId }: EnhancedPlayerSearchProps) {
  const [query, setQuery] = useState('')
  const [players, setPlayers] = useState<Player[]>([])
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([])
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({})
  const [nlpMode, setNlpMode] = useState(false)
  const [aiInsights, setAiInsights] = useState<any>(null)

  // Mock player data (in production, this would come from API)
  const mockPlayers: Player[] = [
    {
      id: '1',
      name: 'Josh Jacobs',
      position: 'RB',
      team: 'LV',
      projectedPoints: 18.4,
      averagePoints: 16.2,
      trend: 'up',
      injuryStatus: 'healthy',
      ownership: 45.2,
      adp: 24,
      aiScore: 87.5,
      tags: ['bellcow', 'red_zone', 'consistent'],
      recentNews: ['Increased workload expected', 'Goal line carries trending up']
    },
    {
      id: '2',
      name: 'DeVonta Smith',
      position: 'WR',
      team: 'PHI',
      projectedPoints: 14.8,
      averagePoints: 13.1,
      trend: 'up',
      injuryStatus: 'healthy',
      ownership: 38.7,
      adp: 42,
      aiScore: 82.3,
      tags: ['target_share', 'deep_threat', 'upside'],
      recentNews: ['Target share increasing', 'Favorable upcoming schedule']
    },
    {
      id: '3',
      name: 'George Kittle',
      position: 'TE',
      team: 'SF',
      projectedPoints: 11.2,
      averagePoints: 9.8,
      trend: 'stable',
      injuryStatus: 'questionable',
      ownership: 67.3,
      adp: 18,
      aiScore: 75.1,
      tags: ['elite', 'injury_prone', 'ceiling'],
      recentNews: ['Minor injury concern', 'Still expected to play']
    },
    {
      id: '4',
      name: 'Calvin Ridley',
      position: 'WR',
      team: 'TEN',
      projectedPoints: 16.2,
      averagePoints: 12.5,
      trend: 'up',
      injuryStatus: 'healthy',
      ownership: 23.1,
      adp: 68,
      aiScore: 91.2,
      tags: ['breakout', 'low_ownership', 'value'],
      recentNews: ['Breakout performance last week', 'Increased target share']
    },
    {
      id: '5',
      name: 'Gus Edwards',
      position: 'RB',
      team: 'BAL',
      projectedPoints: 8.9,
      averagePoints: 7.2,
      trend: 'up',
      injuryStatus: 'healthy',
      ownership: 12.4,
      adp: 156,
      aiScore: 78.9,
      tags: ['waiver_gem', 'goal_line', 'sleeper'],
      recentNews: ['Increased role in offense', 'TD upside growing']
    }
  ]

  useEffect(() => {
    setPlayers(mockPlayers)
    setFilteredPlayers(mockPlayers)
  }, [])

  useEffect(() => {
    if (query.length > 0) {
      performIntelligentSearch()
    } else {
      setFilteredPlayers(players)
      setSuggestions([])
      setAiInsights(null)
    }
  }, [query, players])

  const performIntelligentSearch = async () => {
    setLoading(true)
    
    try {
      // Natural Language Processing for search intent
      const searchIntent = analyzeSearchIntent(query)
      
      // Generate AI-powered suggestions
      const aiSuggestions = generateAISuggestions(query, searchIntent)
      setSuggestions(aiSuggestions)
      
      // Filter players based on intelligent search
      const filtered = intelligentFilter(players, query, searchIntent)
      setFilteredPlayers(filtered)
      
      // Generate AI insights about search results
      const insights = generateSearchInsights(filtered, query, searchIntent)
      setAiInsights(insights)
      
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Search failed:', error);
      }
      toast.error('Search failed')
    } finally {
      setLoading(false)
    }
  }

  const analyzeSearchIntent = (searchQuery: string) => {
    const lowerQuery = searchQuery.toLowerCase()
    
    // Position search
    if (['qb', 'rb', 'wr', 'te', 'k', 'dst'].some(pos => lowerQuery.includes(pos))) {
      return {
        type: 'position',
        position: ['qb', 'rb', 'wr', 'te', 'k', 'dst'].find(pos => lowerQuery.includes(pos)),
        confidence: 0.9
      }
    }
    
    // Team search
    const teams = ['buf', 'mia', 'ne', 'nyj', 'bal', 'cin', 'cle', 'pit', 'hou', 'ind', 'jax', 'ten', 'den', 'kc', 'lv', 'lac']
    const team = teams.find(t => lowerQuery.includes(t))
    if (team) {
      return {
        type: 'team',
        team: team.toUpperCase(),
        confidence: 0.85
      }
    }
    
    // Strategy/situation search
    if (lowerQuery.includes('waiver') || lowerQuery.includes('pickup')) {
      return {
        type: 'waiver',
        criteria: ['low_ownership', 'value', 'sleeper'],
        confidence: 0.8
      }
    }
    
    if (lowerQuery.includes('breakout') || lowerQuery.includes('sleeper')) {
      return {
        type: 'breakout',
        criteria: ['upside', 'low_ownership', 'trending_up'],
        confidence: 0.8
      }
    }
    
    if (lowerQuery.includes('safe') || lowerQuery.includes('floor')) {
      return {
        type: 'safe',
        criteria: ['consistent', 'high_floor', 'low_risk'],
        confidence: 0.8
      }
    }
    
    if (lowerQuery.includes('boom') || lowerQuery.includes('ceiling')) {
      return {
        type: 'ceiling',
        criteria: ['upside', 'boom_potential', 'ceiling'],
        confidence: 0.8
      }
    }
    
    // Injury/availability search
    if (lowerQuery.includes('healthy') || lowerQuery.includes('available')) {
      return {
        type: 'availability',
        criteria: ['healthy'],
        confidence: 0.9
      }
    }
    
    // Player name search (default)
    return {
      type: 'player_name',
      query: searchQuery,
      confidence: 0.7
    }
  }

  const generateAISuggestions = (query: string, intent: any): SearchSuggestion[] => {
    const suggestions: SearchSuggestion[] = []
    
    if (intent.type === 'position') {
      suggestions.push({
        type: 'strategy',
        text: `Best available ${intent.position?.toUpperCase()} players`,
        confidence: 0.9
      })
      suggestions.push({
        type: 'strategy',
        text: `Sleeper ${intent.position?.toUpperCase()} picks`,
        confidence: 0.8
      })
    }
    
    if (intent.type === 'waiver') {
      suggestions.push({
        type: 'strategy',
        text: 'Low ownership gems',
        confidence: 0.9
      })
      suggestions.push({
        type: 'strategy',
        text: 'Trending up players',
        confidence: 0.85
      })
    }
    
    // Add contextual suggestions based on team needs (if teamId provided)
    if (teamId) {
      suggestions.push({
        type: 'situation',
        text: 'Players that fill your team needs',
        confidence: 0.8
      })
    }
    
    return suggestions.slice(0, 3)
  }

  const intelligentFilter = (playerList: Player[], searchQuery: string, intent: any): Player[] => {
    let filtered = [...playerList]
    
    // Apply intent-based filtering
    switch (intent.type) {
      case 'position':
        filtered = filtered.filter(p => p.position.toLowerCase() === intent.position)
        break
        
      case 'team':
        filtered = filtered.filter(p => p.team === intent.team)
        break
        
      case 'waiver':
        filtered = filtered
          .filter(p => p.ownership < 50)
          .sort((a, b) => b.aiScore - a.aiScore)
        break
        
      case 'breakout':
        filtered = filtered
          .filter(p => p.tags.some(tag => ['breakout', 'sleeper', 'upside'].includes(tag)))
          .sort((a, b) => b.aiScore - a.aiScore)
        break
        
      case 'safe':
        filtered = filtered
          .filter(p => p.tags.some(tag => ['consistent', 'bellcow', 'elite'].includes(tag)))
          .sort((a, b) => a.projectedPoints - Math.abs(a.projectedPoints - a.averagePoints) - 
                           (b.projectedPoints - Math.abs(b.projectedPoints - b.averagePoints)))
        break
        
      case 'ceiling':
        filtered = filtered
          .filter(p => p.tags.some(tag => ['upside', 'ceiling', 'boom_potential'].includes(tag)))
          .sort((a, b) => b.projectedPoints - a.projectedPoints)
        break
        
      case 'availability':
        filtered = filtered.filter(p => p.injuryStatus === 'healthy')
        break
        
      case 'player_name':
        filtered = filtered.filter(p => 
          p.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        break
    }
    
    // Apply additional filters from activeFilters
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value) {
        switch (key) {
          case 'trending_up':
            filtered = filtered.filter(p => p.trend === 'up')
            break
          case 'low_ownership':
            filtered = filtered.filter(p => p.ownership < 30)
            break
          case 'high_ceiling':
            filtered = filtered.filter(p => p.projectedPoints > 15)
            break
        }
      }
    })
    
    return filtered.slice(0, 20) // Limit results
  }

  const generateSearchInsights = (results: Player[], query: string, intent: any) => {
    if (results.length === 0) {
      return {
        message: 'No players found matching your criteria',
        suggestions: ['Try broadening your search', 'Consider different positions', 'Look for waiver wire options']
      }
    }
    
    const avgAiScore = results.reduce((sum, p) => sum + p.aiScore, 0) / results.length
    const lowOwnership = results.filter(p => p.ownership < 30).length
    const trendingUp = results.filter(p => p.trend === 'up').length
    
    return {
      message: `Found ${results.length} players matching "${query}"`,
      insights: [
        `Average AI Score: ${avgAiScore.toFixed(1)}/100`,
        `${lowOwnership} low-ownership gems available`,
        `${trendingUp} players trending upward`,
        `Top recommendation: ${results[0]?.name} (${results[0]?.aiScore.toFixed(1)} AI Score)`
      ]
    }
  }

  const toggleFilter = (filterKey: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterKey]: !prev[filterKey]
    }))
  }

  const getPlayerTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <BoltIcon className="h-4 w-4 text-green-400" />
      case 'down': return <ChartBarIcon className="h-4 w-4 text-red-400" />
      default: return <ChartBarIcon className="h-4 w-4 text-gray-400" />
    }
  }

  const getInjuryStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400'
      case 'questionable': return 'text-yellow-400'
      case 'doubtful': return 'text-orange-400'
      case 'out': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Search Bar */}
      <div className="relative">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try: 'waiver wire RB', 'breakout WR', 'safe floor players', or player names..."
            className="w-full pl-10 pr-12 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <SparklesIcon className="h-5 w-5 text-blue-400 animate-spin" />
            </div>
          )}
        </div>
        
        {/* AI-Powered Suggestions */}
        {suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => setQuery(suggestion.text)}
                className="w-full px-4 py-2 text-left hover:bg-slate-700 first:rounded-t-lg last:rounded-b-lg flex items-center space-x-2"
              >
                <SparklesIcon className="h-4 w-4 text-purple-400" />
                <span className="text-white">{suggestion.text}</span>
                <span className="text-xs text-gray-400 ml-auto">
                  {Math.round(suggestion.confidence * 100)}% match
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Smart Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setNlpMode(!nlpMode)}
          className={`px-3 py-1 rounded-full text-sm flex items-center space-x-1 ${
            nlpMode ? 'bg-purple-600 text-white' : 'bg-slate-700 text-gray-300'
          }`}
        >
          <SparklesIcon className="h-4 w-4" />
          <span>AI Mode</span>
        </button>
        
        {['trending_up', 'low_ownership', 'high_ceiling'].map((filter) => (
          <button
            key={filter}
            onClick={() => toggleFilter(filter)}
            className={`px-3 py-1 rounded-full text-sm ${
              activeFilters[filter]
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
          >
            {filter.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      {/* AI Insights */}
      {aiInsights && (
        <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <SparklesIcon className="h-5 w-5 text-blue-400" />
            <h4 className="font-semibold text-blue-400">AI Search Insights</h4>
          </div>
          <p className="text-gray-300 mb-2">{aiInsights.message}</p>
          {aiInsights.insights && (
            <div className="space-y-1">
              {aiInsights.insights.map((insight: string, index: number) => (
                <div key={index} className="text-sm text-gray-400 flex items-center">
                  <div className="w-1 h-1 bg-blue-400 rounded-full mr-2"></div>
                  {insight}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Player Results */}
      <div className="space-y-3">
        {filteredPlayers.length === 0 && query ? (
          <div className="text-center py-8 text-gray-400">
            <MagnifyingGlassIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <div>No players found</div>
            <div className="text-sm">Try adjusting your search or filters</div>
          </div>
        ) : (
          filteredPlayers.map((player) => (
            <div
              key={player.id}
              className="bg-slate-800/50 rounded-lg border border-slate-700 p-4 hover:border-blue-500/50 cursor-pointer transition-all"
              onClick={() => onPlayerSelect?.(player)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex flex-col items-center">
                    <div className="text-lg font-bold text-white">{player.name}</div>
                    <div className="text-sm text-gray-400">{player.position} - {player.team}</div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {getPlayerTrendIcon(player.trend)}
                    <span className={`text-sm ${getInjuryStatusColor(player.injuryStatus)}`}>
                      {player.injuryStatus}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-400">{player.projectedPoints}</div>
                    <div className="text-xs text-gray-400">Projected</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-400">{player.aiScore}</div>
                    <div className="text-xs text-gray-400">AI Score</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-sm text-gray-300">{player.ownership}%</div>
                    <div className="text-xs text-gray-400">Owned</div>
                  </div>
                </div>
              </div>

              {/* Player Tags */}
              <div className="flex items-center space-x-2 mt-3">
                {player.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-slate-700 text-gray-300 text-xs rounded-full"
                  >
                    {tag.replace('_', ' ')}
                  </span>
                ))}
                
                {player.recentNews.length > 0 && (
                  <div className="flex items-center space-x-1 text-xs text-blue-400">
                    <FireIcon className="h-3 w-3" />
                    <span>Breaking News</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}