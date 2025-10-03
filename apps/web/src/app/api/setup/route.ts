import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { exec } from 'child_process'
import { promisify } from 'util'

const prisma = new PrismaClient()
const execAsync = promisify(exec)

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
    // STEP 1: Run database migration
    try {
      const { stdout: migrationOutput, stderr: migrationErrors } = await execAsync('npx prisma db push --accept-data-loss')
      if (migrationErrors) {
        if (process.env.NODE_ENV === 'development') {

          console.warn('Migration warnings:', migrationErrors);

        }
      }
    } catch (migrationError: any) {
      if (process.env.NODE_ENV === 'development') {

        console.error('💥 Migration failed:', migrationError);

      }
      return NextResponse.json({ 
        error: 'Database migration failed', 
        details: migrationError.message,
        step: 'migration'
      }, { status: 500 })
    }

    // STEP 2: Seed database with users
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
        
        console.log(`✅ ${member.name} (${member.teamName}) - ${member.role}`)
        
      } catch (userError: any) {
        if (process.env.NODE_ENV === 'development') {

          console.error(`Failed to create ${member.name}:`, userError);

        }
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
    return NextResponse.json({ 
      message: 'Complete database setup completed successfully',
      migration: 'completed',
      seeding: {
        successful: successful.length,
        failed: failed.length,
        total: results.length,
        results
      },
      password: 'Dynasty2025!',
      ready: failed.length === 0
    })
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {

      console.error('💥 Complete database setup failed:', error);

    }
    return NextResponse.json({ 
      error: 'Complete database setup failed', 
      details: error.message 
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}