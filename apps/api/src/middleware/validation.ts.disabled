import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { logger } from '../server'

export interface ValidationError {
  field: string
  message: string
  code: string
  value?: any
}

export function validateRequest<T extends z.ZodSchema>(schema: T, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[source]
      const result = schema.safeParse(data)
      
      if (!result.success) {
        const errors: ValidationError[] = result.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
          value: issue.path.reduce((obj, key) => obj?.[key], data)
        }))

        logger.warn('Validation failed', {
          source,
          errors,
          data: source !== 'body' ? data : '[REDACTED]'
        })

        return res.status(400).json({
          error: 'Validation failed',
          details: errors,
          timestamp: new Date().toISOString()
        })
      }

      // Attach validated data to request
      req.validated = result.data
      next()
    } catch (error) {
      logger.error('Validation middleware error', error)
      res.status(500).json({
        error: 'Internal validation error',
        timestamp: new Date().toISOString()
      })
    }
  }
}

// Middleware factory for multiple validations
export function validateMultiple(validations: {
  body?: z.ZodSchema
  query?: z.ZodSchema  
  params?: z.ZodSchema
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: ValidationError[] = []
    const validatedData: any = {}

    // Validate body
    if (validations.body) {
      const bodyResult = validations.body.safeParse(req.body)
      if (!bodyResult.success) {
        errors.push(...bodyResult.error.issues.map(issue => ({
          field: `body.${issue.path.join('.')}`,
          message: issue.message,
          code: issue.code,
          value: issue.path.reduce((obj, key) => obj?.[key], req.body)
        })))
      } else {
        validatedData.body = bodyResult.data
      }
    }

    // Validate query
    if (validations.query) {
      const queryResult = validations.query.safeParse(req.query)
      if (!queryResult.success) {
        errors.push(...queryResult.error.issues.map(issue => ({
          field: `query.${issue.path.join('.')}`,
          message: issue.message,
          code: issue.code,
          value: issue.path.reduce((obj, key) => obj?.[key], req.query)
        })))
      } else {
        validatedData.query = queryResult.data
      }
    }

    // Validate params
    if (validations.params) {
      const paramsResult = validations.params.safeParse(req.params)
      if (!paramsResult.success) {
        errors.push(...paramsResult.error.issues.map(issue => ({
          field: `params.${issue.path.join('.')}`,
          message: issue.message,
          code: issue.code,
          value: issue.path.reduce((obj, key) => obj?.[key], req.params)
        })))
      } else {
        validatedData.params = paramsResult.data
      }
    }

    if (errors.length > 0) {
      logger.warn('Multiple validation failed', {
        errors,
        url: req.url,
        method: req.method
      })

      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
        timestamp: new Date().toISOString()
      })
    }

    req.validated = validatedData
    next()
  }
}

// Fantasy-specific validation helpers
export function validateFantasyWeek(req: Request, res: Response, next: NextFunction) {
  const { week } = req.params
  const weekNum = parseInt(week)
  
  if (isNaN(weekNum) || weekNum < 1 || weekNum > 18) {
    return res.status(400).json({
      error: 'Invalid week number',
      message: 'Week must be between 1 and 18',
      timestamp: new Date().toISOString()
    })
  }
  
  req.params.week = weekNum.toString()
  next()
}

export function validateFantasySeason(req: Request, res: Response, next: NextFunction) {
  const { season } = req.params
  const seasonNum = parseInt(season)
  const currentYear = new Date().getFullYear()
  
  if (isNaN(seasonNum) || seasonNum < 2020 || seasonNum > currentYear + 1) {
    return res.status(400).json({
      error: 'Invalid season',
      message: `Season must be between 2020 and ${currentYear + 1}`,
      timestamp: new Date().toISOString()
    })
  }
  
  req.params.season = seasonNum.toString()
  next()
}

export function validateLeagueAccess(req: Request, res: Response, next: NextFunction) {
  // This will be implemented with actual database checks
  // For now, just validate the leagueId format
  const { leagueId } = req.params
  
  if (!leagueId || typeof leagueId !== 'string') {
    return res.status(400).json({
      error: 'League ID required',
      timestamp: new Date().toISOString()
    })
  }
  
  // UUID validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(leagueId)) {
    return res.status(400).json({
      error: 'Invalid league ID format',
      timestamp: new Date().toISOString()
    })
  }
  
  next()
}

export function validateTeamOwnership(req: Request, res: Response, next: NextFunction) {
  // This will be implemented with actual database checks
  // For now, just validate the teamId format
  const { teamId } = req.params
  
  if (!teamId || typeof teamId !== 'string') {
    return res.status(400).json({
      error: 'Team ID required',
      timestamp: new Date().toISOString()
    })
  }
  
  // UUID validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(teamId)) {
    return res.status(400).json({
      error: 'Invalid team ID format',
      timestamp: new Date().toISOString()
    })
  }
  
  next()
}

// Rate limiting validation for specific operations
export function validateOperationLimits(operation: 'draft' | 'trade' | 'waiver' | 'lineup') {
  const limits = {
    draft: { window: 5000, max: 1 }, // 1 pick per 5 seconds
    trade: { window: 60000, max: 5 }, // 5 trades per minute
    waiver: { window: 60000, max: 10 }, // 10 waiver claims per minute
    lineup: { window: 10000, max: 3 } // 3 lineup changes per 10 seconds
  }
  
  return (req: Request, res: Response, next: NextFunction) => {
    const limit = limits[operation]
    const key = `rate_limit:${operation}:${req.user?.id || req.ip}`
    
    // This would typically use Redis for distributed rate limiting
    // For now, just log the validation
    logger.info(`Rate limit check for ${operation}`, {
      userId: req.user?.id,
      operation,
      limits: limit
    })
    
    next()
  }
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      validated?: any
      user?: {
        id: string
        email: string
        role: string
      }
    }
  }
}