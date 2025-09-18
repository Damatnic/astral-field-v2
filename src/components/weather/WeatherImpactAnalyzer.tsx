'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CloudRain,
  Cloud,
  Sun,
  Wind,
  Snowflake,
  Thermometer,
  MapPin,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  Home,
  Plane,
  Target,
  Shield,
  Zap
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface GameWeather {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  stadium: string;
  isDome: boolean;
  gameTime: Date;
  weather: {
    temperature: number;
    feelsLike: number;
    condition: string;
    windSpeed: number;
    windDirection: string;
    precipitation: number;
    humidity: number;
    visibility: number;
  };
  impact: {
    passing: number;
    rushing: number;
    kicking: number;
    overall: number;
  };
}

interface PlayerWeatherImpact {
  playerId: string;
  playerName: string;
  position: string;
  team: string;
  game: GameWeather;
  baseProjection: number;
  weatherAdjustedProjection: number;
  impactPercentage: number;
  confidenceLevel: number;
  historicalPerformance: {
    inSimilarConditions: number;
    gamesPlayed: number;
    averagePoints: number;
  };
  recommendations: string[];
}

interface WeatherReport {
  week: number;
  games: GameWeather[];
  impactedPlayers: PlayerWeatherImpact[];
  extremeWeatherGames: GameWeather[];
  bestConditions: GameWeather[];
  worstConditions: GameWeather[];
}

