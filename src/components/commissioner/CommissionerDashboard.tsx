import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import {
  CogIcon,
  ChartBarIcon,
  UsersIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  LockClosedIcon,
  LockOpenIcon,
  PlusIcon,
  MinusIcon
} from '@heroicons/react/24/outline';

interface CommissionerDashboardProps {
  leagueId: string;
}

interface DashboardData {
  league: any;
  recentActivity: any[];
  currentMatchups: any[];
  teamStats: any;
  pendingActions: {
    pendingTrades: number;
    pendingWaivers: number;
  };
  actionHistory: any[];
}

interface ScoreAdjustment {
  teamId: string;
  week: number;
  adjustment: number;
  reason: string;
}

export default function CommissionerDashboard({ leagueId }: CommissionerDashboardProps) {
  const { data: session } = useSession();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showScoreAdjustment, setShowScoreAdjustment] = useState(false);
  const [scoreAdjustment, setScoreAdjustment] = useState<ScoreAdjustment>({
    teamId: '',
    week: 1,
    adjustment: 0,
    reason: ''
  });

  useEffect(() => {
    fetchDashboardData();
  }, [leagueId]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/leagues/${leagueId}/commissioner/dashboard`);
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      } else {
        toast.error('Failed to load commissioner dashboard');
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Error loading dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const executeAction = async (actionType: string, payload?: any) => {
    try {
      const response = await fetch(`/api/leagues/${leagueId}/commissioner/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionType, ...payload })
      });

      const result = await response.json();
      
      if (response.ok) {
        toast.success(result.message);
        fetchDashboardData(); // Refresh data
      } else {
        toast.error(result.error || 'Action failed');
      }
    } catch (error) {
      console.error('Error executing action:', error);
      toast.error('Failed to execute action');
    }
  };

  const handleScoreAdjustment = async () => {
    if (!scoreAdjustment.teamId || !scoreAdjustment.reason || scoreAdjustment.adjustment === 0) {
      toast.error('Please fill in all fields');
      return;
    }

    await executeAction('adjust_score', scoreAdjustment);
    setShowScoreAdjustment(false);
    setScoreAdjustment({ teamId: '', week: 1, adjustment: 0, reason: '' });
  };

  const toggleRosterLock = async (teamId: string, locked: boolean) => {
    await executeAction('toggle_roster_lock', { teamId, locked });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading commissioner dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load commissioner dashboard</p>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'teams', name: 'Team Management', icon: UsersIcon },
    { id: 'settings', name: 'League Settings', icon: CogIcon },
    { id: 'actions', name: 'Recent Actions', icon: ExclamationTriangleIcon }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Commissioner Dashboard
            </h1>
            <p className="text-gray-600">
              {dashboardData.league.name} • Week {dashboardData.league.currentWeek}
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => executeAction('advance_week')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              <ArrowRightIcon className="h-5 w-5 mr-2" />
              Advance Week
            </button>
            <button
              onClick={() => executeAction('force_process_waivers')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Process Waivers
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <UsersIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Teams</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardData.teamStats.totalTeams}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending Trades</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardData.pendingActions.pendingTrades}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg Roster Size</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardData.teamStats.avgRosterSize}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <ArrowRightIcon className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Recent Activity</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardData.teamStats.recentTransactions}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Current Matchups */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Week {dashboardData.league.currentWeek} Matchups
                </h3>
                <div className="space-y-3">
                  {dashboardData.currentMatchups.map((matchup) => (
                    <div key={matchup.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <span className="font-medium">{matchup.team1.name}</span>
                        <span className="text-gray-500">vs</span>
                        <span className="font-medium">{matchup.team2.name}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {matchup.team1Score.toFixed(1)} - {matchup.team2Score.toFixed(1)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-2">
                  {dashboardData.recentActivity.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex justify-between items-center py-2">
                      <span className="text-sm text-gray-900">
                        {activity.type} - {activity.team.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(activity.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'teams' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Team Management</h3>
                <button
                  onClick={() => setShowScoreAdjustment(true)}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Adjust Score
                </button>
              </div>

              {/* Teams List */}
              <div className="space-y-3">
                {dashboardData.league.teams.map((team: any) => (
                  <div key={team.id} className="flex justify-between items-center p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">{team.name}</div>
                      <div className="text-sm text-gray-600">{team.owner.name || team.owner.email}</div>
                      <div className="text-xs text-gray-500">
                        {team.wins}-{team.losses}-{team.ties} • {team.totalPointsFor.toFixed(1)} PF
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => toggleRosterLock(team.id, true)}
                        className="p-2 text-gray-600 hover:text-red-600"
                        title="Lock Roster"
                      >
                        <LockClosedIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => toggleRosterLock(team.id, false)}
                        className="p-2 text-gray-600 hover:text-green-600"
                        title="Unlock Roster"
                      >
                        <LockOpenIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'actions' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Commissioner Actions</h3>
              <div className="space-y-3">
                {dashboardData.actionHistory.map((action) => (
                  <div key={action.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-sm">{action.action.replace('_', ' ')}</div>
                        <div className="text-sm text-gray-600">{action.reason}</div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(action.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Score Adjustment Modal */}
      {showScoreAdjustment && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Adjust Team Score</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Team</label>
                <select
                  value={scoreAdjustment.teamId}
                  onChange={(e) => setScoreAdjustment({...scoreAdjustment, teamId: e.target.value})}
                  className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select team...</option>
                  {dashboardData.league.teams.map((team: any) => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Week</label>
                <input
                  type="number"
                  min="1"
                  max="18"
                  value={scoreAdjustment.week}
                  onChange={(e) => setScoreAdjustment({...scoreAdjustment, week: parseInt(e.target.value)})}
                  className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Adjustment</label>
                <div className="flex items-center space-x-2 mt-1">
                  <button
                    onClick={() => setScoreAdjustment({...scoreAdjustment, adjustment: scoreAdjustment.adjustment - 1})}
                    className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                  >
                    <MinusIcon className="h-4 w-4" />
                  </button>
                  <input
                    type="number"
                    step="0.1"
                    value={scoreAdjustment.adjustment}
                    onChange={(e) => setScoreAdjustment({...scoreAdjustment, adjustment: parseFloat(e.target.value) || 0})}
                    className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                  />
                  <button
                    onClick={() => setScoreAdjustment({...scoreAdjustment, adjustment: scoreAdjustment.adjustment + 1})}
                    className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Reason</label>
                <textarea
                  value={scoreAdjustment.reason}
                  onChange={(e) => setScoreAdjustment({...scoreAdjustment, reason: e.target.value})}
                  rows={3}
                  className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Explain the reason for this adjustment..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowScoreAdjustment(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleScoreAdjustment}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
              >
                Apply Adjustment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}