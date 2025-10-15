/**
 * Open Graph Image Generation
 * Dynamic OG images for social sharing
 */

import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'default'
  const title = searchParams.get('title') || 'AstralField Fantasy Football'
  const subtitle = searchParams.get('subtitle') || ''
  const stat1 = searchParams.get('stat1') || ''
  const stat2 = searchParams.get('stat2') || ''
  const stat3 = searchParams.get('stat3') || ''

  try {
    // Generate image based on type
    if (type === 'matchup') {
      return new ImageResponse(
        (
          <div
            style={{
              width: '1200px',
              height: '630px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              fontFamily: 'system-ui, sans-serif'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '40px' }}>
              <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#fff', marginBottom: '16px' }}>
                {title}
              </div>
              <div style={{ fontSize: '24px', color: '#94a3b8' }}>
                {subtitle}
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: '40px' }}>
              {stat1 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#1e293b', padding: '32px', borderRadius: '16px', border: '2px solid #334155' }}>
                  <div style={{ fontSize: '64px', fontWeight: 'bold', color: '#3b82f6' }}>
                    {stat1.split(':')[1]}
                  </div>
                  <div style={{ fontSize: '20px', color: '#94a3b8', marginTop: '8px' }}>
                    {stat1.split(':')[0]}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', fontSize: '48px', color: '#64748b' }}>
                vs
              </div>
              {stat2 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#1e293b', padding: '32px', borderRadius: '16px', border: '2px solid #334155' }}>
                  <div style={{ fontSize: '64px', fontWeight: 'bold', color: '#ef4444' }}>
                    {stat2.split(':')[1]}
                  </div>
                  <div style={{ fontSize: '20px', color: '#94a3b8', marginTop: '8px' }}>
                    {stat2.split(':')[0]}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ position: 'absolute', bottom: '40px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: '8px' }}></div>
              <div style={{ fontSize: '20px', color: '#94a3b8' }}>
                AstralField Fantasy Football
              </div>
            </div>
          </div>
        ),
        {
          width: 1200,
          height: 630
        }
      )
    }

    if (type === 'player') {
      return new ImageResponse(
        (
          <div
            style={{
              width: '1200px',
              height: '630px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
              fontFamily: 'system-ui, sans-serif'
            }}
          >
            {/* Player Name */}
            <div style={{ fontSize: '72px', fontWeight: 'bold', color: '#fff', marginBottom: '24px' }}>
              {title}
            </div>

            {/* Position & Team */}
            <div style={{ fontSize: '32px', color: '#94a3b8', marginBottom: '48px' }}>
              {subtitle}
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'flex', gap: '32px' }}>
              {stat1 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 32px', background: '#1e293b', borderRadius: '12px', border: '2px solid #3b82f6' }}>
                  <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#3b82f6' }}>
                    {stat1.split(':')[1]}
                  </div>
                  <div style={{ fontSize: '16px', color: '#94a3b8', marginTop: '8px' }}>
                    {stat1.split(':')[0]}
                  </div>
                </div>
              )}
              {stat2 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 32px', background: '#1e293b', borderRadius: '12px', border: '2px solid #10b981' }}>
                  <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#10b981' }}>
                    {stat2.split(':')[1]}
                  </div>
                  <div style={{ fontSize: '16px', color: '#94a3b8', marginTop: '8px' }}>
                    {stat2.split(':')[0]}
                  </div>
                </div>
              )}
              {stat3 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 32px', background: '#1e293b', borderRadius: '12px', border: '2px solid #8b5cf6' }}>
                  <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#8b5cf6' }}>
                    {stat3.split(':')[1]}
                  </div>
                  <div style={{ fontSize: '16px', color: '#94a3b8', marginTop: '8px' }}>
                    {stat3.split(':')[0]}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ position: 'absolute', bottom: '40px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: '8px' }}></div>
              <div style={{ fontSize: '20px', color: '#94a3b8' }}>
                AstralField Fantasy Football
              </div>
            </div>
          </div>
        ),
        {
          width: 1200,
          height: 630
        }
      )
    }

    if (type === 'team') {
      return new ImageResponse(
        (
          <div
            style={{
              width: '1200px',
              height: '630px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              fontFamily: 'system-ui, sans-serif',
              position: 'relative'
            }}
          >
            {/* Team Name */}
            <div style={{ fontSize: '64px', fontWeight: 'bold', color: '#fff', marginBottom: '16px', textAlign: 'center' }}>
              {title}
            </div>

            {/* Record */}
            <div style={{ fontSize: '36px', color: '#3b82f6', marginBottom: '48px' }}>
              {subtitle}
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'flex', gap: '24px' }}>
              {stat1 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 32px', background: '#1e293b', borderRadius: '12px' }}>
                  <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#10b981' }}>
                    {stat1.split(':')[1]}
                  </div>
                  <div style={{ fontSize: '14px', color: '#94a3b8', marginTop: '8px' }}>
                    {stat1.split(':')[0]}
                  </div>
                </div>
              )}
              {stat2 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 32px', background: '#1e293b', borderRadius: '12px' }}>
                  <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#3b82f6' }}>
                    {stat2.split(':')[1]}
                  </div>
                  <div style={{ fontSize: '14px', color: '#94a3b8', marginTop: '8px' }}>
                    {stat2.split(':')[0]}
                  </div>
                </div>
              )}
              {stat3 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 32px', background: '#1e293b', borderRadius: '12px' }}>
                  <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#8b5cf6' }}>
                    {stat3.split(':')[1]}
                  </div>
                  <div style={{ fontSize: '14px', color: '#94a3b8', marginTop: '8px' }}>
                    {stat3.split(':')[0]}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ position: 'absolute', bottom: '40px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: '8px' }}></div>
              <div style={{ fontSize: '20px', color: '#94a3b8' }}>
                AstralField Fantasy Football
              </div>
            </div>
          </div>
        ),
        {
          width: 1200,
          height: 630
        }
      )
    }

    // Default template
    return new ImageResponse(
      (
        <div
          style={{
            width: '1200px',
            height: '630px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #312e81 100%)',
            fontFamily: 'system-ui, sans-serif'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '120px', height: '120px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: '24px', marginBottom: '48px' }}></div>
            <div style={{ fontSize: '72px', fontWeight: 'bold', color: '#fff', marginBottom: '24px' }}>
              {title}
            </div>
            {subtitle && (
              <div style={{ fontSize: '32px', color: '#94a3b8' }}>
                {subtitle}
              </div>
            )}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630
      }
    )
  } catch (error) {
    console.error('Error generating OG image:', error)
    return new Response('Failed to generate image', { status: 500 })
  }
}

