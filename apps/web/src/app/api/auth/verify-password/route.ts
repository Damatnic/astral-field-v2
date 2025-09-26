import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

// Force Node.js runtime for bcrypt compatibility
export const runtime = 'nodejs'

// Catalyst Performance: Ultra-fast password verification with intelligent caching
const verificationCache = new Map<string, { result: boolean; timestamp: number }>()
const CACHE_TTL = 30000 // 30 seconds
const MAX_CACHE_SIZE = 1000

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { password, hashedPassword } = await request.json()
    
    if (!password || !hashedPassword) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Missing parameters',
        responseTime: Date.now() - startTime
      }, { status: 400 })
    }
    
    // Catalyst Performance: Create secure cache key without storing actual password
    const cacheKey = `verify_${hashedPassword.slice(-16)}_${password.length}_${password.slice(0, 2)}${password.slice(-2)}`
    
    // Check memory cache first (sub-millisecond lookup)
    const cached = verificationCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ 
        valid: cached.result,
        cached: true,
        responseTime: Date.now() - startTime
      })
    }
    
    // Catalyst Performance: Parallel bcrypt verification with timeout
    const verificationPromise = bcrypt.compare(password, hashedPassword)
    const timeoutPromise = new Promise<boolean>((_, reject) => 
      setTimeout(() => reject(new Error('Verification timeout')), 5000)
    )
    
    const isValid = await Promise.race([verificationPromise, timeoutPromise])
    
    // Cache the result
    verificationCache.set(cacheKey, { result: isValid, timestamp: Date.now() })
    
    // Catalyst Performance: Cleanup cache if it gets too large
    if (verificationCache.size > MAX_CACHE_SIZE) {
      const now = Date.now()
      let cleaned = 0
      for (const [key, value] of verificationCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          verificationCache.delete(key)
          cleaned++
        }
        if (cleaned > 100) break // Clean max 100 at a time
      }
    }
    
    const responseTime = Date.now() - startTime
    
    return NextResponse.json({ 
      valid: isValid,
      cached: false,
      responseTime
    })
    
  } catch (error) {
    const responseTime = Date.now() - startTime
    console.error('Password verification error:', error)
    
    return NextResponse.json({ 
      valid: false, 
      error: 'Verification failed',
      responseTime
    }, { status: 500 })
  }
}

// Catalyst Performance: Cleanup cache periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of verificationCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      verificationCache.delete(key)
    }
  }
}, 60000) // Clean every minute