import axios from 'axios';

const SLEEPER_BASE_URL = 'https://api.sleeper.app/v1';
const CURRENT_SEASON = '2025';

interface SleeperProjection {
  pts_ppr?: number;
  pts_std?: number;
  pts_half_ppr?: number;
  passing_yds?: number;
  passing_tds?: number;
  rushing_yds?: number;
  rushing_tds?: number;
  receiving_yds?: number;
  receiving_tds?: number;
  receptions?: number;
}

/**
 * Get the current NFL week
 */
export async function getCurrentNFLWeek(): Promise<number> {
  try {
    const response = await axios.get(`${SLEEPER_BASE_URL}/state/nfl`);
    return response.data.week || 1;
  } catch (error) {
    console.error('Error fetching current week:', error);
    // Default to week 1 if API fails
    return 1;
  }
}

/**
 * Get projections for a specific player
 */
export async function getPlayerProjection(
  sleeperId: string,
  week?: number,
  scoringType: 'PPR' | 'STANDARD' | 'HALF_PPR' = 'PPR'
): Promise<number> {
  try {
    const currentWeek = week || await getCurrentNFLWeek();
    const response = await axios.get(
      `${SLEEPER_BASE_URL}/projections/nfl/regular/${CURRENT_SEASON}/${currentWeek}?players[]=${sleeperId}`
    );
    
    const projection = response.data[sleeperId] as SleeperProjection;
    
    if (!projection) {
      // No projection available, return conservative estimate
      return 8.0;
    }
    
    switch (scoringType) {
      case 'PPR':
        return projection.pts_ppr || 0;
      case 'STANDARD':
        return projection.pts_std || 0;
      case 'HALF_PPR':
        return projection.pts_half_ppr || 0;
      default:
        return projection.pts_ppr || 0;
    }
  } catch (error) {
    console.error(`Error fetching projection for player ${sleeperId}:`, error);
    // Return a conservative default projection on error
    return 8.0;
  }
}

/**
 * Get projections for multiple players
 */
export async function getBulkProjections(
  sleeperIds: string[],
  week?: number,
  scoringType: 'PPR' | 'STANDARD' | 'HALF_PPR' = 'PPR'
): Promise<Map<string, number>> {
  try {
    const currentWeek = week || await getCurrentNFLWeek();
    const projections = new Map<string, number>();
    
    // Sleeper API allows fetching all projections at once
    const response = await axios.get(
      `${SLEEPER_BASE_URL}/projections/nfl/regular/${CURRENT_SEASON}/${currentWeek}`
    );
    
    for (const sleeperId of sleeperIds) {
      const projection = response.data[sleeperId] as SleeperProjection;
      
      if (projection) {
        let points = 0;
        switch (scoringType) {
          case 'PPR':
            points = projection.pts_ppr || 0;
            break;
          case 'STANDARD':
            points = projection.pts_std || 0;
            break;
          case 'HALF_PPR':
            points = projection.pts_half_ppr || 0;
            break;
        }
        projections.set(sleeperId, points);
      } else {
        // Default projection if not found
        projections.set(sleeperId, 8.0);
      }
    }
    
    return projections;
  } catch (error) {
    console.error('Error fetching bulk projections:', error);
    // Return default projections on error
    const defaultProjections = new Map<string, number>();
    sleeperIds.forEach(id => defaultProjections.set(id, 8.0));
    return defaultProjections;
  }
}

/**
 * Get weather-adjusted projection
 */
export async function getWeatherAdjustedProjection(
  sleeperId: string,
  gameWeather?: { windSpeed?: number; precipitation?: number; isDome?: boolean },
  week?: number
): Promise<number> {
  const baseProjection = await getPlayerProjection(sleeperId, week);
  
  if (!gameWeather || gameWeather.isDome) {
    return baseProjection;
  }
  
  let weatherMultiplier = 1.0;
  
  // High wind affects passing game
  if (gameWeather.windSpeed && gameWeather.windSpeed > 20) {
    weatherMultiplier -= 0.10; // -10% for high wind
  }
  
  // Heavy precipitation affects all players
  if (gameWeather.precipitation && gameWeather.precipitation > 0.5) {
    weatherMultiplier -= 0.15; // -15% for heavy rain/snow
  }
  
  return baseProjection * weatherMultiplier;
}

