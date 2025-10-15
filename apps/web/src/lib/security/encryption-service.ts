// Guardian Security: Advanced Encryption Service
// Implements AES-256-GCM encryption with key rotation and secure key management

import { createCipheriv, createDecipheriv, randomBytes, scrypt, createHash, createHmac } from 'crypto'
import { promisify } from 'util'

const scryptAsync = promisify(scrypt)

export interface EncryptionConfig {
  algorithm: string
  keyLength: number
  ivLength: number
  tagLength: number
  saltLength: number
  iterations: number
}

export interface EncryptedData {
  data: string
  iv: string
  tag: string
  salt: string
  algorithm: string
  keyId: string
  timestamp: number
  version: number
}

export interface KeyMetadata {
  id: string
  created: number
  rotated: number
  version: number
  purpose: string
  status: 'active' | 'deprecated' | 'revoked'
}

export class GuardianEncryptionService {
  private config: EncryptionConfig
  private masterKey: Buffer | null = null
  private encryptionKeys = new Map<string, Buffer>()
  private keyMetadata = new Map<string, KeyMetadata>()
  private currentKeyId: string | null = null

  constructor(config: Partial<EncryptionConfig> = {}) {
    this.config = {
      algorithm: 'aes-256-gcm',
      keyLength: 32, // 256 bits
      ivLength: 16,  // 128 bits
      tagLength: 16, // 128 bits
      saltLength: 32, // 256 bits
      iterations: 100000, // PBKDF2 iterations
      ...config
    }

    this.initializeFromEnv()
  }

  /**
   * Initialize encryption service from environment variables
   */
  private initializeFromEnv(): void {
    const masterKeyHex = process.env.ENCRYPTION_MASTER_KEY
    
    if (masterKeyHex) {
      try {
        this.masterKey = Buffer.from(masterKeyHex, 'hex')
        if (this.masterKey.length !== this.config.keyLength) {
          throw new Error(`Master key must be ${this.config.keyLength} bytes (${this.config.keyLength * 2} hex characters)`)
        }
        
        // Generate initial encryption key
        this.rotateKey('initial')
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {

          console.error('Failed to initialize encryption service:', error);

        }
        throw new Error('ENCRYPTION_INITIALIZATION_FAILED')
      }
    } else {
      if (process.env.NODE_ENV === 'development') {

        console.warn('ENCRYPTION_MASTER_KEY not found in environment variables');

      }
    }
  }

  /**
   * Generate a new encryption key and rotate
   */
  rotateKey(purpose: string = 'rotation'): string {
    const keyId = this.generateKeyId()
    const key = randomBytes(this.config.keyLength)
    
    // Mark current key as deprecated
    if (this.currentKeyId) {
      const currentMetadata = this.keyMetadata.get(this.currentKeyId)
      if (currentMetadata) {
        currentMetadata.status = 'deprecated'
        currentMetadata.rotated = Date.now()
      }
    }
    
    // Store new key
    this.encryptionKeys.set(keyId, key)
    this.keyMetadata.set(keyId, {
      id: keyId,
      created: Date.now(),
      rotated: 0,
      version: this.keyMetadata.size + 1,
      purpose,
      status: 'active'
    })
    
    this.currentKeyId = keyId
    
    console.log(`Encryption key rotated: ${keyId.substring(0, 8)}...`)
    return keyId
  }

  /**
   * Encrypt sensitive data
   */
  async encryptData(
    plaintext: string, 
    classification: 'public' | 'internal' | 'confidential' | 'secret' = 'internal'
  ): Promise<EncryptedData> {
    if (!this.currentKeyId || !this.masterKey) {
      throw new Error('ENCRYPTION_SERVICE_NOT_INITIALIZED')
    }

    // Get current encryption key
    const encryptionKey = this.encryptionKeys.get(this.currentKeyId)
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY_NOT_FOUND')
    }

    // Generate random IV and salt
    const iv = randomBytes(this.config.ivLength)
    const salt = randomBytes(this.config.saltLength)
    
    // Derive key using PBKDF2 with salt
    const derivedKey = await scryptAsync(encryptionKey, salt, this.config.keyLength) as Buffer
    
    // Create cipher
    const cipher = createCipheriv(this.config.algorithm, derivedKey, iv) as any
    
