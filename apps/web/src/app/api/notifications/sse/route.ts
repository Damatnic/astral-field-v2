/**
 * Server-Sent Events API for Real-time Notifications
 * Streams notifications to connected clients
 */

import { auth } from '@/lib/auth'
import { NextRequest } from 'next/server'

// Store active connections
const connections = new Map<string, ReadableStreamDefaultController>()

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  const userId = session.user.id

  // Create a readable stream
  const stream = new ReadableStream({
    start(controller) {
      // Store connection
      connections.set(userId, controller)

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
          connections.delete(userId)
        }
      }, 30000)

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval)
        connections.delete(userId)
        try {
          controller.close()
        } catch (e) {
          // Controller might already be closed
        }
      })
    },

    cancel() {
      connections.delete(userId)
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

/**
 * Send a notification to a specific user
 * Called by other API routes to push notifications
 */
export function sendNotificationToUser(
  userId: string,
  notification: {
    type: string
    title: string
    message: string
    actionUrl?: string
    actionLabel?: string
    priority?: string
    metadata?: Record<string, any>
  }
): void {
  const controller = connections.get(userId)
  
  if (!controller) {
    console.log(`User ${userId} not connected to notification stream`)
    return
  }

  try {
    const data = `event: notification\ndata: ${JSON.stringify({
      ...notification,
      timestamp: new Date().toISOString()
    })}\n\n`

    controller.enqueue(new TextEncoder().encode(data))
  } catch (error) {
    console.error('Error sending notification:', error)
    connections.delete(userId)
  }
}

/**
 * Broadcast notification to all connected users
 */
export function broadcastNotification(notification: {
  type: string
  title: string
  message: string
  actionUrl?: string
  actionLabel?: string
}): void {
  const data = `event: notification\ndata: ${JSON.stringify({
    ...notification,
    timestamp: new Date().toISOString()
  })}\n\n`

  const encoded = new TextEncoder().encode(data)

  connections.forEach((controller, userId) => {
    try {
      controller.enqueue(encoded)
    } catch (error) {
      console.error(`Error broadcasting to user ${userId}:`, error)
      connections.delete(userId)
    }
  })
}

/**
 * Get active connection count
 */
export function getActiveConnectionCount(): number {
  return connections.size
}

