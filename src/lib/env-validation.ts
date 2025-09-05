// Environment variable validation and fallbacks
export interface EnvConfig {
  // Database
  DATABASE_URL: string
  NEON_DATABASE_URL?: string
  
  // Authentication
  ADMIN_SETUP_KEY: string
  DEBUG_KEY: string
  
  // API Keys (optional for basic functionality)
  OPENAI_API_KEY?: string
  ANTHROPIC_API_KEY?: string
  GEMINI_API_KEY?: string
  NEXT_PUBLIC_SPORTSDATA_API_KEY?: string
  SPORTSDATA_SECRET_KEY?: string
  
  // Stack Auth (optional)
  NEXT_PUBLIC_STACK_PROJECT_ID?: string
  NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY?: string
  STACK_SECRET_SERVER_KEY?: string
  
  // System
  NODE_ENV: 'development' | 'production' | 'test'
  VERCEL?: string
  VERCEL_URL?: string
}

class EnvironmentValidator {
  private warnings: string[] = []
  private errors: string[] = []

  validateEnvironment(): { config: Partial<EnvConfig>; warnings: string[]; errors: string[] } {
    const config: Partial<EnvConfig> = {}

    // Required variables
    this.validateRequired('NODE_ENV', ['development', 'production', 'test'])
    
    // Database - at least one must be present
    const dbUrl = process.env.DATABASE_URL || 
                  process.env.NEON_DATABASE_URL
    
    if (!dbUrl) {
      this.addError('DATABASE_URL', 'At least one database URL must be provided (DATABASE_URL or NEON_DATABASE_URL)')
    } else {
      config.DATABASE_URL = dbUrl
    }

    // Authentication keys with fallbacks
    config.ADMIN_SETUP_KEY = this.validateWithFallback('ADMIN_SETUP_KEY', 'astral2025')
    config.DEBUG_KEY = this.validateWithFallback('DEBUG_KEY', 'astral2025')

    // Optional API keys
    config.OPENAI_API_KEY = this.validateOptional('OPENAI_API_KEY', 'AI chat features will be disabled')
    config.ANTHROPIC_API_KEY = this.validateOptional('ANTHROPIC_API_KEY', 'Claude AI features will be disabled')
    config.GEMINI_API_KEY = this.validateOptional('GEMINI_API_KEY', 'Gemini AI features will be disabled')
    config.NEXT_PUBLIC_SPORTSDATA_API_KEY = this.validateOptional('NEXT_PUBLIC_SPORTSDATA_API_KEY', 'Sports data features will be limited')
    config.SPORTSDATA_SECRET_KEY = this.validateOptional('SPORTSDATA_SECRET_KEY', 'Sports data features will be limited')

    // Stack Auth (optional for MVP)
    config.NEXT_PUBLIC_STACK_PROJECT_ID = this.validateOptional('NEXT_PUBLIC_STACK_PROJECT_ID', 'Using fallback authentication')
    config.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY = this.validateOptional('NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY', 'Using fallback authentication')
    config.STACK_SECRET_SERVER_KEY = this.validateOptional('STACK_SECRET_SERVER_KEY', 'Using fallback authentication')

    // System variables
    config.NODE_ENV = (process.env.NODE_ENV as any) || 'development'
    config.VERCEL = process.env.VERCEL
    config.VERCEL_URL = process.env.VERCEL_URL

    return {
      config,
      warnings: this.warnings,
      errors: this.errors
    }
  }

  private validateRequired(key: string, allowedValues?: string[]): string | undefined {
    const value = process.env[key]
    
    if (!value) {
      this.addError(key, `${key} is required`)
      return undefined
    }
    
    if (allowedValues && !allowedValues.includes(value)) {
      this.addError(key, `${key} must be one of: ${allowedValues.join(', ')}`)
      return undefined
    }
    
    return value
  }

  private validateWithFallback(key: string, fallback: string): string {
    const value = process.env[key]
    
    if (!value) {
      this.addWarning(key, `${key} not set, using fallback: ${fallback}`)
      return fallback
    }
    
    return value
  }

  private validateOptional(key: string, missingMessage: string): string | undefined {
    const value = process.env[key]
    
    if (!value) {
      this.addWarning(key, `${key} not set: ${missingMessage}`)
      return undefined
    }
    
    return value
  }

  private addError(key: string, message: string) {
    this.errors.push(`❌ ${key}: ${message}`)
  }

  private addWarning(key: string, message: string) {
    this.warnings.push(`⚠️  ${key}: ${message}`)
  }

  logValidationResults() {
    const { warnings, errors } = this.validateEnvironment()
    
    if (errors.length > 0) {
      console.error('🚨 Environment Validation Errors:')
      errors.forEach(error => console.error(error))
    }
    
    if (warnings.length > 0) {
      console.warn('⚠️  Environment Validation Warnings:')
      warnings.forEach(warning => console.warn(warning))
    }
    
    if (errors.length === 0 && warnings.length === 0) {
      console.log('✅ Environment validation passed')
    }
    
    return errors.length === 0
  }
}

// Export singleton instance
export const envValidator = new EnvironmentValidator()

// Validate environment on import (only in Node.js environment)
if (typeof window === 'undefined') {
  envValidator.logValidationResults()
}

// Helper function to get validated config
export function getEnvConfig(): EnvConfig {
  const { config, errors } = envValidator.validateEnvironment()
  
  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`)
  }
  
  return config as EnvConfig
}