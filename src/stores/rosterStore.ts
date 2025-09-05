'use client'

import { create } from 'zustand'
import rosterService, { TeamRoster, OptimalLineup } from '@/services/api/rosterService'

interface RosterState {
  roster: TeamRoster | null
  optimalLineup: OptimalLineup | null
  currentWeek: number
  isLoading: boolean
  error: string | null
  
  // Actions
  fetchRoster: (teamId: string, week?: number) => Promise<void>
  setLineup: (teamId: string, week: number, lineup: Array<{position: string, playerId: string | null}>) => Promise<boolean>
  getOptimalLineup: (teamId: string, week: number) => Promise<void>
  addPlayer: (teamId: string, playerId: string, acquisitionType?: 'waiver' | 'free_agent') => Promise<boolean>
  dropPlayer: (teamId: string, playerId: string) => Promise<boolean>
  setCurrentWeek: (week: number) => void
  clearError: () => void
}

export const useRosterStore = create<RosterState>((set, get) => ({
  roster: null,
  optimalLineup: null,
  currentWeek: 1,
  isLoading: false,
  error: null,

  fetchRoster: async (teamId: string, week?: number) => {
    set({ isLoading: true, error: null })
    
    try {
      const result = await rosterService.getTeamRoster(teamId, week)
      
      if (result.error) {
        set({ error: result.error, isLoading: false })
      } else {
        set({ roster: result.roster, isLoading: false })
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch roster', 
        isLoading: false 
      })
    }
  },

  setLineup: async (teamId: string, week: number, lineup: Array<{position: string, playerId: string | null}>) => {
    set({ isLoading: true, error: null })
    
    try {
      const lineupData = lineup.reduce((acc, slot) => {
        acc[slot.position] = slot.playerId
        return acc
      }, {} as Record<string, string | null>)
      const result = await rosterService.setLineup(teamId, week, lineupData)
      
      if (!result.error) {
        // Refresh roster to get updated lineup
        await get().fetchRoster(teamId, week)
        set({ isLoading: false })
        return true
      } else {
        set({ error: result.error, isLoading: false })
        return false
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to set lineup', 
        isLoading: false 
      })
      return false
    }
  },

  getOptimalLineup: async (teamId: string, week: number) => {
    set({ isLoading: true, error: null })
    
    try {
      const result = await rosterService.getOptimalLineup(teamId, week)
      
      if (result.error) {
        set({ error: result.error, isLoading: false })
      } else {
        set({ optimalLineup: result.lineup, isLoading: false })
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to calculate optimal lineup', 
        isLoading: false 
      })
    }
  },

  addPlayer: async (teamId: string, playerId: string, acquisitionType = 'free_agent' as const) => {
    set({ isLoading: true, error: null })
    
    try {
      const result = await rosterService.addPlayerToRoster(teamId, playerId, acquisitionType)
      
      if (!result.error) {
        // Refresh roster to include new player
        await get().fetchRoster(teamId, get().currentWeek)
        set({ isLoading: false })
        return true
      } else {
        set({ error: result.error, isLoading: false })
        return false
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to add player', 
        isLoading: false 
      })
      return false
    }
  },

  dropPlayer: async (teamId: string, playerId: string) => {
    set({ isLoading: true, error: null })
    
    try {
      const result = await rosterService.removePlayerFromRoster(teamId, playerId)
      
      if (!result.error) {
        // Refresh roster to remove dropped player
        await get().fetchRoster(teamId, get().currentWeek)
        set({ isLoading: false })
        return true
      } else {
        set({ error: result.error, isLoading: false })
        return false
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to drop player', 
        isLoading: false 
      })
      return false
    }
  },

  setCurrentWeek: (week: number) => set({ currentWeek: week }),
  clearError: () => set({ error: null }),
}))