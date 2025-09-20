import axios from 'axios';

// NFL Stadium locations for weather data
const NFL_STADIUMS = {
  // AFC East
  'BUF': { name: 'Highmark Stadium', lat: 42.7738, lon: -78.7870, isDome: false },
  'MIA': { name: 'Hard Rock Stadium', lat: 25.9580, lon: -80.2389, isDome: false },
  'NE': { name: 'Gillette Stadium', lat: 42.0909, lon: -71.2643, isDome: false },
  'NYJ': { name: 'MetLife Stadium', lat: 40.8135, lon: -74.0745, isDome: false },
  
  // AFC North
  'BAL': { name: 'M&T Bank Stadium', lat: 39.2780, lon: -76.6227, isDome: false },
  'CIN': { name: 'Paycor Stadium', lat: 39.0954, lon: -84.5160, isDome: false },
  'CLE': { name: 'Cleveland Browns Stadium', lat: 41.5061, lon: -81.6995, isDome: false },
  'PIT': { name: 'Acrisure Stadium', lat: 40.4468, lon: -80.0158, isDome: false },
  
  // AFC South
  'HOU': { name: 'NRG Stadium', lat: 29.6847, lon: -95.4107, isDome: true },
  'IND': { name: 'Lucas Oil Stadium', lat: 39.7601, lon: -86.1639, isDome: true },
  'JAX': { name: 'TIAA Bank Field', lat: 30.3239, lon: -81.6373, isDome: false },
  'TEN': { name: 'Nissan Stadium', lat: 36.1665, lon: -86.7713, isDome: false },
  
  // AFC West
  'DEN': { name: 'Empower Field', lat: 39.7439, lon: -105.0202, isDome: false },
  'KC': { name: 'Arrowhead Stadium', lat: 39.0489, lon: -94.4839, isDome: false },
  'LV': { name: 'Allegiant Stadium', lat: 36.0909, lon: -115.1833, isDome: true },
  'LAC': { name: 'SoFi Stadium', lat: 33.9535, lon: -118.3392, isDome: true },
  
  // NFC East
  'DAL': { name: 'AT&T Stadium', lat: 32.7473, lon: -97.0945, isDome: true },
  'NYG': { name: 'MetLife Stadium', lat: 40.8135, lon: -74.0745, isDome: false },
  'PHI': { name: 'Lincoln Financial Field', lat: 39.9008, lon: -75.1675, isDome: false },
  'WAS': { name: 'FedExField', lat: 38.9076, lon: -76.8645, isDome: false },
  
  // NFC North
  'CHI': { name: 'Soldier Field', lat: 41.8623, lon: -87.6167, isDome: false },
  'DET': { name: 'Ford Field', lat: 42.3400, lon: -83.0456, isDome: true },
  'GB': { name: 'Lambeau Field', lat: 44.5013, lon: -88.0622, isDome: false },
  'MIN': { name: 'U.S. Bank Stadium', lat: 44.9738, lon: -93.2575, isDome: true },
  
  // NFC South
  'ATL': { name: 'Mercedes-Benz Stadium', lat: 33.7553, lon: -84.4006, isDome: true },
  'CAR': { name: 'Bank of America Stadium', lat: 35.2258, lon: -80.8528, isDome: false },
  'NO': { name: 'Caesars Superdome', lat: 29.9511, lon: -90.0812, isDome: true },
  'TB': { name: 'Raymond James Stadium', lat: 27.9759, lon: -82.5033, isDome: false },
  
  // NFC West
  'ARI': { name: 'State Farm Stadium', lat: 33.5276, lon: -112.2626, isDome: true },
  'LA': { name: 'SoFi Stadium', lat: 33.9535, lon: -118.3392, isDome: true },
  'SF': { name: "Levi's Stadium", lat: 37.4032, lon: -121.9698, isDome: false },
  'SEA': { name: 'Lumen Field', lat: 47.5952, lon: -122.3316, isDome: false }
};

