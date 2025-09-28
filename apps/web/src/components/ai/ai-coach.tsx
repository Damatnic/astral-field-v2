/**
 * AI Coach Component
 * Provides AI-powered fantasy football recommendations and insights
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export interface AIRecommendation {
  id: string
  type: 'LINEUP' | 'TRADE' | 'WAIVER' | 'START_SIT'
  playerId: string
  playerName: string
  position: string
  recommendation: string
  confidence: number
  reasoning: string[]
  impact: 'HIGH' | 'MEDIUM' | 'LOW'
  week?: number
}

interface AICoachProps {
  userId?: string
  leagueId?: string
  teamId?: string
  recommendations?: AIRecommendation[]
  onRecommendationClick?: (recommendation: AIRecommendation) => void
  className?: string
}

export default function AICoach({
  userId,
  leagueId,
  teamId,
  recommendations = [],
  onRecommendationClick,
  className = ''
}: AICoachProps) {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'lineup' | 'trades' | 'waivers'>('lineup')

  const filterRecommendationsByType = (type: string) => {
    return recommendations.filter(rec => {
      switch (type) {
        case 'lineup':
          return rec.type === 'LINEUP' || rec.type === 'START_SIT'
        case 'trades':
          return rec.type === 'TRADE'
        case 'waivers':
          return rec.type === 'WAIVER'
        default:
          return false
      }
    })
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-500'
    if (confidence >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'HIGH':
        return 'bg-red-100 text-red-800'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800'
      case 'LOW':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleRefreshRecommendations = async () => {
    setLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setLoading(false)
  }

  const renderRecommendation = (recommendation: AIRecommendation) => (
    <Card 
      key={recommendation.id}
      className="mb-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onRecommendationClick?.(recommendation)}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-semibold">
              {recommendation.playerName}
            </CardTitle>
            <p className="text-sm text-gray-600">
              {recommendation.position} • {recommendation.recommendation}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className={`w-3 h-3 rounded-full ${getConfidenceColor(recommendation.confidence)}`} />
            <Badge variant="secondary" className={getImpactColor(recommendation.impact)}>
              {recommendation.impact}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Confidence</span>
            <span className="text-sm">{recommendation.confidence}%</span>
          </div>
          <div>
            <p className="text-sm font-medium mb-1">Reasoning:</p>
            <ul className="text-sm text-gray-600 space-y-1">
              {recommendation.reasoning.map((reason, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className={`ai-coach ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>AI Coach Recommendations</CardTitle>
            <Button
              onClick={handleRefreshRecommendations}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
          
          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {[
              { key: 'lineup', label: 'Lineup' },
              { key: 'trades', label: 'Trades' },
              { key: 'waivers', label: 'Waivers' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                {filterRecommendationsByType(activeTab).length > 0 ? (
                  filterRecommendationsByType(activeTab).map(renderRecommendation)
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No {activeTab} recommendations available</p>
                    <p className="text-sm mt-2">Check back later for AI insights</p>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Export types for testing
export type { AICoachProps }