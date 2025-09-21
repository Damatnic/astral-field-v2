'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/AuthProvider';
import DraftRoom from '@/components/draft/DraftRoom';
import { EnhancedCard, EnhancedButton, EnhancedBadge, LoadingSpinner } from '@/components/ui/enhanced-components';

interface DraftInfo {
  id: string;
  name: string;
  status: 'scheduled' | 'active' | 'paused' | 'completed';
  scheduledTime: string;
  currentRound: number;
  currentPick: number;
  totalRounds: number;
  totalTeams: number;
  timePerPick: number;
  userTeam?: {
    name: string;
    draftPosition: number;
    nextPickRound?: number;
    nextPickOverall?: number;
  };
}

export default function EnhancedDraftPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [draftInfo, setDraftInfo] = useState<DraftInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // In a real app, you'd get the draftId from URL params
  const draftId = 'damato-dynasty-2025-draft';

  useEffect(() => {
    fetchDraftInfo();
  }, []);

  const fetchDraftInfo = async () => {
    try {
      setLoading(true);
      // Simulate API call - replace with real API endpoint
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock draft data
      setDraftInfo({
        id: draftId,
        name: "Damato Dynasty 2025 Draft",
        status: 'scheduled',
        scheduledTime: '2025-08-28T19:00:00Z',
        currentRound: 1,
        currentPick: 1,
        totalRounds: 16,
        totalTeams: 12,
        timePerPick: 90,
        userTeam: {
          name: "Your Team",
          draftPosition: 4,
          nextPickRound: 1,
          nextPickOverall: 4
        }
      });
    } catch (error) {
      setError('Failed to load draft information');
    } finally {
      setLoading(false);
    }
  };

  const startDraft = async () => {
    if (draftInfo) {
      setDraftInfo({ ...draftInfo, status: 'active' });
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'scheduled':
        return { text: 'Scheduled', variant: 'warning' as const, color: 'bg-yellow-500' };
      case 'active':
        return { text: 'Live', variant: 'success' as const, color: 'bg-green-500' };
      case 'paused':
        return { text: 'Paused', variant: 'warning' as const, color: 'bg-orange-500' };
      case 'completed':
        return { text: 'Complete', variant: 'default' as const, color: 'bg-gray-500' };
      default:
        return { text: status, variant: 'default' as const, color: 'bg-gray-500' };
    }
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

  if (error || !draftInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <EnhancedCard className="p-8 text-center border-red-200 bg-red-50">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-red-900 mb-2">Draft Unavailable</h2>
            <p className="text-red-700">{error || 'Unable to load draft information'}</p>
          </EnhancedCard>
        </div>
      </div>
    );
  }

  if (draftInfo.status === 'active') {
    return <DraftRoom draftId={draftId} userId={user?.id} />;
  }

  const statusInfo = getStatusInfo(draftInfo.status);
  const scheduledDate = new Date(draftInfo.scheduledTime);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50">
      {/* Enhanced Header */}
      <motion.div 
        className="bg-gradient-to-r from-purple-900 via-indigo-900 to-blue-900 text-white relative overflow-hidden"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-3 h-3 rounded-full ${statusInfo.color} animate-pulse`}></div>
                <EnhancedBadge variant={statusInfo.variant}>
                  {statusInfo.text}
                </EnhancedBadge>
              </div>
              
              <h1 className="text-4xl lg:text-5xl font-bold mb-4">
                {draftInfo.name}
              </h1>
              
              <div className="text-lg text-purple-100 space-y-2">
                <p className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {scheduledDate.toLocaleDateString()} at {scheduledDate.toLocaleTimeString()}
                </p>
                <p className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {draftInfo.totalTeams} teams • {draftInfo.totalRounds} rounds • {draftInfo.timePerPick}s per pick
                </p>
              </div>
            </motion.div>

            {/* Draft Status Card */}
            <motion.div
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 min-w-[300px]"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <h3 className="text-lg font-semibold mb-4">Your Draft Status</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-purple-200">Team Name:</span>
                  <span className="font-semibold">{draftInfo.userTeam?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-200">Draft Position:</span>
                  <span className="font-semibold">#{draftInfo.userTeam?.draftPosition}</span>
                </div>
                {draftInfo.userTeam?.nextPickRound && (
                  <div className="flex justify-between">
                    <span className="text-purple-200">Next Pick:</span>
                    <span className="font-semibold">
                      Round {draftInfo.userTeam.nextPickRound} (#{draftInfo.userTeam.nextPickOverall} overall)
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Pre-Draft Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Draft Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <EnhancedCard>
                <div className="p-6">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Draft Information
                  </h2>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-900">{draftInfo.totalTeams}</div>
                      <div className="text-sm text-purple-600">Teams</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-900">{draftInfo.totalRounds}</div>
                      <div className="text-sm text-blue-600">Rounds</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-900">{draftInfo.timePerPick}s</div>
                      <div className="text-sm text-green-600">Per Pick</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-900">{draftInfo.totalTeams * draftInfo.totalRounds}</div>
                      <div className="text-sm text-orange-600">Total Picks</div>
                    </div>
                  </div>
                </div>
              </EnhancedCard>
            </motion.div>

            {/* Draft Rules & Strategy */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <EnhancedCard>
                <div className="p-6">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Draft Strategy Tips
                  </h2>
                  
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <h3 className="font-semibold text-gray-900">Early Rounds (1-6)</h3>
                      <ul className="text-gray-600 space-y-1">
                        <li>• Focus on RB1s and WR1s</li>
                        <li>• Consider elite TEs (Kelce, Andrews)</li>
                        <li>• Avoid QBs and DST</li>
                        <li>• Target high-floor players</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-semibold text-gray-900">Middle Rounds (7-12)</h3>
                      <ul className="text-gray-600 space-y-1">
                        <li>• QB1 tier starts here</li>
                        <li>• Handcuff your RBs</li>
                        <li>• Target high-upside WRs</li>
                        <li>• Consider TE streaming</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </EnhancedCard>
            </motion.div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Draft Actions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <EnhancedCard>
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Draft Controls</h3>
                  
                  {draftInfo.status === 'scheduled' && (
                    <div className="space-y-4">
                      <EnhancedButton
                        variant="primary"
                        size="lg"
                        className="w-full"
                        onClick={startDraft}
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m2-10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Enter Draft Room
                      </EnhancedButton>
                      
                      <div className="text-xs text-gray-500 text-center">
                        Draft will start automatically at scheduled time
                      </div>
                    </div>
                  )}

                  {draftInfo.status === 'paused' && (
                    <EnhancedButton
                      variant="secondary"
                      size="lg"
                      className="w-full"
                      onClick={() => setDraftInfo({ ...draftInfo, status: 'active' })}
                    >
                      Resume Draft
                    </EnhancedButton>
                  )}

                  {draftInfo.status === 'completed' && (
                    <div className="text-center">
                      <div className="text-green-600 font-semibold mb-2">Draft Complete!</div>
                      <EnhancedButton variant="outline" size="sm" className="w-full">
                        View Draft Results
                      </EnhancedButton>
                    </div>
                  )}
                </div>
              </EnhancedCard>
            </motion.div>

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
            >
              <EnhancedCard>
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Draft Progress</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Overall Progress</span>
                        <span>{Math.round((draftInfo.currentPick / (draftInfo.totalTeams * draftInfo.totalRounds)) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${(draftInfo.currentPick / (draftInfo.totalTeams * draftInfo.totalRounds)) * 100}%` 
                          }}
                        ></div>
                      </div>
                    </div>

                    <div className="text-center text-sm text-gray-600">
                      Round {draftInfo.currentRound} • Pick {draftInfo.currentPick}
                    </div>
                  </div>
                </div>
              </EnhancedCard>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}