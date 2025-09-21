import { createSwaggerSpec } from 'next-swagger-doc';

const swaggerSpec = createSwaggerSpec({
  openapi: '3.0.0',
  info: {
    title: 'Fantasy Football Platform API',
    version: '2.0.0',
    description: `
# Fantasy Football Platform API

Production-ready API for managing fantasy football leagues, teams, and matchups.

## Features
- 🔐 Secure authentication with JWT
- 📊 Real-time scoring updates
- 🏈 Comprehensive league management
- 📱 Mobile-optimized endpoints
- ⚡ High-performance caching
- 🔄 WebSocket support for live updates

## Rate Limiting
- 100 requests per minute for authenticated users
- 20 requests per minute for unauthenticated users

## Authentication
All authenticated endpoints require a Bearer token in the Authorization header:
\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`
    `,
    contact: {
      name: 'API Support',
      email: 'api@fantasyfootball.app',
      url: 'https://fantasyfootball.app/support'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'https://api.fantasyfootball.app',
      description: 'Production Server'
    },
    {
      url: 'https://staging-api.fantasyfootball.app',
      description: 'Staging Server'
    },
    {
      url: 'http://localhost:3000',
      description: 'Development Server'
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      },
      ApiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key'
      }
    },
    schemas: {
      // User schemas
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          avatar: { type: 'string', format: 'uri' },
          role: { type: 'string', enum: ['USER', 'ADMIN', 'COMMISSIONER'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'email', 'name', 'role']
      },
      
      // Team schemas
      Team: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          ownerId: { type: 'string', format: 'uuid' },
          leagueId: { type: 'string', format: 'uuid' },
          wins: { type: 'integer', minimum: 0 },
          losses: { type: 'integer', minimum: 0 },
          ties: { type: 'integer', minimum: 0 },
          pointsFor: { type: 'number' },
          pointsAgainst: { type: 'number' },
          roster: { 
            type: 'array',
            items: { $ref: '#/components/schemas/Player' }
          }
        }
      },
      
      // Player schemas
      Player: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          position: { type: 'string', enum: ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'] },
          team: { type: 'string' },
          status: { type: 'string', enum: ['ACTIVE', 'INJURED', 'BYE', 'SUSPENDED'] },
          projectedPoints: { type: 'number' },
          actualPoints: { type: 'number' },
          stats: { type: 'object' }
        }
      },
      
      // Matchup schemas
      Matchup: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          week: { type: 'integer', minimum: 1, maximum: 18 },
          homeTeamId: { type: 'string', format: 'uuid' },
          awayTeamId: { type: 'string', format: 'uuid' },
          homeScore: { type: 'number' },
          awayScore: { type: 'number' },
          status: { type: 'string', enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'] },
          isPlayoff: { type: 'boolean' }
        }
      },
      
      // League schemas
      League: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          season: { type: 'integer' },
          currentWeek: { type: 'integer' },
          maxTeams: { type: 'integer' },
          scoringSystem: { type: 'string', enum: ['STANDARD', 'PPR', 'HALF_PPR'] },
          draftDate: { type: 'string', format: 'date-time' },
          playoffStartWeek: { type: 'integer' },
          settings: { type: 'object' }
        }
      },
      
      // Error schemas
      Error: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          message: { type: 'string' },
          details: { type: 'object' },
          timestamp: { type: 'string', format: 'date-time' }
        },
        required: ['code', 'message']
      },
      
      // Pagination
      PaginatedResponse: {
        type: 'object',
        properties: {
          data: { type: 'array', items: {} },
          total: { type: 'integer' },
          page: { type: 'integer' },
          limit: { type: 'integer' },
          hasNext: { type: 'boolean' },
          hasPrevious: { type: 'boolean' }
        }
      }
    },
    responses: {
      UnauthorizedError: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required'
            }
          }
        }
      },
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              code: 'NOT_FOUND',
              message: 'Resource not found'
            }
          }
        }
      },
      ValidationError: {
        description: 'Validation failed',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              code: 'VALIDATION_ERROR',
              message: 'Validation failed',
              details: {
                field: 'email',
                error: 'Invalid email format'
              }
            }
          }
        }
      },
      RateLimitError: {
        description: 'Rate limit exceeded',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests',
              details: {
                retryAfter: 60
              }
            }
          }
        }
      }
    }
  },
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and authorization'
    },
    {
      name: 'Users',
      description: 'User management operations'
    },
    {
      name: 'Teams',
      description: 'Fantasy team operations'
    },
    {
      name: 'Leagues',
      description: 'League management'
    },
    {
      name: 'Matchups',
      description: 'Matchup and scoring operations'
    },
    {
      name: 'Players',
      description: 'NFL player data and stats'
    },
    {
      name: 'Draft',
      description: 'Draft operations'
    },
    {
      name: 'Trades',
      description: 'Trade management'
    },
    {
      name: 'Waivers',
      description: 'Waiver wire operations'
    },
    {
      name: 'Analytics',
      description: 'Statistical analysis and insights'
    }
  ]
});

export default swaggerSpec;