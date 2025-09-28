/**
 * Vortex Analytics Page - Elite Fantasy Football Intelligence
 * Comprehensive real-time analytics dashboard
 */

import { Metadata } from 'next';
import VortexAnalyticsDashboard from '@/components/analytics/vortex-analytics-dashboard';

export const metadata: Metadata = {
  title: 'Vortex Analytics - AstralField',
  description: 'Advanced fantasy football analytics with real-time insights, player trends, and AI-powered recommendations',
  keywords: ['fantasy football', 'analytics', 'statistics', 'predictions', 'AI insights']
};

export default function VortexAnalyticsPage() {
  return (
    <div className="min-h-screen">
      <VortexAnalyticsDashboard />
    </div>
  );
}

// Enable static generation for better performance
export const dynamic = 'force-dynamic';
export const revalidate = 300; // Revalidate every 5 minutes