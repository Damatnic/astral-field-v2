// Guardian Security: Advanced Security Headers & CSP Configuration
// Implements military-grade HTTP security headers and Content Security Policy

export interface SecurityHeadersConfig {
  csp: {
    enabled: boolean
    reportOnly: boolean
    sources: {
      default: string[]
      script: string[]
      style: string[]
      img: string[]
      font: string[]
      connect: string[]
      media: string[]
      object: string[]
      frame: string[]
      worker: string[]
      manifest: string[]
    }
    reportUri?: string
    upgradeInsecureRequests: boolean
  }
  hsts: {
    enabled: boolean
    maxAge: number
    includeSubDomains: boolean
    preload: boolean
  }
  frameOptions: 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM'
  contentTypeOptions: boolean
  xssProtection: {
    enabled: boolean
    mode: 'block' | 'sanitize'
  }
  referrerPolicy: string
  permissionsPolicy: Record<string, string[]>
  expectCT: {
    enabled: boolean
    maxAge: number
    enforce: boolean
    reportUri?: string
  }
  additionalHeaders: Record<string, string>
}

export class GuardianSecurityHeaders {
  private config: SecurityHeadersConfig

  constructor(config: Partial<SecurityHeadersConfig> = {}) {
    this.config = {
      csp: {
        enabled: true,
        reportOnly: false,
        sources: {
          default: ["'self'"],
          script: [
            "'self'",
            "'unsafe-inline'", // NextJS requires this for development
            "'unsafe-eval'", // NextJS requires this for development
            "https://vercel.live",
            "https://va.vercel-scripts.com",
            "https://vitals.vercel-insights.com",
            "*.vercel.app"
          ],
          style: [
            "'self'",
            "'unsafe-inline'", // Required for styled-components and CSS-in-JS
            "https://fonts.googleapis.com"
          ],
          img: [
            "'self'",
            "data:",
            "blob:",
            "https:",
            "https://images.unsplash.com",
            "https://api.qrserver.com", // For QR codes
            "https://lh3.googleusercontent.com" // Google OAuth profile images
          ],
          font: [
            "'self'",
            "https://fonts.gstatic.com",
            "data:"
          ],
          connect: [
            "'self'",
            "https:",
            "wss:",
            "ws:",
            "*.neon.tech",
            "https://vitals.vercel-insights.com",
            "*.vercel.app"
          ],
          media: ["'self'", "data:", "blob:"],
          object: ["'none'"],
          frame: [
            "'self'",
            "https://accounts.google.com", // Google OAuth
            "https://www.google.com" // reCAPTCHA if needed
          ],
          worker: ["'self'", "blob:"],
          manifest: ["'self'"]
        },
        upgradeInsecureRequests: true,
        ...config.csp
      },
      hsts: {
        enabled: true,
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
        ...config.hsts
      },
      frameOptions: config.frameOptions || 'DENY',
      contentTypeOptions: config.contentTypeOptions ?? true,
      xssProtection: {
        enabled: true,
        mode: 'block',
        ...config.xssProtection
      },
      referrerPolicy: config.referrerPolicy || 'strict-origin-when-cross-origin',
      permissionsPolicy: {
        camera: [],
        microphone: [],
        geolocation: [],
        payment: [],
        usb: [],
        magnetometer: [],
        gyroscope: [],
        accelerometer: [],
        'ambient-light-sensor': [],
        autoplay: ["'self'"],
        fullscreen: ["'self'"],
        'picture-in-picture': [],
        ...config.permissionsPolicy
      },
      expectCT: {
        enabled: true,
        maxAge: 86400, // 24 hours
        enforce: true,
        ...config.expectCT
      },
      additionalHeaders: {
        'X-Powered-By': '', // Remove server fingerprinting
        'Server': '', // Remove server fingerprinting
        'X-DNS-Prefetch-Control': 'off',
        'X-Download-Options': 'noopen',
        'X-Permitted-Cross-Domain-Policies': 'none',
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
        'Origin-Agent-Cluster': '?1',
        ...config.additionalHeaders
      }
    }
  }

