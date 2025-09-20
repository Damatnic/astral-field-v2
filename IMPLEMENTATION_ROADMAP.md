# D'AMATO DYNASTY PLATFORM - IMPLEMENTATION ROADMAP
## From Mock to Production: Complete Action Plan

---

## ✅ FULLY IMPLEMENTED FEATURES (Keep As-Is)
- User Authentication with JWT/bcrypt
- Team Management System  
- League Commissioner Tools
- Chat System with Real-time Messaging
- Player Search and Database
- Basic Draft Functionality
- Sleeper API Integration Framework
- D'Amato Dynasty League Members (10 teams)

---

## ⚠️ PARTIALLY IMPLEMENTED (Needs Real Data)

### 1. AI Lineup Optimizer 
**Current**: Uses Math.random() for projections
**Files**: `/src/app/api/lineup/optimize/route.ts`, `/src/app/api/ai/optimize-lineup/route.ts`

**Fix Required**:
```typescript
// REPLACE line 58 in optimize/route.ts
// OLD:
const projection = Math.random() * 20 + 5;

// NEW:
const projection = await getSleeperProjections(player.sleeperId, week);
```

**Implementation**:
```bash
npm install @sleeper/api-client axios
```

```typescript
// services/projections.ts
import axios from 'axios';

export async function getSleeperProjections(playerId: string, week: number) {
  const response = await axios.get(
    `https://api.sleeper.app/v1/projections/nfl/regular/2025/${week}?players[]=${playerId}`
  );
  return response.data[playerId]?.pts_ppr || 0;
}

export async function getWeatherImpact(gameId: string) {
  const weather = await getWeatherData(gameId);
  // Wind > 20mph = -10%, Rain/Snow = -15%, Dome = 0%
  let impact = 1.0;
  if (weather.windSpeed > 20) impact -= 0.10;
  if (weather.precipitation > 0.5) impact -= 0.15;
  return impact;
}
```

### 2. Trade Intelligence Engine
**Current**: Returns mock analysis
**Files**: `/src/app/api/trades/[id]/analyze/route.ts`

**Fix Required**:
```typescript
// REPLACE mock analysis with real calculations
import { calculateTradeValue } from '@/services/dynasty-values';

export async function analyzeTrade(trade: Trade) {
  const team1Value = await calculateTeamValue(trade.team1Players);
  const team2Value = await calculateTeamValue(trade.team2Players);
  
  const fairness = Math.min(team1Value, team2Value) / Math.max(team1Value, team2Value);
  
  return {
    team1Value,
    team2Value,
    fairnessScore: fairness * 100,
    recommendation: fairness > 0.85 ? 'ACCEPT' : 'DECLINE',
    analysis: generateTradeAnalysis(trade, team1Value, team2Value)
  };
}
```

### 3. Live Scoring Engine
**Current**: WebSocket not initialized, falls back to mock
**Files**: `/src/app/api/socket/route.ts`, `/src/app/api/scoring/live/route.ts`

**Fix Required**:
```bash
npm install ws socket.io socket.io-client
```

```typescript
// lib/websocket.ts
import { Server } from 'socket.io';
import { createServer } from 'http';

let io: Server;

export function initWebSocket(httpServer: any) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL,
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('join-league', (leagueId) => {
      socket.join(`league-${leagueId}`);
    });
    
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
  
  // Poll Sleeper every 10 seconds during games
  setInterval(async () => {
    const liveScores = await fetchSleeperLiveScores();
    io.emit('score-update', liveScores);
  }, 10000);
}
```

---

## ❌ MISSING FEATURES - IMPLEMENTATION PLANS

### 1. Weather API Integration
**Priority**: CRITICAL
**Effort**: 2 hours

```bash
npm install openweather-api-node
```

```typescript
// services/weather.ts
import OpenWeatherAPI from 'openweather-api-node';

const weather = new OpenWeatherAPI({
  key: process.env.OPENWEATHER_API_KEY!,
  units: 'imperial'
});

