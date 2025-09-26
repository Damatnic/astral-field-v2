import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET() {
  try {
    console.log('🔄 Running Prisma database migration...')
    
    // Run prisma db push to create tables
    const { stdout, stderr } = await execAsync('npx prisma db push --accept-data-loss')
    
    console.log('✅ Migration completed successfully')
    console.log('STDOUT:', stdout)
    
    if (stderr) {
      console.warn('STDERR:', stderr)
    }

    return NextResponse.json({ 
      message: 'Database migration completed successfully',
      output: stdout,
      warnings: stderr || null
    })
  } catch (error: any) {
    console.error('💥 Migration failed:', error)
    return NextResponse.json({ 
      error: 'Database migration failed', 
      details: error.message,
      stdout: error.stdout || null,
      stderr: error.stderr || null
    }, { status: 500 })
  }
}