'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus,
  Settings,
  Play,
  Pause,
  Edit,
  Trash2,
  Clock,
  Zap,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Users,
  Mail,
  Shield,
  Activity
} from 'lucide-react'
import leagueAutomation, { 
  type AutomationRule, 
  type LeagueEnforcementSettings,
  type AutomationLog,
  type RuleViolation
} from '@/services/automation/leagueAutomation'

interface AutomationManagerProps {
  leagueId: string
  commissionerId: string
}

export default function AutomationManager({ leagueId, commissionerId }: AutomationManagerProps) {
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [enforcementSettings, setEnforcementSettings] = useState<LeagueEnforcementSettings | null>(null)
  const [violations, setViolations] = useState<RuleViolation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'rules' | 'enforcement' | 'logs' | 'violations'>('rules')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null)

  useEffect(() => {
    loadAutomationData()
  }, [leagueId])

  const loadAutomationData = async () => {
    setIsLoading(true)
    try {
      const [automationRules, settings] = await Promise.all([
        leagueAutomation.getLeagueAutomationRules(leagueId),
        leagueAutomation.getEnforcementSettings(leagueId)
      ])
      
      setRules(automationRules)
      setEnforcementSettings(settings)
      
      // Detect any current violations
      const currentViolations = await leagueAutomation.detectRuleViolations(leagueId)
      setViolations(currentViolations)
    } catch (error) {
      console.error('Failed to load automation data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      await leagueAutomation.updateAutomationRule(ruleId, { enabled })
      setRules(rules.map(rule => 
        rule.id === ruleId ? { ...rule, enabled } : rule
      ))
    } catch (error) {
      console.error('Failed to toggle rule:', error)
    }
  }

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this automation rule?')) {
      return
    }
    
    try {
      // Would implement deleteAutomationRule in the service
      setRules(rules.filter(rule => rule.id !== ruleId))
    } catch (error) {
      console.error('Failed to delete rule:', error)
    }
  }

  const handleUpdateEnforcement = async (updates: Partial<LeagueEnforcementSettings>) => {
    if (!enforcementSettings) return
    
    try {
      await leagueAutomation.updateEnforcementSettings(leagueId, updates)
      setEnforcementSettings({ ...enforcementSettings, ...updates })
    } catch (error) {
      console.error('Failed to update enforcement settings:', error)
    }
  }

  const tabs = [
    { key: 'rules', label: 'Automation Rules', icon: Zap },
    { key: 'enforcement', label: 'Rule Enforcement', icon: Shield },
    { key: 'violations', label: 'Violations', icon: AlertTriangle },
    { key: 'logs', label: 'Activity Logs', icon: Activity }
  ]

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="text-center py-12">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-white mb-2">Loading Automation Settings...</h3>
          <p className="text-gray-400">Configuring league automation rules</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-900/30 rounded-lg">
              <Zap className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">League Automation</h2>
              <p className="text-sm text-gray-400">Automated rule enforcement and league management</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Rule
            </button>
            <button
              onClick={loadAutomationData}
              className="px-4 py-2 border border-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-700 rounded-lg p-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center px-4 py-2 rounded text-sm transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
              {tab.key === 'violations' && violations.filter(v => !v.resolved).length > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
                  {violations.filter(v => !v.resolved).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          {rules.length > 0 ? (
            rules.map((rule, index) => (
              <motion.div
                key={rule.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gray-800 rounded-lg border border-gray-700 p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">{rule.name}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        rule.enabled 
                          ? 'bg-green-600 text-white' 
                          : 'bg-gray-600 text-gray-300'
                      }`}>
                        {rule.enabled ? 'Active' : 'Disabled'}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        rule.trigger.type === 'schedule' ? 'bg-blue-600 text-white' :
                        rule.trigger.type === 'event' ? 'bg-purple-600 text-white' :
                        'bg-gray-600 text-white'
                      }`}>
                        {rule.trigger.type === 'schedule' ? 'Scheduled' :
                         rule.trigger.type === 'event' ? 'Event-based' :
                         'Conditional'}
                      </span>
                    </div>
                    
                    <p className="text-gray-400 mb-4">{rule.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Trigger</div>
                        <div className="text-sm text-white">
                          {rule.trigger.type === 'schedule' && rule.trigger.schedule && (
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {rule.trigger.schedule.frequency} at {rule.trigger.schedule.time || 'N/A'}
                            </span>
                          )}
                          {rule.trigger.type === 'event' && (
                            <span className="flex items-center">
                              <Zap className="h-3 w-3 mr-1" />
                              {rule.trigger.event}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Actions</div>
                        <div className="text-sm text-white">
                          {rule.actions.map((action, i) => (
                            <span key={i} className="inline-block bg-gray-700 rounded px-2 py-1 mr-1 mb-1 text-xs">
                              {action.type.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Execution</div>
                        <div className="text-sm text-white">
                          {rule.executionCount} times
                          {rule.lastExecuted && (
                            <div className="text-xs text-gray-400">
                              Last: {new Date(rule.lastExecuted).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleToggleRule(rule.id, !rule.enabled)}
                      className={`p-2 rounded transition-colors ${
                        rule.enabled
                          ? 'text-yellow-400 hover:bg-yellow-900/20'
                          : 'text-green-400 hover:bg-green-900/20'
                      }`}
                    >
                      {rule.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => setEditingRule(rule)}
                      className="p-2 text-gray-400 hover:text-white transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-2 text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
              <Zap className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Automation Rules</h3>
              <p className="text-gray-400 mb-4">Create your first automation rule to streamline league management</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Create Rule
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'enforcement' && enforcementSettings && (
        <div className="space-y-6">
          {/* Trade Rules */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Trade Enforcement</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center space-x-3 mb-4">
                  <input
                    type="checkbox"
                    checked={enforcementSettings.tradeDeadline.enabled}
                    onChange={(e) => handleUpdateEnforcement({
                      tradeDeadline: { ...enforcementSettings.tradeDeadline, enabled: e.target.checked }
                    })}
                    className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-white">Enforce Trade Deadline</span>
                </label>
                
                {enforcementSettings.tradeDeadline.enabled && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Deadline Week</label>
                      <input
                        type="number"
                        min="1"
                        max="17"
                        value={enforcementSettings.tradeDeadline.week}
                        onChange={(e) => handleUpdateEnforcement({
                          tradeDeadline: { ...enforcementSettings.tradeDeadline, week: parseInt(e.target.value) }
                        })}
                        className="w-20 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                      />
                    </div>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={enforcementSettings.tradeDeadline.automaticEnforcement}
                        onChange={(e) => handleUpdateEnforcement({
                          tradeDeadline: { ...enforcementSettings.tradeDeadline, automaticEnforcement: e.target.checked }
                        })}
                        className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-300">Automatic Enforcement</span>
                    </label>
                  </div>
                )}
              </div>
              
              <div>
                <label className="flex items-center space-x-3 mb-4">
                  <input
                    type="checkbox"
                    checked={enforcementSettings.tradeReview.enabled}
                    onChange={(e) => handleUpdateEnforcement({
                      tradeReview: { ...enforcementSettings.tradeReview, enabled: e.target.checked }
                    })}
                    className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-white">Trade Review System</span>
                </label>
                
                {enforcementSettings.tradeReview.enabled && (
                  <div className="space-y-3">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={enforcementSettings.tradeReview.requireCommissionerApproval}
                        onChange={(e) => handleUpdateEnforcement({
                          tradeReview: { ...enforcementSettings.tradeReview, requireCommissionerApproval: e.target.checked }
                        })}
                        className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-300">Require Commissioner Approval</span>
                    </label>
                    
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Review Period (hours)</label>
                      <input
                        type="number"
                        min="1"
                        max="168"
                        value={enforcementSettings.tradeReview.reviewPeriodHours}
                        onChange={(e) => handleUpdateEnforcement({
                          tradeReview: { ...enforcementSettings.tradeReview, reviewPeriodHours: parseInt(e.target.value) }
                        })}
                        className="w-20 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Lineup Rules */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Lineup Enforcement</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center space-x-3 mb-4">
                  <input
                    type="checkbox"
                    checked={enforcementSettings.lineupDeadlines.strictEnforcement}
                    onChange={(e) => handleUpdateEnforcement({
                      lineupDeadlines: { ...enforcementSettings.lineupDeadlines, strictEnforcement: e.target.checked }
                    })}
                    className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-white">Strict Lineup Deadlines</span>
                </label>
                
                <label className="flex items-center space-x-3 mb-4">
                  <input
                    type="checkbox"
                    checked={enforcementSettings.lineupDeadlines.autoSetOptimalLineup}
                    onChange={(e) => handleUpdateEnforcement({
                      lineupDeadlines: { ...enforcementSettings.lineupDeadlines, autoSetOptimalLineup: e.target.checked }
                    })}
                    className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-white">Auto-Set Optimal Lineups</span>
                </label>
              </div>
              
              <div>
                <label className="flex items-center space-x-3 mb-4">
                  <input
                    type="checkbox"
                    checked={enforcementSettings.lineupDeadlines.penaltySystem.enabled}
                    onChange={(e) => handleUpdateEnforcement({
                      lineupDeadlines: {
                        ...enforcementSettings.lineupDeadlines,
                        penaltySystem: { ...enforcementSettings.lineupDeadlines.penaltySystem, enabled: e.target.checked }
                      }
                    })}
                    className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-white">Penalty System</span>
                </label>
                
                {enforcementSettings.lineupDeadlines.penaltySystem.enabled && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">First Offense</label>
                      <select
                        value={enforcementSettings.lineupDeadlines.penaltySystem.firstOffense}
                        onChange={(e) => handleUpdateEnforcement({
                          lineupDeadlines: {
                            ...enforcementSettings.lineupDeadlines,
                            penaltySystem: {
                              ...enforcementSettings.lineupDeadlines.penaltySystem,
                              firstOffense: e.target.value as any
                            }
                          }
                        })}
                        className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white w-full"
                      >
                        <option value="warning">Warning</option>
                        <option value="bench_player">Bench Random Player</option>
                        <option value="lose_waiver_priority">Lose Waiver Priority</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Activity Monitoring */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Activity Monitoring</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center space-x-3 mb-4">
                  <input
                    type="checkbox"
                    checked={enforcementSettings.activityMonitoring.enabled}
                    onChange={(e) => handleUpdateEnforcement({
                      activityMonitoring: { ...enforcementSettings.activityMonitoring, enabled: e.target.checked }
                    })}
                    className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-white">Monitor Team Activity</span>
                </label>
                
                {enforcementSettings.activityMonitoring.enabled && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Inactivity Threshold (days)</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={enforcementSettings.activityMonitoring.inactivityThresholdDays}
                      onChange={(e) => handleUpdateEnforcement({
                        activityMonitoring: { ...enforcementSettings.activityMonitoring, inactivityThresholdDays: parseInt(e.target.value) }
                      })}
                      className="w-20 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    />
                  </div>
                )}
              </div>
              
              <div>
                <label className="flex items-center space-x-3 mb-4">
                  <input
                    type="checkbox"
                    checked={enforcementSettings.activityMonitoring.autoRemovalEnabled}
                    onChange={(e) => handleUpdateEnforcement({
                      activityMonitoring: { ...enforcementSettings.activityMonitoring, autoRemovalEnabled: e.target.checked }
                    })}
                    className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-white">Auto-Remove Inactive Teams</span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={enforcementSettings.activityMonitoring.replacementTeamEnabled}
                    onChange={(e) => handleUpdateEnforcement({
                      activityMonitoring: { ...enforcementSettings.activityMonitoring, replacementTeamEnabled: e.target.checked }
                    })}
                    className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-white">Enable Replacement Teams</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'violations' && (
        <div className="space-y-4">
          {violations.length > 0 ? (
            violations.map((violation, index) => (
              <motion.div
                key={violation.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-gray-800 rounded-lg border p-4 ${
                  violation.resolved 
                    ? 'border-green-700 bg-green-900/10' 
                    : violation.severity === 'severe' 
                      ? 'border-red-700 bg-red-900/10'
                      : violation.severity === 'major'
                        ? 'border-orange-700 bg-orange-900/10'
                        : 'border-yellow-700 bg-yellow-900/10'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        violation.resolved ? 'bg-green-600 text-white' :
                        violation.severity === 'severe' ? 'bg-red-600 text-white' :
                        violation.severity === 'major' ? 'bg-orange-600 text-white' :
                        'bg-yellow-600 text-white'
                      }`}>
                        {violation.resolved ? 'RESOLVED' : violation.severity.toUpperCase()}
                      </span>
                      <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs font-medium">
                        {violation.ruleType.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="text-gray-400 text-sm">
                        {new Date(violation.detectedAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="font-medium text-white mb-2">User: {violation.userId}</div>
                    <div className="text-gray-300 mb-2">{violation.description}</div>
                    
                    {violation.actionTaken && (
                      <div className="text-sm text-green-400">Action: {violation.actionTaken}</div>
                    )}
                    
                    {violation.resolved && violation.resolvedAt && (
                      <div className="text-xs text-gray-500 mt-2">
                        Resolved: {new Date(violation.resolvedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  
                  {!violation.resolved && (
                    <div className="flex space-x-2 ml-4">
                      <button className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors">
                        Resolve
                      </button>
                      <button className="px-3 py-1 border border-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors">
                        Investigate
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          ) : (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Rule Violations</h3>
              <p className="text-gray-400">Your league is following all established rules!</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}