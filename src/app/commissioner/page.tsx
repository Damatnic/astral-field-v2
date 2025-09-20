'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Crown, Users, Settings, BarChart3, Shield, Clock, Trophy, Target } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CommissionerPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'users' | 'scoring'>('overview');

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Login Required</h1>
          <p className="text-gray-600">Please log in to access commissioner tools.</p>
        </div>
      </div>
    );
  }

  if (user.role !== 'ADMIN' && user.role !== 'COMMISSIONER') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">Only commissioners can access this page.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'settings', label: 'League Settings', icon: Settings },
    { id: 'users', label: 'Manage Users', icon: Users },
    { id: 'scoring', label: 'Scoring', icon: Target }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Crown className="h-8 w-8 text-yellow-600 mr-3" />
                Commissioner Dashboard
              </h1>
              <p className="text-gray-600 mt-2">
                Manage your fantasy league settings and operations
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="text-sm text-gray-500">League Status</div>
              <div className="text-lg font-bold text-green-600">Active</div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border p-6"
          >
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">10</div>
                <div className="text-sm text-gray-500">League Members</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border p-6"
          >
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">3</div>
                <div className="text-sm text-gray-500">Current Week</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm border p-6"
          >
            <div className="flex items-center">
              <Trophy className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">147.6</div>
                <div className="text-sm text-gray-500">Highest Score</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-sm border p-6"
          >
            <div className="flex items-center">
              <Target className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">5</div>
                <div className="text-sm text-gray-500">Waiver Claims</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl shadow-sm border mb-8"
        >
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">League Overview</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Nicholas completed a trade</span>
                        <span className="text-xs text-gray-500">2h ago</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Waiver claims processed</span>
                        <span className="text-xs text-gray-500">1d ago</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Week 3 scoring finalized</span>
                        <span className="text-xs text-gray-500">2d ago</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Upcoming Events</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Waiver processing</span>
                        <span className="text-xs text-gray-500">Wed 12:00 AM</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Week 4 lineup lock</span>
                        <span className="text-xs text-gray-500">Sun 1:00 PM</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">League Settings</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Basic Settings</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">League Name</label>
                        <input
                          type="text"
                          defaultValue="Astral Field Championship League 2025"
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Team Count</label>
                        <select className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2">
                          <option>10 Teams</option>
                          <option>12 Teams</option>
                          <option>14 Teams</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Scoring Settings</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">PPR (Points Per Reception)</span>
                        <input type="number" defaultValue="1" className="w-20 border border-gray-300 rounded px-2 py-1" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">QB Passing TD</span>
                        <input type="number" defaultValue="4" className="w-20 border border-gray-300 rounded px-2 py-1" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">Manage Users</h2>
                
                {/* League Members Table */}
                <div className="bg-white border rounded-lg overflow-hidden">
                  <div className="px-6 py-4 border-b bg-gray-50">
                    <h3 className="text-lg font-semibold">League Members</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Record</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {[
                          { name: "Nicholas D'Amato", team: "D'Amato Dynasty", record: "7-6", status: "Active", role: "Commissioner" },
                          { name: "Jack McCaigue", team: "McCaigue Mayhem", record: "3-10", status: "Active", role: "Player" },
                          { name: "Larry McCaigue", team: "Larry's Legends", record: "11-3", status: "Active", role: "Player" },
                          { name: "Renee McCaigue", team: "Renee's Reign", record: "12-5", status: "Active", role: "Player" },
                          { name: "Nick Hartley", team: "Hartley Heroes", record: "3-4", status: "Active", role: "Player" }
                        ].map((member, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">
                                  {member.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                  <div className="font-medium">{member.name}</div>
                                  {member.role === 'Commissioner' && (
                                    <div className="text-xs text-purple-600 flex items-center">
                                      <Crown className="h-3 w-3 mr-1" />
                                      Commissioner
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">{member.team}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{member.record}</td>
                            <td className="px-6 py-4">
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                {member.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              <div className="flex space-x-2">
                                <button className="text-blue-600 hover:text-blue-800 text-xs">Edit</button>
                                <button className="text-red-600 hover:text-red-800 text-xs">Remove</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Commissioner Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-white border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Force Trade</h4>
                    <p className="text-sm text-gray-600 mb-3">Execute a trade between teams</p>
                    <button className="w-full bg-blue-600 text-white py-2 px-4 rounded text-sm hover:bg-blue-700">
                      Manage Trades
                    </button>
                  </div>
                  
                  <div className="bg-white border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Adjust Scores</h4>
                    <p className="text-sm text-gray-600 mb-3">Manually adjust team scores</p>
                    <button className="w-full bg-yellow-600 text-white py-2 px-4 rounded text-sm hover:bg-yellow-700">
                      Score Adjustments
                    </button>
                  </div>
                  
                  <div className="bg-white border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Roster Moves</h4>
                    <p className="text-sm text-gray-600 mb-3">Force add/drop players</p>
                    <button className="w-full bg-green-600 text-white py-2 px-4 rounded text-sm hover:bg-green-700">
                      Manage Rosters
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'scoring' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">Scoring Management</h2>
                
                {/* Current Scoring Settings */}
                <div className="bg-white border rounded-lg">
                  <div className="px-6 py-4 border-b">
                    <h3 className="text-lg font-semibold">Current Scoring System</h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      
                      {/* Passing */}
                      <div>
                        <h4 className="font-semibold mb-3 text-blue-600">Passing</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Passing Yards</span>
                            <span>1 pt per 25 yards</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Passing TD</span>
                            <span>4 pts</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Interceptions</span>
                            <span>-2 pts</span>
                          </div>
                          <div className="flex justify-between">
                            <span>2-Point Conversion</span>
                            <span>2 pts</span>
                          </div>
                        </div>
                      </div>

                      {/* Rushing */}
                      <div>
                        <h4 className="font-semibold mb-3 text-green-600">Rushing</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Rushing Yards</span>
                            <span>1 pt per 10 yards</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Rushing TD</span>
                            <span>6 pts</span>
                          </div>
                          <div className="flex justify-between">
                            <span>2-Point Conversion</span>
                            <span>2 pts</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Fumbles Lost</span>
                            <span>-2 pts</span>
                          </div>
                        </div>
                      </div>

                      {/* Receiving */}
                      <div>
                        <h4 className="font-semibold mb-3 text-purple-600">Receiving</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Receiving Yards</span>
                            <span>1 pt per 10 yards</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Receptions (PPR)</span>
                            <span>1 pt</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Receiving TD</span>
                            <span>6 pts</span>
                          </div>
                          <div className="flex justify-between">
                            <span>2-Point Conversion</span>
                            <span>2 pts</span>
                          </div>
                        </div>
                      </div>

                      {/* Kicking */}
                      <div>
                        <h4 className="font-semibold mb-3 text-orange-600">Kicking</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Extra Points</span>
                            <span>1 pt</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Field Goals (0-39)</span>
                            <span>3 pts</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Field Goals (40-49)</span>
                            <span>4 pts</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Field Goals (50+)</span>
                            <span>5 pts</span>
                          </div>
                        </div>
                      </div>

                      {/* Defense */}
                      <div>
                        <h4 className="font-semibold mb-3 text-red-600">Defense/ST</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Sacks</span>
                            <span>1 pt</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Interceptions</span>
                            <span>2 pts</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Fumble Recoveries</span>
                            <span>2 pts</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Defensive TD</span>
                            <span>6 pts</span>
                          </div>
                        </div>
                      </div>

                      {/* Points Allowed */}
                      <div>
                        <h4 className="font-semibold mb-3 text-gray-600">Points Allowed</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>0 points</span>
                            <span>10 pts</span>
                          </div>
                          <div className="flex justify-between">
                            <span>1-6 points</span>
                            <span>7 pts</span>
                          </div>
                          <div className="flex justify-between">
                            <span>7-13 points</span>
                            <span>4 pts</span>
                          </div>
                          <div className="flex justify-between">
                            <span>14-20 points</span>
                            <span>1 pt</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scoring Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Manual Score Adjustment</h4>
                    <p className="text-sm text-gray-600 mb-3">Adjust individual player or team scores</p>
                    <button className="w-full bg-red-600 text-white py-2 px-4 rounded text-sm hover:bg-red-700">
                      Score Adjustments
                    </button>
                  </div>
                  
                  <div className="bg-white border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Recalculate Scores</h4>
                    <p className="text-sm text-gray-600 mb-3">Recalculate all scores for a specific week</p>
                    <button className="w-full bg-blue-600 text-white py-2 px-4 rounded text-sm hover:bg-blue-700">
                      Recalculate Week
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}