interface WeatherData {
  temperature: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  humidity: number;
  conditions: string;
  description: string;
  isDome: boolean;
  impact: number;
}

interface OpenWeatherResponse {
  main: {
    temp: number;
    humidity: number;
  };
  wind: {
    speed: number;
    deg: number;
  };
  weather: Array<{
    main: string;
    description: string;
  }>;
  rain?: {
    '1h'?: number;
    '3h'?: number;
  };
  snow?: {
    '1h'?: number;
    '3h'?: number;
  };
}

/**
 * Get weather data for a specific NFL team's stadium
 */
export async function getStadiumWeather(teamCode: string): Promise<WeatherData> {
  const stadium = NFL_STADIUMS[teamCode as keyof typeof NFL_STADIUMS];
  
  if (!stadium) {
    console.error(`Stadium not found for team: ${teamCode}`);
    return getDefaultWeather();
  }
  
  // If it's a dome, return perfect conditions
  if (stadium.isDome) {
    return {
      temperature: 72,
      windSpeed: 0,
      windDirection: 0,
      precipitation: 0,
      humidity: 50,
      conditions: 'Dome',
      description: 'Climate controlled dome',
      isDome: true,
      impact: 1.0
    };
  }
  
  try {
    // Check if we have an API key
    const apiKey = process.env.OPENWEATHER_API_KEY;
    
    if (!apiKey) {
      console.warn('OpenWeather API key not configured, using simulated weather');
      return getSimulatedWeather(stadium);
    }
    
    // Fetch real weather data from OpenWeatherMap
    const response = await axios.get<OpenWeatherResponse>(
      `https://api.openweathermap.org/data/2.5/weather`,
      {
        params: {
          lat: stadium.lat,
          lon: stadium.lon,
          appid: apiKey,
          units: 'imperial' // Get temperature in Fahrenheit
        }
      }
    );
    
    const weather = response.data;
    
    // Calculate precipitation amount
    const precipitation = 
      (weather.rain?.['1h'] || 0) + 
      (weather.snow?.['1h'] || 0);
    
    // Calculate weather impact on fantasy scoring
    const impact = calculateWeatherImpact({
      temperature: weather.main.temp,
      windSpeed: weather.wind.speed,
      precipitation,
      conditions: weather.weather[0]?.main || 'Clear'
    });
    
    return {
      temperature: Math.round(weather.main.temp),
      windSpeed: Math.round(weather.wind.speed),
      windDirection: weather.wind.deg,
      precipitation,
      humidity: weather.main.humidity,
      conditions: weather.weather[0]?.main || 'Unknown',
      description: weather.weather[0]?.description || 'No description',
      isDome: false,
      impact
    };
    
  } catch (error) {
    console.error('Error fetching weather data:', error);
    // Fallback to simulated weather
    return getSimulatedWeather(stadium);
  }
}

/**
 * Calculate the impact of weather on fantasy scoring
 * Returns a multiplier between 0.5 and 1.0
 */
function calculateWeatherImpact(conditions: {
  temperature: number;
  windSpeed: number;
  precipitation: number;
  conditions: string;
}): number {
  let impact = 1.0;
  
  // Temperature impact
  if (conditions.temperature < 32) {
    impact -= 0.10; // Cold weather -10%
  } else if (conditions.temperature < 20) {
    impact -= 0.15; // Very cold -15%
  } else if (conditions.temperature > 90) {
    impact -= 0.05; // Very hot -5%
  }
  
  // Wind impact (mainly affects passing game)
  if (conditions.windSpeed > 20) {
    impact -= 0.15; // High wind -15%
  } else if (conditions.windSpeed > 15) {
    impact -= 0.10; // Moderate wind -10%
  } else if (conditions.windSpeed > 10) {
    impact -= 0.05; // Light wind -5%
  }
  
  // Precipitation impact
  if (conditions.precipitation > 0.5) {
    impact -= 0.15; // Heavy rain/snow -15%
  } else if (conditions.precipitation > 0.1) {
    impact -= 0.10; // Moderate rain/snow -10%
  } else if (conditions.precipitation > 0) {
    impact -= 0.05; // Light rain/snow -5%
  }
  
  // Severe weather conditions
  if (conditions.conditions === 'Thunderstorm') {
    impact -= 0.20; // Thunderstorm -20%
  } else if (conditions.conditions === 'Snow') {
    impact -= 0.15; // Snow -15%
  } else if (conditions.conditions === 'Rain') {
    impact -= 0.10; // Rain -10%
  }
  
  // Ensure impact doesn't go below 0.5
  return Math.max(0.5, impact);
}

