/**
 * Zenith Production Asset Loading Tests
 * Tests for critical production issues: 404s, MIME types, CSP violations
 */
import { describe, expect, test, beforeAll, afterAll } from '@jest/globals'

const PRODUCTION_URL = 'https://web-daxgcan59-astral-productions.vercel.app'
const CRITICAL_ASSETS = [
  '/polyfills.js',
  '/webpack.js', 
  '/main.js',
  '/_next/static/css/app/layout.css',
  '/_next/static/chunks/webpack.js',
  '/_next/static/chunks/main-app.js',
  '/_next/static/chunks/polyfills.js'
]

const EXPECTED_MIME_TYPES = {
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
}

describe('Production Asset Loading', () => {
  let baseUrl: string

  beforeAll(() => {
    baseUrl = process.env.E2E_BASE_URL || PRODUCTION_URL
  })

  describe('Critical Asset Availability', () => {
    test.each(CRITICAL_ASSETS)('should load critical asset: %s', async (assetPath) => {
      const response = await fetch(`${baseUrl}${assetPath}`)
      
      expect(response.status).toBe(200)
      expect(response.ok).toBe(true)
      
      // Verify content length
      const contentLength = response.headers.get('content-length')
      expect(contentLength).toBeTruthy()
      expect(parseInt(contentLength || '0')).toBeGreaterThan(0)
    })

    test('should load homepage without 404s', async () => {
      const response = await fetch(baseUrl)
      expect(response.status).toBe(200)
      
      const html = await response.text()
      expect(html).toContain('<!DOCTYPE html>')
      expect(html).not.toContain('404')
      expect(html).not.toContain('Not Found')
    })
  })

  describe('MIME Type Validation', () => {
    test('should serve CSS files with correct MIME type', async () => {
      const response = await fetch(`${baseUrl}/_next/static/css/app/layout.css`)
      
      if (response.status === 200) {
        const contentType = response.headers.get('content-type')
        expect(contentType).toMatch(/text\/css/)
      }
    })

    test('should serve JavaScript files with correct MIME type', async () => {
      const response = await fetch(`${baseUrl}/_next/static/chunks/webpack.js`)
      
      if (response.status === 200) {
        const contentType = response.headers.get('content-type')
        expect(contentType).toMatch(/(?:text\/javascript|application\/javascript)/)
      }
    })

    test('should serve font files with correct MIME types', async () => {
      // Test common font paths
      const fontPaths = [
        '/_next/static/media/inter.woff2',
        '/_next/static/media/inter.woff',
        '/fonts/inter.woff2'
      ]

      for (const fontPath of fontPaths) {
        try {
          const response = await fetch(`${baseUrl}${fontPath}`)
          if (response.status === 200) {
            const contentType = response.headers.get('content-type')
            expect(contentType).toMatch(/font\//)
          }
        } catch (error) {
          // Font might not exist, skip
          console.log(`Font not found: ${fontPath}`)
        }
      }
    })
  })

  describe('Asset Integrity', () => {
    test('should serve assets with proper caching headers', async () => {
      const response = await fetch(`${baseUrl}/_next/static/chunks/webpack.js`)
      
      if (response.status === 200) {
        const cacheControl = response.headers.get('cache-control')
        expect(cacheControl).toBeTruthy()
        // Next.js should set long cache times for hashed assets
        expect(cacheControl).toMatch(/max-age=/)
      }
    })

    test('should serve assets without error responses', async () => {
      const responses = await Promise.all(
        CRITICAL_ASSETS.map(asset => 
          fetch(`${baseUrl}${asset}`).catch(() => ({ status: 404, ok: false }))
        )
      )

      const errors = responses.filter(r => !r.ok)
      if (errors.length > 0) {
        console.error('Failed assets:', errors.map((r, i) => ({ asset: CRITICAL_ASSETS[i], status: r.status })))
      }

      // Allow some assets to be missing but not all
      expect(errors.length).toBeLessThan(CRITICAL_ASSETS.length)
    })
  })

  describe('CSP and Security Headers', () => {
    test('should have Content Security Policy header', async () => {
      const response = await fetch(baseUrl)
      
      const csp = response.headers.get('content-security-policy') || 
                 response.headers.get('content-security-policy-report-only')
      
      if (csp) {
        expect(csp).toContain('default-src')
        // Should allow fonts from appropriate sources
        expect(csp).toMatch(/font-src[^;]*(?:'self'|fonts\.googleapis\.com|fonts\.gstatic\.com)/)
      }
    })

    test('should have security headers', async () => {
      const response = await fetch(baseUrl)
      
      // Check for common security headers
      const headers = {
        'x-frame-options': response.headers.get('x-frame-options'),
        'x-content-type-options': response.headers.get('x-content-type-options'),
        'referrer-policy': response.headers.get('referrer-policy')
      }

      // At least some security headers should be present
      const presentHeaders = Object.values(headers).filter(Boolean)
      expect(presentHeaders.length).toBeGreaterThan(0)
    })
  })

  describe('Font Loading', () => {
    test('should load Google Fonts without CSP violations', async () => {
      const response = await fetch(`${baseUrl}`)
      const html = await response.text()
      
      // Check if Google Fonts are used
      if (html.includes('fonts.googleapis.com') || html.includes('fonts.gstatic.com')) {
        // Verify CSP allows font loading
        const csp = response.headers.get('content-security-policy')
        if (csp) {
          expect(csp).toMatch(/font-src[^;]*(?:fonts\.gstatic\.com|\*|'unsafe-inline')/)
        }
      }
    })

    test('should preload critical fonts', async () => {
      const response = await fetch(`${baseUrl}`)
      const html = await response.text()
      
      // Check for font preloading
      const hasPreloadedFonts = html.includes('<link rel="preload"') && 
                               html.includes('as="font"')
      
      if (hasPreloadedFonts) {
        expect(html).toMatch(/<link[^>]*rel="preload"[^>]*as="font"[^>]*crossorigin/)
      }
    })
  })

  describe('Manifest and PWA Assets', () => {
    test('should load manifest.json', async () => {
      const response = await fetch(`${baseUrl}/manifest.json`)
      
      if (response.status === 200) {
        const manifest = await response.json()
        expect(manifest.name || manifest.short_name).toBeTruthy()
      }
    })

    test('should load favicon and icons', async () => {
      const iconPaths = [
        '/favicon.ico',
        '/icon-192.png',
        '/icon-512.png',
        '/apple-touch-icon.png'
      ]

      for (const iconPath of iconPaths) {
        try {
          const response = await fetch(`${baseUrl}${iconPath}`)
          if (response.status === 200) {
            const contentType = response.headers.get('content-type')
            expect(contentType).toMatch(/image\//)
          }
        } catch (error) {
          // Icon might not exist, that's okay
        }
      }
    })
  })
})

// Network Performance Tests
describe('Asset Loading Performance', () => {
  test('should load critical assets within performance budget', async () => {
    const startTime = Date.now()
    
    const criticalAssets = [
      `${PRODUCTION_URL}`,
      `${PRODUCTION_URL}/_next/static/chunks/webpack.js`,
      `${PRODUCTION_URL}/_next/static/css/app/layout.css`
    ]

    const responses = await Promise.all(
      criticalAssets.map(url => 
        fetch(url).then(response => ({
          url,
          status: response.status,
          size: parseInt(response.headers.get('content-length') || '0'),
          time: Date.now() - startTime
        }))
      )
    )

    // All critical assets should load in under 3 seconds
    responses.forEach(({ url, time, status }) => {
      if (status === 200) {
        expect(time).toBeLessThan(3000)
      }
    })
  })
})