  /**
   * Generate all security headers
   */
  generateHeaders(isProduction: boolean = true): Record<string, string> {
    const headers: Record<string, string> = {}

    // Content Security Policy
    if (this.config.csp.enabled) {
      const cspHeader = this.config.csp.reportOnly 
        ? 'Content-Security-Policy-Report-Only'
        : 'Content-Security-Policy'
      
      headers[cspHeader] = this.generateCSP(isProduction)
    }

    // HTTP Strict Transport Security
    if (this.config.hsts.enabled && isProduction) {
      headers['Strict-Transport-Security'] = this.generateHSTS()
    }

    // X-Frame-Options
    headers['X-Frame-Options'] = this.config.frameOptions

    // X-Content-Type-Options
    if (this.config.contentTypeOptions) {
      headers['X-Content-Type-Options'] = 'nosniff'
    }

    // X-XSS-Protection
    if (this.config.xssProtection.enabled) {
      headers['X-XSS-Protection'] = this.config.xssProtection.mode === 'block'
        ? '1; mode=block'
        : '1'
    }

    // Referrer Policy
    headers['Referrer-Policy'] = this.config.referrerPolicy

    // Permissions Policy
    headers['Permissions-Policy'] = this.generatePermissionsPolicy()

    // Expect-CT
    if (this.config.expectCT.enabled && isProduction) {
      headers['Expect-CT'] = this.generateExpectCT()
    }

    // Additional custom headers
    Object.entries(this.config.additionalHeaders).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        headers[key] = value
      }
    })

    return headers
  }

  /**
   * Generate Content Security Policy
   */
  private generateCSP(isProduction: boolean): string {
    const directives: string[] = []

    // Default source
    if (this.config.csp.sources.default.length > 0) {
      directives.push(`default-src ${this.config.csp.sources.default.join(' ')}`)
    }

    // Script source
    let scriptSources = [...this.config.csp.sources.script]
    if (!isProduction) {
      // Add development-specific sources
      scriptSources.push("'unsafe-eval'")
      if (!scriptSources.includes("'unsafe-inline'")) {
        scriptSources.push("'unsafe-inline'")
      }
    }
    directives.push(`script-src ${scriptSources.join(' ')}`)

    // Style source
    directives.push(`style-src ${this.config.csp.sources.style.join(' ')}`)

    // Image source
    directives.push(`img-src ${this.config.csp.sources.img.join(' ')}`)

    // Font source
    directives.push(`font-src ${this.config.csp.sources.font.join(' ')}`)

    // Connect source
    let connectSources = [...this.config.csp.sources.connect]
    if (!isProduction) {
      // Add webpack dev server
      connectSources.push('ws:', 'wss:')
    }
    directives.push(`connect-src ${connectSources.join(' ')}`)

    // Media source
    directives.push(`media-src ${this.config.csp.sources.media.join(' ')}`)

    // Object source
    directives.push(`object-src ${this.config.csp.sources.object.join(' ')}`)

    // Frame source
    directives.push(`frame-src ${this.config.csp.sources.frame.join(' ')}`)

    // Worker source
    directives.push(`worker-src ${this.config.csp.sources.worker.join(' ')}`)

    // Manifest source
    directives.push(`manifest-src ${this.config.csp.sources.manifest.join(' ')}`)

    // Base URI
    directives.push("base-uri 'self'")

    // Form action
    directives.push("form-action 'self'")

    // Frame ancestors
    directives.push("frame-ancestors 'none'")

    // Upgrade insecure requests
    if (this.config.csp.upgradeInsecureRequests && isProduction) {
      directives.push('upgrade-insecure-requests')
    }

    // Block all mixed content
    if (isProduction) {
      directives.push('block-all-mixed-content')
    }

    // Report URI
    if (this.config.csp.reportUri) {
      directives.push(`report-uri ${this.config.csp.reportUri}`)
    }

    return directives.join('; ')
  }

  /**
   * Generate HSTS header
   */
  private generateHSTS(): string {
    let hsts = `max-age=${this.config.hsts.maxAge}`
    
    if (this.config.hsts.includeSubDomains) {
      hsts += '; includeSubDomains'
    }
    
    if (this.config.hsts.preload) {
      hsts += '; preload'
    }
    
    return hsts
  }

  /**
   * Generate Permissions Policy
   */
  private generatePermissionsPolicy(): string {
    const policies: string[] = []

    Object.entries(this.config.permissionsPolicy).forEach(([directive, allowlist]) => {
      if (allowlist.length > 0) {
        // Use proper format with parentheses and quotes for allowlist items
        const sources = allowlist.map(source => {
          if (source === '*') return '*'
          if (source.startsWith("'") && source.endsWith("'")) return source
          return `"${source}"`
        }).join(' ')
        policies.push(`${directive}=(${sources})`)
      } else {
        // Empty allowlist means disabled for all origins
        policies.push(`${directive}=()`)
      }
    })

    return policies.join(', ')
  }

  /**
   * Generate Expect-CT header
   */
  private generateExpectCT(): string {
    let expectCT = `max-age=${this.config.expectCT.maxAge}`
    
    if (this.config.expectCT.enforce) {
      expectCT += ', enforce'
    }
    
    if (this.config.expectCT.reportUri) {
      expectCT += `, report-uri="${this.config.expectCT.reportUri}"`
    }
    
    return expectCT
  }

  /**
   * Add CSP nonce for inline scripts
   */
  generateNonce(): string {
    return Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64')
  }

  /**
   * Create CSP with nonce
   */
  generateCSPWithNonce(nonce: string, isProduction: boolean = true): string {
    // Create a copy of config with nonce added to script sources
    const configWithNonce = {
      ...this.config,
      csp: {
        ...this.config.csp,
        sources: {
          ...this.config.csp.sources,
          script: [...this.config.csp.sources.script, `'nonce-${nonce}'`]
        }
      }
    }

    const tempHeaders = new GuardianSecurityHeaders(configWithNonce)
    return tempHeaders.generateCSP(isProduction)
  }

  /**
   * Validate and sanitize header values
   */
  static sanitizeHeaderValue(value: string): string {
    // Remove potentially dangerous characters
    return value
      .replace(/[\r\n]/g, '') // Remove line breaks
      .replace(/[^\x20-\x7E]/g, '') // Remove non-printable characters
      .trim()
  }

  /**
   * Check if CSP directive is valid
   */
  static validateCSPDirective(directive: string): boolean {
    const validDirectives = [
      'default-src', 'script-src', 'style-src', 'img-src', 'font-src',
      'connect-src', 'media-src', 'object-src', 'frame-src', 'worker-src',
      'manifest-src', 'base-uri', 'form-action', 'frame-ancestors'
    ]
    
    return validDirectives.some(valid => directive.startsWith(valid))
  }

  /**
   * Get security score based on configured headers
   */
  getSecurityScore(): {
    score: number
    maxScore: number
    recommendations: string[]
  } {
    let score = 0
    const maxScore = 100
    const recommendations: string[] = []

    // CSP (30 points)
    if (this.config.csp.enabled) {
      score += 25
      if (!this.config.csp.reportOnly) {
        score += 5
      } else {
        recommendations.push('Enable CSP enforcement (not just report-only)')
      }
    } else {
      recommendations.push('Enable Content Security Policy')
    }

    // HSTS (20 points)
    if (this.config.hsts.enabled) {
      score += 15
      if (this.config.hsts.includeSubDomains) score += 3
      if (this.config.hsts.preload) score += 2
    } else {
      recommendations.push('Enable HTTP Strict Transport Security')
    }

    // Frame Options (10 points)
    if (this.config.frameOptions === 'DENY') {
      score += 10
    } else if (this.config.frameOptions === 'SAMEORIGIN') {
      score += 7
      recommendations.push('Consider using X-Frame-Options: DENY for maximum protection')
    }

    // Content Type Options (10 points)
    if (this.config.contentTypeOptions) {
      score += 10
    } else {
      recommendations.push('Enable X-Content-Type-Options: nosniff')
    }

    // XSS Protection (10 points)
    if (this.config.xssProtection.enabled) {
      score += 8
      if (this.config.xssProtection.mode === 'block') score += 2
    } else {
      recommendations.push('Enable X-XSS-Protection')
    }

    // Referrer Policy (10 points)
    if (this.config.referrerPolicy.includes('strict-origin')) {
      score += 10
    } else if (this.config.referrerPolicy !== 'unsafe-url') {
      score += 7
      recommendations.push('Use strict-origin-when-cross-origin for better privacy')
    }

    // Permissions Policy (10 points)
    if (Object.keys(this.config.permissionsPolicy).length > 5) {
      score += 10
    } else {
      recommendations.push('Configure more Permissions Policy directives')
    }

    return { score, maxScore, recommendations }
  }
}

