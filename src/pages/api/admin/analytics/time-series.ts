import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/db';
import { redis } from '@/lib/cache/redis-client';

interface TimeSeriesData {
  date: string;
  users: number;
  leagues: number;
  revenue: number;
  pageViews: number;
  apiCalls: number;
  errors: number;
}

interface TimeSeriesResponse {
  data: TimeSeriesData[];
  period: string;
  totalDataPoints: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TimeSeriesResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user || !session.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { period = '7d' } = req.query;

    // Validate period
    const validPeriods = ['24h', '7d', '30d', '90d', '1y'];
    if (!validPeriods.includes(period as string)) {
      return res.status(400).json({ error: 'Invalid period. Must be one of: 24h, 7d, 30d, 90d, 1y' });
    }

    const cacheKey = `admin:analytics:time-series:${period}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    // Calculate date range and grouping
    const now = new Date();
    let startDate: Date;
    let dateFormat: string;
    let groupByFormat: string;

    switch (period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        dateFormat = 'YYYY-MM-DD HH24:00';
        groupByFormat = 'hour';
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFormat = 'YYYY-MM-DD';
        groupByFormat = 'day';
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFormat = 'YYYY-MM-DD';
        groupByFormat = 'day';
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        dateFormat = 'YYYY-MM-DD';
        groupByFormat = 'day';
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        dateFormat = 'YYYY-MM';
        groupByFormat = 'month';
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFormat = 'YYYY-MM-DD';
        groupByFormat = 'day';
    }

    // Generate date series
    const dates: string[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= now) {
      if (groupByFormat === 'hour') {
        dates.push(currentDate.toISOString().split('T')[0] + ' ' + String(currentDate.getHours()).padStart(2, '0') + ':00');
        currentDate.setHours(currentDate.getHours() + 1);
      } else if (groupByFormat === 'day') {
        dates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      } else if (groupByFormat === 'month') {
        dates.push(`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`);
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }

    // Fetch user registrations by period
    const userRegistrations = await prisma.user.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: startDate }
      },
      _count: { id: true }
    });

    // Fetch league creations by period
    const leagueCreations = await prisma.league.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: startDate }
      },
      _count: { id: true }
    });

    // Fetch audit log data for API calls and errors
    const auditLogs = await prisma.auditLog.groupBy({
      by: ['timestamp', 'action'],
      where: {
        timestamp: { gte: startDate }
      },
      _count: { id: true }
    });

    // Process audit logs into daily/hourly buckets
    const apiCallsByDate = new Map<string, number>();
    const errorsByDate = new Map<string, number>();
    const pageViewsByDate = new Map<string, number>();

    auditLogs.forEach(log => {
      const logDate = new Date(log.timestamp);
      let dateKey: string;

      if (groupByFormat === 'hour') {
        dateKey = logDate.toISOString().split('T')[0] + ' ' + String(logDate.getHours()).padStart(2, '0') + ':00';
      } else if (groupByFormat === 'day') {
        dateKey = logDate.toISOString().split('T')[0];
      } else if (groupByFormat === 'month') {
        dateKey = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}`;
      } else {
        dateKey = logDate.toISOString().split('T')[0];
      }

      if (log.action === 'ERROR') {
        errorsByDate.set(dateKey, (errorsByDate.get(dateKey) || 0) + log._count.id);
      } else if (log.action === 'PAGE_VIEW') {
        pageViewsByDate.set(dateKey, (pageViewsByDate.get(dateKey) || 0) + log._count.id);
      } else {
        apiCallsByDate.set(dateKey, (apiCallsByDate.get(dateKey) || 0) + log._count.id);
      }
    });

    // Create time series data
    const timeSeriesData: TimeSeriesData[] = dates.map(date => {
      // Count users for this date
      const usersCount = userRegistrations.filter(reg => {
        const regDate = new Date(reg.createdAt);
        if (groupByFormat === 'hour') {
          const regDateKey = regDate.toISOString().split('T')[0] + ' ' + String(regDate.getHours()).padStart(2, '0') + ':00';
          return regDateKey === date;
        } else if (groupByFormat === 'day') {
          return regDate.toISOString().split('T')[0] === date;
        } else if (groupByFormat === 'month') {
          return `${regDate.getFullYear()}-${String(regDate.getMonth() + 1).padStart(2, '0')}` === date;
        }
        return false;
      }).reduce((sum, reg) => sum + reg._count.id, 0);

      // Count leagues for this date
      const leaguesCount = leagueCreations.filter(league => {
        const leagueDate = new Date(league.createdAt);
        if (groupByFormat === 'hour') {
          const leagueDateKey = leagueDate.toISOString().split('T')[0] + ' ' + String(leagueDate.getHours()).padStart(2, '0') + ':00';
          return leagueDateKey === date;
        } else if (groupByFormat === 'day') {
          return leagueDate.toISOString().split('T')[0] === date;
        } else if (groupByFormat === 'month') {
          return `${leagueDate.getFullYear()}-${String(leagueDate.getMonth() + 1).padStart(2, '0')}` === date;
        }
        return false;
      }).reduce((sum, league) => sum + league._count.id, 0);

      // Mock revenue data (would come from payment processor)
      const baseRevenue = 100;
      const variance = Math.random() * 50;
      const revenue = Math.round(baseRevenue + variance);

      return {
        date,
        users: usersCount,
        leagues: leaguesCount,
        revenue,
        pageViews: pageViewsByDate.get(date) || 0,
        apiCalls: apiCallsByDate.get(date) || 0,
        errors: errorsByDate.get(date) || 0
      };
    });

    const response: TimeSeriesResponse = {
      data: timeSeriesData,
      period: period as string,
      totalDataPoints: timeSeriesData.length
    };

    // Cache for different durations based on period
    let cacheDuration = 300; // 5 minutes default
    if (period === '24h') cacheDuration = 60;  // 1 minute for recent data
    else if (period === '7d') cacheDuration = 300; // 5 minutes
    else if (period === '30d') cacheDuration = 900; // 15 minutes
    else cacheDuration = 3600; // 1 hour for longer periods

    await redis.setex(cacheKey, cacheDuration, JSON.stringify(response));

    return res.status(200).json(response);

  } catch (error) {
    console.error('Error fetching time series data:', error);
    return res.status(500).json({ error: 'Failed to fetch time series data' });
  }
}