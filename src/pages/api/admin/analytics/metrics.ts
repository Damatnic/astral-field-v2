import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '@/lib/db';
import { redis } from '@/lib/cache/redis-client';

interface AnalyticsMetrics {
  users: {
    total: number;
    active: number;
    newToday: number;
    retentionRate: number;
    growth: number;
  };
  leagues: {
    total: number;
    active: number;
    completed: number;
    averageTeams: number;
    growth: number;
  };
  engagement: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    averageSessionDuration: number;
    pageViewsPerSession: number;
  };
  performance: {
    averagePageLoad: number;
    apiResponseTime: number;
    errorRate: number;
    uptime: number;
  };
  revenue: {
    totalRevenue: number;
    monthlyRevenue: number;
    averageRevenuePerUser: number;
    conversionRate: number;
    growth: number;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AnalyticsMetrics | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user || !session.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    // Check cache first
    const cacheKey = 'admin:analytics:metrics';
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    // User metrics
    const [
      totalUsers,
      usersToday,
      usersThisWeek,
      usersThisMonth,
      usersLastMonth,
      usersLastYear,
      activeUsersToday,
      activeUsersWeek,
      activeUsersMonth
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: monthAgo, lt: new Date(monthAgo.getTime() + 30 * 24 * 60 * 60 * 1000) } } }),
      prisma.user.count({ where: { createdAt: { gte: yearAgo } } }),
      prisma.user.count({ where: { lastActiveAt: { gte: todayStart } } }),
      prisma.user.count({ where: { lastActiveAt: { gte: weekAgo } } }),
      prisma.user.count({ where: { lastActiveAt: { gte: monthAgo } } })
    ]);

    // League metrics
    const [
      totalLeagues,
      activeLeagues,
      completedLeagues,
      leaguesThisMonth,
      leaguesLastMonth,
      teamCounts
    ] = await Promise.all([
      prisma.league.count(),
      prisma.league.count({ where: { status: 'ACTIVE' } }),
      prisma.league.count({ where: { status: 'COMPLETED' } }),
      prisma.league.count({ where: { createdAt: { gte: monthAgo } } }),
      prisma.league.count({ where: { createdAt: { gte: monthAgo, lt: new Date(monthAgo.getTime() + 30 * 24 * 60 * 60 * 1000) } } }),
      prisma.team.groupBy({
        by: ['leagueId'],
        _count: { id: true }
      })
    ]);

    // Performance metrics
    const performanceMetrics = await prisma.performanceMetric.aggregate({
      where: { timestamp: { gte: monthAgo } },
      _avg: {
        value: true
      }
    });

    const errorRate = await prisma.auditLog.count({
      where: {
        timestamp: { gte: todayStart },
        action: 'ERROR'
      }
    });

    const totalRequests = await prisma.auditLog.count({
      where: { timestamp: { gte: todayStart } }
    });

    // Session metrics
    const sessionMetrics = await prisma.userSession.aggregate({
      where: { createdAt: { gte: monthAgo } },
      _avg: {
        duration: true,
        pageViews: true
      }
    });

    // Revenue metrics (mock data for now)
    const revenue = {
      totalRevenue: 45000,
      monthlyRevenue: 3800,
      averageRevenuePerUser: totalUsers > 0 ? 45000 / totalUsers : 0,
      conversionRate: 0.12,
      growth: 0.15
    };

    const metrics: AnalyticsMetrics = {
      users: {
        total: totalUsers,
        active: activeUsersMonth,
        newToday: usersToday,
        retentionRate: totalUsers > 0 ? activeUsersMonth / totalUsers : 0,
        growth: usersLastMonth > 0 ? (usersThisMonth - usersLastMonth) / usersLastMonth : 0
      },
      leagues: {
        total: totalLeagues,
        active: activeLeagues,
        completed: completedLeagues,
        averageTeams: teamCounts.length > 0 ? teamCounts.reduce((sum, league) => sum + league._count.id, 0) / teamCounts.length : 0,
        growth: leaguesLastMonth > 0 ? (leaguesThisMonth - leaguesLastMonth) / leaguesLastMonth : 0
      },
      engagement: {
        dailyActiveUsers: activeUsersToday,
        weeklyActiveUsers: activeUsersWeek,
        monthlyActiveUsers: activeUsersMonth,
        averageSessionDuration: sessionMetrics._avg.duration || 0,
        pageViewsPerSession: sessionMetrics._avg.pageViews || 0
      },
      performance: {
        averagePageLoad: performanceMetrics._avg.value || 0,
        apiResponseTime: 250, // Placeholder
        errorRate: totalRequests > 0 ? errorRate / totalRequests : 0,
        uptime: 0.996
      },
      revenue
    };

    // Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(metrics));

    return res.status(200).json(metrics);

  } catch (error) {
    console.error('Error fetching analytics metrics:', error);
    return res.status(500).json({ error: 'Failed to fetch analytics metrics' });
  }
}