/**
 * Load Testing Script for AstralField
 * Tests concurrent user scenarios, API performance, and WebSocket scaling
 */

import http from 'k6/http';
import ws from 'k6/ws';
import { check, group, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const draftPicksCounter = new Counter('draft_picks_total');
const draftPicksFailureRate = new Rate('draft_picks_failures');
const draftPickDuration = new Trend('draft_pick_duration');
const websocketConnectionRate = new Rate('websocket_connection_failures');

// Test configuration
export const options = {
  scenarios: {
    // Concurrent draft room users
    draft_room_load: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '1m', target: 100 },
        { duration: '2m', target: 100 },
        { duration: '30s', target: 0 },
      ],
      exec: 'draftRoomLoad',
      tags: { test_type: 'draft_room' },
    },
    
    // API stress testing
    api_stress_test: {
      executor: 'ramping-arrival-rate',
      startRate: 50,
      timeUnit: '1s',
      preAllocatedVUs: 20,
      maxVUs: 200,
      stages: [
        { duration: '1m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '1m', target: 100 },
        { duration: '30s', target: 0 },
      ],
      exec: 'apiStressTest',
      tags: { test_type: 'api_stress' },
    },

    // WebSocket connections
    websocket_load: {
      executor: 'constant-vus',
      vus: 50,
      duration: '3m',
      exec: 'websocketLoad',
      tags: { test_type: 'websocket' },
    },

    // Database performance
    database_load: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '30s', target: 25 },
        { duration: '1m', target: 50 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 0 },
      ],
      exec: 'databaseLoad',
      tags: { test_type: 'database' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    http_req_failed: ['rate<0.1'],      // Less than 10% failure rate
    draft_picks_failures: ['rate<0.05'], // Less than 5% draft pick failures
    websocket_connection_failures: ['rate<0.02'], // Less than 2% WebSocket failures
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const WS_URL = __ENV.WS_URL || 'ws://localhost:3000';

// Test data
const TEST_USERS = [
  { email: 'testuser1@example.com', password: 'Dynasty2025' },
  { email: 'testuser2@example.com', password: 'Dynasty2025' },
  { email: 'testuser3@example.com', password: 'Dynasty2025' },
  { email: 'testuser4@example.com', password: 'Dynasty2025' },
  { email: 'testuser5@example.com', password: 'Dynasty2025' },
];

let TEST_LEAGUE_ID = 'cmfy5ltrp000v1xpso7ux8a9v'; // Using test league
let TEST_DRAFT_ID = null;
let authTokens = {};

// Setup function to create test data
export function setup() {
  console.log('Setting up load test data...');
  
  // Get auth tokens for test users
  TEST_USERS.forEach((user, index) => {
    const response = http.post(`${BASE_URL}/api/auth/login`, {
      email: user.email,
      password: user.password,
    });
    
    if (response.status === 200) {
      const data = response.json();
      authTokens[`user${index}`] = data.token;
    }
  });

  // Create a test draft for load testing
  const createDraftResponse = http.post(`${BASE_URL}/api/draft`, {
    leagueId: TEST_LEAGUE_ID,
    type: 'SNAKE',
    roundTimeLimit: 90,
    scheduledFor: new Date(Date.now() + 60000).toISOString(), // 1 minute from now
  }, {
    headers: { 'Authorization': `Bearer ${authTokens.user0}` }
  });

  if (createDraftResponse.status === 201) {
    const draftData = createDraftResponse.json();
    TEST_DRAFT_ID = draftData.draft.id;
  }

  return {
    authTokens,
    testDraftId: TEST_DRAFT_ID,
    testLeagueId: TEST_LEAGUE_ID,
  };
}

// Cleanup function
export function teardown(data) {
  console.log('Cleaning up load test data...');
  
  if (data.testDraftId) {
    http.del(`${BASE_URL}/api/draft/${data.testDraftId}`, null, {
      headers: { 'Authorization': `Bearer ${data.authTokens.user0}` }
    });
  }
}

/**
 * Draft Room Load Testing
 * Simulates multiple users in a draft room
 */
export function draftRoomLoad(data) {
  const userIndex = Math.floor(Math.random() * TEST_USERS.length);
  const authToken = data.authTokens[`user${userIndex}`];
  
  if (!authToken) {
    console.error('No auth token available for user');
    return;
  }

  group('Draft Room Load Test', () => {
    // Join draft room
    const joinResponse = http.get(`${BASE_URL}/api/draft/${data.testDraftId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    check(joinResponse, {
      'Draft room loads successfully': (r) => r.status === 200,
      'Response time < 1s': (r) => r.timings.duration < 1000,
    });

    if (joinResponse.status !== 200) {
      return;
    }

    // Get available players
    const playersResponse = http.get(
      `${BASE_URL}/api/draft/${data.testDraftId}/available-players?limit=50`,
      { headers: { 'Authorization': `Bearer ${authToken}` } }
    );

    check(playersResponse, {
      'Players load successfully': (r) => r.status === 200,
      'Players response time < 500ms': (r) => r.timings.duration < 500,
    });

    // Simulate user activity in draft room
    sleep(1);

    // Get draft board
    const boardResponse = http.get(`${BASE_URL}/api/draft/${data.testDraftId}/board`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    check(boardResponse, {
      'Draft board loads': (r) => r.status === 200,
    });

    // Simulate making a draft pick (if it's user's turn)
    const pickResponse = http.post(`${BASE_URL}/api/draft/${data.testDraftId}/make-pick`, {
      playerId: 'test-player-id',
    }, {
      headers: { 
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      }
    });

    // Track draft pick metrics
    draftPicksCounter.add(1);
    draftPickDuration.add(pickResponse.timings.duration);
    
    if (pickResponse.status >= 400) {
      draftPicksFailureRate.add(1);
    } else {
      draftPicksFailureRate.add(0);
    }

    sleep(2);
  });
}

/**
 * API Stress Testing
 * Tests critical API endpoints under heavy load
 */
export function apiStressTest(data) {
  const userIndex = Math.floor(Math.random() * TEST_USERS.length);
  const authToken = data.authTokens[`user${userIndex}`];

  group('API Stress Test', () => {
    const requests = [
      // Dashboard data
      {
        method: 'GET',
        url: `${BASE_URL}/api/dashboard`,
        name: 'Dashboard Load',
      },
      // League data
      {
        method: 'GET', 
        url: `${BASE_URL}/api/leagues/${data.testLeagueId}`,
        name: 'League Details',
      },
      // Team roster
      {
        method: 'GET',
        url: `${BASE_URL}/api/teams/roster`,
        name: 'Team Roster',
      },
      // Players search
      {
        method: 'GET',
        url: `${BASE_URL}/api/players?search=Josh&position=QB&limit=20`,
        name: 'Player Search',
      },
      // Live scoring
      {
        method: 'GET',
        url: `${BASE_URL}/api/scoring/live/${data.testLeagueId}/4`,
        name: 'Live Scoring',
      },
    ];

    requests.forEach(req => {
      const response = http.request(req.method, req.url, null, {
        headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {},
      });

      check(response, {
        [`${req.name} - Status 200`]: (r) => r.status === 200,
        [`${req.name} - Response time < 1s`]: (r) => r.timings.duration < 1000,
      }, { name: req.name });
    });

    sleep(0.1);
  });
}

/**
 * WebSocket Load Testing
 * Tests WebSocket connections and real-time messaging
 */
export function websocketLoad(data) {
  const userIndex = Math.floor(Math.random() * TEST_USERS.length);
  const authToken = data.authTokens[`user${userIndex}`];

  group('WebSocket Load Test', () => {
    const response = ws.connect(`${WS_URL}/api/socket`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    }, function (socket) {
      socket.on('open', () => {
        websocketConnectionRate.add(0);
        
        // Join draft room
        socket.send(JSON.stringify({
          type: 'draft:join',
          data: { draftId: data.testDraftId }
        }));

        // Send periodic chat messages
        let messageCount = 0;
        const chatInterval = setInterval(() => {
          if (messageCount < 5) {
            socket.send(JSON.stringify({
              type: 'draft:chat',
              data: { 
                draftId: data.testDraftId,
                message: `Load test message ${messageCount} from user ${userIndex}`
              }
            }));
            messageCount++;
          } else {
            clearInterval(chatInterval);
          }
        }, 3000);

        // Listen for messages
        socket.on('message', (data) => {
          try {
            const message = JSON.parse(data);
            console.log(`Received: ${message.type}`);
          } catch (e) {
            console.error('Failed to parse WebSocket message');
          }
        });

        // Keep connection alive for 2 minutes
        setTimeout(() => {
          socket.close();
        }, 120000);
      });

      socket.on('error', (e) => {
        websocketConnectionRate.add(1);
        console.error('WebSocket error:', e);
      });

      socket.on('close', () => {
        console.log('WebSocket connection closed');
      });
    });

    if (!response) {
      websocketConnectionRate.add(1);
    }
  });
}

/**
 * Database Load Testing
 * Tests database performance under concurrent operations
 */
export function databaseLoad(data) {
  const userIndex = Math.floor(Math.random() * TEST_USERS.length);
  const authToken = data.authTokens[`user${userIndex}`];

  group('Database Load Test', () => {
    // Complex queries that stress the database
    const dbRequests = [
      // League standings calculation
      {
        url: `${BASE_URL}/api/leagues/${data.testLeagueId}/standings`,
        name: 'League Standings',
      },
      // Player stats aggregation
      {
        url: `${BASE_URL}/api/players/stats/week/4`,
        name: 'Player Stats',
      },
      // Matchup history
      {
        url: `${BASE_URL}/api/matchups/history/${data.testLeagueId}`,
        name: 'Matchup History',
      },
      // Team transactions
      {
        url: `${BASE_URL}/api/teams/transactions`,
        name: 'Team Transactions',
      },
      // Waiver wire activity
      {
        url: `${BASE_URL}/api/waivers/activity/${data.testLeagueId}`,
        name: 'Waiver Activity',
      },
    ];

    dbRequests.forEach(req => {
      const response = http.get(req.url, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      check(response, {
        [`${req.name} - Success`]: (r) => r.status === 200,
        [`${req.name} - Fast Response`]: (r) => r.timings.duration < 2000,
      }, { name: req.name });
    });

    sleep(1);
  });
}

/**
 * Spike Testing Scenario
 * Simulates sudden traffic spikes
 */
export function spikeTest(data) {
  group('Spike Test', () => {
    // Simulate game day traffic spike
    const endpoints = [
      '/api/scoring/live',
      '/api/dashboard',
      '/api/leagues',
      '/api/players'
    ];

    const randomEndpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const response = http.get(`${BASE_URL}${randomEndpoint}`, {
      headers: { 'Authorization': `Bearer ${data.authTokens.user0}` }
    });

    check(response, {
      'Spike test response': (r) => r.status < 500,
      'Response under load': (r) => r.timings.duration < 5000,
    });
  });
}