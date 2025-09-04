'use client'

import { create } from 'zustand'
import oracleService, { 
  type OracleQuery, 
  type OracleResponse, 
  type OraclePersonality,
  type OracleQueryType 
} from '@/services/ai/oracleService'

interface Conversation {
  id: string
  title: string
  queries: Array<{
    query: OracleQuery
    response: OracleResponse
  }>
  createdAt: string
  updatedAt: string
}

interface OracleState {
  // Current conversation
  currentConversation: Conversation | null
  conversations: Conversation[]
  
  // Oracle state
  isThinking: boolean
  lastQuery: OracleQuery | null
  lastResponse: OracleResponse | null
  personality: OraclePersonality
  
  // Quick actions state
  quickInsights: Array<{
    type: string
    title: string
    description: string
    action: () => void
  }>
  
  // Loading and error states
  isLoading: boolean
  error: string | null
  
  // Actions
  askOracle: (question: string, type?: OracleQueryType, context?: any) => Promise<OracleResponse | null>
  getLineupAdvice: (teamId: string, week: number) => Promise<OracleResponse | null>
  analyzeTradeProposal: (offeredPlayers: string[], requestedPlayers: string[], teamId: string) => Promise<OracleResponse | null>
  getPlayerAnalysis: (playerId: string, context?: any) => Promise<OracleResponse | null>
  getMatchupStrategy: (teamId: string, opponentTeamId: string, week: number) => Promise<OracleResponse | null>
  getSeasonOutlook: (teamId: string) => Promise<OracleResponse | null>
  
  // Conversation management
  startNewConversation: (title?: string) => void
  loadConversation: (conversationId: string) => void
  saveConversation: () => void
  deleteConversation: (conversationId: string) => void
  clearCurrentConversation: () => void
  addToConversation: (query: OracleQuery, response: OracleResponse) => void
  
  // Settings
  updatePersonality: (personality: Partial<OraclePersonality>) => void
  
  // Quick actions
  refreshQuickInsights: (teamId?: string) => Promise<void>
  
  // Utility
  clearError: () => void
}

