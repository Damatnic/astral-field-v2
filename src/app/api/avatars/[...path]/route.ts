import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Default avatar SVG
const DEFAULT_AVATAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <rect width="100" height="100" fill="#3B82F6"/>
  <circle cx="50" cy="35" r="20" fill="#ffffff"/>
  <ellipse cx="50" cy="75" rx="35" ry="25" fill="#ffffff"/>
  <text x="50" y="55" font-family="Arial, sans-serif" font-size="32" fill="#3B82F6" text-anchor="middle" font-weight="bold">AF</text>
</svg>`;

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const avatarPath = params.path?.join('/') || '';
    const publicDir = path.join(process.cwd(), 'public', 'avatars');
    const filePath = path.join(publicDir, avatarPath);
    
    // Security check - prevent directory traversal
    if (!filePath.startsWith(publicDir)) {
      return new NextResponse(DEFAULT_AVATAR_SVG, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }
    
    // Check if file exists
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const fileBuffer = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      
      let contentType = 'application/octet-stream';
      if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.gif') contentType = 'image/gif';
      else if (ext === '.svg') contentType = 'image/svg+xml';
      else if (ext === '.webp') contentType = 'image/webp';
      
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }
    
    // Return default avatar if file not found
    return new NextResponse(DEFAULT_AVATAR_SVG, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
    
  } catch (error) {
    console.error('Error serving avatar:', error);
    // Return default avatar on error
    return new NextResponse(DEFAULT_AVATAR_SVG, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }
}