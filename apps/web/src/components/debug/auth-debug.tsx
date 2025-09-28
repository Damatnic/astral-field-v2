'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface AuthDebugData {
  session: any
  cookies: Record<string, string>
  localStorage: Record<string, string>
  sessionStorage: Record<string, string>
  apiSessionTest: any
  timestamp: string
}

export function AuthDebugPanel() {
  const { data: session, status } = useSession()
  const [debugData, setDebugData] = useState<AuthDebugData | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  const collectDebugData = async () => {
    try {
      // Collect cookies
      const cookies: Record<string, string> = {}
      if (typeof document !== 'undefined') {
        document.cookie.split(';').forEach(cookie => {
          const [name, value] = cookie.trim().split('=')
          if (name) cookies[name] = value || ''
        })
      }

      // Collect localStorage
      const localStorage: Record<string, string> = {}
      if (typeof window !== 'undefined' && window.localStorage) {
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i)
          if (key) {
            localStorage[key] = window.localStorage.getItem(key) || ''
          }
        }
      }

      // Collect sessionStorage
      const sessionStorage: Record<string, string> = {}
      if (typeof window !== 'undefined' && window.sessionStorage) {
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i)
          if (key) {
            sessionStorage[key] = window.sessionStorage.getItem(key) || ''
          }
        }
      }

      // Test API session endpoint
      let apiSessionTest = null
      try {
        const response = await fetch('/api/auth/session')
        apiSessionTest = {
          status: response.status,
          data: await response.json()
        }
      } catch (error) {
        apiSessionTest = {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }

      setDebugData({
        session,
        cookies,
        localStorage,
        sessionStorage,
        apiSessionTest,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error collecting debug data:', error)
    }
  }

  const clearAllAuthData = () => {
    if (typeof window !== 'undefined') {
      // Clear cookies
      document.cookie.split(';').forEach(cookie => {
        const eqPos = cookie.indexOf('=')
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie
        if (name.trim().includes('auth') || name.trim().includes('session')) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=localhost`
        }
      })

      // Clear localStorage
      Object.keys(window.localStorage).forEach(key => {
        if (key.includes('auth') || key.includes('session') || key.includes('token')) {
          window.localStorage.removeItem(key)
        }
      })

      // Clear sessionStorage
      Object.keys(window.sessionStorage).forEach(key => {
        if (key.includes('auth') || key.includes('session') || key.includes('token')) {
          window.sessionStorage.removeItem(key)
        }
      })

      alert('Authentication data cleared! Please refresh the page.')
    }
  }

  useEffect(() => {
    // Auto-collect data when component mounts
    collectDebugData()
  }, [session, status])

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <>
      {/* Debug toggle button */}
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsVisible(!isVisible)}
          className="bg-purple-600 hover:bg-purple-700 text-white"
          size="sm"
        >
          {isVisible ? 'Hide' : 'Show'} Auth Debug
        </Button>
      </div>

      {/* Debug panel */}
      {isVisible && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-black bg-opacity-50">
          <div className="min-h-screen px-4 text-center">
            <div className="fixed inset-0" onClick={() => setIsVisible(false)} />
            
            <div className="inline-block w-full max-w-4xl my-8 text-left align-middle transition-all transform bg-slate-800 shadow-xl rounded-lg relative z-50">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-white">🛡️ Sentinel Auth Debug Panel</h2>
                  <div className="space-x-2">
                    <Button onClick={collectDebugData} size="sm" variant="outline">
                      Refresh Data
                    </Button>
                    <Button onClick={clearAllAuthData} size="sm" variant="destructive">
                      Clear Auth Data
                    </Button>
                    <Button onClick={() => setIsVisible(false)} size="sm" variant="ghost">
                      ✕
                    </Button>
                  </div>
                </div>

                {debugData && (
                  <div className="space-y-6 text-sm">
                    {/* Session Status */}
                    <div className="bg-slate-700 p-4 rounded">
                      <h3 className="font-semibold text-white mb-2">📊 Session Status</h3>
                      <div className="text-gray-300">
                        <p><strong>Status:</strong> {status}</p>
                        <p><strong>User ID:</strong> {session?.user?.id || 'None'}</p>
                        <p><strong>Email:</strong> {session?.user?.email || 'None'}</p>
                        <p><strong>Name:</strong> {session?.user?.name || 'None'}</p>
                        <p><strong>Role:</strong> {(session?.user as any)?.role || 'None'}</p>
                        <p><strong>Session ID:</strong> {(session?.user as any)?.sessionId || 'None'}</p>
                      </div>
                    </div>

                    {/* API Session Test */}
                    <div className="bg-slate-700 p-4 rounded">
                      <h3 className="font-semibold text-white mb-2">🔗 API Session Test</h3>
                      <div className="text-gray-300">
                        {debugData.apiSessionTest?.error ? (
                          <p className="text-red-400">Error: {debugData.apiSessionTest.error}</p>
                        ) : (
                          <>
                            <p><strong>Status:</strong> {debugData.apiSessionTest?.status}</p>
                            <p><strong>Has User:</strong> {debugData.apiSessionTest?.data?.user ? 'Yes' : 'No'}</p>
                            <p><strong>API User ID:</strong> {debugData.apiSessionTest?.data?.user?.id || 'None'}</p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Cookies */}
                    <div className="bg-slate-700 p-4 rounded">
                      <h3 className="font-semibold text-white mb-2">🍪 Auth Cookies</h3>
                      <div className="text-gray-300 max-h-40 overflow-y-auto">
                        {Object.entries(debugData.cookies)
                          .filter(([key]) => key.includes('auth') || key.includes('session'))
                          .map(([key, value]) => (
                            <p key={key} className="mb-1">
                              <strong>{key}:</strong> {value.substring(0, 50)}{value.length > 50 ? '...' : ''}
                            </p>
                          ))}
                        {Object.entries(debugData.cookies).filter(([key]) => key.includes('auth') || key.includes('session')).length === 0 && (
                          <p className="text-yellow-400">No auth-related cookies found</p>
                        )}
                      </div>
                    </div>

                    {/* Local Storage */}
                    <div className="bg-slate-700 p-4 rounded">
                      <h3 className="font-semibold text-white mb-2">💾 Local Storage</h3>
                      <div className="text-gray-300 max-h-40 overflow-y-auto">
                        {Object.entries(debugData.localStorage)
                          .filter(([key]) => key.includes('auth') || key.includes('session') || key.includes('token'))
                          .map(([key, value]) => (
                            <p key={key} className="mb-1">
                              <strong>{key}:</strong> {value.substring(0, 50)}{value.length > 50 ? '...' : ''}
                            </p>
                          ))}
                        {Object.entries(debugData.localStorage).filter(([key]) => key.includes('auth') || key.includes('session') || key.includes('token')).length === 0 && (
                          <p className="text-yellow-400">No auth-related localStorage found</p>
                        )}
                      </div>
                    </div>

                    {/* Session Storage */}
                    <div className="bg-slate-700 p-4 rounded">
                      <h3 className="font-semibold text-white mb-2">🗃️ Session Storage</h3>
                      <div className="text-gray-300 max-h-40 overflow-y-auto">
                        {Object.entries(debugData.sessionStorage)
                          .filter(([key]) => key.includes('auth') || key.includes('session') || key.includes('token'))
                          .map(([key, value]) => (
                            <p key={key} className="mb-1">
                              <strong>{key}:</strong> {value.substring(0, 50)}{value.length > 50 ? '...' : ''}
                            </p>
                          ))}
                        {Object.entries(debugData.sessionStorage).filter(([key]) => key.includes('auth') || key.includes('session') || key.includes('token')).length === 0 && (
                          <p className="text-yellow-400">No auth-related sessionStorage found</p>
                        )}
                      </div>
                    </div>

                    {/* Full Session Data */}
                    <div className="bg-slate-700 p-4 rounded">
                      <h3 className="font-semibold text-white mb-2">🔍 Full Session Data</h3>
                      <pre className="text-xs text-gray-300 bg-slate-800 p-2 rounded overflow-x-auto">
                        {JSON.stringify(session, null, 2)}
                      </pre>
                    </div>

                    <div className="text-xs text-gray-500">
                      Last updated: {debugData.timestamp}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}