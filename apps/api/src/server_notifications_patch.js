// This is a patch to add notification routes to server.ts
// Add this import after line 30:
// import { notificationRoutes } from './routes/notifications'

// Add this route after line 147:
// app.use('/api/notifications', authMiddleware, notificationRoutes)

console.log('Patch file created for notification routes integration');