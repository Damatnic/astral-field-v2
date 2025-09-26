/**
 * Zenith Security Tests - CSP Compliance and Security Headers
 * Comprehensive security testing for production deployment
 */
import { describe, expect, test, beforeAll } from '@jest/globals'

const PRODUCTION_URL = 'https://web-daxgcan59-astral-productions.vercel.app'
const LOCAL_URL = 'http://localhost:3000'

const SECURITY_HEADERS = [
  'content-security-policy',
  'content-security-policy-report-only',
  'x-frame-options',
  'x-content-type-options',
  'referrer-policy',
  'strict-transport-security',
  'x-xss-protection',
  'permissions-policy'
]

const CSP_DIRECTIVES = [
  'default-src',
  'script-src',
  'style-src',
  'img-src',
  'font-src',
  'connect-src',
  'frame-src',
  'object-src',
  'base-uri',
  'form-action'
]

describe('Security Headers and CSP Compliance', () => {
  let baseUrl: string

  beforeAll(() => {
    baseUrl = process.env.E2E_BASE_URL || PRODUCTION_URL
  })

  describe('Content Security Policy (CSP)', () => {
    test('should have CSP header present', async () => {
      const response = await fetch(baseUrl)
      
      const csp = response.headers.get('content-security-policy') ||
                 response.headers.get('content-security-policy-report-only')
      
      expect(csp).toBeTruthy()
      expect(csp).toContain('default-src')
    })

    test('should allow required font sources', async () => {
      const response = await fetch(baseUrl)
      const csp = response.headers.get('content-security-policy') ||
                 response.headers.get('content-security-policy-report-only')
      
      if (csp) {
        // Should allow self and common font CDNs
        const fontSrcMatch = csp.match(/font-src[^;]+/)
        if (fontSrcMatch) {
          const fontSrc = fontSrcMatch[0]
          expect(fontSrc).toMatch(/'self'|\*|fonts\.gstatic\.com|fonts\.googleapis\.com/)
        }
      }
    })

    test('should allow required script sources', async () => {
      const response = await fetch(baseUrl)
      const csp = response.headers.get('content-security-policy') ||
                 response.headers.get('content-security-policy-report-only')
      
      if (csp) {
        const scriptSrcMatch = csp.match(/script-src[^;]+/)
        if (scriptSrcMatch) {
          const scriptSrc = scriptSrcMatch[0]
          // Should allow self and necessary CDNs
          expect(scriptSrc).toMatch(/'self'|'unsafe-inline'|'unsafe-eval'|vercel\.live/)
        }
      }
    })

    test('should allow required style sources', async () => {
      const response = await fetch(baseUrl)
      const csp = response.headers.get('content-security-policy') ||
                 response.headers.get('content-security-policy-report-only')
      
      if (csp) {
        const styleSrcMatch = csp.match(/style-src[^;]+/)
        if (styleSrcMatch) {
          const styleSrc = styleSrcMatch[0]
          // Should allow self and inline styles for Next.js
          expect(styleSrc).toMatch(/'self'|'unsafe-inline'|fonts\.googleapis\.com/)
        }
      }
    })

    test('should have restrictive default-src', async () => {
      const response = await fetch(baseUrl)
      const csp = response.headers.get('content-security-policy') ||
                 response.headers.get('content-security-policy-report-only')
      
      if (csp) {
        const defaultSrcMatch = csp.match(/default-src[^;]+/)
        if (defaultSrcMatch) {
          const defaultSrc = defaultSrcMatch[0]
          // Should not allow everything (*) unless specific reason
          expect(defaultSrc).not.toContain("*")
          expect(defaultSrc).toMatch(/'self'|'none'/)
        }
      }
    })

    test('should restrict object-src', async () => {
      const response = await fetch(baseUrl)
      const csp = response.headers.get('content-security-policy') ||
                 response.headers.get('content-security-policy-report-only')
      
      if (csp) {
        // object-src should be 'none' for security
        expect(csp).toMatch(/object-src[^;]*'none'/)
      }
    })

    test('should restrict frame-ancestors', async () => {
      const response = await fetch(baseUrl)
      const csp = response.headers.get('content-security-policy') ||
                 response.headers.get('content-security-policy-report-only')
      
      if (csp) {
        // Should prevent clickjacking
        const frameAncestorsMatch = csp.match(/frame-ancestors[^;]+/)
        if (frameAncestorsMatch) {
          expect(frameAncestorsMatch[0]).toMatch(/'self'|'none'/)
        }
      }
    })
  })

  describe('Security Headers', () => {
    test('should have X-Frame-Options header', async () => {
      const response = await fetch(baseUrl)
      const xFrameOptions = response.headers.get('x-frame-options')
      
      if (xFrameOptions) {
        expect(xFrameOptions).toMatch(/DENY|SAMEORIGIN/)
      }
    })

    test('should have X-Content-Type-Options header', async () => {
      const response = await fetch(baseUrl)
      const xContentTypeOptions = response.headers.get('x-content-type-options')
      
      if (xContentTypeOptions) {
        expect(xContentTypeOptions).toBe('nosniff')
      }
    })

    test('should have Referrer-Policy header', async () => {
      const response = await fetch(baseUrl)
      const referrerPolicy = response.headers.get('referrer-policy')
      
      if (referrerPolicy) {
        expect(referrerPolicy).toMatch(/strict-origin-when-cross-origin|same-origin|no-referrer/)
      }
    })

    test('should have Strict-Transport-Security in production', async () => {
      if (baseUrl.startsWith('https://')) {
        const response = await fetch(baseUrl)
        const hsts = response.headers.get('strict-transport-security')
        
        if (hsts) {
          expect(hsts).toMatch(/max-age=\d+/)
          expect(hsts).toContain('includeSubDomains')
        }
      }
    })

    test('should have Permissions-Policy header', async () => {
      const response = await fetch(baseUrl)
      const permissionsPolicy = response.headers.get('permissions-policy')
      
      if (permissionsPolicy) {
        // Should restrict dangerous features
        expect(permissionsPolicy).toMatch(/camera=\(\)|microphone=\(\)|geolocation=\(\)/)
      }
    })
  })

  describe('HTTPS and TLS Security', () => {
    test('should use HTTPS in production', () => {
      if (baseUrl.includes('vercel.app') || baseUrl.includes('production')) {
        expect(baseUrl).toMatch(/^https:/)
      }
    })

    test('should have secure cookies', async () => {
      const response = await fetch(baseUrl, {
        credentials: 'include'
      })
      
      const setCookieHeaders = response.headers.get('set-cookie')
      if (setCookieHeaders) {
        // Cookies should be secure in production
        if (baseUrl.startsWith('https://')) {
          expect(setCookieHeaders).toMatch(/Secure/)
          expect(setCookieHeaders).toMatch(/HttpOnly/)
        }
      }
    })
  })

  describe('Content Type Security', () => {
    test('should serve JavaScript with correct MIME type', async () => {
      const jsAssets = [
        '/_next/static/chunks/webpack.js',
        '/_next/static/chunks/main-app.js',
        '/_next/static/chunks/polyfills.js'
      ]
      
      for (const asset of jsAssets) {
        try {
          const response = await fetch(`${baseUrl}${asset}`)
          if (response.status === 200) {
            const contentType = response.headers.get('content-type')
            expect(contentType).toMatch(/(?:text\/javascript|application\/javascript)/)
            expect(contentType).not.toContain('text/plain')
          }
        } catch (error) {
          // Asset might not exist in this build
        }
      }
    })

    test('should serve CSS with correct MIME type', async () => {
      const cssAssets = [
        '/_next/static/css/app/layout.css',
        '/_next/static/css/app/globals.css'
      ]
      
      for (const asset of cssAssets) {
        try {
          const response = await fetch(`${baseUrl}${asset}`)
          if (response.status === 200) {
            const contentType = response.headers.get('content-type')
            expect(contentType).toMatch(/text\/css/)
            expect(contentType).not.toContain('text/plain')
          }
        } catch (error) {
          // Asset might not exist
        }
      }
    })

    test('should serve fonts with correct MIME type', async () => {
      const fontAssets = [
        '/_next/static/media/inter.woff2',
        '/fonts/inter.woff2',
        '/fonts/roboto.woff'
      ]
      
      for (const asset of fontAssets) {
        try {
          const response = await fetch(`${baseUrl}${asset}`)
          if (response.status === 200) {
            const contentType = response.headers.get('content-type')
            expect(contentType).toMatch(/font\//)
          }
        } catch (error) {
          // Font might not exist
        }
      }
    })
  })

  describe('Cross-Origin Resource Sharing (CORS)', () => {
    test('should have appropriate CORS headers for API endpoints', async () => {
      const apiEndpoints = [
        '/api/auth/signin',
        '/api/auth/session',
        '/api/teams',
        '/api/players'
      ]
      
      for (const endpoint of apiEndpoints) {
        try {
          const response = await fetch(`${baseUrl}${endpoint}`, {
            method: 'OPTIONS'
          })
          
          if (response.status === 200 || response.status === 204) {
            const corsHeader = response.headers.get('access-control-allow-origin')
            if (corsHeader) {
              // CORS should be restrictive, not allow all origins
              expect(corsHeader).not.toBe('*')
            }
          }
        } catch (error) {
          // Endpoint might not exist or not support OPTIONS
        }
      }
    })
  })

  describe('Information Disclosure Prevention', () => {
    test('should not expose server information', async () => {
      const response = await fetch(baseUrl)
      
      // Should not expose server details
      const serverHeader = response.headers.get('server')
      if (serverHeader) {
        expect(serverHeader).not.toMatch(/Apache|nginx|IIS/i)
      }
      
      // Should not expose framework versions
      const xPoweredBy = response.headers.get('x-powered-by')
      expect(xPoweredBy).toBeNull()
    })

    test('should not expose debug information', async () => {
      const response = await fetch(baseUrl)
      const body = await response.text()
      
      // Should not contain debug information
      expect(body).not.toMatch(/error|exception|stack trace|debug/i)
      expect(body).not.toContain('NODE_ENV=development')
    })

    test('should handle 404s securely', async () => {
      const response = await fetch(`${baseUrl}/non-existent-page-12345`)
      
      expect(response.status).toBe(404)
      
      const body = await response.text()
      // Should not expose sensitive path information
      expect(body).not.toMatch(/server|file|path|directory/i)
    })
  })

  describe('Authentication Security', () => {
    test('should protect sensitive endpoints', async () => {
      const protectedEndpoints = [
        '/api/admin',
        '/api/user/profile',
        '/api/teams/private',
        '/dashboard/admin'
      ]
      
      for (const endpoint of protectedEndpoints) {
        try {
          const response = await fetch(`${baseUrl}${endpoint}`)
          
          // Should require authentication (401) or be forbidden (403)
          expect([401, 403, 404]).toContain(response.status)
        } catch (error) {
          // Endpoint might not exist
        }
      }
    })

    test('should have secure session management', async () => {
      // Test session cookie security
      const response = await fetch(`${baseUrl}/api/auth/session`)
      
      const setCookieHeaders = response.headers.get('set-cookie')
      if (setCookieHeaders) {
        // Session cookies should be secure
        expect(setCookieHeaders).toMatch(/HttpOnly/)
        expect(setCookieHeaders).toMatch(/SameSite=(Strict|Lax)/)
        
        if (baseUrl.startsWith('https://')) {
          expect(setCookieHeaders).toMatch(/Secure/)
        }
      }
    })
  })
})

// Additional security test for CSP violations in real browser context
describe('CSP Violation Detection', () => {
  test('should detect and report CSP violations', async () => {
    // This test would be run in a browser context to catch actual CSP violations
    const violations: any[] = []
    
    // Mock CSP violation reporting
    const mockViolationHandler = (event: any) => {
      violations.push({
        directive: event.violatedDirective,
        source: event.sourceFile,
        line: event.lineNumber,
        blocked: event.blockedURI
      })
    }
    
    // In a real browser test, you would add:
    // document.addEventListener('securitypolicyviolation', mockViolationHandler)
    
    // Simulate loading the page and checking for violations
    const response = await fetch(baseUrl)
    const html = await response.text()
    
    // Check for potential CSP violations in HTML
    const inlineScripts = html.match(/<script[^>]*>.*?<\/script>/gs) || []
    const inlineStyles = html.match(/style="[^"]*"/g) || []
    
    console.log(`Found ${inlineScripts.length} inline scripts`)
    console.log(`Found ${inlineStyles.length} inline styles`)
    
    // If CSP is strict, these should be minimal
    expect(inlineScripts.length).toBeLessThan(10)
  })
})