/**
 * Get matchup-adjusted projection
 */
export async function getMatchupAdjustedProjection(
  sleeperId: string,
  opponentDefenseRanking: number, // 1-32, where 1 is best defense
  week?: number
): Promise<number> {
  const baseProjection = await getPlayerProjection(sleeperId, week);
  
  // Adjust based on opponent defense ranking
  // Best defense (1) = -20%, Worst defense (32) = +20%
  const defenseMultiplier = 1.0 + ((32 - opponentDefenseRanking) / 31 * 0.4 - 0.2);
  
  return baseProjection * defenseMultiplier;
}

/**
 * Get injury-adjusted projection
 */
export async function getInjuryAdjustedProjection(
  sleeperId: string,
  injuryStatus?: 'QUESTIONABLE' | 'DOUBTFUL' | 'OUT' | 'HEALTHY',
  week?: number
): Promise<number> {
  if (injuryStatus === 'OUT') {
    return 0;
  }
  
  const baseProjection = await getPlayerProjection(sleeperId, week);
  
  switch (injuryStatus) {
    case 'DOUBTFUL':
      return baseProjection * 0.25; // 25% chance of playing
    case 'QUESTIONABLE':
      return baseProjection * 0.75; // 75% chance of playing
    default:
      return baseProjection;
  }
}

/**
 * Get comprehensive projection with all adjustments
 */
export async function getComprehensiveProjection(
  sleeperId: string,
  options?: {
    week?: number;
    weather?: { windSpeed?: number; precipitation?: number; isDome?: boolean };
    opponentDefenseRanking?: number;
    injuryStatus?: 'QUESTIONABLE' | 'DOUBTFUL' | 'OUT' | 'HEALTHY';
    scoringType?: 'PPR' | 'STANDARD' | 'HALF_PPR';
  }
): Promise<{
  baseProjection: number;
  adjustedProjection: number;
  confidence: number;
  factors: string[];
}> {
  const week = options?.week || await getCurrentNFLWeek();
  const baseProjection = await getPlayerProjection(sleeperId, week, options?.scoringType);
  
  let adjustedProjection = baseProjection;
  const factors: string[] = [];
  let confidence = 85; // Base confidence
  
  // Weather adjustment
  if (options?.weather && !options.weather.isDome) {
    if (options.weather.windSpeed && options.weather.windSpeed > 20) {
      adjustedProjection *= 0.9;
      factors.push('High wind (-10%)');
      confidence -= 5;
    }
    if (options.weather.precipitation && options.weather.precipitation > 0.5) {
      adjustedProjection *= 0.85;
      factors.push('Heavy precipitation (-15%)');
      confidence -= 10;
    }
  }
  
  // Matchup adjustment
  if (options?.opponentDefenseRanking) {
    const defenseMultiplier = 1.0 + ((32 - options.opponentDefenseRanking) / 31 * 0.4 - 0.2);
    adjustedProjection *= defenseMultiplier;
    
    if (options.opponentDefenseRanking <= 5) {
      factors.push('Elite defense matchup');
      confidence -= 10;
    } else if (options.opponentDefenseRanking >= 28) {
      factors.push('Favorable defense matchup');
      confidence += 5;
    }
  }
  
  // Injury adjustment
  if (options?.injuryStatus && options.injuryStatus !== 'HEALTHY') {
    switch (options.injuryStatus) {
      case 'OUT':
        adjustedProjection = 0;
        factors.push('Player ruled out');
        confidence = 100;
        break;
      case 'DOUBTFUL':
        adjustedProjection *= 0.25;
        factors.push('Doubtful to play (-75%)');
        confidence = 40;
        break;
      case 'QUESTIONABLE':
        adjustedProjection *= 0.75;
        factors.push('Questionable (-25%)');
        confidence -= 15;
        break;
    }
  }
  
  return {
    baseProjection,
    adjustedProjection,
    confidence: Math.max(0, Math.min(100, confidence)),
    factors
  };
}