export function WeatherImpactAnalyzer({ 
  teamId,
  week,
  leagueId 
}: { 
  teamId: string;
  week: number;
  leagueId: string;
}) {
  const [weatherReport, setWeatherReport] = useState<WeatherReport | null>(null);
  const [selectedGame, setSelectedGame] = useState<GameWeather | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'recommendations'>('overview');

  useEffect(() => {
    fetchWeatherData();
  }, [week]);

  const fetchWeatherData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/weather/impact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, week, leagueId })
      });

      if (response.ok) {
        const data = await response.json();
        setWeatherReport(data);
      }
    } catch (error) {
      console.error('Failed to fetch weather data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'rain':
      case 'showers':
        return <CloudRain className="w-5 h-5" />;
      case 'snow':
        return <Snowflake className="w-5 h-5" />;
      case 'cloudy':
      case 'overcast':
        return <Cloud className="w-5 h-5" />;
      case 'clear':
      case 'sunny':
        return <Sun className="w-5 h-5" />;
      default:
        return <Cloud className="w-5 h-5" />;
    }
  };

  const getImpactColor = (impact: number) => {
    if (impact > 10) return 'text-green-500';
    if (impact > -10) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getConditionSeverity = (game: GameWeather) => {
    const { temperature, windSpeed, precipitation } = game.weather;
    
    if (game.isDome) return 'ideal';
    if (precipitation > 70 || windSpeed > 25 || temperature < 20 || temperature > 95) return 'severe';
    if (precipitation > 40 || windSpeed > 15 || temperature < 35 || temperature > 85) return 'moderate';
    if (precipitation > 20 || windSpeed > 10) return 'mild';
    return 'ideal';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'ideal': return 'bg-green-900/20 border-green-500/30';
      case 'mild': return 'bg-blue-900/20 border-blue-500/30';
      case 'moderate': return 'bg-yellow-900/20 border-yellow-500/30';
      case 'severe': return 'bg-red-900/20 border-red-500/30';
      default: return 'bg-gray-900/20 border-gray-500/30';
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-blue-900/20 to-cyan-900/20 border-blue-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <CloudRain className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Weather Impact Analysis</h2>
              <p className="text-gray-400">Real-time weather effects on player performance</p>
            </div>
          </div>
          
          <Button
            onClick={fetchWeatherData}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'Loading...' : 'Refresh Weather'}
          </Button>
        </div>
      </Card>

      {/* View Tabs */}
      <div className="flex space-x-2">
        {['overview', 'detailed', 'recommendations'].map((mode) => (
          <Button
            key={mode}
            variant={viewMode === mode ? 'default' : 'outline'}
            onClick={() => setViewMode(mode as any)}
            className="capitalize"
          >
            {mode}
          </Button>
        ))}
      </div>

      {weatherReport && (
        <AnimatePresence mode="wait">
          {viewMode === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Weather Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 bg-gray-800 border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Total Games</span>
                    <MapPin className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {weatherReport.games.length}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {weatherReport.games.filter(g => g.isDome).length} dome games
                  </div>
                </Card>

                <Card className="p-4 bg-gray-800 border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Extreme Weather</span>
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {weatherReport.extremeWeatherGames.length}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    games with severe conditions
                  </div>
                </Card>

                <Card className="p-4 bg-gray-800 border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Impacted Players</span>
                    <Wind className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {weatherReport.impactedPlayers.filter(p => Math.abs(p.impactPercentage) > 10).length}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    significant impact expected
                  </div>
                </Card>
              </div>

              {/* Game Weather Grid */}
              <Card className="p-6 bg-gray-800 border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Week {week} Game Conditions</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {weatherReport.games.map((game) => {
                    const severity = getConditionSeverity(game);
                    
                    return (
                      <motion.div
                        key={game.gameId}
                        whileHover={{ scale: 1.02 }}
                        className={`p-4 rounded-lg cursor-pointer ${getSeverityColor(severity)}`}
                        onClick={() => setSelectedGame(game)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">
                              {game.homeTeam} vs {game.awayTeam}
                            </Badge>
                            {game.isDome && (
                              <Shield className="w-4 h-4 text-green-400" />
                            )}
                          </div>
                          <div className="flex items-center space-x-1">
                            {getWeatherIcon(game.weather.condition)}
                            <span className="text-sm text-white">
                              {game.weather.temperature}°F
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center space-x-2">
                            <Wind className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-300">
                              {game.weather.windSpeed} mph
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <CloudRain className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-300">
                              {game.weather.precipitation}%
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-gray-600">
                          <div className="text-xs text-gray-400 mb-1">Performance Impact</div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <span className="text-xs text-gray-500">Pass</span>
                              <div className={`font-bold ${getImpactColor(game.impact.passing)}`}>
                                {game.impact.passing > 0 ? '+' : ''}{game.impact.passing}%
                              </div>
                            </div>
                            <div>
                              <span className="text-xs text-gray-500">Rush</span>
                              <div className={`font-bold ${getImpactColor(game.impact.rushing)}`}>
                                {game.impact.rushing > 0 ? '+' : ''}{game.impact.rushing}%
                              </div>
                            </div>
                            <div>
                              <span className="text-xs text-gray-500">Kick</span>
                              <div className={`font-bold ${getImpactColor(game.impact.kicking)}`}>
                                {game.impact.kicking > 0 ? '+' : ''}{game.impact.kicking}%
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </Card>

              {/* Extreme Weather Alert */}
              {weatherReport.extremeWeatherGames.length > 0 && (
                <Card className="p-4 bg-red-900/20 border-red-500/30">
                  <div className="flex items-center space-x-2 mb-3">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <h4 className="font-semibold text-white">Extreme Weather Alert</h4>
                  </div>
                  <div className="space-y-2">
                    {weatherReport.extremeWeatherGames.map((game) => (
                      <div key={game.gameId} className="flex items-center justify-between p-3 bg-red-900/20 rounded-lg">
                        <div>
                          <div className="font-medium text-white">
                            {game.homeTeam} vs {game.awayTeam}
                          </div>
                          <div className="text-sm text-gray-400">
                            {game.stadium}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-2">
                            {getWeatherIcon(game.weather.condition)}
                            <span className="text-white">
                              {game.weather.temperature}°F
                            </span>
                          </div>
                          <div className="text-xs text-gray-400">
                            Wind: {game.weather.windSpeed} mph
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </motion.div>
          )}

          {viewMode === 'detailed' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Detailed Player Impact Analysis */}
              <Card className="p-6 bg-gray-800 border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Player Weather Impact</h3>
                
                <div className="space-y-3">
                  {weatherReport.impactedPlayers
                    .sort((a, b) => Math.abs(b.impactPercentage) - Math.abs(a.impactPercentage))
                    .map((player) => (
                      <div key={player.playerId} className="p-4 bg-gray-700/50 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="font-semibold text-white">{player.playerName}</div>
                            <div className="text-sm text-gray-400">
                              {player.position} - {player.team}
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className={`text-2xl font-bold ${getImpactColor(player.impactPercentage)}`}>
                              {player.impactPercentage > 0 ? '+' : ''}{player.impactPercentage}%
                            </div>
                            <div className="text-xs text-gray-400">
                              weather impact
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <div className="text-xs text-gray-400">Base Projection</div>
                            <div className="text-lg font-bold text-white">
                              {player.baseProjection.toFixed(1)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400">Adjusted</div>
                            <div className="text-lg font-bold text-white">
                              {player.weatherAdjustedProjection.toFixed(1)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400">Confidence</div>
                            <div className="text-lg font-bold text-white">
                              {player.confidenceLevel}%
                            </div>
                          </div>
                        </div>

                        {player.historicalPerformance.gamesPlayed > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-600">
                            <div className="text-xs text-gray-400 mb-1">Historical in Similar Conditions</div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-300">
                                {player.historicalPerformance.gamesPlayed} games played
                              </span>
                              <span className="text-sm font-bold text-white">
                                {player.historicalPerformance.averagePoints.toFixed(1)} avg pts
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="mt-3 flex items-center space-x-2">
                          <div className="flex items-center space-x-1 text-xs">
                            <Thermometer className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-400">
                              {player.game.weather.temperature}°F
                            </span>
                          </div>
                          <div className="flex items-center space-x-1 text-xs">
                            <Wind className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-400">
                              {player.game.weather.windSpeed} mph
                            </span>
                          </div>
                          {player.game.weather.precipitation > 30 && (
                            <div className="flex items-center space-x-1 text-xs">
                              <CloudRain className="w-3 h-3 text-gray-400" />
                              <span className="text-gray-400">
                                {player.game.weather.precipitation}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </Card>
            </motion.div>
          )}

          {viewMode === 'recommendations' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Best/Worst Conditions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 bg-gray-800 border-gray-700">
                  <div className="flex items-center space-x-2 mb-4">
                    <Sun className="w-5 h-5 text-green-400" />
                    <h4 className="font-semibold text-white">Best Conditions</h4>
                  </div>
                  
                  <div className="space-y-3">
                    {weatherReport.bestConditions.slice(0, 3).map((game) => (
                      <div key={game.gameId} className="p-3 bg-green-900/20 rounded-lg border border-green-500/30">
                        <div className="font-medium text-white">
                          {game.homeTeam} vs {game.awayTeam}
                        </div>
                        <div className="text-sm text-gray-400 mt-1">
                          {game.isDome ? 'Dome' : `${game.weather.temperature}°F, ${game.weather.condition}`}
                        </div>
                        <div className="text-xs text-green-400 mt-1">
                          Ideal for all positions
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-6 bg-gray-800 border-gray-700">
                  <div className="flex items-center space-x-2 mb-4">
                    <Snowflake className="w-5 h-5 text-red-400" />
                    <h4 className="font-semibold text-white">Worst Conditions</h4>
                  </div>
                  
                  <div className="space-y-3">
                    {weatherReport.worstConditions.slice(0, 3).map((game) => (
                      <div key={game.gameId} className="p-3 bg-red-900/20 rounded-lg border border-red-500/30">
                        <div className="font-medium text-white">
                          {game.homeTeam} vs {game.awayTeam}
                        </div>
                        <div className="text-sm text-gray-400 mt-1">
                          {game.weather.temperature}°F, {game.weather.condition}
                        </div>
                        <div className="text-xs text-red-400 mt-1">
                          Avoid passing game players
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Weather-Based Recommendations */}
              <Card className="p-6 bg-gray-800 border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Weather-Based Lineup Recommendations</h3>
                
                <div className="space-y-4">
                  {weatherReport.impactedPlayers
                    .filter(p => p.recommendations.length > 0)
                    .slice(0, 5)
                    .map((player) => (
                      <div key={player.playerId} className="p-4 bg-gray-700/50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium text-white">{player.playerName}</div>
                          <Badge className={player.impactPercentage > 0 ? 'bg-green-600' : 'bg-red-600'}>
                            {player.impactPercentage > 0 ? 'UPGRADE' : 'DOWNGRADE'}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1">
                          {player.recommendations.map((rec, idx) => (
                            <div key={idx} className="flex items-start space-x-2">
                              <Target className="w-3 h-3 text-blue-400 mt-0.5" />
                              <span className="text-sm text-gray-300">{rec}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </Card>

              {/* Position-Specific Guidance */}
              <Card className="p-6 bg-gray-800 border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Position-Specific Weather Guidance</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-700/50 rounded-lg">
                    <Badge className="mb-2">QB</Badge>
                    <div className="text-xs text-gray-400">
                      Avoid in wind &gt; 20mph or heavy precipitation
                    </div>
                  </div>
                  <div className="p-4 bg-gray-700/50 rounded-lg">
                    <Badge className="mb-2">RB</Badge>
                    <div className="text-xs text-gray-400">
                      Upgrade in bad weather (more rushing attempts)
                    </div>
                  </div>
                  <div className="p-4 bg-gray-700/50 rounded-lg">
                    <Badge className="mb-2">WR</Badge>
                    <div className="text-xs text-gray-400">
                      Downgrade in wind/rain, focus on slot receivers
                    </div>
                  </div>
                  <div className="p-4 bg-gray-700/50 rounded-lg">
                    <Badge className="mb-2">TE</Badge>
                    <div className="text-xs text-gray-400">
                      Neutral impact, slight upgrade in wind
                    </div>
                  </div>
                  <div className="p-4 bg-gray-700/50 rounded-lg">
                    <Badge className="mb-2">K</Badge>
                    <div className="text-xs text-gray-400">
                      Major downgrade in wind &gt; 15mph
                    </div>
                  </div>
                  <div className="p-4 bg-gray-700/50 rounded-lg">
                    <Badge className="mb-2">DST</Badge>
                    <div className="text-xs text-gray-400">
                      Upgrade in extreme weather (more turnovers)
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Game Detail Modal */}
      {selectedGame && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedGame(null)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="bg-gray-800 rounded-lg p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">
                {selectedGame.homeTeam} vs {selectedGame.awayTeam}
              </h3>
              <Button
                variant="ghost"
                onClick={() => setSelectedGame(null)}
              >
                Close
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-400 mb-1">Stadium</div>
                <div className="font-medium text-white">
                  {selectedGame.stadium} {selectedGame.isDome && '(Dome)'}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-400 mb-2">Weather Conditions</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-700 rounded-lg">
                    <div className="text-xs text-gray-400">Temperature</div>
                    <div className="font-bold text-white">
                      {selectedGame.weather.temperature}°F
                    </div>
                    <div className="text-xs text-gray-500">
                      Feels like {selectedGame.weather.feelsLike}°F
                    </div>
                  </div>
                  <div className="p-3 bg-gray-700 rounded-lg">
                    <div className="text-xs text-gray-400">Wind</div>
                    <div className="font-bold text-white">
                      {selectedGame.weather.windSpeed} mph
                    </div>
                    <div className="text-xs text-gray-500">
                      {selectedGame.weather.windDirection}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-700 rounded-lg">
                    <div className="text-xs text-gray-400">Precipitation</div>
                    <div className="font-bold text-white">
                      {selectedGame.weather.precipitation}%
                    </div>
                  </div>
                  <div className="p-3 bg-gray-700 rounded-lg">
                    <div className="text-xs text-gray-400">Humidity</div>
                    <div className="font-bold text-white">
                      {selectedGame.weather.humidity}%
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-400 mb-2">Expected Impact</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Passing Game</span>
                    <span className={`font-bold ${getImpactColor(selectedGame.impact.passing)}`}>
                      {selectedGame.impact.passing > 0 ? '+' : ''}{selectedGame.impact.passing}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Rushing Game</span>
                    <span className={`font-bold ${getImpactColor(selectedGame.impact.rushing)}`}>
                      {selectedGame.impact.rushing > 0 ? '+' : ''}{selectedGame.impact.rushing}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Kicking Game</span>
                    <span className={`font-bold ${getImpactColor(selectedGame.impact.kicking)}`}>
                      {selectedGame.impact.kicking > 0 ? '+' : ''}{selectedGame.impact.kicking}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}export default WeatherImpactAnalyzer;
