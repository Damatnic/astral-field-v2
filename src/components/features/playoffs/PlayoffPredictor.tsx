'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Trophy, 
  Target, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  BarChart,
  Zap,
  Star,
  Calendar
} from 'lucide-react'
import playoffPredictor, { type PlayoffPrediction, type LeaguePlayoffRace } from '@/services/ai/playoffPredictor'

interface PlayoffPredictorProps {
  teamId?: string
  leagueId: string
  showLeagueRace?: boolean
}

export default function PlayoffPredictor({ teamId, leagueId, showLeagueRace = false }: PlayoffPredictorProps) {
  const [prediction, setPrediction] = useState<PlayoffPrediction | null>(null)
  const [leagueRace, setLeagueRace] = useState<LeaguePlayoffRace | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'scenarios' | 'schedule' | 'race'>('overview')

  useEffect(() => {
    loadPredictions()
  }, [teamId, leagueId])

  const loadPredictions = async () => {
    setIsLoading(true)
    try {
      const [teamPrediction, raceData] = await Promise.all([
        teamId ? playoffPredictor.predictTeamPlayoffChances(teamId, leagueId) : null,
        showLeagueRace ? playoffPredictor.getLeaguePlayoffRace(leagueId) : null
      ])
      
      setPrediction(teamPrediction)
      setLeagueRace(raceData)
    } catch (error) {
      console.error('Failed to load playoff predictions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getProbabilityColor = (probability: number) => {
    if (probability >= 80) return 'text-green-400 bg-green-900/20 border-green-500'
    if (probability >= 60) return 'text-green-300 bg-green-900/10 border-green-600'
    if (probability >= 40) return 'text-yellow-400 bg-yellow-900/20 border-yellow-500'
    if (probability >= 20) return 'text-orange-400 bg-orange-900/20 border-orange-500'
    return 'text-red-400 bg-red-900/20 border-red-500'
  }

  const getScheduleStrengthColor = (strength: number) => {
    if (strength >= 70) return 'text-red-400'
    if (strength >= 50) return 'text-yellow-400'
    return 'text-green-400'
  }

  const tabs = [
    { key: 'overview', label: 'Overview', icon: BarChart },
    { key: 'scenarios', label: 'Scenarios', icon: Target },
    { key: 'schedule', label: 'Schedule', icon: Calendar },
    ...(showLeagueRace ? [{ key: 'race', label: 'League Race', icon: Users }] : [])
  ]

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="text-center py-12">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-white mb-2">Calculating Playoff Scenarios...</h3>
          <p className="text-gray-400">Analyzing standings, schedules, and probabilities</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-900/30 rounded-lg">
              <Trophy className="h-6 w-6 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Playoff Predictor</h2>
              <p className="text-sm text-gray-400">AI-powered playoff scenario analysis</p>
            </div>
          </div>
          <button
            onClick={loadPredictions}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Refresh Predictions
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-700 rounded-lg p-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center px-4 py-2 rounded text-sm transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'overview' && prediction && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 text-center">
              <div className="p-3 bg-blue-900/30 rounded-lg inline-block mb-3">
                <Target className="h-8 w-8 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {prediction.playoffProbability}%
              </div>
              <div className="text-gray-400">Playoff Probability</div>
            </div>

            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 text-center">
              <div className="p-3 bg-yellow-900/30 rounded-lg inline-block mb-3">
                <Trophy className="h-8 w-8 text-yellow-400" />
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                #{prediction.projectedSeed}
              </div>
              <div className="text-gray-400">Projected Seed</div>
            </div>

            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 text-center">
              <div className="p-3 bg-green-900/30 rounded-lg inline-block mb-3">
                <Star className="h-8 w-8 text-green-400" />
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {prediction.championshipOdds}%
              </div>
              <div className="text-gray-400">Championship Odds</div>
            </div>

            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 text-center">
              <div className="p-3 bg-purple-900/30 rounded-lg inline-block mb-3">
                <Zap className="h-8 w-8 text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {prediction.byeProbability}%
              </div>
              <div className="text-gray-400">First Round Bye</div>
            </div>
          </div>

          {/* Current Position */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Current Position</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Current Seed:</span>
                  <span className="text-white font-medium">#{prediction.currentSeed}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Projected Seed:</span>
                  <span className={`font-medium ${
                    prediction.projectedSeed < prediction.currentSeed ? 'text-green-400' :
                    prediction.projectedSeed > prediction.currentSeed ? 'text-red-400' :
                    'text-yellow-400'
                  }`}>
                    #{prediction.projectedSeed}
                    {prediction.projectedSeed < prediction.currentSeed && (
                      <TrendingUp className="inline h-4 w-4 ml-1" />
                    )}
                    {prediction.projectedSeed > prediction.currentSeed && (
                      <TrendingDown className="inline h-4 w-4 ml-1" />
                    )}
                  </span>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Schedule Strength:</span>
                  <span className={`font-medium ${getScheduleStrengthColor(prediction.strengthOfSchedule.remaining)}`}>
                    {prediction.strengthOfSchedule.remaining}% (Rank #{prediction.strengthOfSchedule.rank})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Toughest Weeks:</span>
                  <span className="text-white">
                    {prediction.strengthOfSchedule.toughestWeeks.join(', ') || 'None'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {prediction.recommendations.length > 0 && (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">AI Recommendations</h3>
              <div className="space-y-4">
                {prediction.recommendations.map((rec, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`border-l-4 pl-4 py-3 ${
                      rec.priority === 'high' ? 'border-red-500' :
                      rec.priority === 'medium' ? 'border-yellow-500' :
                      'border-blue-500'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`text-xs px-2 py-1 rounded uppercase font-medium ${
                            rec.type === 'trade' ? 'bg-purple-900/30 text-purple-400' :
                            rec.type === 'waiver' ? 'bg-blue-900/30 text-blue-400' :
                            rec.type === 'lineup' ? 'bg-green-900/30 text-green-400' :
                            'bg-gray-700 text-gray-300'
                          }`}>
                            {rec.type}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded uppercase font-medium ${
                            rec.priority === 'high' ? 'bg-red-900/30 text-red-400' :
                            rec.priority === 'medium' ? 'bg-yellow-900/30 text-yellow-400' :
                            'bg-blue-900/30 text-blue-400'
                          }`}>
                            {rec.priority} priority
                          </span>
                        </div>
                        <p className="font-medium text-white">{rec.description}</p>
                        <p className="text-gray-400 text-sm mt-1">{rec.impact}</p>
                        {rec.weeks.length > 0 && (
                          <p className="text-gray-500 text-xs mt-1">
                            Target weeks: {rec.weeks.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'scenarios' && prediction && (
        <div className="space-y-6">
          {/* Scenarios Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Best Case */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-green-900/30 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Best Case</h3>
                  <p className="text-sm text-green-400">{prediction.scenarios.best.probability}% chance</p>
                </div>
              </div>
              <p className="text-gray-300 text-sm mb-4">
                {prediction.scenarios.best.description}
              </p>
              <div className="space-y-2">
                <div className="text-xs text-gray-400">Requirements:</div>
                <div className="text-sm text-white">
                  • {prediction.scenarios.best.requirements.wins} total wins
                </div>
                {prediction.scenarios.best.requirements.teamsToOutperform.length > 0 && (
                  <div className="text-sm text-white">
                    • Outperform: {prediction.scenarios.best.requirements.teamsToOutperform.join(', ')}
                  </div>
                )}
              </div>
            </div>

            {/* Most Likely */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-yellow-900/30 rounded-lg">
                  <Target className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Most Likely</h3>
                  <p className="text-sm text-yellow-400">{prediction.scenarios.mostLikely.probability}% chance</p>
                </div>
              </div>
              <p className="text-gray-300 text-sm mb-4">
                {prediction.scenarios.mostLikely.description}
              </p>
              <div className="space-y-2">
                <div className="text-xs text-gray-400">Requirements:</div>
                <div className="text-sm text-white">
                  • {prediction.scenarios.mostLikely.requirements.wins} total wins
                </div>
                {prediction.scenarios.mostLikely.requirements.teamsToOutperform.length > 0 && (
                  <div className="text-sm text-white">
                    • Outperform: {prediction.scenarios.mostLikely.requirements.teamsToOutperform.join(', ')}
                  </div>
                )}
              </div>
            </div>

            {/* Worst Case */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-red-900/30 rounded-lg">
                  <TrendingDown className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Worst Case</h3>
                  <p className="text-sm text-red-400">{prediction.scenarios.worst.probability}% chance</p>
                </div>
              </div>
              <p className="text-gray-300 text-sm mb-4">
                {prediction.scenarios.worst.description}
              </p>
              <div className="space-y-2">
                <div className="text-xs text-gray-400">Risk factors:</div>
                <div className="text-sm text-white">
                  • Lose key matchups
                </div>
                <div className="text-sm text-white">
                  • Other teams improve
                </div>
              </div>
            </div>
          </div>

          {/* Key Games */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Critical Upcoming Games</h3>
            <div className="space-y-4">
              {prediction.scenarios.mostLikely.keyGames.map((game, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div>
                    <div className="font-medium text-white">
                      Week {game.week}: vs {game.teamB}
                    </div>
                    <div className="text-sm text-gray-400">{game.impact}</div>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded text-xs font-medium ${
                      game.importance === 'critical' ? 'bg-red-900/30 text-red-400' :
                      game.importance === 'important' ? 'bg-yellow-900/30 text-yellow-400' :
                      'bg-blue-900/30 text-blue-400'
                    }`}>
                      {game.importance.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'schedule' && prediction && (
        <div className="space-y-6">
          {/* Week by Week */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Playoff Probability by Week</h3>
            <div className="space-y-4">
              {prediction.weekByWeek.map((week, index) => (
                <motion.div
                  key={week.week}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-white">
                        W{week.week}
                      </div>
                    </div>
                    <div>
                      {week.keyMatchups.map((matchup, i) => (
                        <div key={i}>
                          <div className="font-medium text-white">
                            vs {matchup.opponent}
                          </div>
                          <div className="text-sm text-gray-400">
                            {matchup.winProbability}% win probability
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`text-lg font-bold ${getProbabilityColor(week.probabilityAfterWeek).split(' ')[0]}`}>
                      {week.probabilityAfterWeek}%
                    </div>
                    <div className="text-sm text-gray-400">
                      Playoff odds after week
                    </div>
                    <div className="text-xs text-gray-500">
                      Projected seed: #{week.projectedSeed}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'race' && leagueRace && (
        <div className="space-y-6">
          {/* League Standings */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Playoff Race Standings</h3>
            <div className="space-y-2">
              {leagueRace.standings.map((team, index) => (
                <div
                  key={team.teamId}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    team.clinched ? 'bg-green-900/20 border border-green-700' :
                    team.eliminated ? 'bg-red-900/20 border border-red-700' :
                    'bg-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-8 text-center font-bold text-white">
                      #{team.seed}
                    </div>
                    <div>
                      <div className="font-medium text-white">
                        Team {team.teamId}
                      </div>
                      <div className="text-sm text-gray-400">
                        {team.record}
                        {team.clinched && (
                          <span className="ml-2 text-green-400">• CLINCHED</span>
                        )}
                        {team.eliminated && (
                          <span className="ml-2 text-red-400">• ELIMINATED</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-medium ${getProbabilityColor(team.playoffProbability).split(' ')[0]}`}>
                      {team.playoffProbability}%
                    </div>
                    <div className="text-xs text-gray-400">Playoff odds</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Matchups */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Key Upcoming Matchups</h3>
            <div className="space-y-4">
              {leagueRace.playoffPicture.keyMatchups.map((weekMatchups) => (
                <div key={weekMatchups.week}>
                  <h4 className="font-medium text-white mb-3">Week {weekMatchups.week}</h4>
                  <div className="space-y-3">
                    {weekMatchups.matchups.map((matchup, index) => (
                      <div key={index} className="p-3 bg-gray-700 rounded-lg">
                        <div className="font-medium text-white mb-1">
                          {matchup.teamA} vs {matchup.teamB}
                        </div>
                        <div className="text-sm text-gray-400">
                          {matchup.playoffImplications}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}