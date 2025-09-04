import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import playerService, { PlayerFilters, PlayerSortOptions } from '@/services/api/playerService'
import type { Database } from '@/types/database'

type Player = Database['public']['Tables']['players']['Row']

interface PlayerState {
  players: Player[]
  selectedPlayer: Player | null
  total: number
  isLoading: boolean
  error: string | null
  filters: PlayerFilters
  sortOptions: PlayerSortOptions
  currentPage: number
  pageSize: number
  
  // Actions
  fetchPlayers: () => Promise<void>
  searchPlayers: (searchTerm: string) => Promise<void>
  selectPlayer: (playerId: string) => Promise<void>
  setFilters: (filters: PlayerFilters) => void
  setSortOptions: (sort: PlayerSortOptions) => void
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  clearSelectedPlayer: () => void
  clearError: () => void
  resetFilters: () => void
}

const initialFilters: PlayerFilters = {}
const initialSortOptions: PlayerSortOptions = { field: 'name', direction: 'asc' }

export const usePlayerStore = create<PlayerState>()(
  devtools(
    (set, get) => ({
      players: [],
      selectedPlayer: null,
      total: 0,
      isLoading: false,
      error: null,
      filters: initialFilters,
      sortOptions: initialSortOptions,
      currentPage: 1,
      pageSize: 50,

      fetchPlayers: async () => {
        const { filters, sortOptions, currentPage, pageSize } = get()
        set({ isLoading: true, error: null })
        
        const offset = (currentPage - 1) * pageSize
        const { players, total, error } = await playerService.getPlayers(
          filters,
          sortOptions,
          pageSize,
          offset
        )
        
        if (error) {
          set({ error, isLoading: false })
          return
        }
        
        set({ players, total, isLoading: false })
      },

      searchPlayers: async (searchTerm) => {
        set({ isLoading: true, error: null })
        
        const { players, error } = await playerService.searchPlayers(searchTerm, 20)
        
        if (error) {
          set({ error, isLoading: false })
          return
        }
        
        set({ players, total: players.length, isLoading: false })
      },

      selectPlayer: async (playerId) => {
        set({ isLoading: true, error: null })
        
        const { player, error } = await playerService.getPlayerById(playerId)
        
        if (error) {
          set({ error, isLoading: false })
          return
        }
        
        set({ selectedPlayer: player, isLoading: false })
      },

      setFilters: (filters) => {
        set({ filters, currentPage: 1 })
        get().fetchPlayers()
      },

      setSortOptions: (sortOptions) => {
        set({ sortOptions, currentPage: 1 })
        get().fetchPlayers()
      },

      setPage: (page) => {
        set({ currentPage: page })
        get().fetchPlayers()
      },

      setPageSize: (pageSize) => {
        set({ pageSize, currentPage: 1 })
        get().fetchPlayers()
      },

      clearSelectedPlayer: () => set({ selectedPlayer: null }),
      
      clearError: () => set({ error: null }),
      
      resetFilters: () => {
        set({ 
          filters: initialFilters, 
          sortOptions: initialSortOptions, 
          currentPage: 1 
        })
        get().fetchPlayers()
      },
    })
  )
)