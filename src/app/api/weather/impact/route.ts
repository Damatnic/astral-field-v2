import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Weather Impact API
 * GET /api/weather/impact - Get weather impact analysis for fantasy football
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const week = parseInt(searchParams.get('week') || '0');
    const season = searchParams.get('season') || '2025';
    const team = searchParams.get('team');
    const includeForecasts = searchParams.get('includeForecasts') === 'true';
    const includePlayers = searchParams.get('includePlayers') === 'true';

    // Get current week if not specified
    const currentWeek = week || await getCurrentWeek();

    // Get NFL game data for the specified week
    const gameData = await getNFLGameData(currentWeek, season);

    // Get weather data for each game
    const weatherImpacts = await Promise.all(
      gameData.map(async (game: any) => {
        const weather = await getGameWeather(game);
        const impact = analyzeWeatherImpact(weather, game);
        
        // Get affected players if requested
        let affectedPlayers: any[] = [];
        if (includePlayers) {
          affectedPlayers = await getAffectedPlayers(game, impact, team);
        }

        return {
          gameId: game.id,
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          stadium: game.stadium,
          gameTime: game.gameTime,
          
          // Weather conditions
          weather: {
            temperature: weather.temperature,
            condition: weather.condition,
            windSpeed: weather.windSpeed,
            windDirection: weather.windDirection,
            precipitation: weather.precipitation,
            humidity: weather.humidity,
            visibility: weather.visibility
          },

          // Fantasy impact analysis
          impact: {
            overall: impact.overall,
            passing: impact.passing,
            rushing: impact.rushing,
            kicking: impact.kicking,
            defense: impact.defense,
            severity: impact.severity,
            confidence: impact.confidence
          },

          // Recommendations
          recommendations: {
            start: impact.favoredPositions,
            sit: impact.adversePositions,
            riskLevel: impact.riskLevel,
            notes: impact.notes
          },

          // Affected players
          ...(includePlayers && { affectedPlayers }),

          lastUpdated: new Date().toISOString()
        };
      })
    );

    // Generate summary and insights
    const summary = generateWeatherSummary(weatherImpacts);

    // Get historical weather performance if forecasts requested
    let forecasts: any[] = [];
    if (includeForecasts) {
      forecasts = await getHistoricalWeatherPerformance(currentWeek, season);
    }

    return NextResponse.json({
      success: true,
      data: {
        week: currentWeek,
        season: season,
        gameWeather: weatherImpacts,
        summary: summary,
        ...(includeForecasts && { historicalTrends: forecasts }),
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Weather impact API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch weather impact data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Update weather data
 * POST /api/weather/impact - Update weather data for games
 */
export async function POST(request: Request) {
  try {
    const { gameId, weatherData, week, season = '2025' } = await request.json();

    if (!gameId && !week) {
      return NextResponse.json(
        { success: false, error: 'Either gameId or week is required' },
        { status: 400 }
      );
    }

    let updatedGames = 0;

    if (gameId) {
      // Update specific game weather
      const result = await updateGameWeather(gameId, weatherData);
      updatedGames = result ? 1 : 0;
    } else if (week) {
      // Update all games for the week
      const games = await getNFLGameData(week, season);
      for (const game of games) {
        const weather = await fetchLatestWeather(game.stadium, game.gameTime);
        await updateGameWeather(game.id, weather);
        updatedGames++;
      }
    }

    console.log(`Weather data updated for ${updatedGames} games`);

    return NextResponse.json({
      success: true,
      message: `Weather data updated for ${updatedGames} games`,
      data: {
        updatedGames,
        week: week || 'specific game',
        season: season,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Weather update error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update weather data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper functions

async function getCurrentWeek(): Promise<number> {
  try {
    const league = await prisma.league.findFirst({
      where: { isActive: true },
      select: { currentWeek: true }
    });
    return league?.currentWeek || 1;
  } catch (error) {
    console.error('Error getting current week:', error);
    return 1;
  }
}

async function getNFLGameData(week: number, season: string) {
  // This would integrate with ESPN/NFL API for real game data
  // For now, return mock structure with major stadiums
  return [
    {
      id: `2025-week-${week}-game-1`,
      homeTeam: 'KC',
      awayTeam: 'BUF',
      stadium: 'Arrowhead Stadium',
      city: 'Kansas City, MO',
      gameTime: new Date('2025-01-12T18:30:00Z'),
      isOutdoor: true,
      elevation: 750
    },
    {
      id: `2025-week-${week}-game-2`,
      homeTeam: 'GB',
      awayTeam: 'DAL',
      stadium: 'Lambeau Field',
      city: 'Green Bay, WI',
      gameTime: new Date('2025-01-12T21:00:00Z'),
      isOutdoor: true,
      elevation: 640
    },
    {
      id: `2025-week-${week}-game-3`,
      homeTeam: 'DEN',
      awayTeam: 'LV',
      stadium: 'Empower Field at Mile High',
      city: 'Denver, CO',
      gameTime: new Date('2025-01-13T17:00:00Z'),
      isOutdoor: true,
      elevation: 5280
    }
  ];
}

async function getGameWeather(game: any) {
  // This would integrate with weather API (OpenWeatherMap, WeatherAPI, etc.)
  // For now, return realistic weather data based on location and season
  
  const weatherPatterns = getSeasonalWeather(game.city, game.gameTime);
  
  return {
    temperature: weatherPatterns.temperature + (Math.random() - 0.5) * 10,
    condition: weatherPatterns.condition,
    windSpeed: weatherPatterns.windSpeed + (Math.random() - 0.5) * 5,
    windDirection: weatherPatterns.windDirection,
    precipitation: weatherPatterns.precipitation,
    humidity: weatherPatterns.humidity + (Math.random() - 0.5) * 20,
    visibility: weatherPatterns.visibility,
    pressure: 29.92 + (Math.random() - 0.5) * 0.5,
    lastUpdated: new Date().toISOString()
  };
}

function getSeasonalWeather(city: string, gameTime: Date) {
  const month = gameTime.getMonth(); // 0-11
  const isWinter = month <= 2 || month >= 11; // Dec, Jan, Feb
  
  // Basic patterns by city and season
  const patterns: { [key: string]: any } = {
    'Kansas City, MO': {
      temperature: isWinter ? 35 : 75,
      condition: isWinter ? 'cloudy' : 'clear',
      windSpeed: 8,
      windDirection: 'SW',
      precipitation: isWinter ? 0.1 : 0,
      humidity: 65,
      visibility: 10
    },
    'Green Bay, WI': {
      temperature: isWinter ? 25 : 70,
      condition: isWinter ? 'snow' : 'partly_cloudy',
      windSpeed: 12,
      windDirection: 'NW',
      precipitation: isWinter ? 0.3 : 0,
      humidity: 75,
      visibility: isWinter ? 5 : 10
    },
    'Denver, CO': {
      temperature: isWinter ? 40 : 80,
      condition: 'clear',
      windSpeed: 6,
      windDirection: 'W',
      precipitation: 0,
      humidity: 45,
      visibility: 15
    }
  };
  
  return patterns[city] || patterns['Kansas City, MO'];
}

function analyzeWeatherImpact(weather: any, game: any) {
  const temp = weather.temperature;
  const wind = weather.windSpeed;
  const precip = weather.precipitation;
  const condition = weather.condition;
  
  // Analyze impact on different aspects of the game
  const passingImpact = calculatePassingImpact(temp, wind, precip, condition);
  const rushingImpact = calculateRushingImpact(temp, wind, precip, condition);
  const kickingImpact = calculateKickingImpact(temp, wind, precip, condition, game.elevation);
  const defenseImpact = calculateDefenseImpact(temp, wind, precip, condition);
  
  // Overall impact severity
  const impacts = [passingImpact, rushingImpact, kickingImpact, defenseImpact];
  const avgImpact = impacts.reduce((sum, impact) => sum + Math.abs(impact), 0) / impacts.length;
  
  let severity: 'low' | 'medium' | 'high' = 'low';
  if (avgImpact > 2) severity = 'high';
  else if (avgImpact > 1) severity = 'medium';
  
  // Position recommendations
  const favoredPositions = [];
  const adversePositions = [];
  
  if (rushingImpact > 0.5) favoredPositions.push('RB');
  if (passingImpact < -0.5) adversePositions.push('QB', 'WR', 'TE');
  if (kickingImpact < -1) adversePositions.push('K');
  if (defenseImpact > 0.5) favoredPositions.push('DEF');
  
  return {
    overall: avgImpact,
    passing: passingImpact,
    rushing: rushingImpact,
    kicking: kickingImpact,
    defense: defenseImpact,
    severity: severity,
    confidence: calculateConfidence(weather),
    favoredPositions,
    adversePositions,
    riskLevel: severity,
    notes: generateWeatherNotes(weather, game)
  };
}

function calculatePassingImpact(temp: number, wind: number, precip: number, condition: string): number {
  let impact = 0;
  
  // Temperature impact
  if (temp < 32) impact -= 1.5; // Very cold hurts passing
  else if (temp < 45) impact -= 0.8;
  else if (temp > 85) impact -= 0.3; // Heat can be tiring
  
  // Wind impact (most significant for passing)
  if (wind > 20) impact -= 2.0;
  else if (wind > 15) impact -= 1.2;
  else if (wind > 10) impact -= 0.6;
  
  // Precipitation impact
  if (precip > 0.5) impact -= 1.5; // Heavy rain/snow
  else if (precip > 0.1) impact -= 0.8;
  
  // Condition adjustments
  if (condition === 'snow') impact -= 0.5;
  else if (condition === 'fog') impact -= 0.8;
  
  return Math.max(-3, Math.min(1, impact)); // Cap between -3 and 1
}

function calculateRushingImpact(temp: number, wind: number, precip: number, condition: string): number {
  let impact = 0;
  
  // Cold weather slightly favors rushing
  if (temp < 32) impact += 0.5;
  else if (temp < 45) impact += 0.3;
  
  // Wind doesn't affect rushing much
  if (wind > 20) impact += 0.3; // Teams run more in high wind
  
  // Precipitation can help or hurt
  if (precip > 0.5) impact -= 0.5; // Slippery conditions
  else if (precip > 0.1) impact -= 0.2;
  
  // Snow can be neutral to slightly negative
  if (condition === 'snow') impact -= 0.2;
  
  return Math.max(-2, Math.min(2, impact));
}

function calculateKickingImpact(temp: number, wind: number, precip: number, condition: string, elevation: number): number {
  let impact = 0;
  
  // Wind is the biggest factor for kicking
  if (wind > 25) impact -= 3.0;
  else if (wind > 20) impact -= 2.0;
  else if (wind > 15) impact -= 1.2;
  else if (wind > 10) impact -= 0.6;
  
  // Cold affects distance
  if (temp < 32) impact -= 1.0;
  else if (temp < 45) impact -= 0.5;
  
  // Precipitation affects accuracy
  if (precip > 0.3) impact -= 1.0;
  else if (precip > 0.1) impact -= 0.5;
  
  // High elevation helps (thinner air)
  if (elevation > 4000) impact += 0.5;
  
  return Math.max(-4, Math.min(1, impact));
}

function calculateDefenseImpact(temp: number, wind: number, precip: number, condition: string): number {
  let impact = 0;
  
  // Bad weather generally helps defense
  if (temp < 32) impact += 0.8;
  else if (temp < 45) impact += 0.4;
  
  if (wind > 15) impact += 1.0;
  else if (wind > 10) impact += 0.5;
  
  if (precip > 0.3) impact += 1.2;
  else if (precip > 0.1) impact += 0.6;
  
  if (condition === 'snow' || condition === 'fog') impact += 0.5;
  
  return Math.max(0, Math.min(3, impact));
}

function calculateConfidence(weather: any): number {
  // Higher confidence for recent weather data and stable conditions
  let confidence = 0.8;
  
  const dataAge = Date.now() - new Date(weather.lastUpdated).getTime();
  const hoursOld = dataAge / (1000 * 60 * 60);
  
  if (hoursOld > 24) confidence -= 0.2;
  else if (hoursOld > 12) confidence -= 0.1;
  
  // Less confident in rapidly changing conditions
  if (weather.condition === 'partly_cloudy') confidence -= 0.1;
  
  return Math.max(0.5, Math.min(1.0, confidence));
}

function generateWeatherNotes(weather: any, game: any): string[] {
  const notes = [];
  
  if (weather.temperature < 32) {
    notes.push('Freezing temperatures will affect ball handling and passing accuracy');
  }
  
  if (weather.windSpeed > 15) {
    notes.push('High winds will significantly impact passing game and field goal attempts');
  }
  
  if (weather.precipitation > 0.3) {
    notes.push('Heavy precipitation increases fumble risk and reduces offensive efficiency');
  }
  
  if (game.elevation > 4000) {
    notes.push('High altitude may help kickers but could affect player endurance');
  }
  
  if (weather.condition === 'fog') {
    notes.push('Low visibility may impact deep passing and overall offensive rhythm');
  }
  
  return notes;
}

async function getAffectedPlayers(game: any, impact: any, teamFilter?: string) {
  try {
    const teams = teamFilter ? [teamFilter] : [game.homeTeam, game.awayTeam];
    
    const players = await prisma.player.findMany({
      where: {
        nflTeam: { in: teams },
        isActive: true,
        isFantasyRelevant: true
      },
      include: {
        stats: {
          orderBy: { week: 'desc' },
          take: 3,
          where: { season: '2025' }
        },
        playerProjections: {
          orderBy: { week: 'desc' },
          take: 1,
          where: { season: 2025 }
        }
      },
      orderBy: [
        { position: 'asc' },
        { adp: 'asc' }
      ]
    });

    return players.map(player => {
      const positionImpact = getPositionWeatherImpact(player.position, impact);
      const projection = player.playerProjections[0];
      const recentAvg = player.stats.length > 0 
        ? player.stats.reduce((sum, stat) => sum + (stat.fantasyPoints || 0), 0) / player.stats.length
        : 0;

      return {
        id: player.id,
        name: player.name,
        position: player.position,
        team: player.nflTeam,
        
        weatherImpact: {
          severity: positionImpact.severity,
          projectedChange: positionImpact.projectedChange,
          recommendation: positionImpact.recommendation,
          confidence: impact.confidence
        },
        
        projectedPoints: projection ? 
          Math.max(0, projection.points + positionImpact.projectedChange) : 
          Math.max(0, recentAvg + positionImpact.projectedChange),
          
        baseline: projection?.points || recentAvg,
        adp: player.adp,
        rank: player.rank
      };
    });
  } catch (error) {
    console.error('Error getting affected players:', error);
    return [];
  }
}

function getPositionWeatherImpact(position: string, impact: any) {
  const impacts: { [key: string]: any } = {
    'QB': {
      severity: impact.passing < -1 ? 'high' : impact.passing < -0.5 ? 'medium' : 'low',
      projectedChange: impact.passing * 4, // QBs more affected by weather
      recommendation: impact.passing < -1 ? 'avoid' : impact.passing < -0.5 ? 'risky' : 'start'
    },
    'RB': {
      severity: Math.abs(impact.rushing) > 1 ? 'medium' : 'low',
      projectedChange: impact.rushing * 2,
      recommendation: impact.rushing > 0.5 ? 'favorable' : impact.rushing < -0.5 ? 'risky' : 'neutral'
    },
    'WR': {
      severity: impact.passing < -1 ? 'high' : impact.passing < -0.5 ? 'medium' : 'low',
      projectedChange: impact.passing * 3,
      recommendation: impact.passing < -1 ? 'avoid' : impact.passing < -0.5 ? 'risky' : 'start'
    },
    'TE': {
      severity: impact.passing < -1 ? 'medium' : 'low',
      projectedChange: impact.passing * 2.5,
      recommendation: impact.passing < -1 ? 'risky' : 'neutral'
    },
    'K': {
      severity: impact.kicking < -2 ? 'high' : impact.kicking < -1 ? 'medium' : 'low',
      projectedChange: impact.kicking * 2,
      recommendation: impact.kicking < -2 ? 'avoid' : impact.kicking < -1 ? 'risky' : 'start'
    },
    'DEF': {
      severity: impact.defense > 1 ? 'favorable' : 'neutral',
      projectedChange: impact.defense * 1.5,
      recommendation: impact.defense > 1 ? 'start' : 'neutral'
    }
  };
  
  return impacts[position] || impacts['WR'];
}

function generateWeatherSummary(weatherImpacts: any[]) {
  const highImpactGames = weatherImpacts.filter(w => w.impact.severity === 'high');
  const avgTemperature = weatherImpacts.reduce((sum, w) => sum + w.weather.temperature, 0) / weatherImpacts.length;
  const avgWindSpeed = weatherImpacts.reduce((sum, w) => sum + w.weather.windSpeed, 0) / weatherImpacts.length;
  
  return {
    totalGames: weatherImpacts.length,
    highImpactGames: highImpactGames.length,
    averageTemperature: Math.round(avgTemperature),
    averageWindSpeed: Math.round(avgWindSpeed * 10) / 10,
    worstConditions: highImpactGames.map(game => ({
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      stadium: game.stadium,
      severity: game.impact.severity,
      primaryConcern: getPrimaryConcern(game.impact)
    })),
    overallAdvice: generateOverallAdvice(weatherImpacts)
  };
}

function getPrimaryConcern(impact: any): string {
  if (impact.kicking < -2) return 'Kicking conditions extremely poor';
  if (impact.passing < -2) return 'Passing game severely affected';
  if (impact.defense > 2) return 'Defense heavily favored';
  if (impact.rushing > 1) return 'Ground game favored';
  return 'Moderate weather impact expected';
}

function generateOverallAdvice(weatherImpacts: any[]): string[] {
  const advice = [];
  const highImpactCount = weatherImpacts.filter(w => w.impact.severity === 'high').length;
  
  if (highImpactCount > 0) {
    advice.push(`${highImpactCount} games have significant weather concerns this week`);
  }
  
  const coldGames = weatherImpacts.filter(w => w.weather.temperature < 32).length;
  if (coldGames > 0) {
    advice.push(`${coldGames} games in freezing temperatures - favor running backs and defenses`);
  }
  
  const windyGames = weatherImpacts.filter(w => w.weather.windSpeed > 15).length;
  if (windyGames > 0) {
    advice.push(`${windyGames} games with high winds - avoid kickers and deep passing games`);
  }
  
  if (advice.length === 0) {
    advice.push('Weather conditions are generally favorable for fantasy football this week');
  }
  
  return advice;
}

async function getHistoricalWeatherPerformance(week: number, season: string) {
  // This would analyze historical performance in similar weather conditions
  // For now, return mock historical trends
  return [
    {
      condition: 'Snow games',
      averagePassingYards: -45,
      averageRushingYards: +12,
      defensePointsBonus: +2.3,
      kickerAccuracy: -15
    },
    {
      condition: 'High wind (15+ mph)',
      averagePassingYards: -38,
      averageRushingYards: +8,
      defensePointsBonus: +1.8,
      kickerAccuracy: -25
    },
    {
      condition: 'Cold weather (under 32°F)',
      averagePassingYards: -22,
      averageRushingYards: +5,
      defensePointsBonus: +1.2,
      kickerAccuracy: -12
    }
  ];
}

async function updateGameWeather(gameId: string, weatherData: any): Promise<boolean> {
  try {
    // This would update a game_weather table or cache
    // For now, just log the update
    console.log(`Weather updated for game ${gameId}:`, weatherData);
    return true;
  } catch (error) {
    console.error('Error updating game weather:', error);
    return false;
  }
}

async function fetchLatestWeather(stadium: string, gameTime: Date) {
  // This would call a weather API
  // For now, return mock data
  return {
    temperature: 45,
    condition: 'partly_cloudy',
    windSpeed: 8,
    windDirection: 'SW',
    precipitation: 0,
    humidity: 65,
    visibility: 10
  };
}