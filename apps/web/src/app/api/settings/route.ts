import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const SettingsUpdateSchema = z.object({
  name: z.string().max(100).optional(),
  teamName: z.string().max(100).optional(),
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  theme: z.enum(['light', 'dark', 'system']),
  timezone: z.string(),
  favoriteTeam: z.string().optional()
})

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = SettingsUpdateSchema.parse(body)

    // Update user
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: data.name || null,
        teamName: data.teamName || null,
        preferences: {
          upsert: {
            create: {
              emailUpdates: data.emailNotifications || true,
              theme: data.theme || 'system',
              notifications: JSON.stringify({ 
                push: data.pushNotifications || false, 
                email: data.emailNotifications || true,
                timezone: data.timezone || 'UTC',
                favoriteTeam: data.favoriteTeam || null
              })
            },
            update: {
              emailUpdates: data.emailNotifications || true,
              theme: data.theme || 'system',
              notifications: JSON.stringify({ 
                push: data.pushNotifications || false, 
                email: data.emailNotifications || true,
                timezone: data.timezone || 'UTC',
                favoriteTeam: data.favoriteTeam || null
              })
            }
          }
        }
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Settings update error:', error);
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}