import { NextRequest, NextResponse } from 'next/server';
import { getStadiumWeather, getBulkWeather } from '@/services/weather/weather';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET /api/weather - Get weather data for NFL stadiums
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const team = searchParams.get('team');
    const teams = searchParams.get('teams');
    
    // Single team weather
    if (team) {
      const weather = await getStadiumWeather(team.toUpperCase());
      return NextResponse.json({
        success: true,
        team: team.toUpperCase(),
        weather
      });
    }
    
    // Multiple teams weather
    if (teams) {
      const teamCodes = teams.split(',').map(t => t.trim().toUpperCase());
      const weatherMap = await getBulkWeather(teamCodes);
      
      const weatherData: Record<string, any> = {};
      weatherMap.forEach((weather, teamCode) => {
        weatherData[teamCode] = weather;
      });
      
      return NextResponse.json({
        success: true,
        weather: weatherData
      });
    }
    
    // Get weather for all teams (for weekly overview)
    const allTeams = Object.keys(NFL_STADIUMS);
    const allWeatherMap = await getBulkWeather(allTeams);
    
    const allWeatherData: Record<string, any> = {};
    allWeatherMap.forEach((weather, teamCode) => {
      allWeatherData[teamCode] = weather;
    });
    
    return NextResponse.json({
      success: true,
      weather: allWeatherData
    });
    
  } catch (error) {
    console.error('Weather API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weather data' },
      { status: 500 }
    );
  }
}

// Manually define NFL_STADIUMS for TypeScript
const NFL_STADIUMS = {
  'BUF': 'Buffalo Bills',
  'MIA': 'Miami Dolphins',
  'NE': 'New England Patriots',
  'NYJ': 'New York Jets',
  'BAL': 'Baltimore Ravens',
  'CIN': 'Cincinnati Bengals',
  'CLE': 'Cleveland Browns',
  'PIT': 'Pittsburgh Steelers',
  'HOU': 'Houston Texans',
  'IND': 'Indianapolis Colts',
  'JAX': 'Jacksonville Jaguars',
  'TEN': 'Tennessee Titans',
  'DEN': 'Denver Broncos',
  'KC': 'Kansas City Chiefs',
  'LV': 'Las Vegas Raiders',
  'LAC': 'Los Angeles Chargers',
  'DAL': 'Dallas Cowboys',
  'NYG': 'New York Giants',
  'PHI': 'Philadelphia Eagles',
  'WAS': 'Washington Commanders',
  'CHI': 'Chicago Bears',
  'DET': 'Detroit Lions',
  'GB': 'Green Bay Packers',
  'MIN': 'Minnesota Vikings',
  'ATL': 'Atlanta Falcons',
  'CAR': 'Carolina Panthers',
  'NO': 'New Orleans Saints',
  'TB': 'Tampa Bay Buccaneers',
  'ARI': 'Arizona Cardinals',
  'LA': 'Los Angeles Rams',
  'SF': 'San Francisco 49ers',
  'SEA': 'Seattle Seahawks'
};