export const useOracleStore = create<OracleState>((set, get) => ({
  // Initial state
  currentConversation: null,
  conversations: [],
  isThinking: false,
  lastQuery: null,
  lastResponse: null,
  personality: {
    tone: 'analytical',
    expertise: 'expert',
    verbosity: 'detailed'
  },
  quickInsights: [],
  isLoading: false,
  error: null,

  // Main Oracle interaction
  askOracle: async (question: string, type: OracleQueryType = 'general_question', context: any = {}) => {
    set({ isThinking: true, error: null })
    
    try {
      const query: OracleQuery = {
        id: crypto.randomUUID(),
        userId: 'current_user', // Would get from auth
        leagueId: context.leagueId,
        teamId: context.teamId,
        type,
        question,
        context,
        timestamp: new Date().toISOString()
      }

      const response = await oracleService.askOracle(query)
      
      // Add to current conversation
      let conversation = get().currentConversation
      if (!conversation) {
        conversation = {
          id: crypto.randomUUID(),
          title: question.substring(0, 50) + (question.length > 50 ? '...' : ''),
          queries: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }

      conversation.queries.push({ query, response })
      conversation.updatedAt = new Date().toISOString()

      set({
        currentConversation: conversation,
        lastQuery: query,
        lastResponse: response,
        isThinking: false
      })

      // Auto-save conversation
      get().saveConversation()

      return response
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Oracle is having trouble responding',
        isThinking: false
      })
      return null
    }
  },

  // Specific Oracle methods
  getLineupAdvice: async (teamId: string, week: number) => {
    set({ isLoading: true })
    
    try {
      const response = await oracleService.getLineupAdvice(teamId, week)
      
      // Add to conversation
      const query: OracleQuery = {
        id: crypto.randomUUID(),
        userId: 'current_user',
        teamId,
        type: 'lineup_advice',
        question: `Who should I start in Week ${week}?`,
        context: { week },
        timestamp: new Date().toISOString()
      }

      get().addToConversation(query, response)
      set({ isLoading: false })
      return response
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to get lineup advice',
        isLoading: false
      })
      return null
    }
  },

  analyzeTradeProposal: async (offeredPlayers: string[], requestedPlayers: string[], teamId: string) => {
    set({ isLoading: true })
    
    try {
      const response = await oracleService.analyzeTradeProposal(offeredPlayers, requestedPlayers, teamId)
      
      const query: OracleQuery = {
        id: crypto.randomUUID(),
        userId: 'current_user',
        teamId,
        type: 'trade_analysis',
        question: 'Should I accept this trade proposal?',
        context: { 
          players: [...offeredPlayers, ...requestedPlayers],
          tradePartners: [teamId]
        },
        timestamp: new Date().toISOString()
      }

      get().addToConversation(query, response)
      set({ isLoading: false })
      return response
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to analyze trade',
        isLoading: false
      })
      return null
    }
  },

  getPlayerAnalysis: async (playerId: string, context: any = {}) => {
    set({ isLoading: true })
    
    try {
      const response = await oracleService.getPlayerAnalysis(playerId, context)
      
      const query: OracleQuery = {
        id: crypto.randomUUID(),
        userId: 'current_user',
        type: 'player_analysis',
        question: 'Tell me about this player\'s outlook',
        context: { 
          players: [playerId],
          ...context
        },
        timestamp: new Date().toISOString()
      }

      get().addToConversation(query, response)
      set({ isLoading: false })
      return response
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to analyze player',
        isLoading: false
      })
      return null
    }
  },

  getMatchupStrategy: async (teamId: string, opponentTeamId: string, week: number) => {
    set({ isLoading: true })
    
    try {
      const response = await oracleService.getMatchupStrategy(teamId, opponentTeamId, week)
      
      const query: OracleQuery = {
        id: crypto.randomUUID(),
        userId: 'current_user',
        teamId,
        type: 'matchup_strategy',
        question: 'How should I approach this matchup?',
        context: { 
          week,
          tradePartners: [opponentTeamId]
        },
        timestamp: new Date().toISOString()
      }

      get().addToConversation(query, response)
      set({ isLoading: false })
      return response
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to get matchup strategy',
        isLoading: false
      })
      return null
    }
  },

  getSeasonOutlook: async (teamId: string) => {
    set({ isLoading: true })
    
    try {
      const response = await oracleService.getSeasonOutlook(teamId)
      
      const query: OracleQuery = {
        id: crypto.randomUUID(),
        userId: 'current_user',
        teamId,
        type: 'season_outlook',
        question: 'What\'s my team\'s outlook for the rest of the season?',
        context: {},
        timestamp: new Date().toISOString()
      }

      get().addToConversation(query, response)
      set({ isLoading: false })
      return response
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to get season outlook',
        isLoading: false
      })
      return null
    }
  },

  // Helper method to add query/response to conversation
  addToConversation: (query: OracleQuery, response: OracleResponse) => {
    let conversation = get().currentConversation
    if (!conversation) {
      conversation = {
        id: crypto.randomUUID(),
        title: query.question.substring(0, 50) + (query.question.length > 50 ? '...' : ''),
        queries: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }

    conversation.queries.push({ query, response })
    conversation.updatedAt = new Date().toISOString()

    set({
      currentConversation: conversation,
      lastQuery: query,
      lastResponse: response
    })

    get().saveConversation()
  },

  // Conversation management
  startNewConversation: (title?: string) => {
    const newConversation: Conversation = {
      id: crypto.randomUUID(),
      title: title || 'New Conversation',
      queries: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    set({
      currentConversation: newConversation,
      lastQuery: null,
      lastResponse: null
    })
  },

  loadConversation: (conversationId: string) => {
    const conversations = get().conversations
    const conversation = conversations.find(c => c.id === conversationId)
    
    if (conversation) {
      const lastExchange = conversation.queries[conversation.queries.length - 1]
      set({
        currentConversation: conversation,
        lastQuery: lastExchange?.query || null,
        lastResponse: lastExchange?.response || null
      })
    }
  },

  saveConversation: () => {
    const conversation = get().currentConversation
    if (!conversation) return

    const conversations = get().conversations
    const existingIndex = conversations.findIndex(c => c.id === conversation.id)
    
    let updatedConversations
    if (existingIndex >= 0) {
      updatedConversations = [...conversations]
      updatedConversations[existingIndex] = conversation
    } else {
      updatedConversations = [conversation, ...conversations]
    }

    set({ conversations: updatedConversations })
    
    // Save to localStorage
    try {
      localStorage.setItem('oracle_conversations', JSON.stringify(updatedConversations))
    } catch (error) {
      console.error('Failed to save conversations:', error)
    }
  },

  deleteConversation: (conversationId: string) => {
    const conversations = get().conversations.filter(c => c.id !== conversationId)
    set({ conversations })
    
    if (get().currentConversation?.id === conversationId) {
      set({ currentConversation: null, lastQuery: null, lastResponse: null })
    }

    try {
      localStorage.setItem('oracle_conversations', JSON.stringify(conversations))
    } catch (error) {
      console.error('Failed to save conversations:', error)
    }
  },

  clearCurrentConversation: () => {
    set({
      currentConversation: null,
      lastQuery: null,
      lastResponse: null
    })
  },

  // Settings
  updatePersonality: (personality: Partial<OraclePersonality>) => {
    const updatedPersonality = { ...get().personality, ...personality }
    set({ personality: updatedPersonality })
    oracleService.updatePersonality(updatedPersonality)
    
    try {
      localStorage.setItem('oracle_personality', JSON.stringify(updatedPersonality))
    } catch (error) {
      console.error('Failed to save personality:', error)
    }
  },

  // Quick insights
  refreshQuickInsights: async (teamId?: string) => {
    const insights = [
      {
        type: 'lineup',
        title: 'Lineup Check',
        description: 'Get AI recommendations for your Week 13 lineup',
        action: () => {
          if (teamId) get().getLineupAdvice(teamId, 13)
        }
      },
      {
        type: 'waiver',
        title: 'Waiver Targets',
        description: 'Find the best available players to improve your team',
        action: () => {
          get().askOracle('Who should I target on waivers this week?', 'waiver_priority')
        }
      },
      {
        type: 'matchup',
        title: 'Matchup Analysis',
        description: 'Strategic insights for this week\'s opponent',
        action: () => {
          if (teamId) get().askOracle('How should I approach this week\'s matchup?', 'matchup_strategy', { teamId })
        }
      },
      {
        type: 'playoff',
        title: 'Playoff Push',
        description: 'Analysis of your path to the playoffs',
        action: () => {
          if (teamId) get().getSeasonOutlook(teamId)
        }
      }
    ]

    set({ quickInsights: insights })
  },

  // Utility
  clearError: () => set({ error: null }),
}))

// Initialize store with saved data
if (typeof window !== 'undefined') {
  try {
    const savedConversations = localStorage.getItem('oracle_conversations')
    if (savedConversations) {
      useOracleStore.setState({ conversations: JSON.parse(savedConversations) })
    }

    const savedPersonality = localStorage.getItem('oracle_personality')
    if (savedPersonality) {
      const personality = JSON.parse(savedPersonality)
      useOracleStore.setState({ personality })
      oracleService.updatePersonality(personality)
    }
  } catch (error) {
    console.error('Failed to load saved Oracle data:', error)
  }
}