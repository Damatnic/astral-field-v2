/**
 * Live Scores SSE Endpoint
 * Streams real-time score updates to clients
 */

import { NextRequest } from 'next/server'
import { ESPNService } from '@/lib/services/espn'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Helper to create SSE response
function createSSEResponse() {
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      const espn = new ESPNService()
      
      // Send initial connection message
      const initMessage = `data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`
      controller.enqueue(encoder.encode(initMessage))

      // Heartbeat interval
      const heartbeat = setInterval(() => {
        try {
          const heartbeatMessage = `event: heartbeat\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`
          controller.enqueue(encoder.encode(heartbeatMessage))
        } catch (error) {
          clearInterval(heartbeat)
          clearInterval(updateInterval)
        }
      }, 30000) // Every 30 seconds

      // Score update interval
      const updateInterval = setInterval(async () => {
        try {
          const scores = await espn.getScoreboard()
          
          if (scores && Array.isArray(scores)) {
            const message = `event: score\ndata: ${JSON.stringify({ 
              type: 'score', 
              data: scores,
              timestamp: new Date().toISOString()
            })}\n\n`
            controller.enqueue(encoder.encode(message))
          }
        } catch (error) {
          console.error('Error fetching scores:', error)
        }
      }, 10000) // Every 10 seconds

      // Cleanup on close
      const cleanup = () => {
        clearInterval(heartbeat)
        clearInterval(updateInterval)
        controller.close()
      }

      // Handle client disconnect
      setTimeout(cleanup, 1000 * 60 * 10) // Max 10 minutes per connection
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  })
}

export async function GET(request: NextRequest) {
  return createSSEResponse()
}