export async function getGameWeather(stadium: Stadium) {
  if (stadium.isDome) return { impact: 1.0, conditions: 'dome' };
  
  const current = await weather.getCurrent({
    coordinates: {
      lat: stadium.latitude,
      lon: stadium.longitude
    }
  });
  
  return {
    temperature: current.weather.temp.cur,
    windSpeed: current.weather.wind.speed,
    precipitation: current.weather.rain?.['1h'] || 0,
    conditions: current.weather.description,
    impact: calculateWeatherImpact(current)
  };
}
```

**Environment Variables**:
```env
OPENWEATHER_API_KEY=your_api_key_here
```

### 2. Injury Prediction System (Real ML)
**Priority**: HIGH
**Effort**: 1 week

```bash
npm install @tensorflow/tfjs brain.js
```

```typescript
// services/ml/injury-predictor.ts
import * as tf from '@tensorflow/tfjs';

export class InjuryPredictor {
  private model: tf.LayersModel | null = null;
  
  async loadModel() {
    // Option 1: Use pre-trained model
    this.model = await tf.loadLayersModel('/models/injury/model.json');
    
    // Option 2: Train simple model with historical data
    const historicalData = await loadInjuryHistory();
    this.model = this.trainModel(historicalData);
  }
  
  private trainModel(data: InjuryData[]) {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [8], units: 16, activation: 'relu' }),
        tf.layers.dense({ units: 8, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' })
      ]
    });
    
    model.compile({
      optimizer: 'adam',
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });
    
    // Features: age, gamesPlayed, previousInjuries, position, snapCount, etc.
    const features = prepareFeatures(data);
    const labels = prepareLabels(data);
    
    model.fit(features, labels, {
      epochs: 50,
      batchSize: 32
    });
    
    return model;
  }
  
  async predictInjuryRisk(player: Player): Promise<number> {
    if (!this.model) await this.loadModel();
    
    const features = [
      player.age,
      player.gamesPlayed,
      player.injuryHistory.length,
      positionRiskMap[player.position],
      player.snapPercentage,
      player.touches,
      player.targetShare,
      player.yardsPerGame
    ];
    
    const prediction = this.model!.predict(tf.tensor2d([features])) as tf.Tensor;
    const risk = await prediction.data();
    return risk[0];
  }
}
```

### 3. Dynasty Asset Valuation
**Priority**: HIGH
**Effort**: 3 days

```typescript
// services/dynasty-values.ts
interface DynastyValue {
  currentValue: number;
  futureValue: number;
  peakAge: number;
  ageMultiplier: number;
}

export function calculateDynastyValue(player: Player): DynastyValue {
  const baseValue = getBaseValue(player); // from rankings/projections
  const ageMultiplier = getAgeMultiplier(player.age, player.position);
  const injuryDiscount = getInjuryDiscount(player.injuryHistory);
  const situationBonus = getSituationBonus(player.team);
  
  return {
    currentValue: baseValue * injuryDiscount,
    futureValue: baseValue * ageMultiplier * situationBonus,
    peakAge: POSITION_PEAK_AGE[player.position],
    ageMultiplier
  };
}

const POSITION_PEAK_AGE = {
  QB: 28,
  RB: 24,
  WR: 26,
  TE: 27
};

function getAgeMultiplier(age: number, position: string): number {
  const peak = POSITION_PEAK_AGE[position];
  const diff = Math.abs(age - peak);
  
  if (position === 'RB' && age > 27) {
    return Math.max(0.3, 1 - (diff * 0.15)); // Steep RB decline
  }
  
  return Math.max(0.5, 1 - (diff * 0.08)); // Gradual decline
}
```

### 4. Push Notifications
**Priority**: MEDIUM
**Effort**: 1 day

```bash
npm install web-push
```

```typescript
// services/notifications.ts
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:admin@damato-dynasty.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function sendPushNotification(
  subscription: PushSubscription,
  notification: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data?: any;
  }
) {
  await webpush.sendNotification(
    subscription,
    JSON.stringify(notification)
  );
}

