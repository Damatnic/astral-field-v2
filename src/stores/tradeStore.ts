'use client'

import { create } from 'zustand'
import tradeService, { TradeProposal, TradeAnalysis, CreateTradeData } from '@/services/api/tradeService'

interface TradeState {
  trades: TradeProposal[]
  currentAnalysis: TradeAnalysis | null
  isLoading: boolean
  error: string | null
  
  // Actions
  createTrade: (leagueId: string, data: CreateTradeData) => Promise<boolean>
  fetchTeamTrades: (teamId: string) => Promise<void>
  respondToTrade: (tradeId: string, response: 'accepted' | 'rejected') => Promise<boolean>
  analyzeTrade: (offeredPlayers: string[], requestedPlayers: string[]) => Promise<void>
  cancelTrade: (tradeId: string) => Promise<boolean>
  clearError: () => void
  clearAnalysis: () => void
}

export const useTradeStore = create<TradeState>((set, get) => ({
  trades: [],
  currentAnalysis: null,
  isLoading: false,
  error: null,

  createTrade: async (leagueId: string, data: CreateTradeData) => {
    set({ isLoading: true, error: null })
    
    try {
      const result = await tradeService.createTrade(leagueId, data)
      
      if (result.success) {
        // Refresh trades for the team
        await get().fetchTeamTrades(data.initiatorTeamId)
        set({ isLoading: false })
        return true
      } else {
        set({ error: result.error || 'Failed to create trade', isLoading: false })
        return false
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create trade', 
        isLoading: false 
      })
      return false
    }
  },

  fetchTeamTrades: async (teamId: string) => {
    set({ isLoading: true, error: null })
    
    try {
      const result = await tradeService.getTeamTrades(teamId)
      
      if (result.error) {
        set({ error: result.error, isLoading: false })
      } else {
        set({ trades: result.trades, isLoading: false })
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch trades', 
        isLoading: false 
      })
    }
  },

  respondToTrade: async (tradeId: string, response: 'accepted' | 'rejected') => {
    set({ isLoading: true, error: null })
    
    try {
      const result = await tradeService.respondToTrade(tradeId, response)
      
      if (result.success) {
        // Update the trade status in local state
        set(state => ({
          trades: state.trades.map(trade => 
            trade.id === tradeId 
              ? { ...trade, status: response }
              : trade
          ),
          isLoading: false
        }))
        return true
      } else {
        set({ error: result.error || 'Failed to respond to trade', isLoading: false })
        return false
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to respond to trade', 
        isLoading: false 
      })
      return false
    }
  },

  analyzeTrade: async (offeredPlayers: string[], requestedPlayers: string[]) => {
    set({ isLoading: true, error: null })
    
    try {
      const result = await tradeService.analyzeTrade(offeredPlayers, requestedPlayers)
      
      if (result.error) {
        set({ error: result.error, isLoading: false })
      } else {
        set({ currentAnalysis: result.analysis, isLoading: false })
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to analyze trade', 
        isLoading: false 
      })
    }
  },

  cancelTrade: async (tradeId: string) => {
    set({ isLoading: true, error: null })
    
    try {
      const result = await tradeService.cancelTrade(tradeId)
      
      if (result.success) {
        // Update the trade status in local state
        set(state => ({
          trades: state.trades.map(trade => 
            trade.id === tradeId 
              ? { ...trade, status: 'cancelled' as any }
              : trade
          ),
          isLoading: false
        }))
        return true
      } else {
        set({ error: result.error || 'Failed to cancel trade', isLoading: false })
        return false
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to cancel trade', 
        isLoading: false 
      })
      return false
    }
  },

  clearError: () => set({ error: null }),
  clearAnalysis: () => set({ currentAnalysis: null }),
}))