// Guardian Security: Default production configuration
export const guardianSecurityHeaders = new GuardianSecurityHeaders({
  csp: {
    enabled: true,
    reportOnly: false,
    sources: {
      default: ["'self'"],
      script: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      style: ["'self'", "'unsafe-inline'"],
      img: ["'self'", "data:", "https:"],
      font: ["'self'", "data:"],
      connect: ["'self'", "https:", "wss:"],
      media: ["'self'"],
      object: ["'none'"],
      frame: ["'self'"],
      worker: ["'self'"],
      manifest: ["'self'"]
    },
    reportUri: '/api/security/csp-report',
    upgradeInsecureRequests: true
  },
  hsts: {
    enabled: true,
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  expectCT: {
    enabled: true,
    maxAge: 86400,
    enforce: true,
    reportUri: '/api/security/expect-ct-report'
  }
})

// Guardian Security: Development configuration
export const guardianSecurityHeadersDev = new GuardianSecurityHeaders({
  csp: {
    enabled: true,
    reportOnly: true,
    sources: {
      default: ["'self'"],
      script: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      style: ["'self'", "'unsafe-inline'"],
      img: ["'self'", "data:", "https:"],
      font: ["'self'", "data:"],
      connect: ["'self'", "ws:", "wss:"],
      media: ["'self'"],
      object: ["'none'"],
      frame: ["'self'"],
      worker: ["'self'"],
      manifest: ["'self'"]
    },
    upgradeInsecureRequests: false
  },
  hsts: {
    enabled: false,
    maxAge: 0,
    includeSubDomains: false,
    preload: false
  }
})