import { NextRequest, NextResponse } from 'next/server';

interface Params {
  name: string;
}

// D'Amato Dynasty League member colors for consistent branding
const memberColors: Record<string, string> = {
  'nicholas-damato': '#1f2937',     // Commissioner - Dark slate
  'nick-hartley': '#3b82f6',       // Blue
  'jon-kornbeck': '#10b981',       // Emerald
  'brittany-bergum': '#f59e0b',    // Amber
  'jack-mccaigue': '#ef4444',      // Red
  'larry-mccaigue': '#8b5cf6',     // Purple
  'cason-minor': '#06b6d4',        // Cyan
  'renee-mccaigue': '#ec4899',     // Pink
  'david-jarvey': '#84cc16',       // Lime
  'kaity-lorbecki': '#f97316',     // Orange
  'default': '#6b7280'             // Gray fallback
};

// Generate professional avatar SVG with league member colors
function generateAvatarSVG(name: string, color: string): string {
  const initials = name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return `
    <svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <!-- Background circle -->
      <circle cx="60" cy="60" r="60" fill="${color}"/>
      
      <!-- Inner circle for depth -->
      <circle cx="60" cy="60" r="54" fill="${color}" fill-opacity="0.9"/>
      
      <!-- Initials text -->
      <text 
        x="60" 
        y="72" 
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
        font-size="28" 
        font-weight="600" 
        text-anchor="middle" 
        dominant-baseline="middle"
        fill="white"
        letter-spacing="1"
      >
        ${initials}
      </text>
      
      <!-- Subtle gradient overlay for depth -->
      <defs>
        <radialGradient id="gradient-${name.replace(/\s+/g, '-')}" cx="0.3" cy="0.3" r="0.8">
          <stop offset="0%" stop-color="rgba(255,255,255,0.2)"/>
          <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="60" fill="url(#gradient-${name.replace(/\s+/g, '-')})"/>
    </svg>
  `.trim();
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<Params> }
) {
  try {
    const { name } = await context.params;
    
    // Clean the name and convert to proper format
    const cleanName = name.replace(/\.(jpg|jpeg|png|svg)$/i, '');
    const properName = cleanName
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    // Get specific color for D'Amato Dynasty League members
    const memberKey = cleanName.toLowerCase();
    const color = memberColors[memberKey] || memberColors.default;
    
    // Generate SVG avatar
    const svg = generateAvatarSVG(properName, color);
    
    return new NextResponse(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400', // 24 hour cache
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Avatar name route error:', error);
    
    // Return a default avatar on error
    const defaultSvg = generateAvatarSVG('User', memberColors.default);
    
    return new NextResponse(defaultSvg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }
}