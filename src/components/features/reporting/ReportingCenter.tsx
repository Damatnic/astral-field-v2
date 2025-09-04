'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileText,
  Download,
  Mail,
  Calendar,
  BarChart,
  DollarSign,
  Users,
  TrendingUp,
  Clock,
  Filter,
  Share,
  Eye,
  Plus,
  Settings,
  RefreshCw
} from 'lucide-react'
import leagueReporting, { 
  type LeagueReport, 
  type ReportTemplate,
  type SeasonSummaryReport,
  type WeeklyRecapReport,
  type MemberActivityReport,
  type FinancialReport
} from '@/services/reporting/leagueReporting'

interface ReportingCenterProps {
  leagueId: string
  commissionerId: string
  season: number
}

export default function ReportingCenter({ leagueId, commissionerId, season }: ReportingCenterProps) {
  const [reports, setReports] = useState<LeagueReport[]>([])
  const [templates, setTemplates] = useState<ReportTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'reports' | 'templates' | 'generate'>('reports')
  const [selectedReport, setSelectedReport] = useState<LeagueReport | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [generatingReport, setGeneratingReport] = useState(false)

  useEffect(() => {
    loadReportingData()
  }, [leagueId, season])

  const loadReportingData = async () => {
    setIsLoading(true)
    try {
      const [reportTemplates] = await Promise.all([
        leagueReporting.getReportTemplates(leagueId)
        // Would also fetch existing reports
      ])
      
      setTemplates(reportTemplates)
      // setReports(existingReports) - would load from database
    } catch (error) {
      console.error('Failed to load reporting data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateReport = async (type: LeagueReport['type'], parameters: any = {}) => {
    setGeneratingReport(true)
    try {
      let reportData: any = null
      
      switch (type) {
        case 'season_summary':
          reportData = await leagueReporting.generateSeasonSummary(leagueId, season)
          break
        case 'weekly_recap':
          reportData = await leagueReporting.generateWeeklyRecap(leagueId, parameters.week, season)
          break
        case 'member_activity':
          reportData = await leagueReporting.generateMemberActivityReport(
            leagueId, 
            parameters.startDate, 
            parameters.endDate
          )
          break
        case 'financial':
          reportData = await leagueReporting.generateFinancialReport(leagueId, season)
          break
      }

      const newReport: LeagueReport = {
        id: crypto.randomUUID(),
        leagueId,
        title: `${type.replace('_', ' ')} Report - ${new Date().toLocaleDateString()}`,
        type,
        generatedAt: new Date().toISOString(),
        generatedBy: commissionerId,
        period: {
          startDate: parameters.startDate || `${season}-09-01`,
          endDate: parameters.endDate || `${season}-12-31`,
          season,
          week: parameters.week
        },
        data: reportData,
        format: 'json',
        isPublic: false
      }

      setReports([newReport, ...reports])
      setSelectedReport(newReport)
    } catch (error) {
      console.error('Failed to generate report:', error)
    } finally {
      setGeneratingReport(false)
    }
  }

  const handleExportReport = async (report: LeagueReport, format: 'pdf' | 'csv' | 'html') => {
    try {
      const blob = await leagueReporting.exportReport(report, format)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${report.title.replace(/\s+/g, '_')}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export report:', error)
    }
  }

  const handleEmailReport = async (reportId: string, recipients: string[]) => {
    try {
      await leagueReporting.emailReport(reportId, recipients)
      // Show success message
    } catch (error) {
      console.error('Failed to email report:', error)
    }
  }

  const reportTypes = [
    {
      type: 'season_summary',
      title: 'Season Summary',
      description: 'Comprehensive overview of the entire season',
      icon: BarChart,
      color: 'blue',
      generateAction: () => handleGenerateReport('season_summary')
    },
    {
      type: 'weekly_recap',
      title: 'Weekly Recap',
      description: 'Detailed analysis of a specific week',
      icon: Calendar,
      color: 'green',
      generateAction: () => {
        const week = prompt('Enter week number (1-17):')
        if (week && !isNaN(parseInt(week))) {
          handleGenerateReport('weekly_recap', { week: parseInt(week) })
        }
      }
    },
    {
      type: 'member_activity',
      title: 'Member Activity',
      description: 'League member engagement and participation analysis',
      icon: Users,
      color: 'purple',
      generateAction: () => {
        const startDate = prompt('Enter start date (YYYY-MM-DD):')
        const endDate = prompt('Enter end date (YYYY-MM-DD):')
        if (startDate && endDate) {
          handleGenerateReport('member_activity', { startDate, endDate })
        }
      }
    },
    {
      type: 'financial',
      title: 'Financial Report',
      description: 'League finances, collections, and payouts',
      icon: DollarSign,
      color: 'yellow',
      generateAction: () => handleGenerateReport('financial')
    }
  ]

  const tabs = [
    { key: 'reports', label: 'Generated Reports', icon: FileText },
    { key: 'templates', label: 'Report Templates', icon: Settings },
    { key: 'generate', label: 'Generate New', icon: Plus }
  ]

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="text-center py-12">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-white mb-2">Loading Reporting Center...</h3>
          <p className="text-gray-400">Preparing league reports and analytics</p>
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
            <div className="p-2 bg-green-900/30 rounded-lg">
              <FileText className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">League Reporting Center</h2>
              <p className="text-sm text-gray-400">Generate comprehensive league analytics and reports</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={loadReportingData}
              className="flex items-center px-4 py-2 border border-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
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
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {reports.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Reports List */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Generated Reports</h3>
                {reports.map((report, index) => (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`bg-gray-800 rounded-lg border p-4 cursor-pointer transition-colors ${
                      selectedReport?.id === report.id 
                        ? 'border-blue-500 bg-blue-900/10' 
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                    onClick={() => setSelectedReport(report)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            report.type === 'season_summary' ? 'bg-blue-600 text-white' :
                            report.type === 'weekly_recap' ? 'bg-green-600 text-white' :
                            report.type === 'member_activity' ? 'bg-purple-600 text-white' :
                            report.type === 'financial' ? 'bg-yellow-600 text-white' :
                            'bg-gray-600 text-white'
                          }`}>
                            {report.type.replace('_', ' ').toUpperCase()}
                          </span>
                          {report.period.week && (
                            <span className="text-xs text-gray-400">Week {report.period.week}</span>
                          )}
                        </div>
                        <h4 className="font-medium text-white mb-1">{report.title}</h4>
                        <div className="text-sm text-gray-400">
                          Generated {new Date(report.generatedAt).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleExportReport(report, 'pdf')
                          }}
                          className="p-2 text-gray-400 hover:text-white transition-colors"
                          title="Export as PDF"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            const recipients = prompt('Enter email addresses (comma-separated):')
                            if (recipients) {
                              handleEmailReport(report.id, recipients.split(',').map(e => e.trim()))
                            }
                          }}
                          className="p-2 text-gray-400 hover:text-white transition-colors"
                          title="Email Report"
                        >
                          <Mail className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Report Preview */}
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Report Preview</h3>
                {selectedReport ? (
                  <ReportPreview report={selectedReport} />
                ) : (
                  <div className="text-center py-12">
                    <Eye className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">Select a report to preview its contents</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
              <FileText className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Reports Generated</h3>
              <p className="text-gray-400 mb-4">Create your first league report to get started</p>
              <button
                onClick={() => setActiveTab('generate')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Generate Report
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'generate' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reportTypes.map((reportType, index) => (
            <motion.div
              key={reportType.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-800 rounded-lg border border-gray-700 p-6"
            >
              <div className="flex items-start space-x-4">
                <div className={`p-3 rounded-lg ${
                  reportType.color === 'blue' ? 'bg-blue-900/30' :
                  reportType.color === 'green' ? 'bg-green-900/30' :
                  reportType.color === 'purple' ? 'bg-purple-900/30' :
                  reportType.color === 'yellow' ? 'bg-yellow-900/30' :
                  'bg-gray-700'
                }`}>
                  <reportType.icon className={`h-6 w-6 ${
                    reportType.color === 'blue' ? 'text-blue-400' :
                    reportType.color === 'green' ? 'text-green-400' :
                    reportType.color === 'purple' ? 'text-purple-400' :
                    reportType.color === 'yellow' ? 'text-yellow-400' :
                    'text-gray-400'
                  }`} />
                </div>
                
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2">{reportType.title}</h3>
                  <p className="text-gray-400 text-sm mb-4">{reportType.description}</p>
                  
                  <button
                    onClick={reportType.generateAction}
                    disabled={generatingReport}
                    className={`w-full py-2 rounded-lg font-medium transition-colors ${
                      generatingReport 
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : `${
                          reportType.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' :
                          reportType.color === 'green' ? 'bg-green-600 hover:bg-green-700' :
                          reportType.color === 'purple' ? 'bg-purple-600 hover:bg-purple-700' :
                          reportType.color === 'yellow' ? 'bg-yellow-600 hover:bg-yellow-700' :
                          'bg-gray-600 hover:bg-gray-700'
                        } text-white`
                    }`}
                  >
                    {generatingReport ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-transparent rounded-full mr-2"></div>
                        Generating...
                      </div>
                    ) : (
                      'Generate Report'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Report Templates</h3>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </button>
          </div>

          {templates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template, index) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gray-800 rounded-lg border border-gray-700 p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-white">{template.name}</h4>
                    <span className={`px-2 py-1 rounded text-xs ${
                      template.isActive 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-600 text-gray-300'
                    }`}>
                      {template.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <p className="text-gray-400 text-sm mb-3">{template.description}</p>
                  
                  {template.schedule && (
                    <div className="flex items-center text-xs text-gray-500 mb-3">
                      <Clock className="h-3 w-3 mr-1" />
                      {template.schedule.frequency} at {template.schedule.time || 'N/A'}
                    </div>
                  )}
                  
                  <div className="flex space-x-2">
                    <button className="flex-1 py-1 px-2 text-xs border border-gray-600 hover:bg-gray-700 text-white rounded transition-colors">
                      Edit
                    </button>
                    <button className="flex-1 py-1 px-2 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors">
                      Run Now
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
              <Settings className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Templates Created</h3>
              <p className="text-gray-400 mb-4">Create automated report templates to streamline reporting</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Create Template
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Report Preview Component
function ReportPreview({ report }: { report: LeagueReport }) {
  if (report.type === 'season_summary') {
    const data = report.data as SeasonSummaryReport
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-700 p-3 rounded">
            <div className="text-sm text-gray-400">Total Teams</div>
            <div className="text-lg font-semibold text-white">{data.overview?.totalTeams || 'N/A'}</div>
          </div>
          <div className="bg-gray-700 p-3 rounded">
            <div className="text-sm text-gray-400">Total Trades</div>
            <div className="text-lg font-semibold text-white">{data.overview?.totalTrades || 'N/A'}</div>
          </div>
        </div>
        
        {data.awards && (
          <div className="bg-gray-700 p-3 rounded">
            <div className="text-sm text-gray-400 mb-2">Season Champion</div>
            <div className="font-medium text-white">{data.awards.champion?.teamName || 'N/A'}</div>
            <div className="text-sm text-gray-400">{data.awards.champion?.finalRecord}</div>
          </div>
        )}
      </div>
    )
  }

  if (report.type === 'weekly_recap') {
    const data = report.data as WeeklyRecapReport
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-white">Week {data.week}</div>
          <div className="text-gray-400">Season {data.season}</div>
        </div>
        
        {data.highlights && (
          <div className="bg-gray-700 p-3 rounded">
            <div className="text-sm text-gray-400 mb-2">Highest Score</div>
            <div className="font-medium text-white">{data.highlights.highestScore?.teamName}</div>
            <div className="text-lg font-semibold text-green-400">{data.highlights.highestScore?.score} pts</div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="text-sm text-gray-400">Report Type:</div>
      <div className="text-white capitalize">{report.type.replace('_', ' ')}</div>
      <div className="text-sm text-gray-400 mt-4">Generated:</div>
      <div className="text-white">{new Date(report.generatedAt).toLocaleString()}</div>
    </div>
  )
}