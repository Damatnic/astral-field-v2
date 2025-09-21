'use client';

import { handleComponentError } from '@/lib/error-handling';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { League, CreateLeagueForm } from '@/types/fantasy';
import CreateLeagueModal from '@/components/league/CreateLeagueModal';
import { EnhancedCard, EnhancedButton, EnhancedBadge, StatItem, LoadingSpinner } from '@/components/ui/enhanced-components';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function EnhancedLeaguesPage() {
  const router = useRouter();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'commissioner'>('all');
  const [seasonFilter, setSeasonFilter] = useState<number>(new Date().getFullYear());

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
      }
    } catch (error) {
      handleComponentError(error as Error, 'page');
    }
  };

  useEffect(() => {
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
        handleComponentError(error as Error, 'page');
      } finally {
        setLoading(false);
      }
    };
    
    fetchLeagues();
    fetchUser();
  }, [activeTab, seasonFilter, user?.id]);

  const refreshLeagues = async () => {
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
      handleComponentError(error as Error, 'page');
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
        await refreshLeagues(); // Refresh leagues list
        router.push(`/leagues/${data.data.id}`);
      } else {
        setError(data.message || 'Failed to create league');
      }
    } catch (error) {
      setError('Error creating league');
      handleComponentError(error as Error, 'page');
    }
  };

  const getTabCounts = () => {
    const allCount = leagues.length;
    const activeCount = leagues.filter(l => l.isActive).length;
    const commissionerCount = leagues.filter(l => l.commissionerId === user?.id).length;
    
    return { all: allCount, active: activeCount, commissioner: commissionerCount };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </div>
    );
  }

  const tabCounts = getTabCounts();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Enhanced Header with ESPN-style Hero Section */}
      <motion.div 
        className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white relative overflow-hidden"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <motion.h1 
                className="text-4xl lg:text-5xl font-bold mb-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                My Leagues
              </motion.h1>
              <motion.p 
                className="text-xl text-blue-100 max-w-2xl"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                Manage your fantasy football empire. Track standings, make moves, and dominate your competition.
              </motion.p>
              
              {/* Quick Stats */}
              <motion.div 
                className="flex gap-6 mt-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                <div className="text-center">
                  <div className="text-2xl font-bold">{tabCounts.all}</div>
                  <div className="text-sm text-blue-200">Total Leagues</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{tabCounts.active}</div>
                  <div className="text-sm text-blue-200">Active</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{tabCounts.commissioner}</div>
                  <div className="text-sm text-blue-200">Commissioner</div>
                </div>
              </motion.div>
            </div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <EnhancedButton
                variant="secondary"
                size="lg"
                onClick={() => setShowCreateModal(true)}
                className="bg-white text-blue-900 hover:bg-gray-50 shadow-lg"
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New League
              </EnhancedButton>
            </motion.div>
          </div>
          
          {/* Enhanced Filter Tabs */}
          <motion.div 
            className="mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex bg-white/10 backdrop-blur-sm rounded-xl p-1 border border-white/20">
                {[
                  { key: 'all', label: 'All Leagues', count: tabCounts.all },
                  { key: 'active', label: 'Active', count: tabCounts.active },
                  { key: 'commissioner', label: 'Commissioner', count: tabCounts.commissioner }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`relative px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                      activeTab === tab.key
                        ? 'bg-white text-blue-900 shadow-lg'
                        : 'text-white hover:bg-white/20'
                    }`}
                  >
                    {tab.label}
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      activeTab === tab.key 
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-white/20 text-white'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
              
              <select
                value={seasonFilter}
                onChange={(e) => setSeasonFilter(parseInt(e.target.value))}
                className="px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-white/50 focus:border-white/50"
              >
                {[2024, 2023, 2022].map((year) => (
                  <option key={year} value={year} className="text-gray-900">
                    {year} Season
                  </option>
                ))}
              </select>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6"
            >
              <EnhancedCard className="p-4 border-red-200 bg-red-50">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-red-700">{error}</span>
                </div>
              </EnhancedCard>
            </motion.div>
          )}
        </AnimatePresence>

        {leagues.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="max-w-md mx-auto">
              <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                <svg className="w-16 h-16 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">No leagues found</h3>
              <p className="text-gray-600 mb-8 text-lg">
                {activeTab === 'all' 
                  ? "Ready to start your fantasy football journey? Create your first league and invite friends to compete."
                  : activeTab === 'active'
                  ? "No active leagues found for the selected season. Time to join or create one!"
                  : "You haven't created any leagues as commissioner yet. Take charge and start one today."
                }
              </p>
              <EnhancedButton
                variant="primary"
                size="lg"
                onClick={() => setShowCreateModal(true)}
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Your First League
              </EnhancedButton>
            </div>
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ staggerChildren: 0.1 }}
          >
            {leagues.map((league, index) => (
              <EnhancedLeagueCard
                key={league.id}
                league={league}
                currentUserId={user?.id}
                index={index}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* Create League Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateLeagueModal
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreateLeague}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Enhanced League Card Component
interface EnhancedLeagueCardProps {
  league: League;
  currentUserId?: string;
  index: number;
}

function EnhancedLeagueCard({ league, currentUserId, index }: EnhancedLeagueCardProps) {
  const isCommissioner = league.commissionerId === currentUserId;

  const userTeam = league.teams?.find(team => team.ownerId === currentUserId);

  const getStatusInfo = () => {
    if (!league.isActive) {
      return { text: 'Inactive', variant: 'default' as const };
    }
    if (league.currentWeek && league.currentWeek > 17) {
      return { text: 'Playoffs', variant: 'warning' as const };
    }
    return { text: `Week ${league.currentWeek || 1}`, variant: 'success' as const };
  };

  const statusInfo = getStatusInfo();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.6 }}
    >
      <EnhancedCard className="h-full hover:shadow-xl transition-all duration-300 group">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <Link
                href={`/leagues/${league.id}`}
                className="block group-hover:text-blue-600 transition-colors"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-1 line-clamp-1">
                  {league.name}
                </h3>
              </Link>
              {league.description && (
                <p className="text-sm text-gray-600 line-clamp-2">
                  {league.description}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2 ml-4">
              <EnhancedBadge variant={statusInfo.variant} size="sm">
                {statusInfo.text}
              </EnhancedBadge>
              {isCommissioner && (
                <EnhancedBadge variant="info" size="sm">
                  Commissioner
                </EnhancedBadge>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <StatItem
              label="Teams"
              value={league.teamCount?.toString() || '0'}
            />
            <StatItem
              label="Season"
              value={league.season?.toString() || '2024'}
            />
          </div>

          {/* User Team Status */}
          {userTeam && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-6 border border-blue-100">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-semibold text-blue-900 mb-1">{userTeam.name}</h4>
                  <div className="flex items-center gap-3 text-sm text-blue-700">
                    <span className="font-medium">
                      {userTeam.wins}-{userTeam.losses}
                      {userTeam.ties > 0 && `-${userTeam.ties}`}
                    </span>
                    <span>•</span>
                    <span>{userTeam.pointsFor?.toFixed(1)} pts</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-900">
                    #{userTeam.standings?.rank || '?'}
                  </div>
                  <div className="text-xs text-blue-600">Rank</div>
                </div>
              </div>
            </div>
          )}

          {/* League Settings */}
          <div className="border-t border-gray-100 pt-4 mb-6">
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span className="font-medium">
                {league.settings?.waiverMode === 'FAAB' ? 'FAAB Waivers' : 
                 league.settings?.waiverMode === 'ROLLING' ? 'Rolling Waivers' : 
                 'Reverse Order'}
              </span>
              <span className="font-mono text-xs">
                {league.settings?.rosterSlots?.QB || 1}QB • {league.settings?.rosterSlots?.RB || 2}RB • {league.settings?.rosterSlots?.WR || 2}WR
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Link href={`/leagues/${league.id}`} className="flex-1">
              <EnhancedButton variant="primary" size="sm" className="w-full">
                View League
              </EnhancedButton>
            </Link>
            
            {userTeam && (
              <Link href={`/teams/${userTeam.id}`}>
                <EnhancedButton variant="secondary" size="sm">
                  My Team
                </EnhancedButton>
              </Link>
            )}
            
            {isCommissioner && (
              <Link href={`/leagues/${league.id}/settings` as any}>
                <EnhancedButton variant="outline" size="sm">
                  Settings
                </EnhancedButton>
              </Link>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 rounded-b-lg">
          <p className="text-xs text-gray-500">
            Updated {new Date(league.updatedAt).toLocaleDateString()}
          </p>
        </div>
      </EnhancedCard>
    </motion.div>
  );
}