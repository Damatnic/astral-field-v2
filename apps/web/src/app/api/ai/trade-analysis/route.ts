/**
 * AI Trade Analysis API
 * Analyzes trade fairness and provides recommendations
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface TradePlayer {
  id: string
  name: string
  position: string
  team: string
  projectedPoints: number
  currentValue: number
}

interface TradeAnalysisRequest {
  teamId: string
  week: number
  giving: TradePlayer[]
  receiving: TradePlayer[]
}

interface TradeAnalysisResponse {
  fairness: 'fair' | 'favorable' | 'unfavorable'
  confidence: number
  valueGap: number
  analysis: {
    givingValue: number
    receivingValue: number
    positionalImpact: Record<string, number>
    rosterBalance: string
  }
  recommendations: string[]
  alternatives?: Array<{
    suggestion: string
    impact: string
  }>
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const week = searchParams.get('week')

    if (!teamId || !week) {
      return NextResponse.json(
        { error: 'teamId and week are required' },
        { status: 400 }
      )
    }

    // Mock analysis for demo
    const analysis: TradeAnalysisResponse = {
      fairness: 'fair',
      confidence: 0.87,
      valueGap: 2.5,
      analysis: {
        givingValue: 45.2,
        receivingValue: 47.7,
        positionalImpact: {
          QB: 0,
          RB: 5.5,
          WR: -3.0,
          TE: 0
        },
        rosterBalance: 'improved'
      },
      recommendations: [
        'Trade improves your RB depth significantly',
        'Slight downgrade at WR but acceptable',
        'Overall roster balance is improved',
        'Consider their Week 9 bye week situation'
      ],
      alternatives: [
        {
          suggestion: 'Add their WR3 to balance positional value',
          impact: '+8.5 value'
        },
        {
          suggestion: 'Swap your RB2 for their RB1 instead',
          impact: '+12.0 value'
        }
      ]
    }

    return NextResponse.json(analysis, {
      headers: {
        'Cache-Control': 'private, s-maxage=300, stale-while-revalidate=60',
      },
    })
  } catch (error) {
    console.error('Trade analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze trade' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body: TradeAnalysisRequest = await request.json()

    if (!body.teamId || !body.week || !body.giving || !body.receiving) {
      return NextResponse.json(
        { error: 'Invalid trade analysis request' },
        { status: 400 }
      )
    }

    // Calculate trade values
    const givingValue = body.giving.reduce((sum, player) => sum + player.projectedPoints, 0)
    const receivingValue = body.receiving.reduce((sum, player) => sum + player.projectedPoints, 0)
    const valueGap = receivingValue - givingValue

    // Determine fairness
    let fairness: 'fair' | 'favorable' | 'unfavorable'
    if (Math.abs(valueGap) < 5) {
      fairness = 'fair'
    } else if (valueGap > 0) {
      fairness = 'favorable'
    } else {
      fairness = 'unfavorable'
    }

    // Calculate positional impact
    const positionalImpact: Record<string, number> = {}
    
    body.giving.forEach(player => {
      positionalImpact[player.position] = (positionalImpact[player.position] || 0) - player.projectedPoints
    })
    
    body.receiving.forEach(player => {
      positionalImpact[player.position] = (positionalImpact[player.position] || 0) + player.projectedPoints
    })

    const analysis: TradeAnalysisResponse = {
      fairness,
      confidence: 0.85,
      valueGap,
      analysis: {
        givingValue,
        receivingValue,
        positionalImpact,
        rosterBalance: valueGap > 0 ? 'improved' : valueGap < 0 ? 'worsened' : 'neutral'
      },
      recommendations: [
        `You would ${fairness === 'favorable' ? 'gain' : fairness === 'unfavorable' ? 'lose' : 'maintain'} ${Math.abs(valueGap).toFixed(1)} points per week`,
        fairness === 'favorable' 
          ? 'This trade significantly benefits your team'
          : fairness === 'unfavorable'
          ? 'Consider negotiating for additional value'
          : 'Trade value is balanced',
        'Review bye week schedules before accepting',
        'Check injury reports for all players involved'
      ]
    }

    return NextResponse.json(analysis, {
      headers: {
        'Cache-Control': 'private, no-cache',
      },
    })
  } catch (error) {
    console.error('Trade analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze trade' },
      { status: 500 }
    )
  }
}