// Register service worker in app
if ('serviceWorker' in navigator && 'PushManager' in window) {
  const registration = await navigator.serviceWorker.register('/sw.js');
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  });
  
  // Save subscription to database
  await saveSubscription(subscription);
}
```

### 5. PWA Service Worker
**Priority**: MEDIUM
**Effort**: 4 hours

```javascript
// public/sw.js
const CACHE_NAME = 'damato-dynasty-v1';
const urlsToCache = [
  '/',
  '/dashboard',
  '/teams',
  '/players',
  '/offline.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) return response;
        
        // Clone the request
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then((response) => {
          // Check valid response
          if (!response || response.status !== 200) {
            return response;
          }
          
          // Clone response for cache
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          
          return response;
        });
      })
      .catch(() => {
        // Offline fallback
        return caches.match('/offline.html');
      })
  );
});
```

---

## 🔧 MOCK DATA TO REPLACE

### Location #1: `/api/lineup/optimize/route.ts:58`
```typescript
// REMOVE:
const projection = Math.random() * 20 + 5;
const weatherImpact = 0.9 + Math.random() * 0.2;

// REPLACE WITH:
const projection = await sleeperService.getProjection(player.sleeperId, week);
const weather = await weatherService.getGameWeather(player.gameId);
const weatherImpact = weather.impact;
```

### Location #2: `/api/trades/[id]/analyze/route.ts:73`
```typescript
// REMOVE:
return NextResponse.json({
  success: true,
  analysis: {
    fairnessScore: 75,
    recommendation: "Mock trade analysis for testing"
  }
});

// REPLACE WITH:
const analysis = await dynastyService.analyzeTrade(trade);
return NextResponse.json({
  success: true,
  analysis
});
```

### Location #3: `/api/leagues/[id]/activity/route.ts:19`
```typescript
// REMOVE:
const mockActivities = [
  { type: 'trade', description: 'Mock trade completed', timestamp: new Date() },
  // ... more mock data
];

// REPLACE WITH:
const activities = await prisma.leagueActivity.findMany({
  where: { leagueId: params.id },
  orderBy: { createdAt: 'desc' },
  take: 50,
  include: {
    user: true,
    relatedUsers: true
  }
});
```

---

## 📋 PRIORITY IMPLEMENTATION SCHEDULE

### WEEK 1: Critical Data Integration (40 hours)
**Monday-Tuesday**:
- [ ] Integrate OpenWeather API (4 hours)
- [ ] Fix WebSocket initialization (4 hours)
- [ ] Replace all Math.random() with real projections (8 hours)

**Wednesday-Thursday**:
- [ ] Implement real trade analysis calculations (8 hours)
- [ ] Add dynasty value calculations (8 hours)

**Friday**:
- [ ] Testing and bug fixes (8 hours)

### WEEK 2: Core Features (40 hours)
**Monday-Tuesday**:
- [ ] Add PWA service worker (4 hours)
- [ ] Implement push notifications (8 hours)
- [ ] Create news API integration (4 hours)

**Wednesday-Thursday**:
- [ ] Build injury prediction model (16 hours)

**Friday**:
- [ ] FAAB UI improvements (4 hours)
- [ ] Testing (4 hours)

### WEEK 3: Advanced Features (40 hours)
**Monday-Tuesday**:
- [ ] Social sentiment analysis setup (8 hours)
- [ ] Performance monitoring implementation (8 hours)

**Wednesday-Thursday**:
- [ ] Two-factor authentication (8 hours)
- [ ] Cross-device sync (8 hours)

**Friday**:
- [ ] GraphQL layer setup (8 hours)

### WEEK 4: Polish & Launch Prep (40 hours)
**Monday-Tuesday**:
- [ ] Remove all TODO comments (4 hours)
- [ ] Production deployment setup (8 hours)
- [ ] Security audit (4 hours)

**Wednesday-Thursday**:
- [ ] Performance optimization (8 hours)
- [ ] Mobile app wrapper (if needed) (8 hours)

**Friday**:
- [ ] Final testing (4 hours)
- [ ] Documentation (4 hours)

---

## 🚀 IMMEDIATE SETUP COMMANDS

```bash
# Install all required packages
npm install \
  @sleeper/api-client \
  openweather-api-node \
  @tensorflow/tfjs \
  brain.js \
  socket.io \
  socket.io-client \
  web-push \
  axios \
  node-cron

