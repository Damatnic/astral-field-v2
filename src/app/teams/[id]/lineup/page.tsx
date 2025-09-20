'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import LineupManager from '@/components/team/LineupManager';
import { ArrowLeft, Trophy, TrendingUp, Clock, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { safeToFixed } from '@/utils/numberUtils';

export default function LineupPage() {
  const params = useParams();
  const teamId = params.id as string;

  const [teamData, setTeamData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTeamData();
  }, [teamId]);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/teams/${teamId}`);
      const data = await response.json();
      
      if (data.success) {
        setTeamData(data.data);
      } else {
        setError(data.message || 'Failed to load team data');
      }
    } catch (error) {
      setError('Error loading team data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading lineup manager...</p>
        </div>
      </div>
    );
  }

  if (error || !teamData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Team Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <Link
            href="/teams"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Teams
          </Link>
        </div>
      </div>
    );
  }

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
                  Record: {teamData.wins}-{teamData.losses}{teamData.ties > 0 ? `-${teamData.ties}` : ''} (#{teamData.standings?.rank || 'N/A'})
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  Points For: {safeToFixed(teamData.pointsFor, 1, '0.0')} pts
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  League: {teamData.league?.name || 'Unknown League'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Lineup Manager Component */}
        <LineupManager teamId={teamId} isOwner={true} />
      </div>
    </div>
  );
}