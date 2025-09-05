'use client'

import { useEffect, useState } from 'react'
import { 
  Activity, 
  Database, 
  Server, 
  Users, 
  Clock,
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Globe,
  Zap
} from 'lucide-react'
import { useApiCache } from '@/hooks/useCache'

interface HealthData {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  uptime: number
  responseTime: string
  environment: string
  version: string
  checks: {
    database: 'pass' | 'fail'
    environment: 'pass' | 'fail'
  }
  database: {
    connected: boolean
    responseTime: string
  }
}

interface InfoData {
  status: string
  deployment: {
    autoInitialized: boolean
    usersInDatabase: number
    demoUsersAvailable: number
  }
  demoCredentials: {
    email: string
    password: string
    note: string
  }
  loginUrl: string
  message: string
}

interface ServiceStatus {
  name: string
  status: 'operational' | 'degraded' | 'outage'
  responseTime: number
  uptime: number
}

export default function StatusPage() {
  const [lastUpdated, setLastUpdated] = useState(new Date())
  
  const { 
    data: healthData, 
    loading: healthLoading, 
    error: healthError,
    refetch: refetchHealth
  } = useApiCache<HealthData>('/api/health', { ttl: 30 })
  
  const { 
    data: infoData, 
    loading: infoLoading, 
    refetch: refetchInfo
  } = useApiCache<InfoData>('/api/info', { ttl: 60 })

  const [services, setServices] = useState<ServiceStatus[]>([])

  useEffect(() => {
    // Simulate checking multiple services
    const checkServices = async () => {
      const serviceChecks = [
        { name: 'Web Application', endpoint: '/api/health' },
        { name: 'Database', endpoint: '/api/health' },
        { name: 'Authentication', endpoint: '/api/info' },
      ]

      const results = await Promise.allSettled(
        serviceChecks.map(async (service) => {
          const start = performance.now()
          try {
            const response = await fetch(service.endpoint)
            const end = performance.now()
            return {
              name: service.name,
              status: response.ok ? 'operational' : 'degraded',
              responseTime: Math.round(end - start),
              uptime: 99.9 // This would come from monitoring service
            } as ServiceStatus
          } catch (error) {
            return {
              name: service.name,
              status: 'outage',
              responseTime: 0,
              uptime: 0
            } as ServiceStatus
          }
        })
      )

      const validResults = results
        .filter((result): result is PromiseFulfilledResult<ServiceStatus> => 
          result.status === 'fulfilled'
        )
        .map(result => result.value)

      setServices(validResults)
    }

    checkServices()
    const interval = setInterval(checkServices, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const handleRefresh = async () => {
    setLastUpdated(new Date())
    await Promise.all([refetchHealth(), refetchInfo()])
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
      case 'healthy':
      case 'pass':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'degraded':
      case 'unhealthy':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
      case 'outage':
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
      case 'healthy':
      case 'pass':
        return 'text-green-400'
      case 'degraded':
      case 'unhealthy':
        return 'text-yellow-400'
      case 'outage':
      case 'fail':
        return 'text-red-400'
      default:
        return 'text-gray-400'
    }
  }

  const overallStatus = healthData?.status === 'healthy' && 
                       services.every(s => s.status === 'operational') 
                       ? 'operational' : 'degraded'

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Activity className="w-8 h-8 text-blue-500" />
            <h1 className="text-3xl font-bold text-white">
              Astral Field Status
            </h1>
          </div>
          <div className="flex items-center justify-center gap-2 text-lg">
            {getStatusIcon(overallStatus)}
            <span className={`font-semibold ${getStatusColor(overallStatus)}`}>
              {overallStatus === 'operational' ? 'All Systems Operational' : 'Some Systems Degraded'}
            </span>
          </div>
          <p className="text-gray-400 mt-2">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
          <button
            onClick={handleRefresh}
            className="mt-2 flex items-center gap-2 mx-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Status
          </button>
        </div>

        {/* Current Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Overall Health */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <Server className="w-8 h-8 text-blue-500" />
              {getStatusIcon(healthData?.status || 'unknown')}
            </div>
            <h3 className="font-semibold text-white mb-1">System Health</h3>
            <p className={`text-sm ${getStatusColor(healthData?.status || 'unknown')}`}>
              {healthData?.status || 'Unknown'}
            </p>
            {healthData && (
              <p className="text-xs text-gray-400 mt-2">
                Response: {healthData.responseTime}
              </p>
            )}
          </div>

          {/* Database */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <Database className="w-8 h-8 text-green-500" />
              {getStatusIcon(healthData?.checks.database || 'unknown')}
            </div>
            <h3 className="font-semibold text-white mb-1">Database</h3>
            <p className={`text-sm ${getStatusColor(healthData?.checks.database || 'unknown')}`}>
              {healthData?.database.connected ? 'Connected' : 'Disconnected'}
            </p>
            {healthData?.database && (
              <p className="text-xs text-gray-400 mt-2">
                Response: {healthData.database.responseTime}
              </p>
            )}
          </div>

          {/* Users */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 text-purple-500" />
              {infoData?.deployment.usersInDatabase ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-500" />
              )}
            </div>
            <h3 className="font-semibold text-white mb-1">Active Users</h3>
            <p className="text-sm text-green-400">
              {infoData?.deployment.usersInDatabase || 0} registered
            </p>
            <p className="text-xs text-gray-400 mt-2">
              {infoData?.deployment.demoUsersAvailable || 0} demo accounts
            </p>
          </div>

          {/* Deployment */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <Globe className="w-8 h-8 text-cyan-500" />
              {infoData?.deployment.autoInitialized ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
            </div>
            <h3 className="font-semibold text-white mb-1">Deployment</h3>
            <p className="text-sm text-green-400">
              {infoData?.deployment.autoInitialized ? 'Initialized' : 'Pending'}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Env: {healthData?.environment || 'unknown'}
            </p>
          </div>
        </div>

        {/* Services Status */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-500" />
            Service Status
          </h2>
          <div className="space-y-4">
            {services.map((service) => (
              <div key={service.name} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(service.status)}
                  <div>
                    <h3 className="font-medium text-white">{service.name}</h3>
                    <p className={`text-sm ${getStatusColor(service.status)}`}>
                      {service.status}
                    </p>
                  </div>
                </div>
                <div className="text-right text-sm text-gray-400">
                  <div>Response: {service.responseTime}ms</div>
                  <div>Uptime: {service.uptime}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Application Info */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-blue-500" />
              Application Info
            </h2>
            {infoLoading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-700 rounded"></div>
                <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-700 rounded w-1/2"></div>
              </div>
            ) : infoData ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className="text-green-400">{infoData.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Auto-initialized:</span>
                  <span className={infoData.deployment.autoInitialized ? 'text-green-400' : 'text-red-400'}>
                    {infoData.deployment.autoInitialized ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Message:</span>
                  <span className="text-white text-sm text-right max-w-xs">
                    {infoData.message}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-red-400">Failed to load application info</p>
            )}
          </div>

          {/* System Metrics */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="w-6 h-6 text-green-500" />
              System Metrics
            </h2>
            {healthLoading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-700 rounded"></div>
                <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-700 rounded w-1/2"></div>
              </div>
            ) : healthData ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Uptime:</span>
                  <span className="text-white">{Math.round(healthData.uptime)}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Version:</span>
                  <span className="text-white">{healthData.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Environment:</span>
                  <span className="text-white">{healthData.environment}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Last Check:</span>
                  <span className="text-white text-sm">
                    {new Date(healthData.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-red-400">Failed to load system metrics</p>
            )}
          </div>
        </div>

        {/* Demo Access */}
        {infoData?.demoCredentials && (
          <div className="mt-8 bg-blue-900/20 border border-blue-700 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Demo Access</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-blue-400 font-medium">Email:</span>
                <code className="ml-2 bg-gray-800 px-2 py-1 rounded text-sm text-white">
                  {infoData.demoCredentials.email}
                </code>
              </div>
              <div>
                <span className="text-blue-400 font-medium">Password:</span>
                <code className="ml-2 bg-gray-800 px-2 py-1 rounded text-sm text-white">
                  {infoData.demoCredentials.password}
                </code>
              </div>
            </div>
            <p className="text-blue-300 text-sm mt-3">{infoData.demoCredentials.note}</p>
            <a
              href={infoData.loginUrl}
              className="mt-4 inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Go to Login
            </a>
          </div>
        )}
      </div>
    </div>
  )
}