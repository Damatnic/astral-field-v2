// Guardian Security: Multi-Factor Authentication (MFA) System
// Implements TOTP, backup codes, and adaptive authentication

import crypto from 'crypto'
import { authenticator } from 'otplib'

export interface MFASetup {
  secret: string
  qrCodeUrl: string
  backupCodes: string[]
  manualEntryKey: string
}

export interface MFAVerification {
  isValid: boolean
  method: 'totp' | 'backup' | 'recovery'
  remainingBackupCodes?: number
  riskScore: number
}

export interface MFAConfig {
  appName: string
  issuer: string
  window: number // Time window for TOTP validation
  codeLength: number
}

export class GuardianMFA {
  private config: MFAConfig

  constructor(config: Partial<MFAConfig> = {}) {
    this.config = {
      appName: 'AstralField',
      issuer: 'AstralField Fantasy Football',
      window: 2, // Allow 2 time steps before/after
      codeLength: 6,
      ...config
    }
    
    // Configure TOTP library
    authenticator.options = {
      window: this.config.window,
      step: 30, // 30-second time steps
      digits: this.config.codeLength
    }
  }

  /**
   * Generate MFA setup for a user
   */
  generateMFASetup(userEmail: string): MFASetup {
    // Generate a secure secret
    const secret = authenticator.generateSecret()
    
    // Generate backup codes
    const backupCodes = this.generateBackupCodes()
    
    // Create QR code URL for authenticator apps
    const qrCodeUrl = authenticator.keyuri(
      userEmail,
      this.config.issuer,
      secret
    )
    
    // Manual entry key (formatted for easy typing)
    const manualEntryKey = secret.match(/.{1,4}/g)?.join(' ') || secret
    
    return {
      secret,
      qrCodeUrl,
      backupCodes,
      manualEntryKey
    }
  }

  /**
   * Verify TOTP code
   */
  verifyTOTP(token: string, secret: string): boolean {
    try {
      // Remove any spaces or formatting
      const cleanToken = token.replace(/\s/g, '')
      
      if (cleanToken.length !== this.config.codeLength) {
        return false
      }
      
      return authenticator.verify({
        token: cleanToken,
        secret
      })
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {

        console.error('TOTP verification error:', error);

      }
      return false
    }
  }

  /**
   * Verify backup code
   */
  verifyBackupCode(code: string, validCodes: string[]): { isValid: boolean; remainingCodes: string[] } {
    const cleanCode = code.replace(/\s|-/g, '').toLowerCase()
    
    const codeIndex = validCodes.findIndex(validCode => 
      validCode.replace(/\s|-/g, '').toLowerCase() === cleanCode
    )
    
    if (codeIndex === -1) {
      return { isValid: false, remainingCodes: validCodes }
    }
    
    // Remove used backup code
    const remainingCodes = validCodes.filter((_, index) => index !== codeIndex)
    
    return { isValid: true, remainingCodes }
  }

  /**
   * Comprehensive MFA verification with risk assessment
   */
  async verifyMFA(
    token: string,
    userMFAData: {
      secret?: string
      backupCodes?: string[]
      lastUsedAt?: Date
      totalAttempts?: number
      failedAttempts?: number
    },
    context: {
      ip: string
      userAgent: string
      location?: string
      previousIPs?: string[]
      deviceFingerprint?: string
    }
  ): Promise<MFAVerification> {
    const riskScore = this.calculateMFAContextRisk(context, userMFAData)
    
    // Try TOTP verification first
    if (userMFAData.secret && this.verifyTOTP(token, userMFAData.secret)) {
      return {
        isValid: true,
        method: 'totp',
        riskScore
      }
    }
    
    // Try backup code verification
    if (userMFAData.backupCodes && userMFAData.backupCodes.length > 0) {
      const backupResult = this.verifyBackupCode(token, userMFAData.backupCodes)
      
      if (backupResult.isValid) {
        return {
          isValid: true,
          method: 'backup',
          remainingBackupCodes: backupResult.remainingCodes.length,
          riskScore: riskScore + 0.1 // Slightly higher risk for backup code usage
        }
      }
    }
    
    return {
      isValid: false,
      method: 'totp', // Default method for failed attempts
      riskScore: riskScore + 0.2 // Higher risk for failed MFA
    }
  }

