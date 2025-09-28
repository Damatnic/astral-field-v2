import { NextRequest } from 'next/server'
import { leagueCache } from '@/lib/cache/catalyst-cache'
import { phoenixDb } from '@/lib/optimized-prisma'

// Catalyst: High-performance SSE endpoint for real-time league updates
export async function GET(
  request: NextRequest,
  { params }: { params: { leagueId: string } }
) {
  const { leagueId } = params
  
  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      // Catalyst: Send initial connection confirmation
      const encoder = new TextEncoder()
      
      const sendEvent = (event: string, data: any) => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(message))
      }
      
      // Send connection established
      sendEvent('connected', { 
        leagueId, 
        timestamp: new Date().toISOString(),
        message: 'Real-time updates active'
      })

      // Catalyst: Set up periodic updates every 30 seconds
      const updateInterval = setInterval(async () => {
        try {
          // Check for fresh data (bypass cache)
          const freshData = await phoenixDb.getCachedResult(`realtime:${leagueId}`)
          
          if (freshData) {
            sendEvent('league-update', {
              type: 'standings',
              data: freshData,
              timestamp: new Date().toISOString()
            })
          }

          // Check for score updates
          const scoreUpdates = await phoenixDb.getCachedResult(`scores:${leagueId}:latest`)
          
          if (scoreUpdates) {
            sendEvent('score-update', {
              type: 'scores',
              data: scoreUpdates,
              timestamp: new Date().toISOString()
            })
          }

          // Send heartbeat
          sendEvent('heartbeat', { 
            timestamp: new Date().toISOString(),
            leagueId 
          })

        } catch (error) {
          console.error('SSE update error:', error)
          sendEvent('error', {
            message: 'Update failed',
            timestamp: new Date().toISOString()
          })
        }
      }, 30000) // 30 seconds

      // Catalyst: Immediate score updates (check every 10 seconds during game days)
      const scoreInterval = setInterval(async () => {
        try {
          const isGameDay = await checkIfGameDay()
          
          if (isGameDay) {
            const liveScores = await fetchLiveScores(leagueId)
            
            if (liveScores) {
              sendEvent('live-scores', {
                type: 'live',
                data: liveScores,
                timestamp: new Date().toISOString()
              })
              
              // Update cache with fresh scores
              phoenixDb.setCachedResult(`scores:${leagueId}:latest`, liveScores, 60000)
            }
          }
        } catch (error) {
          console.error('Live score update error:', error)
        }
      }, 10000) // 10 seconds during games

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(updateInterval)
        clearInterval(scoreInterval)
        controller.close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering
    },
  })
}

// Helper functions
async function checkIfGameDay(): Promise<boolean> {
  // Check if it's a game day (Sunday, Monday, Thursday)
  const now = new Date()
  const dayOfWeek = now.getDay()
  const hour = now.getHours()
  
  // Sunday (0), Monday (1), Thursday (4)
  // Games typically between 9 AM and 11 PM Eastern
  return (dayOfWeek === 0 || dayOfWeek === 1 || dayOfWeek === 4) && 
         hour >= 9 && hour <= 23
}

async function fetchLiveScores(leagueId: string): Promise<any> {
  try {
    // Catalyst: Fetch live scores with optimized query
    const liveData = await phoenixDb.getCachedResult(`live:${leagueId}`)
    
    if (!liveData) {
      // Fetch fresh live data
      const freshScores = await phoenixDb.calculateLeagueStandings(leagueId, 4)
      
      // Cache for 1 minute during live games
      phoenixDb.setCachedResult(`live:${leagueId}`, freshScores, 60000)
      
      return freshScores
    }
    
    return liveData
  } catch (error) {
    console.error('Failed to fetch live scores:', error)
    return null
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'