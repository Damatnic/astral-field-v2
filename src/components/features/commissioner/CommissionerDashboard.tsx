'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Settings,
  Users,
  AlertTriangle,
  DollarSign,
  Activity,
  FileText,
  Shield,
  Clock,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Mail,
  Calendar,
  BarChart,
  Gavel
} from 'lucide-react'
import commissionerService, { 
  type CommissionerDashboardData, 
  type LeagueSettings,
  type LeagueActivity,
  type LeagueIssue
} from '@/services/commissioner/commissionerService'

interface CommissionerDashboardProps {
  leagueId: string
  commissionerId: string
}

export default function CommissionerDashboard({ leagueId, commissionerId }: CommissionerDashboardProps) {
  const [dashboardData, setDashboardData] = useState<CommissionerDashboardData | null>(null)
  const [leagueSettings, setLeagueSettings] = useState<LeagueSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'activity' | 'finances' | 'settings' | 'issues'>('overview')
  const [selectedActivity, setSelectedActivity] = useState<LeagueActivity | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [leagueId, commissionerId])

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      const [dashboard, settings] = await Promise.all([
        commissionerService.getCommissionerDashboard(leagueId, commissionerId),
        commissionerService.getLeagueSettings(leagueId)
      ])
      
      setDashboardData(dashboard)
      setLeagueSettings(settings)
    } catch (error) {
      console.error('Failed to load commissioner dashboard:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApproveActivity = async (activityId: string) => {
    try {
      await commissionerService.approveActivity(activityId, commissionerId)
      await loadDashboardData() // Refresh data
    } catch (error) {
      console.error('Failed to approve activity:', error)
    }
  }

  const handleResolveIssue = async (issueId: string, resolution: string) => {
    try {
      await commissionerService.resolveIssue(issueId, resolution, commissionerId)
      await loadDashboardData() // Refresh data
    } catch (error) {
      console.error('Failed to resolve issue:', error)
    }
  }

  const tabs = [
    { key: 'overview', label: 'Overview', icon: BarChart },
    { key: 'members', label: 'Members', icon: Users },
    { key: 'activity', label: 'Activity', icon: Activity },
    { key: 'finances', label: 'Finances', icon: DollarSign },
    { key: 'issues', label: 'Issues', icon: AlertTriangle },
    { key: 'settings', label: 'Settings', icon: Settings }
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="text-center py-12">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-white mb-2">Loading Commissioner Dashboard...</h3>
          <p className="text-gray-400">Gathering league management data</p>
        </div>
      </div>
    )
  }

  if (!dashboardData || !leagueSettings) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="text-center py-12">
          <AlertTriangle className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Dashboard Unavailable</h3>
          <p className="text-gray-400">Unable to load commissioner dashboard</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-900/30 rounded-xl">
              <Shield className="h-8 w-8 text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">{leagueSettings.name}</h1>
              <p className="text-gray-400">Commissioner Dashboard • {leagueSettings.seasonYear} Season</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={loadDashboardData}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Refresh Data
            </button>
            <button className="px-4 py-2 border border-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors">
              Export Report
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400">Active Members</p>
                <p className="text-2xl font-bold text-white">{dashboardData.leagueOverview.activeMembers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400">Open Issues</p>
                <p className="text-2xl font-bold text-white">{dashboardData.leagueOverview.disputesOpen}</p>
              </div>
              <AlertTriangle className={`h-8 w-8 ${dashboardData.leagueOverview.disputesOpen > 0 ? 'text-red-400' : 'text-green-400'}`} />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400">Total Trades</p>
                <p className="text-2xl font-bold text-white">{dashboardData.leagueOverview.totalTrades}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-400" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400">Collected Fees</p>
                <p className="text-2xl font-bold text-white">
                  ${dashboardData.financialSummary.collections.collectedAmount}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-400" />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 mb-6">
          <div className="flex space-x-1 p-1">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center px-4 py-3 rounded text-sm transition-colors ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
                {tab.key === 'issues' && dashboardData.activeIssues.length > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
                    {dashboardData.activeIssues.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Upcoming Deadlines */}
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Calendar className="h-5 w-5 text-yellow-400 mr-2" />
                  Upcoming Deadlines
                </h3>
                <div className="space-y-3">
                  {dashboardData.leagueOverview.upcomingDeadlines.map((deadline, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-yellow-900/20 border border-yellow-700 rounded-lg">
                      <div>
                        <div className="font-medium text-white">{deadline.type}</div>
                        <div className="text-sm text-gray-400">{deadline.description}</div>
                      </div>
                      <div className="text-yellow-400 font-medium">{deadline.date}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Activity Preview */}
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center">
                    <Activity className="h-5 w-5 text-blue-400 mr-2" />
                    Recent Activity
                  </h3>
                  <button
                    onClick={() => setActiveTab('activity')}
                    className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-3">
                  {dashboardData.recentActivity.slice(0, 5).map((activity, index) => (
                    <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                      <div>
                        <div className="font-medium text-white">{activity.description}</div>
                        <div className="text-sm text-gray-400">by {activity.userName}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-400">{new Date(activity.timestamp).toLocaleDateString()}</div>
                        {activity.requiresApproval && (
                          <span className="inline-block mt-1 px-2 py-1 bg-yellow-600 text-white text-xs rounded">
                            Needs Approval
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Issues Preview */}
              {dashboardData.activeIssues.length > 0 && (
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center">
                      <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
                      Active Issues
                    </h3>
                    <button
                      onClick={() => setActiveTab('issues')}
                      className="text-red-400 hover:text-red-300 text-sm transition-colors"
                    >
                      Manage Issues
                    </button>
                  </div>
                  <div className="space-y-3">
                    {dashboardData.activeIssues.slice(0, 3).map((issue, index) => (
                      <div key={issue.id} className={`p-3 rounded-lg border ${
                        issue.priority === 'urgent' ? 'bg-red-900/20 border-red-700' :
                        issue.priority === 'high' ? 'bg-orange-900/20 border-orange-700' :
                        'bg-gray-700 border-gray-600'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-white">{issue.subject}</div>
                            <div className="text-sm text-gray-400">Reported by {issue.reportedBy}</div>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              issue.priority === 'urgent' ? 'bg-red-600 text-white' :
                              issue.priority === 'high' ? 'bg-orange-600 text-white' :
                              issue.priority === 'medium' ? 'bg-yellow-600 text-white' :
                              'bg-blue-600 text-white'
                            }`}>
                              {issue.priority.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Members Tab */}
          {activeTab === 'members' && (
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white">Member Engagement</h3>
                  <div className="flex space-x-2">
                    <button className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors">
                      Send Message
                    </button>
                    <button className="px-3 py-2 text-sm border border-gray-600 hover:bg-gray-700 text-white rounded transition-colors">
                      Export Data
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {dashboardData.memberEngagement.map((member, index) => (
                    <motion.div
                      key={member.userId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-4 bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-3 h-3 rounded-full ${
                          member.riskLevel === 'low' ? 'bg-green-500' :
                          member.riskLevel === 'medium' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}></div>
                        <div>
                          <div className="font-medium text-white">{member.userName}</div>
                          <div className="text-sm text-gray-400">
                            Last active: {new Date(member.lastActivity).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-6">
                        <div className="text-center">
                          <div className="text-sm font-medium text-white">{member.activityScore.toFixed(0)}</div>
                          <div className="text-xs text-gray-400">Activity</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium text-white">{member.lineupSettingFrequency.toFixed(0)}%</div>
                          <div className="text-xs text-gray-400">Lineup Sets</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium text-white">{member.tradeParticipation.toFixed(0)}%</div>
                          <div className="text-xs text-gray-400">Trade Activity</div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <button className="p-2 text-gray-400 hover:text-white transition-colors">
                            <Mail className="h-4 w-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-white transition-colors">
                            <Eye className="h-4 w-4" />
                          </button>
                          {member.riskLevel === 'high' && (
                            <button
                              onClick={() => commissionerService.flagInactiveMember(member.userId, leagueId, commissionerId)}
                              className="p-2 text-red-400 hover:text-red-300 transition-colors"
                            >
                              <AlertTriangle className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white">League Activity</h3>
                  <div className="flex space-x-2">
                    <select className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm">
                      <option value="all">All Activities</option>
                      <option value="trade">Trades</option>
                      <option value="waiver">Waivers</option>
                      <option value="lineup">Lineups</option>
                      <option value="admin">Admin Actions</option>
                    </select>
                    <button className="px-3 py-2 text-sm border border-gray-600 hover:bg-gray-700 text-white rounded transition-colors">
                      Export
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {dashboardData.recentActivity.map((activity, index) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 rounded-lg border ${
                        activity.requiresApproval 
                          ? 'bg-yellow-900/20 border-yellow-700' 
                          : 'bg-gray-700 border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              activity.type === 'trade' ? 'bg-purple-600 text-white' :
                              activity.type === 'waiver' ? 'bg-blue-600 text-white' :
                              activity.type === 'lineup' ? 'bg-green-600 text-white' :
                              activity.type === 'admin' ? 'bg-red-600 text-white' :
                              'bg-gray-600 text-white'
                            }`}>
                              {activity.type.toUpperCase()}
                            </span>
                            <span className="font-medium text-white">{activity.userName}</span>
                            <span className="text-gray-400 text-sm">
                              {new Date(activity.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-gray-300">{activity.description}</div>
                          {activity.requiresApproval && (
                            <div className="mt-2 flex space-x-2">
                              <button
                                onClick={() => handleApproveActivity(activity.id)}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                              >
                                Approve
                              </button>
                              <button className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors">
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedActivity(activity)}
                            className="p-2 text-gray-400 hover:text-white transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Issues Tab */}
          {activeTab === 'issues' && (
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white">Issue Management</h3>
                  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors">
                    Create Issue
                  </button>
                </div>
                
                {dashboardData.activeIssues.length > 0 ? (
                  <div className="space-y-4">
                    {dashboardData.activeIssues.map((issue, index) => (
                      <motion.div
                        key={issue.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-4 rounded-lg border ${
                          issue.priority === 'urgent' ? 'bg-red-900/20 border-red-700' :
                          issue.priority === 'high' ? 'bg-orange-900/20 border-orange-700' :
                          issue.priority === 'medium' ? 'bg-yellow-900/20 border-yellow-700' :
                          'bg-gray-700 border-gray-600'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                issue.priority === 'urgent' ? 'bg-red-600 text-white' :
                                issue.priority === 'high' ? 'bg-orange-600 text-white' :
                                issue.priority === 'medium' ? 'bg-yellow-600 text-white' :
                                'bg-blue-600 text-white'
                              }`}>
                                {issue.priority.toUpperCase()}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs ${
                                issue.type === 'dispute' ? 'bg-purple-600 text-white' :
                                issue.type === 'rule_violation' ? 'bg-red-600 text-white' :
                                issue.type === 'inactive_team' ? 'bg-yellow-600 text-white' :
                                'bg-gray-600 text-white'
                              }`}>
                                {issue.type.replace('_', ' ').toUpperCase()}
                              </span>
                              <span className="text-gray-400 text-sm">
                                {new Date(issue.reportedAt).toLocaleDateString()}
                              </span>
                            </div>
                            <h4 className="font-medium text-white mb-2">{issue.subject}</h4>
                            <p className="text-gray-300 text-sm mb-3">{issue.description}</p>
                            <div className="text-xs text-gray-400">
                              Reported by: {issue.reportedBy} | 
                              Involved: {issue.involvedUsers.join(', ')}
                            </div>
                          </div>
                          <div className="flex space-x-2 ml-4">
                            <button
                              onClick={() => handleResolveIssue(issue.id, 'Resolved by commissioner')}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                            >
                              Resolve
                            </button>
                            <button className="px-3 py-1 border border-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors">
                              Investigate
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">No Active Issues</h3>
                    <p className="text-gray-400">Your league is running smoothly!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Other tabs would be implemented similarly */}
        </div>
      </div>
    </div>
  )
}