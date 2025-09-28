'use client'

import React from 'react'

interface Matchup {
  id: string
  homeTeam: string
  awayTeam: string
  homeScore?: number
  awayScore?: number
  isComplete: boolean
}

interface WeeklyMatchupsProps {
  matchups?: Matchup[]
  week?: number
}

export function WeeklyMatchups({ matchups = [], week = 1 }: WeeklyMatchupsProps) {
  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
      <h3 className="text-xl font-semibold text-white mb-4">
        Week {week} Matchups
      </h3>
      
      {matchups.length === 0 ? (
        <div className="text-gray-400 text-center py-8">
          No matchups available for this week
        </div>
      ) : (
        <div className="space-y-4">
          {matchups.map((matchup) => (
            <div 
              key={matchup.id} 
              className="bg-slate-700/50 rounded-lg p-4 border border-slate-600"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-white font-medium">{matchup.awayTeam}</div>
                  <div className="text-gray-400 text-sm">@ {matchup.homeTeam}</div>
                </div>
                
                <div className="text-right">
                  {matchup.isComplete ? (
                    <div className="space-y-1">
                      <div className="text-white font-bold">
                        {matchup.awayScore?.toFixed(1)} - {matchup.homeScore?.toFixed(1)}
                      </div>
                      <div className="text-green-400 text-xs">Final</div>
                    </div>
                  ) : (
                    <div className="text-gray-400 text-sm">
                      Not started
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}