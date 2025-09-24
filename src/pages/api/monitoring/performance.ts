import type { NextApiRequest, NextApiResponse } from 'next';
import { performanceMonitor } from '@/lib/monitoring/performance-monitor';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    // Record performance metrics
    try {
      const { metricType, name, value, unit, userId, sessionId, userAgent, url, additionalData } = req.body;

      await performanceMonitor.recordMetric({
        metricType,
        name,
        value,
        unit,
        userId,
        sessionId,
        userAgent,
        url,
        additionalData
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error recording performance metric:', error);
      return res.status(500).json({ error: 'Failed to record metric' });
    }
  } else if (req.method === 'GET') {
    // Get performance summary
    try {
      const { timeRange = '24h' } = req.query;
      const summary = performanceMonitor.getPerformanceSummary(timeRange as any);
      
      return res.status(200).json(summary);
    } catch (error) {
      console.error('Error getting performance summary:', error);
      return res.status(500).json({ error: 'Failed to get performance summary' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}