    // Encrypt data
    let encrypted = cipher.update(plaintext, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    // Get authentication tag
    const tag = cipher.getAuthTag() as Buffer
    
    // Create encrypted data object
    const encryptedData: EncryptedData = {
      data: encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      salt: salt.toString('hex'),
      algorithm: this.config.algorithm,
      keyId: this.currentKeyId,
      timestamp: Date.now(),
      version: 1
    }

    return encryptedData
  }

  /**
   * Decrypt sensitive data
   */
  async decryptData(encryptedData: EncryptedData): Promise<string> {
    if (!this.masterKey) {
      throw new Error('ENCRYPTION_SERVICE_NOT_INITIALIZED')
    }

    // Get encryption key by ID
    const encryptionKey = this.encryptionKeys.get(encryptedData.keyId)
    if (!encryptionKey) {
      throw new Error('DECRYPTION_KEY_NOT_FOUND')
    }

    try {
      // Convert hex strings back to buffers
      const iv = Buffer.from(encryptedData.iv, 'hex')
      const tag = Buffer.from(encryptedData.tag, 'hex')
      const salt = Buffer.from(encryptedData.salt, 'hex')
      
      // Derive key using same salt
      const derivedKey = await scryptAsync(encryptionKey, salt, this.config.keyLength) as Buffer
      
      // Create decipher
      const decipher = createDecipheriv(encryptedData.algorithm, derivedKey, iv) as any
      decipher.setAuthTag(tag)
      
      // Decrypt data
      let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      
      return decrypted
    } catch (error) {
      throw new Error('DECRYPTION_FAILED')
    }
  }

  /**
   * Encrypt PII data with additional protections
   */
  async encryptPII(data: string): Promise<EncryptedData> {
    // Add data integrity hash
    const hash = this.generateDataHash(data)
    const dataWithHash = JSON.stringify({ data, hash })
    
    return this.encryptData(dataWithHash, 'confidential')
  }

  /**
   * Decrypt PII data with integrity verification
   */
  async decryptPII(encryptedData: EncryptedData): Promise<string> {
    const decrypted = await this.decryptData(encryptedData)
    
    try {
      const parsed = JSON.parse(decrypted)
      const { data, hash } = parsed
      
      // Verify data integrity
      const expectedHash = this.generateDataHash(data)
      if (hash !== expectedHash) {
        throw new Error('DATA_INTEGRITY_VIOLATION')
      }
      
      return data
    } catch (error) {
      throw new Error('PII_DECRYPTION_FAILED')
    }
  }

  /**
   * Encrypt database field
   */
  async encryptField(value: any): Promise<string | null> {
    if (value === null || value === undefined) {
      return null
    }
    
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
    const encrypted = await this.encryptData(stringValue, 'internal')
    
    // Return as base64 encoded JSON for database storage
    return Buffer.from(JSON.stringify(encrypted)).toString('base64')
  }

  /**
   * Decrypt database field
   */
  async decryptField(encryptedValue: string | null): Promise<any> {
    if (!encryptedValue) {
      return null
    }
    
    try {
      // Decode from base64 and parse JSON
      const encryptedData = JSON.parse(Buffer.from(encryptedValue, 'base64').toString('utf8'))
      const decrypted = await this.decryptData(encryptedData)
      
      // Try to parse as JSON, fallback to string
      try {
        return JSON.parse(decrypted)
      } catch {
        return decrypted
      }
    } catch (error) {
      throw new Error('FIELD_DECRYPTION_FAILED')
    }
  }

  /**
   * Generate secure hash for data integrity
   */
  private generateDataHash(data: string): string {
    return createHash('sha256').update(data).digest('hex')
  }

  /**
   * Generate unique key ID
   */
  private generateKeyId(): string {
    const timestamp = Date.now().toString(36)
    const random = randomBytes(8).toString('hex')
    return `key_${timestamp}_${random}`
  }

  /**
   * Generate HMAC for message authentication
   */
  generateHMAC(data: string, secret?: Buffer): string {
    const key = secret || this.masterKey
    if (!key) {
      throw new Error('HMAC_KEY_NOT_AVAILABLE')
    }
    
    return createHmac('sha256', key).update(data).digest('hex')
  }

  /**
   * Verify HMAC
   */
  verifyHMAC(data: string, expectedHmac: string, secret?: Buffer): boolean {
    try {
      const actualHmac = this.generateHMAC(data, secret)
      return this.constantTimeCompare(actualHmac, expectedHmac)
    } catch {
      return false
    }
  }

