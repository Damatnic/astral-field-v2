/**
 * Live Scores Page - Complete Rebuild
 * Real-time NFL scores with SSE streaming
 */

'use client'

import { ModernLayout } from '@/components/layout/modern-layout'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingState } from '@/components/ui/loading-state'
import { LiveGameCard } from '@/components/live/live-game-card'
import { useLiveScores } from '@/hooks/use-live-scores'
import { Activity, Wifi, WifiOff, Trophy, Calendar, RefreshCcw } from 'lucide-react'
import { ActionButton } from '@/components/ui/action-button'

export default function LiveScoresPage() {
  const { scores, connected, error, refresh } = useLiveScores({
    enabled: true,
    onConnect: () => console.log('Connected to live scores'),
    onDisconnect: () => console.log('Disconnected from live scores'),
  })

  // Calculate stats from scores
  const liveGames = scores.filter(s => s.status === 'live').length
  const completedGames = scores.filter(s => s.status === 'final').length
  const upcomingGames = scores.filter(s => s.status === 'scheduled').length
  const totalPoints = scores.reduce((sum, s) => sum + s.homeScore + s.awayScore, 0)

  return (
    <ModernLayout>
      <div className="p-6 lg:p-8 space-y-6 pt-16 lg:pt-8">
        {/* Header */}
        <PageHeader
          title="Live Scores"
          description="Real-time NFL game updates and scoring"
          icon={Activity}
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Live Scores' },
          ]}
          actions={
            <div className="flex items-center gap-3">
              {/* Connection Status */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/50 border border-slate-800">
                {connected ? (
                  <>
                    <Wifi className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-medium text-emerald-400">Connected</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-red-400" />
                    <span className="text-sm font-medium text-red-400">Disconnected</span>
                  </>
                )}
              </div>

              {/* Refresh Button */}
              <ActionButton
                variant="ghost"
                size="sm"
                icon={RefreshCcw}
                onClick={refresh}
              >
                Refresh
              </ActionButton>
            </div>
          }
        />

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Live Games"
            value={liveGames}
            icon={Activity}
            variant="success"
            description="in progress"
          />

          <StatCard
            label="Completed"
            value={completedGames}
            icon={Trophy}
            variant="info"
            description="games finished"
          />

          <StatCard
            label="Upcoming"
            value={upcomingGames}
            icon={Calendar}
            variant="default"
            description="scheduled"
          />

          <StatCard
            label="Total Points"
            value={totalPoints}
            icon={Activity}
            variant="warning"
            description="across all games"
          />
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
            <div className="flex items-center gap-3">
              <WifiOff className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-red-400">Connection Error</h3>
                <p className="text-sm text-red-400/80 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Games Grid */}
        {scores.length > 0 ? (
          <div className="space-y-6">
            {/* Live Games */}
            {liveGames > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live Games
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {scores
                    .filter(s => s.status === 'live')
                    .map(game => (
                      <LiveGameCard key={game.gameId} game={game} />
                    ))}
                </div>
              </div>
            )}

            {/* Completed Games */}
            {completedGames > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-white">Final Scores</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {scores
                    .filter(s => s.status === 'final')
                    .map(game => (
                      <LiveGameCard key={game.gameId} game={game} />
                    ))}
                </div>
              </div>
            )}

            {/* Upcoming Games */}
            {upcomingGames > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-white">Upcoming</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {scores
                    .filter(s => s.status === 'scheduled')
                    .map(game => (
                      <LiveGameCard key={game.gameId} game={game} />
                    ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          !connected ? (
            <LoadingState variant="card" count={6} />
          ) : (
            <EmptyState
              icon={Calendar}
              title="No games today"
              description="Check back during the NFL season for live scores and updates."
              action={{
                label: "View Schedule",
                onClick: () => window.location.href = '/schedule',
                icon: Calendar,
              }}
            />
          )
        )}
      </div>
    </ModernLayout>
  )
}
