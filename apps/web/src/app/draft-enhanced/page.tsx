import { Metadata } from 'next'
import { prisma } from '@/lib/database/prisma'
import { EnhancedDraftRoom } from '@/components/draft/EnhancedDraftRoom'

export const metadata: Metadata = {
  title: 'Draft Room | AstralField',
  description: 'Live fantasy football draft with AI coach',
}

async function getDraftData() {
  try {
    // Get current league
    const league = await prisma.league.findFirst({
      where: {
        status: 'active',
      },
      select: {
        id: true,
        name: true,
      },
    })

    if (!league) {
      return {
        league: null,
        teams: [],
        availablePlayers: [],
        draftPicks: [],
        userTeam: null,
        currentPick: null,
        isUserTurn: false,
      }
    }

    // Get all teams in the league
    const teams = await prisma.team.findMany({
      where: {
        leagueId: league.id,
      },
      select: {
        id: true,
        name: true,
        User: {
          select: {
            name: true,
          },
        },
      },
    })

    // Get available players (mock - in real app would filter out drafted players)
    const availablePlayers = await prisma.player.findMany({
      take: 200,
      orderBy: {
        adp: 'asc',
      },
      select: {
        id: true,
        name: true,
        position: true,
        nflTeam: true,
        adp: true,
        rank: true,
      },
    })

    // Mock draft picks (in real app would query DraftPick model)
    const draftPicks: any[] = []

    // For demo, use first team as user's team
    const userTeam = teams[0] || null

    // Mock current pick
    const currentPick = {
      id: 'pick-1',
      pickNumber: 1,
      round: 1,
      teamId: userTeam?.id || '',
      playerId: null,
      player: null,
      team: userTeam || { id: '', name: '' },
    }

    const isUserTurn = currentPick.teamId === userTeam?.id

    return {
      league,
      teams,
      availablePlayers,
      draftPicks,
      userTeam,
      currentPick,
      isUserTurn,
    }
  } catch (error) {
    console.error('Error fetching draft data:', error)
    return {
      league: null,
      teams: [],
      availablePlayers: [],
      draftPicks: [],
      userTeam: null,
      currentPick: null,
      isUserTurn: false,
    }
  }
}

export default async function DraftEnhancedPage() {
  const data = await getDraftData()

  if (!data.league || !data.userTeam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">No Active Draft</h1>
          <p className="text-gray-400">No draft is currently in progress.</p>
        </div>
      </div>
    )
  }

  return (
    <EnhancedDraftRoom
      leagueId={data.league.id}
      currentUserId="demo-user" // In real app, get from session
      teams={data.teams}
      availablePlayers={data.availablePlayers}
      draftPicks={data.draftPicks}
      userTeam={data.userTeam}
      currentPick={data.currentPick}
      isUserTurn={data.isUserTurn}
    />
  )
}

