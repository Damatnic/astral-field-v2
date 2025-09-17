'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { League, CreateLeagueForm } from '@/types/fantasy';
import LeagueCard from '@/components/league/LeagueCard';
import CreateLeagueModal from '@/components/league/CreateLeagueModal';

export default function LeaguesPage() {
  const router = useRouter();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'commissioner'>('all');
  const [seasonFilter, setSeasonFilter] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    fetchLeagues();
    fetchUser();
  }, [activeTab, seasonFilter]);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchLeagues = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        season: seasonFilter.toString(),
        limit: '20'
      });

      if (activeTab === 'active') {
        params.append('isActive', 'true');
      }

      const response = await fetch(`/api/leagues?${params}`);
      const data = await response.json();

      if (data.data) {
        let filteredLeagues = data.data;
        
        if (activeTab === 'commissioner') {
          filteredLeagues = data.data.filter((league: League) => 
            league.commissionerId === user?.id
          );
        }

        setLeagues(filteredLeagues);
      } else {
        setError('Failed to load leagues');
      }
    } catch (error) {
      setError('Error loading leagues');
      console.error('Error fetching leagues:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLeague = async (formData: CreateLeagueForm) => {
    try {
      const response = await fetch('/api/leagues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setShowCreateModal(false);
        fetchLeagues(); // Refresh leagues list
        router.push(`/leagues/${data.data.id}`);
      } else {
        setError(data.message || 'Failed to create league');
      }
    } catch (error) {
      setError('Error creating league');
      console.error('Error creating league:', error);
    }
  };

  const handleJoinLeague = async (leagueId: string) => {
    // This would be implemented when we add league invitations
    console.log('Join league:', leagueId);
  };

  const handleLeaveLeague = async (leagueId: string) => {
    // This would be implemented when we add leave functionality
    console.log('Leave league:', leagueId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg h-64 shadow"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Leagues</h1>
              <p className="mt-2 text-gray-600">
                Manage your fantasy football leagues and create new ones
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
            >
              Create League
            </button>
          </div>

          {/* Filters */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            {/* Tab filters */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {[
                { key: 'all', label: 'All Leagues' },
                { key: 'active', label: 'Active' },
                { key: 'commissioner', label: 'Commissioner' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Season filter */}
            <select
              value={seasonFilter}
              onChange={(e) => setSeasonFilter(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              {[2024, 2023, 2022].map((year) => (
                <option key={year} value={year}>
                  {year} Season
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {leagues.length === 0 ? (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="h-24 w-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No leagues found</h3>
              <p className="text-gray-600 mb-6">
                {activeTab === 'all' 
                  ? "You haven't joined any leagues yet. Create your first league or ask for an invitation to join one."
                  : activeTab === 'active'
                  ? "No active leagues found for the selected season."
                  : "You aren't the commissioner of any leagues yet."
                }
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
              >
                Create Your First League
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {leagues.map((league) => (
              <LeagueCard
                key={league.id}
                league={league}
                currentUserId={user?.id}
                onJoin={handleJoinLeague}
                onLeave={handleLeaveLeague}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create League Modal */}
      {showCreateModal && (
        <CreateLeagueModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateLeague}
        />
      )}
    </div>
  );
}