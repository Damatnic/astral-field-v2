'use client'

import { create } from 'zustand'
import waiverService, { WaiverPlayer, WaiverClaim, CreateWaiverClaimData } from '@/services/api/waiverService'

interface WaiverState {
  waiverPlayers: WaiverPlayer[]
  teamClaims: WaiverClaim[]
  faabBudget: {
    total: number
    spent: number
    remaining: number
  }
  isLoading: boolean
  error: string | null
  
  // Actions
  fetchWaiverPlayers: (leagueId: string) => Promise<void>
  fetchTeamClaims: (teamId: string) => Promise<void>
  fetchFAABBudget: (teamId: string) => Promise<void>
  submitWaiverClaim: (teamId: string, data: CreateWaiverClaimData) => Promise<boolean>
  cancelWaiverClaim: (claimId: string) => Promise<boolean>
  processWaivers: (leagueId: string) => Promise<{ success: boolean; processed: number }>
  clearError: () => void
}

export const useWaiverStore = create<WaiverState>((set, get) => ({
  waiverPlayers: [],
  teamClaims: [],
  faabBudget: {
    total: 100,
    spent: 0,
    remaining: 100,
  },
  isLoading: false,
  error: null,

  fetchWaiverPlayers: async (leagueId: string) => {
    set({ isLoading: true, error: null })
    
    try {
      const result = await waiverService.getWaiverPlayers(leagueId)
      
      if (result.error) {
        set({ error: result.error, isLoading: false })
      } else {
        set({ waiverPlayers: result.players, isLoading: false })
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch waiver players', 
        isLoading: false 
      })
    }
  },

  fetchTeamClaims: async (teamId: string) => {
    set({ isLoading: true, error: null })
    
    try {
      const result = await waiverService.getTeamWaiverClaims(teamId)
      
      if (result.error) {
        set({ error: result.error, isLoading: false })
      } else {
        set({ teamClaims: result.claims, isLoading: false })
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch waiver claims', 
        isLoading: false 
      })
    }
  },

  fetchFAABBudget: async (teamId: string) => {
    try {
      const result = await waiverService.getTeamFAABBudget(teamId)
      
      if (result.error) {
        set({ error: result.error })
      } else {
        set({ 
          faabBudget: {
            total: result.budget,
            spent: result.spent,
            remaining: result.remaining,
          }
        })
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch FAAB budget'
      })
    }
  },

  submitWaiverClaim: async (teamId: string, data: CreateWaiverClaimData) => {
    set({ isLoading: true, error: null })
    
    try {
      const result = await waiverService.submitWaiverClaim(teamId, data)
      
      if (result.success) {
        // Refresh team claims and FAAB budget
        await get().fetchTeamClaims(teamId)
        await get().fetchFAABBudget(teamId)
        set({ isLoading: false })
        return true
      } else {
        set({ error: result.error || 'Failed to submit waiver claim', isLoading: false })
        return false
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to submit waiver claim', 
        isLoading: false 
      })
      return false
    }
  },

  cancelWaiverClaim: async (claimId: string) => {
    set({ isLoading: true, error: null })
    
    try {
      const result = await waiverService.cancelWaiverClaim(claimId)
      
      if (result.success) {
        // Remove the claim from local state
        set(state => ({
          teamClaims: state.teamClaims.filter(claim => claim.id !== claimId),
          isLoading: false
        }))
        return true
      } else {
        set({ error: result.error || 'Failed to cancel waiver claim', isLoading: false })
        return false
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to cancel waiver claim', 
        isLoading: false 
      })
      return false
    }
  },

  processWaivers: async (leagueId: string) => {
    set({ isLoading: true, error: null })
    
    try {
      const result = await waiverService.processWaivers(leagueId)
      
      if (result.success) {
        // Refresh waiver players to remove claimed ones
        await get().fetchWaiverPlayers(leagueId)
        set({ isLoading: false })
        return { success: true, processed: result.processed }
      } else {
        set({ error: result.error || 'Failed to process waivers', isLoading: false })
        return { success: false, processed: 0 }
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to process waivers', 
        isLoading: false 
      })
      return { success: false, processed: 0 }
    }
  },

  clearError: () => set({ error: null }),
}))