  /**
   * Constant time string comparison to prevent timing attacks
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false
    }
    
    let result = 0
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }
    
    return result === 0
  }

  /**
   * Get encryption service status
   */
  getServiceStatus(): {
    initialized: boolean
    activeKeys: number
    currentKeyId: string | null
    keyRotationNeeded: boolean
    lastRotation: number | null
  } {
    const activeKeys = Array.from(this.keyMetadata.values())
      .filter(meta => meta.status === 'active').length
    
    let lastRotation: number | null = null
    if (this.currentKeyId) {
      const currentMeta = this.keyMetadata.get(this.currentKeyId)
      lastRotation = currentMeta?.created || null
    }
    
    // Recommend rotation every 90 days
    const rotationNeeded = lastRotation ? 
      (Date.now() - lastRotation) > (90 * 24 * 60 * 60 * 1000) : false

    return {
      initialized: !!this.masterKey && !!this.currentKeyId,
      activeKeys,
      currentKeyId: this.currentKeyId,
      keyRotationNeeded: rotationNeeded,
      lastRotation
    }
  }

  /**
   * Get key metadata for audit purposes
   */
  getKeyMetadata(): KeyMetadata[] {
    return Array.from(this.keyMetadata.values())
  }

  /**
   * Revoke a specific key
   */
  revokeKey(keyId: string): boolean {
    const metadata = this.keyMetadata.get(keyId)
    if (!metadata) {
      return false
    }
    
    metadata.status = 'revoked'
    metadata.rotated = Date.now()
    
    // Remove the actual key from memory
    this.encryptionKeys.delete(keyId)
    
    console.log(`Encryption key revoked: ${keyId.substring(0, 8)}...`)
    return true
  }

  /**
   * Cleanup deprecated keys (older than 1 year)
   */
  cleanupDeprecatedKeys(): number {
    const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000)
    let cleanedCount = 0
    
    for (const [keyId, metadata] of this.keyMetadata.entries()) {
      if (metadata.status === 'deprecated' && metadata.rotated < oneYearAgo) {
        this.encryptionKeys.delete(keyId)
        this.keyMetadata.delete(keyId)
        cleanedCount++
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} deprecated encryption keys`)
    }
    
    return cleanedCount
  }

  /**
   * Generate a secure random token
   */
  generateSecureToken(length: number = 32): string {
    return randomBytes(length).toString('hex')
  }

  /**
   * Generate a cryptographically secure password
   */
  generateSecurePassword(length: number = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const numbers = '0123456789'
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?'
    
    const allChars = uppercase + lowercase + numbers + symbols
    let password = ''
    
    // Ensure at least one character from each category
    password += uppercase[Math.floor(Math.random() * uppercase.length)]
    password += lowercase[Math.floor(Math.random() * lowercase.length)]
    password += numbers[Math.floor(Math.random() * numbers.length)]
    password += symbols[Math.floor(Math.random() * symbols.length)]
    
    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)]
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('')
  }
}

// Global encryption service instance
export const guardianEncryption = new GuardianEncryptionService()

// Utility functions for common encryption tasks
export const encryptionUtils = {
  /**
   * Encrypt user PII data
   */
  async encryptUserData(userData: {
    email?: string
    name?: string
    phone?: string
    address?: string
  }): Promise<Record<string, string | null>> {
    const encrypted: Record<string, string | null> = {}
    
    for (const [key, value] of Object.entries(userData)) {
      if (value) {
        encrypted[key] = await guardianEncryption.encryptField(value)
      } else {
        encrypted[key] = null
      }
    }
    
    return encrypted
  },

  /**
   * Decrypt user PII data
   */
  async decryptUserData(encryptedData: Record<string, string | null>): Promise<Record<string, any>> {
    const decrypted: Record<string, any> = {}
    
    for (const [key, value] of Object.entries(encryptedData)) {
      if (value) {
        decrypted[key] = await guardianEncryption.decryptField(value)
      } else {
        decrypted[key] = null
      }
    }
    
    return decrypted
  },

  /**
   * Hash password securely
   */
  hashPassword: async (password: string): Promise<string> => {
    const bcrypt = await import('bcryptjs')
    return bcrypt.hash(password, 12)
  },

  /**
   * Verify password hash
   */
  verifyPassword: async (password: string, hash: string): Promise<boolean> => {
    const bcrypt = await import('bcryptjs')
    return bcrypt.compare(password, hash)
  }
}