'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import LineupManager from '@/components/team/LineupManager';
import { ArrowLeft, Trophy, TrendingUp, Clock } from 'lucide-react';
import Link from 'next/link';

export default function LineupPage() {
  const params = useParams();
  const teamId = params.id as string;

  // Mock team data - replace with actual API call
  const teamData = {
    name: 'Thunder Bolts',
    record: '6-2',
    rank: 2,
    projectedPoints: 124.5,
    weeklyMatchup: 'vs Lightning Strike'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href={`/teams/${teamId}`}
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Team
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {teamData.name} - Lineup Manager
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Trophy className="h-4 w-4" />
                  Record: {teamData.record} (#{teamData.rank})
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  Projected: {teamData.projectedPoints} pts
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Week 9: {teamData.weeklyMatchup}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Lineup Manager Component */}
        <LineupManager />
      </div>
    </div>
  );
}