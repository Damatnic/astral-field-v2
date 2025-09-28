/**
 * Analytics Hub Page - Gateway to Fantasy Football Intelligence
 * Provides access to both basic and advanced Vortex analytics
 */

import { Metadata } from 'next';
import AnalyticsNavigation from '@/components/navigation/analytics-nav';

export const metadata: Metadata = {
  title: 'Analytics Hub - AstralField',
  description: 'Your gateway to fantasy football analytics - from basic insights to elite AI-powered intelligence',
  keywords: ['fantasy football', 'analytics', 'statistics', 'AI insights', 'predictions']
};

export default function AnalyticsHubPage() {
  return <AnalyticsNavigation />;
}

// Enable static generation for better performance
export const dynamic = 'force-static';
export const revalidate = 3600; // Revalidate every hour