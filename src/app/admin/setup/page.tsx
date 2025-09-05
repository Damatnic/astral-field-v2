'use client'

import { useState } from 'react'

export default function AdminSetupPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)

  const setupDatabase = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/setup-database', { method: 'POST' })
      const data = await response.json()
      setResults({ type: 'database', ...data })
    } catch (error) {
      setResults({ type: 'database', success: false, error: 'Failed to setup database' })
    } finally {
      setLoading(false)
    }
  }

  const setupProfiles = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/setup-profiles', { method: 'POST' })
      const data = await response.json()
      setResults({ type: 'profiles', ...data })
    } catch (error) {
      setResults({ type: 'profiles', success: false, error: 'Failed to setup profiles' })
    } finally {
      setLoading(false)
    }
  }

  const checkStatus = async () => {
    setLoading(true)
    try {
      const [dbResponse, profilesResponse] = await Promise.all([
        fetch('/api/setup-database'),
        fetch('/api/setup-profiles')
      ])
      
      const dbData = await dbResponse.json()
      const profilesData = await profilesResponse.json()
      
      setResults({ 
        type: 'status', 
        database: dbData, 
        profiles: profilesData 
      })
    } catch (error) {
      setResults({ type: 'status', success: false, error: 'Failed to check status' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">
          🏈 Astral Field - Netlify Database Setup
        </h1>
        
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <button
            onClick={setupDatabase}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-4 rounded-lg font-medium transition-colors"
          >
            {loading ? '⏳ Working...' : '🗄️ Setup Database Tables'}
          </button>
          
          <button
            onClick={setupProfiles}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-6 py-4 rounded-lg font-medium transition-colors"
          >
            {loading ? '⏳ Working...' : '👥 Create User Profiles'}
          </button>
          
          <button
            onClick={checkStatus}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 px-6 py-4 rounded-lg font-medium transition-colors"
          >
            {loading ? '⏳ Working...' : '📊 Check Status'}
          </button>
        </div>

        {results && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 capitalize">
              {results.type === 'status' ? '📊 Database Status' : 
               results.type === 'database' ? '🗄️ Database Setup' : '👥 Profiles Setup'}
            </h2>
            
            {results.success === false ? (
              <div className="text-red-400">
                <p className="font-medium">❌ Error:</p>
                <p>{results.error}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {results.type === 'status' && (
                  <>
                    <div>
                      <h3 className="font-medium text-blue-400">Database Tables:</h3>
                      <p>{results.database?.tables?.join(', ') || 'None'}</p>
                      <p className="text-sm text-gray-400">
                        Users: {results.database?.counts?.users || 0} | 
                        Players: {results.database?.counts?.players || 0}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-medium text-green-400">User Profiles:</h3>
                      <p>Total Users: {results.profiles?.count || 0}</p>
                    </div>
                  </>
                )}
                
                {results.type === 'database' && (
                  <div>
                    <p className="text-green-400">✅ {results.message}</p>
                    <p className="text-sm text-gray-400">
                      Tables: {results.tables?.join(', ') || 'None'}
                    </p>
                  </div>
                )}
                
                {results.type === 'profiles' && (
                  <div>
                    <p className="text-green-400">✅ {results.message}</p>
                    {results.results && (
                      <div className="mt-2 text-sm">
                        <p>Created: {results.results.created}</p>
                        <p>Existing: {results.results.existing}</p>
                        <p>Errors: {results.results.errors}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-gray-400 hover:text-white">
                Show Raw Response
              </summary>
              <pre className="mt-2 text-xs bg-gray-900 p-3 rounded overflow-auto">
                {JSON.stringify(results, null, 2)}
              </pre>
            </details>
          </div>
        )}

        <div className="mt-8 text-center text-gray-400">
          <p>🚀 This page helps set up your Netlify + Neon database for fantasy football!</p>
        </div>
      </div>
    </div>
  )
}