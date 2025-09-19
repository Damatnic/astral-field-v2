'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { handleComponentError } from '@/lib/error-handling';

interface UserTeam {
  id: string;
  name: string;
  leagueId: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  league: {
    id: string;
    name: string;
    currentWeek: number;
    season: number;
  };
  rosterCount: number;
}

interface MyTeamRedirectProps {
  children: React.ReactNode | ((props: {
    team: UserTeam | null;
    loading: boolean;
    error: string | null;
    navigateToTeam: () => void;
    navigateToLineup: () => void;
    getTeamId: () => string | null;
  }) => React.ReactNode);
  fallbackPath?: string;
}

export default function MyTeamRedirect({ children, fallbackPath = '/leagues' }: MyTeamRedirectProps) {
  const [team, setTeam] = useState<UserTeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchUserTeam();
  }, []);

  const fetchUserTeam = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/my-team');
      const data = await response.json();
      
      if (data.success) {
        setTeam(data.data);
      } else if (response.status === 401) {
        // User not authenticated, let them stay on current page
        setError('Please log in to view your team');
      } else {
        setError(data.message || 'No team found');
      }
    } catch (error) {
      setError('Error loading team information');
      handleComponentError(error as Error, 'component');
    } finally {
      setLoading(false);
    }
  };

  const navigateToTeam = () => {
    if (team) {
      router.push(`/teams/${team.id}` as any);
    } else {
      router.push(fallbackPath as any);
    }
  };

  const navigateToLineup = () => {
    if (team) {
      router.push(`/teams/${team.id}/lineup` as any);
    } else {
      router.push(fallbackPath as any);
    }
  };

  // Helper function for other components to use
  const getTeamId = () => team?.id || null;

  return (
    <>
      {typeof children === 'function' ? 
        children({ 
          team, 
          loading, 
          error, 
          navigateToTeam, 
          navigateToLineup, 
          getTeamId 
        }) : 
        children
      }
    </>
  );
}