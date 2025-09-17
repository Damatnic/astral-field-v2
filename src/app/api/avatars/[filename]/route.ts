import { NextRequest, NextResponse } from 'next/server';

// Generate SVG avatar placeholder
function generateAvatarSVG(name: string): string {
  const initials = name.split('-').map(part => part.charAt(0).toUpperCase()).join('');
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
    '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43'
  ];
  const color = colors[name.length % colors.length];
  
  return `
    <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="${color}"/>
      <text x="50%" y="50%" text-anchor="middle" dy="0.3em" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="white">${initials}</text>
    </svg>
  `;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename;
    const name = filename.replace('.jpg', '').replace('.png', '');
    
    const svg = generateAvatarSVG(name);
    
    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error generating avatar:', error);
    return NextResponse.json(
      { error: 'Failed to generate avatar' },
      { status: 500 }
    );
  }
}