/**
 * SSE Notification Manager
 * Manages server-sent event connections and notifications
 */

// Store active connections
const connections = new Map<string, ReadableStreamDefaultController>()

/**
 * Register a new SSE connection
 */
export function registerConnection(userId: string, controller: ReadableStreamDefaultController): void {
  connections.set(userId, controller)
}

/**
 * Unregister an SSE connection
 */
export function unregisterConnection(userId: string): void {
  connections.delete(userId)
}

/**
 * Send a notification to a specific user
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
