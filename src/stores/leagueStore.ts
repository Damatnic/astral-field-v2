import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import leagueService, { CreateLeagueData } from '@/services/api/leagueService'
import type { Database } from '@/types/database'

type League = Database['public']['Tables']['leagues']['Row']
type Team = Database['public']['Tables']['teams']['Row']

interface LeagueState {
  leagues: League[]
  currentLeague: League | null
  teams: Team[]
  isLoading: boolean
  error: string | null
  
  // Actions
  fetchUserLeagues: (userId: string) => Promise<void>
  createLeague: (userId: string, data: CreateLeagueData) => Promise<boolean>
  selectLeague: (leagueId: string) => Promise<void>
  joinLeague: (leagueId: string, userId: string, teamName: string) => Promise<boolean>
  leaveLeague: (leagueId: string, userId: string) => Promise<boolean>
  fetchLeagueTeams: (leagueId: string) => Promise<void>
  updateLeague: (leagueId: string, updates: Partial<League>) => Promise<boolean>
  deleteLeague: (leagueId: string, userId: string) => Promise<boolean>
  clearError: () => void
  clearCurrentLeague: () => void
}

export const useLeagueStore = create<LeagueState>()(
  devtools(
    (set, get) => ({
      leagues: [],
      currentLeague: null,
      teams: [],
      isLoading: false,
      error: null,

      fetchUserLeagues: async (userId) => {
        set({ isLoading: true, error: null })
        
        const { leagues, error } = await leagueService.getUserLeagues(userId)
        
        if (error) {
          set({ error, isLoading: false })
          return
        }
        
        set({ leagues, isLoading: false })
      },

      createLeague: async (userId, data) => {
        set({ isLoading: true, error: null })
        
        const { league, error } = await leagueService.createLeague(userId, data)
        
        if (error) {
          set({ error, isLoading: false })
          return false
        }
        
        if (league) {
          const { leagues } = get()
          set({ 
            leagues: [...leagues, league], 
            currentLeague: league,
            isLoading: false 
          })
        }
        
        return true
      },

      selectLeague: async (leagueId) => {
        set({ isLoading: true, error: null })
        
        const { league, error } = await leagueService.getLeague(leagueId)
        
        if (error) {
          set({ error, isLoading: false })
          return
        }
        
        set({ currentLeague: league, isLoading: false })
        
        // Also fetch teams for this league
        if (league) {
          get().fetchLeagueTeams(leagueId)
        }
      },

      joinLeague: async (leagueId, userId, teamName) => {
        set({ isLoading: true, error: null })
        
        const { error } = await leagueService.joinLeague(leagueId, userId, teamName)
        
        if (error) {
          set({ error, isLoading: false })
          return false
        }
        
        // Refresh user leagues and teams
        await get().fetchUserLeagues(userId)
        await get().fetchLeagueTeams(leagueId)
        
        set({ isLoading: false })
        return true
      },

      leaveLeague: async (leagueId, userId) => {
        set({ isLoading: true, error: null })
        
        const { error } = await leagueService.leaveLeague(leagueId, userId)
        
        if (error) {
          set({ error, isLoading: false })
          return false
        }
        
        // Refresh user leagues and teams
        await get().fetchUserLeagues(userId)
        await get().fetchLeagueTeams(leagueId)
        
        set({ isLoading: false })
        return true
      },

      fetchLeagueTeams: async (leagueId) => {
        const { teams, error } = await leagueService.getLeagueTeams(leagueId)
        
        if (error) {
          set({ error })
          return
        }
        
        set({ teams })
      },

      updateLeague: async (leagueId, updates) => {
        set({ isLoading: true, error: null })
        
        const { league, error } = await leagueService.updateLeague(leagueId, updates)
        
        if (error) {
          set({ error, isLoading: false })
          return false
        }
        
        if (league) {
          const { leagues, currentLeague } = get()
          const updatedLeagues = leagues.map(l => l.id === leagueId ? league : l)
          
          set({ 
            leagues: updatedLeagues,
            currentLeague: currentLeague?.id === leagueId ? league : currentLeague,
            isLoading: false 
          })
        }
        
        return true
      },

      deleteLeague: async (leagueId, userId) => {
        set({ isLoading: true, error: null })
        
        const { error } = await leagueService.deleteLeague(leagueId, userId)
        
        if (error) {
          set({ error, isLoading: false })
          return false
        }
        
        const { leagues, currentLeague } = get()
        const filteredLeagues = leagues.filter(l => l.id !== leagueId)
        
        set({ 
          leagues: filteredLeagues,
          currentLeague: currentLeague?.id === leagueId ? null : currentLeague,
          isLoading: false 
        })
        
        return true
      },

      clearError: () => set({ error: null }),
      
      clearCurrentLeague: () => set({ currentLeague: null, teams: [] }),
    })
  )
)