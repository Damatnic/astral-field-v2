import { NextRequest, NextResponse } from 'next/server';

// Generate avatar placeholder SVG with initials
function generateAvatarSVG(name: string): string {
  const initials = name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Generate consistent color based on name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = Math.abs(hash) % 360;
  const bgColor = `hsl(${hue}, 70%, 50%)`;
  const textColor = '#ffffff';

  return `
    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="${bgColor}" />
      <text x="100" y="100" font-family="Arial, sans-serif" font-size="80" font-weight="bold" 
            text-anchor="middle" dominant-baseline="middle" fill="${textColor}">
        ${initials}
      </text>
    </svg>
  `;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  const name = params.name.replace('.jpg', '').replace(/-/g, ' ');
  const properName = name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const svg = generateAvatarSVG(properName);

  return new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}