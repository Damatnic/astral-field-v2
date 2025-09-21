'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EnhancedCard, EnhancedBadge } from './enhanced-components';

// Types for live data
interface LiveScore {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  quarter: number;
  timeRemaining: string;
  gameStatus: 'pregame' | 'live' | 'final' | 'halftime';
  redZone?: boolean;
}

interface PlayerUpdate {
  id: string;
  playerId: string;
  playerName: string;
  team: string;
  position: string;
  updateType: 'touchdown' | 'injury' | 'target' | 'carry' | 'interception' | 'fumble';
  description: string;
  points?: number;
  timestamp: string;
  gameId: string;
}

interface InjuryReportItem {
  id: string;
  playerId: string;
  playerName: string;
  team: string;
  position: string;
  injuryStatus: 'questionable' | 'doubtful' | 'out' | 'ir' | 'healthy';
  injuryType: string;
  description: string;
  updatedAt: string;
  weeklyUpdate?: string;
}

interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  source: string;
  category: 'injury' | 'trade' | 'lineup' | 'performance' | 'news';
  playersInvolved?: Array<{
    id: string;
    name: string;
    team: string;
    position: string;
  }>;
  impact: 'high' | 'medium' | 'low';
  publishedAt: string;
}

// Live Scoring Ticker Component
export function LiveScoresTicker() {
  const [scores, setScores] = useState<LiveScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLiveScores = async () => {
      try {
        // Fetch real live scores from ESPN API
        const response = await fetch('/api/live-scores');
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.scores)) {
            setScores(data.scores);
          } else {
            console.warn('Live scores API returned invalid data:', data);
            setScores([]);
          }
        } else {
          // Fallback to mock data if API fails
          console.warn('Live scores API failed, using fallback data');
          const fallbackScores: LiveScore[] = [
            {
              gameId: 'fallback-1',
              homeTeam: 'TBD',
              awayTeam: 'TBD',
              homeScore: 0,
              awayScore: 0,
              quarter: 1,
              timeRemaining: 'Scheduled',
              gameStatus: 'pregame'
            }
          ];
          setScores(fallbackScores);
        }
        setLoading(false);
      } catch (error) {
        // Failed to fetch live scores
        setLoading(false);
      }
    };

    fetchLiveScores();
    // Refresh every 30 seconds
    const interval = setInterval(fetchLiveScores, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string, redZone?: boolean) => {
    if (redZone) return 'text-red-500 animate-pulse';
    switch (status) {
      case 'live': return 'text-green-500';
      case 'final': return 'text-gray-500';
      case 'halftime': return 'text-yellow-500';
      default: return 'text-blue-500';
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 overflow-hidden">
        <div className="animate-pulse flex items-center justify-center">
          <div className="text-lg font-semibold">Loading live scores...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white overflow-hidden">
      <div className="relative">
        <motion.div
          className="flex items-center space-x-8 py-4 px-4"
          animate={{ x: ['0%', '-100%'] }}
          transition={{ 
            duration: scores.length * 8,
            repeat: Infinity,
            ease: 'linear'
          }}
        >
          {[...scores, ...scores].map((score, index) => (
            <div key={`${score.gameId}-${index}`} className="flex items-center space-x-4 whitespace-nowrap">
              <div className="flex items-center space-x-2">
                <span className="font-bold">{score.awayTeam}</span>
                <span className="text-2xl font-bold">{score.awayScore}</span>
              </div>
              <span className="text-blue-200">@</span>
              <div className="flex items-center space-x-2">
                <span className="font-bold">{score.homeTeam}</span>
                <span className="text-2xl font-bold">{score.homeScore}</span>
              </div>
              <div className="flex flex-col items-center text-xs">
                <span className={getStatusColor(score.gameStatus, score.redZone)}>
                  {score.redZone ? 'RED ZONE' : 
                   score.gameStatus === 'final' ? 'FINAL' :
                   score.gameStatus === 'halftime' ? 'HALF' :
                   `Q${score.quarter}`}
                </span>
                {score.gameStatus === 'live' && !score.redZone && (
                  <span className="text-blue-200">{score.timeRemaining}</span>
                )}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

// Live Player Updates Feed
export function LivePlayerUpdates() {
  const [updates, setUpdates] = useState<PlayerUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUpdates = async () => {
      try {
        // Fetch real player updates from API
        const response = await fetch('/api/player-updates');
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.updates)) {
            setUpdates(data.updates);
          } else {
            console.warn('Player updates API returned invalid data:', data);
            setUpdates([]);
          }
        } else {
          // Fallback to empty array if API fails
          console.warn('Player updates API failed');
          setUpdates([]);
        }
        setLoading(false);
      } catch (error) {
        // Failed to fetch player updates
        setLoading(false);
      }
    };

    fetchUpdates();
    // Refresh every 15 seconds
    const interval = setInterval(fetchUpdates, 15000);
    return () => clearInterval(interval);
  }, []);

  const getUpdateIcon = (type: string) => {
    switch (type) {
      case 'touchdown':
        return (
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
            TD
          </div>
        );
      case 'injury':
        return (
          <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'target':
      case 'carry':
        return (
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  return (
    <EnhancedCard className="h-96 overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <h3 className="font-semibold text-gray-900">Live Player Updates</h3>
        </div>
      </div>
      
      <div className="p-4 overflow-y-auto h-full">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse flex items-center space-x-3">
                <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-3">
              {updates.map((update) => (
                <motion.div
                  key={update.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {getUpdateIcon(update.updateType)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">{update.playerName}</span>
                      <EnhancedBadge variant="position" position={update.position as any} size="sm">
                        {update.position}
                      </EnhancedBadge>
                      <span className="text-sm text-gray-500">{update.team}</span>
                    </div>
                    <p className="text-sm text-gray-600">{update.description}</p>
                    {update.points && (
                      <div className="text-sm font-medium text-green-600">
                        +{update.points} pts
                      </div>
                    )}
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(update.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </EnhancedCard>
  );
}

// Injury Report Component
export function InjuryReport() {
  const [injuries, setInjuries] = useState<InjuryReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInjuries = async () => {
      try {
        // Fetch real injury report from API
        const response = await fetch('/api/injuries');
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.injuries)) {
            setInjuries(data.injuries);
          } else {
            console.warn('Injury report API returned invalid data:', data);
            setInjuries([]);
          }
        } else {
          // Fallback to empty array if API fails
          console.warn('Injury report API failed');
          setInjuries([]);
        }
        setLoading(false);
      } catch (error) {
        // Failed to fetch injury report
        setLoading(false);
      }
    };

    fetchInjuries();
    // Refresh every 5 minutes
    const interval = setInterval(fetchInjuries, 300000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'out':
        return <EnhancedBadge variant="danger" size="sm">OUT</EnhancedBadge>;
      case 'doubtful':
        return <EnhancedBadge variant="warning" size="sm">DOUBTFUL</EnhancedBadge>;
      case 'questionable':
        return <EnhancedBadge variant="warning" size="sm">QUESTIONABLE</EnhancedBadge>;
      case 'ir':
        return <EnhancedBadge variant="danger" size="sm">IR</EnhancedBadge>;
      case 'healthy':
        return <EnhancedBadge variant="success" size="sm">HEALTHY</EnhancedBadge>;
      default:
        return <EnhancedBadge variant="default" size="sm">{status.toUpperCase()}</EnhancedBadge>;
    }
  };

  return (
    <EnhancedCard>
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="font-semibold text-gray-900">Injury Report</h3>
        </div>
      </div>
      
      <div className="p-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {injuries.map((injury) => (
              <motion.div
                key={injury.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{injury.playerName}</span>
                    <EnhancedBadge variant="position" position={injury.position as any} size="sm">
                      {injury.position}
                    </EnhancedBadge>
                    <span className="text-sm text-gray-500">{injury.team}</span>
                  </div>
                  {getStatusBadge(injury.injuryStatus)}
                </div>
                
                <div className="text-sm text-gray-600 mb-1">
                  <strong>{injury.injuryType}:</strong> {injury.description}
                </div>
                
                {injury.weeklyUpdate && (
                  <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded mt-2">
                    {injury.weeklyUpdate}
                  </div>
                )}
                
                <div className="text-xs text-gray-400 mt-2">
                  Updated: {new Date(injury.updatedAt).toLocaleString()}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </EnhancedCard>
  );
}

// News Feed Component
export function NewsFeed() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'injury' | 'trade' | 'lineup'>('all');

  useEffect(() => {
    const fetchNews = async () => {
      try {
        // Fetch real news from API
        const response = await fetch('/api/news/fantasy');
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.news)) {
            setNews(data.news);
          } else {
            console.warn('Fantasy news API returned invalid data:', data);
            setNews([]);
          }
        } else {
          // Fallback to empty array if API fails
          console.warn('Fantasy news API failed');
          setNews([]);
        }
        setLoading(false);
      } catch (error) {
        // Failed to fetch news
        setLoading(false);
      }
    };

    fetchNews();
    // Refresh every 2 minutes
    const interval = setInterval(fetchNews, 120000);
    return () => clearInterval(interval);
  }, []);

  const filteredNews = filter === 'all' 
    ? news 
    : news.filter(item => item.category === filter);

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'injury':
        return (
          <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'trade':
        return (
          <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        );
      case 'lineup':
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
        );
    }
  };

  return (
    <EnhancedCard>
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <h3 className="font-semibold text-gray-900">Fantasy News</h3>
          </div>
          
          <div className="flex gap-1">
            {['all', 'injury', 'trade', 'lineup'].map((filterOption) => (
              <button
                key={filterOption}
                onClick={() => setFilter(filterOption as any)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  filter === filterOption
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="p-4 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-4">
              {filteredNews.map((item) => (
                <motion.article
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-3 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getCategoryIcon(item.category)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getImpactColor(item.impact)}`}>
                          {item.impact.toUpperCase()} IMPACT
                        </span>
                        <span className="text-xs text-gray-500">{item.source}</span>
                      </div>
                      
                      <h4 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
                        {item.headline}
                      </h4>
                      
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                        {item.summary}
                      </p>
                      
                      {item.playersInvolved && item.playersInvolved.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {item.playersInvolved.map((player) => (
                            <span
                              key={player.id}
                              className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full"
                            >
                              {player.name} ({player.team})
                            </span>
                          ))}
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-400">
                        {new Date(item.publishedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </EnhancedCard>
  );
}