# Create environment variables file
echo "OPENWEATHER_API_KEY=" >> .env.local
echo "NEWS_API_KEY=" >> .env.local
echo "VAPID_PUBLIC_KEY=" >> .env.local
echo "VAPID_PRIVATE_KEY=" >> .env.local
echo "TWITTER_BEARER_TOKEN=" >> .env.local

# Generate VAPID keys for push notifications
npx web-push generate-vapid-keys

# Create required directories
mkdir -p src/services/ml
mkdir -p src/services/weather
mkdir -p src/services/dynasty
mkdir -p public/models/injury

# Initialize WebSocket server
touch src/lib/websocket.ts
touch public/sw.js
touch public/offline.html
```

---

## 📝 CRITICAL CODE FIXES NEEDED

### Fix #1: WebSocket Initialization
```typescript
// src/app/api/socket/route.ts
import { initWebSocket } from '@/lib/websocket';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  if (!global.wsServer) {
    const httpServer = createServer();
    global.wsServer = initWebSocket(httpServer);
    httpServer.listen(3001);
  }
  
  return new Response('WebSocket server running on port 3001', {
    status: 200
  });
}
```

### Fix #2: Sleeper Live Scoring
```typescript
// services/sleeper/live-scores.ts
export async function fetchSleeperLiveScores() {
  const week = await getCurrentWeek();
  const response = await fetch(
    `https://api.sleeper.app/v1/stats/nfl/regular/2025/${week}`
  );
  
  const stats = await response.json();
  
  // Calculate fantasy points for each player
  const scores = {};
  for (const [playerId, playerStats] of Object.entries(stats)) {
    scores[playerId] = calculateFantasyPoints(playerStats, 'PPR');
  }
  
  return scores;
}
```

### Fix #3: Real ML Model Integration
```typescript
// api/injury/predict/route.ts
import { InjuryPredictor } from '@/services/ml/injury-predictor';

const predictor = new InjuryPredictor();

export async function POST(request: Request) {
  const { playerId } = await request.json();
  
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: { injuries: true }
  });
  
  if (!player) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  }
  
  // Use real ML model instead of random
  const risk = await predictor.predictInjuryRisk(player);
  
  return NextResponse.json({
    playerId,
    riskScore: risk,
    riskLevel: getRiskLevel(risk),
    factors: getInjuryFactors(player)
  });
}
```

---

## ⚠️ FEATURES TO REMOVE/DESCOPE

### Remove from Documentation:
1. **VR Draft Experience** - Not feasible for web
2. **AR Player Cards** - Limited browser support
3. **3D Stadium Visualization** - High effort, low value

### Simplify Claims:
- Change "AI-powered" to "Data-driven"
- Change "Machine Learning" to "Advanced Analytics"
- Change "Real-time" to "Live Updates" (where not truly real-time)

---

## ✅ DEFINITION OF DONE

A feature is considered COMPLETE when:
1. No mock data or Math.random() in production code
2. Real API integration verified with actual responses
3. Error handling for API failures
4. Loading states implemented
5. Data persisted to database
6. WebSocket updates working (where applicable)
7. Mobile responsive
8. No TODO comments
9. TypeScript types fully defined
10. Tested with real user accounts

---

## 🎯 SUCCESS METRICS

Track these metrics after implementation:
- API response times < 200ms
- WebSocket latency < 50ms  
- Lighthouse score > 90
- Zero mock data in production
- 100% real-time score accuracy
- Push notification delivery > 95%
- PWA installable on all devices
- Cross-browser compatibility

---

*This roadmap transforms the D'Amato Dynasty platform from a mock prototype to a production-ready fantasy football powerhouse.*