  /**
   * Calculate MFA context risk score
   */
  private calculateMFAContextRisk(
    context: {
      ip: string
      userAgent: string
      location?: string
      previousIPs?: string[]
      deviceFingerprint?: string
    },
    userMFAData: {
      lastUsedAt?: Date
      totalAttempts?: number
      failedAttempts?: number
    }
  ): number {
    let riskScore = 0
    
    // IP-based risk assessment
    if (context.previousIPs && !context.previousIPs.includes(context.ip)) {
      riskScore += 0.3 // New IP address
    }
    
    // Geographic risk (basic implementation)
    if (context.location && this.isHighRiskLocation(context.location)) {
      riskScore += 0.2
    }
    
    // User agent anomalies
    if (this.isSuspiciousUserAgent(context.userAgent)) {
      riskScore += 0.2
    }
    
    // MFA usage patterns
    if (userMFAData.failedAttempts && userMFAData.totalAttempts) {
      const failureRate = userMFAData.failedAttempts / userMFAData.totalAttempts
      if (failureRate > 0.5) {
        riskScore += 0.2 // High failure rate indicates potential compromise
      }
    }
    
    // Time-based risk
    if (userMFAData.lastUsedAt) {
      const daysSinceLastUse = (Date.now() - userMFAData.lastUsedAt.getTime()) / (24 * 60 * 60 * 1000)
      if (daysSinceLastUse > 30) {
        riskScore += 0.1 // Long time since last use
      }
    }
    
    return Math.min(riskScore, 1.0)
  }

  /**
   * Generate secure backup codes
   */
  private generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = []
    
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric code
      const code = crypto.randomBytes(4).toString('hex').toUpperCase()
      // Format as XXXX-XXXX for readability
      const formattedCode = `${code.slice(0, 4)}-${code.slice(4, 8)}`
      codes.push(formattedCode)
    }
    
    return codes
  }

  /**
   * Generate recovery code for MFA reset
   */
  generateRecoveryCode(): string {
    // Generate longer recovery code (16 characters)
    const code = crypto.randomBytes(8).toString('hex').toUpperCase()
    return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}-${code.slice(12, 16)}`
  }

  /**
   * Validate recovery code format
   */
  isValidRecoveryCodeFormat(code: string): boolean {
    const cleanCode = code.replace(/\s|-/g, '')
    return /^[A-F0-9]{16}$/i.test(cleanCode)
  }

  /**
   * Check if location is high-risk (simplified implementation)
   */
  private isHighRiskLocation(location: string): boolean {
    // In production, use threat intelligence feeds
    const highRiskCountries = ['CN', 'RU', 'KP', 'IR', 'SY']
    return highRiskCountries.includes(location.toUpperCase())
  }

  /**
   * Check for suspicious user agents
   */
  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i,
      /curl/i, /wget/i, /python/i, /requests/i,
      /scanner/i, /exploit/i, /hack/i, /attack/i
    ]
    
    return suspiciousPatterns.some(pattern => pattern.test(userAgent))
  }

  /**
   * Generate QR code data URL for display
   */
  async generateQRCodeDataUrl(text: string): Promise<string> {
    // For production, use a proper QR code library like 'qrcode'
    // For now, return the URL that can be used with QR code services
    const encodedText = encodeURIComponent(text)
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedText}`
  }

  /**
   * Validate MFA setup completion
   */
  validateMFASetup(
    secret: string,
    verificationCode: string,
    backupCodes: string[]
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    
    // Validate secret
    if (!secret || secret.length < 16) {
      errors.push('Invalid secret key')
    }
    
    // Validate verification code
    if (!this.verifyTOTP(verificationCode, secret)) {
      errors.push('Invalid verification code')
    }
    
    // Validate backup codes
    if (!backupCodes || backupCodes.length < 8) {
      errors.push('Insufficient backup codes')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Get MFA status for user
   */
  getMFAStatus(userMFAData: {
    secret?: string
    backupCodes?: string[]
    isEnabled?: boolean
    lastUsedAt?: Date
  }): {
    isEnabled: boolean
    hasBackupCodes: boolean
    backupCodesRemaining: number
    lastUsed: Date | null
    requiresSetup: boolean
  } {
    return {
      isEnabled: !!(userMFAData.isEnabled && userMFAData.secret),
      hasBackupCodes: !!(userMFAData.backupCodes && userMFAData.backupCodes.length > 0),
      backupCodesRemaining: userMFAData.backupCodes?.length || 0,
      lastUsed: userMFAData.lastUsedAt || null,
      requiresSetup: !(userMFAData.secret && userMFAData.isEnabled)
    }
  }
}

// Guardian Security: Global MFA instance
export const guardianMFA = new GuardianMFA()

// Guardian Security: MFA-related types for database integration
export interface UserMFAData {
  id: string
  userId: string
  secret: string
  backupCodes: string[]
  isEnabled: boolean
  enabledAt: Date
  lastUsedAt?: Date
  totalAttempts: number
  failedAttempts: number
  recoveryCode?: string
  createdAt: Date
  updatedAt: Date
}

export interface MFAAttempt {
  id: string
  userId: string
  method: 'totp' | 'backup' | 'recovery'
  success: boolean
  ip: string
  userAgent: string
  riskScore: number
  attemptedAt: Date
}