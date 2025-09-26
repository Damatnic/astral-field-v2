import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const DAMATO_DYNASTY_MEMBERS = [
  { name: "Nicholas D'Amato", email: "nicholas@damato-dynasty.com", teamName: "D'Amato Dynasty", role: "COMMISSIONER" },
  { name: "Nick Hartley", email: "nick@damato-dynasty.com", teamName: "Hartley's Heroes", role: "PLAYER" },
  { name: "Jack McCaigue", email: "jack@damato-dynasty.com", teamName: "McCaigue Mayhem", role: "PLAYER" },
  { name: "Larry McCaigue", email: "larry@damato-dynasty.com", teamName: "Larry Legends", role: "PLAYER" },
  { name: "Renee McCaigue", email: "renee@damato-dynasty.com", teamName: "Renee's Reign", role: "PLAYER" },
  { name: "Jon Kornbeck", email: "jon@damato-dynasty.com", teamName: "Kornbeck Crushers", role: "PLAYER" },
  { name: "David Jarvey", email: "david@damato-dynasty.com", teamName: "Jarvey's Juggernauts", role: "PLAYER" },
  { name: "Kaity Lorbecki", email: "kaity@damato-dynasty.com", teamName: "Lorbecki Lions", role: "PLAYER" },
  { name: "Cason Minor", email: "cason@damato-dynasty.com", teamName: "Minor Miracles", role: "PLAYER" },
  { name: "Brittany Bergum", email: "brittany@damato-dynasty.com", teamName: "Bergum Blitz", role: "PLAYER" }
] as const

export async function GET() {
  try {
    console.log('🌱 Starting database seeding...')
    
    const hashedPassword = await bcrypt.hash('Dynasty2025!', 10)
    const results = []

    for (const member of DAMATO_DYNASTY_MEMBERS) {
      try {
        const user = await prisma.user.upsert({
          where: { email: member.email },
          update: {
            name: member.name,
            role: member.role,
            teamName: member.teamName
          },
          create: {
            email: member.email,
            hashedPassword,
            name: member.name,
            role: member.role,
            teamName: member.teamName
          }
        })
        
        results.push({ 
          success: true, 
          email: member.email, 
          name: member.name,
          team: member.teamName,
          role: member.role
        })
      } catch (userError: any) {
        console.error(`Failed to create ${member.name}:`, userError)
        results.push({ 
          success: false, 
          email: member.email, 
          name: member.name,
          error: userError.message 
        })
      }
    }

    const successful = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)

    console.log(`✅ Successfully created: ${successful.length}/${DAMATO_DYNASTY_MEMBERS.length} users`)
    console.log(`❌ Failed: ${failed.length} users`)

    return NextResponse.json({ 
      message: 'Database seeding completed',
      successful: successful.length,
      failed: failed.length,
      total: results.length,
      results,
      password: 'Dynasty2025!'
    })
  } catch (error: any) {
    console.error('💥 Database seeding failed:', error)
    return NextResponse.json({ 
      error: 'Database seeding failed', 
      details: error.message 
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}