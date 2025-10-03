/**
 * Weather Service
 * Provides weather data for player performance predictions
 */

interface WeatherData {
  temperature: number
  windSpeed: number
  precipitation: number
  conditions: 'clear' | 'rain' | 'snow' | 'wind' | 'dome'
  impact: number // -1 to 1, negative is bad for performance
}

interface GameWeather {
  gameId: string
  stadium: string
  isDome: boolean
  weather: WeatherData
}

export class WeatherService {
  private cache: Map<string, { data: WeatherData; timestamp: number }> = new Map()
  private readonly CACHE_TTL = 3600000 // 1 hour

  /**
   * Get weather impact for a player's game
   */
  async getWeatherImpact(
    nflTeam: string,
    week: number,
    season: number
  ): Promise<number> {
    const cacheKey = `${nflTeam}-${week}-${season}`
    const cached = this.cache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data.impact
    }

    // Get weather data
    const weather = await this.fetchWeatherData(nflTeam, week, season)
    
    // Cache the result
    this.cache.set(cacheKey, {
      data: weather,
      timestamp: Date.now()
    })

    return weather.impact
  }

  /**
   * Fetch weather data for a team's game
   */
  private async fetchWeatherData(
    nflTeam: string,
    week: number,
    season: number
  ): Promise<WeatherData> {
    // Check if team plays in a dome
    const domeTeams = ['ATL', 'DET', 'NO', 'MIN', 'LV', 'LAR', 'ARI', 'IND']
    
    if (domeTeams.includes(nflTeam)) {
      return {
        temperature: 72,
        windSpeed: 0,
        precipitation: 0,
        conditions: 'dome',
        impact: 0 // No weather impact in dome
      }
    }

    // In production, this would call a weather API
    // For now, return simulated data based on team location and time of year
    return this.simulateWeather(nflTeam, week, season)
  }

  /**
   * Simulate weather based on team location and week
   */
  private simulateWeather(
    nflTeam: string,
    week: number,
    season: number
  ): WeatherData {
    // Cold weather teams
    const coldWeatherTeams = ['GB', 'BUF', 'CHI', 'CLE', 'DEN', 'NE', 'NYG', 'NYJ', 'PHI', 'PIT']
    
    // Calculate weather impact based on week (later in season = colder)
    const isColdWeatherTeam = coldWeatherTeams.includes(nflTeam)
    const isLateSeasonWeek = week >= 13
    
    let temperature = 65
    let windSpeed = 5
    let precipitation = 0
    let conditions: WeatherData['conditions'] = 'clear'
    let impact = 0

    if (isColdWeatherTeam && isLateSeasonWeek) {
      // Cold weather conditions
      temperature = 30 + Math.random() * 20 // 30-50°F
      windSpeed = 10 + Math.random() * 15 // 10-25 mph
      precipitation = Math.random() * 0.5 // 0-50% chance
      
      if (temperature < 35 && precipitation > 0.3) {
        conditions = 'snow'
        impact = -0.15 // Negative impact on passing
      } else if (windSpeed > 20) {
        conditions = 'wind'
        impact = -0.10 // Negative impact on passing
      } else if (precipitation > 0.3) {
        conditions = 'rain'
        impact = -0.08 // Slight negative impact
      }
    } else {
      // Normal conditions
      temperature = 55 + Math.random() * 25 // 55-80°F
      windSpeed = 5 + Math.random() * 10 // 5-15 mph
      precipitation = Math.random() * 0.3 // 0-30% chance
      
      if (precipitation > 0.2) {
        conditions = 'rain'
        impact = -0.05
      }
    }

    return {
      temperature: Math.round(temperature),
      windSpeed: Math.round(windSpeed),
      precipitation: Math.round(precipitation * 100) / 100,
      conditions,
      impact: Math.round(impact * 100) / 100
    }
  }

  /**
   * Get position-specific weather impact
   */
  getPositionWeatherImpact(
    position: string,
    weather: WeatherData
  ): number {
    // QBs and WRs are more affected by wind and precipitation
    if (position === 'QB' || position === 'WR') {
      return weather.impact * 1.5
    }
    
    // RBs are less affected
    if (position === 'RB') {
      return weather.impact * 0.5
    }
    
    // TEs moderately affected
    if (position === 'TE') {
      return weather.impact * 0.8
    }
    
    // Kickers heavily affected by wind
    if (position === 'K') {
      return weather.impact * 2.0
    }
    
    return weather.impact
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
  }
}

// Export singleton instance
export const weatherService = new WeatherService()