/**
 * Get simulated weather when API is not available
 */
function getSimulatedWeather(stadium: { lat: number; lon: number; isDome: boolean }): WeatherData {
  // Generate somewhat realistic weather based on latitude
  const isNorthern = stadium.lat > 40;
  const baseTemp = isNorthern ? 45 : 75;
  const tempVariation = Math.random() * 30 - 15;
  
  const temperature = baseTemp + tempVariation;
  const windSpeed = Math.random() * 15;
  const precipitation = Math.random() < 0.2 ? Math.random() * 0.5 : 0;
  
  const conditions = precipitation > 0 ? 'Rain' : windSpeed > 10 ? 'Windy' : 'Clear';
  
  return {
    temperature: Math.round(temperature),
    windSpeed: Math.round(windSpeed),
    windDirection: Math.round(Math.random() * 360),
    precipitation,
    humidity: Math.round(50 + Math.random() * 40),
    conditions,
    description: `Simulated ${conditions.toLowerCase()} conditions`,
    isDome: false,
    impact: calculateWeatherImpact({
      temperature,
      windSpeed,
      precipitation,
      conditions
    })
  };
}

/**
 * Get default weather when no data is available
 */
function getDefaultWeather(): WeatherData {
  return {
    temperature: 72,
    windSpeed: 5,
    windDirection: 180,
    precipitation: 0,
    humidity: 60,
    conditions: 'Clear',
    description: 'Default weather conditions',
    isDome: false,
    impact: 1.0
  };
}

/**
 * Get weather for multiple teams
 */
export async function getBulkWeather(teamCodes: string[]): Promise<Map<string, WeatherData>> {
  const weatherMap = new Map<string, WeatherData>();
  
  // Process in parallel but limit concurrency to avoid rate limiting
  const chunks = [];
  for (let i = 0; i < teamCodes.length; i += 5) {
    chunks.push(teamCodes.slice(i, i + 5));
  }
  
  for (const chunk of chunks) {
    const weatherPromises = chunk.map(async (teamCode) => {
      const weather = await getStadiumWeather(teamCode);
      return { teamCode, weather };
    });
    
    const results = await Promise.all(weatherPromises);
    results.forEach(({ teamCode, weather }) => {
      weatherMap.set(teamCode, weather);
    });
    
    // Small delay between chunks to avoid rate limiting
    if (chunks.indexOf(chunk) < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return weatherMap;
}

/**
 * Get weather impact description for UI
 */
export function getWeatherImpactDescription(impact: number): {
  level: 'excellent' | 'good' | 'moderate' | 'poor' | 'terrible';
  color: string;
  description: string;
} {
  if (impact >= 0.95) {
    return {
      level: 'excellent',
      color: 'green',
      description: 'Perfect conditions for fantasy scoring'
    };
  } else if (impact >= 0.85) {
    return {
      level: 'good',
      color: 'blue',
      description: 'Good conditions, minimal impact'
    };
  } else if (impact >= 0.75) {
    return {
      level: 'moderate',
      color: 'yellow',
      description: 'Moderate weather impact expected'
    };
  } else if (impact >= 0.65) {
    return {
      level: 'poor',
      color: 'orange',
      description: 'Poor conditions, significant impact'
    };
  } else {
    return {
      level: 'terrible',
      color: 'red',
      description: 'Severe weather, major scoring impact'
    };
  }
}