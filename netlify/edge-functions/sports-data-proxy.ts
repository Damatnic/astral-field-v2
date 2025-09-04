// @ts-ignore - Netlify Edge Functions runtime
import { Context } from "https://edge.netlify.com"

export default async (request: Request, _context: Context) => {
  const url = new URL(request.url)
  const path = url.pathname.replace('/api/sports/', '')
  
  // @ts-ignore - Netlify runtime global
  const apiKey = Netlify.env.get('SPORTSDATA_API_KEY')
  if (!apiKey) {
    return new Response('API key not configured', { status: 500 })
  }
  
  const sportsDataUrl = `https://api.sportsdata.io/v3/nfl/${path}?key=${apiKey}`
  
  try {
    const response = await fetch(sportsDataUrl, {
      method: request.method,
      headers: {
        'User-Agent': 'Astral Field Fantasy Football Platform',
        'Accept': 'application/json',
      },
    })
    
    const data = await response.text()
    
    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    })
  } catch (error) {
    console.error('SportsData API Error:', error)
    return new Response('API request failed', { status: 500 })
  }
}