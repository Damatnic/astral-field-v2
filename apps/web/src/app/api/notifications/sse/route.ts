/**
 * Server-Sent Events API for Real-time Notifications
 * Streams notifications to connected clients
 */

import { NextRequest } from 'next/server'
import { registerConnection, unregisterConnection } from '@/lib/notifications/sse-manager'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs' // Changed from 'edge' due to auth requirements

export async function GET(request: NextRequest) {
  // Get userId from query params or headers (simplified for now)
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return new Response('Unauthorized - userId required', { status: 401 })
  }

  // Create a readable stream
  const stream = new ReadableStream({
    start(controller) {
      // Store connection
      registerConnection(userId, controller)

      // Send initial connection message
      const data = `data: ${JSON.stringify({
        type: 'connected',
        message: 'Notification stream connected',
        timestamp: new Date().toISOString()
      })}\n\n`

      controller.enqueue(new TextEncoder().encode(data))

      // Send heartbeat every 30 seconds
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = `data: ${JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString()
          })}\n\n`

          controller.enqueue(new TextEncoder().encode(heartbeat))
        } catch (error) {
          console.error('Heartbeat error:', error)
          clearInterval(heartbeatInterval)
          unregisterConnection(userId)
        }
      }, 30000)

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval)
        unregisterConnection(userId)
        try {
          controller.close()
        } catch (e) {
          // Controller might already be closed
        }
      })
    },

    cancel() {
      unregisterConnection(userId)
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  })
}



