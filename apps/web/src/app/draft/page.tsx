import { Suspense } from 'react'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { DraftRoom } from '@/components/draft/draft-room'

export const metadata = {
  title: 'Draft Room - AstralField',
  description: 'Live fantasy football draft room',
  themeColor: '#0f172a'
}

async function getDraftData(userId: string) {
  // Get user's active draft (first league with draft status)
  const userTeams = await prisma.team.findMany({
    where: { ownerId: userId },
    include: {
      league: {
        select: {
          id: true,
          name: true,
          isActive: true,
          playoffs: true
        }
      }
    }
  })

  const activeDraft = userTeams.find((team: any) => 
    team.league.isActive && 
    !team.league.playoffs
  )

  return {
    userTeams,
    activeDraft,
    leagueId: activeDraft?.league.id
  }
}

export default async function DraftPage() {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const data = await getDraftData(session.user.id)

  if (!data.activeDraft) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">No Active Drafts</h1>
          <p className="text-gray-400 mb-6">
            You don't have any active or scheduled drafts at this time.
          </p>
          <div className="space-y-4">
            {data.userTeams.length > 0 ? (
              <div>
                <h2 className="text-lg font-semibold text-white mb-2">Your Leagues</h2>
                <div className="space-y-2">
                  {data.userTeams.map((team: any) => (
                    <div key={team.id} className="bg-slate-800 rounded p-4 text-left">
                      <p className="font-medium text-white">{team.league.name}</p>
                      <p className="text-sm text-gray-400">
                        Status: {team.league.isActive ? (team.league.playoffs ? 'Playoffs' : 'Active') : 'Inactive'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-gray-400">
                Join a league to participate in drafts.
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="loading-spinner h-8 w-8"></div>
      </div>
    }>
      <DraftRoom 
        leagueId={data.leagueId!}
        currentUserId={session.user.id}
      />
    </Suspense>
  )
}