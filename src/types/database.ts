export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          stack_user_id: string | null
          email: string
          username: string
          password_hash: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          stack_user_id?: string | null
          email: string
          username: string
          password_hash?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          stack_user_id?: string | null
          email?: string
          username?: string
          password_hash?: string | null
          avatar_url?: string | null
          updated_at?: string
        }
      }
      leagues: {
        Row: {
          id: string
          name: string
          commissioner_id: string
          settings: Json
          scoring_system: Json
          draft_date: string | null
          season_year: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          commissioner_id: string
          settings?: Json
          scoring_system?: Json
          draft_date?: string | null
          season_year?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          commissioner_id?: string
          settings?: Json
          scoring_system?: Json
          draft_date?: string | null
          season_year?: number
          updated_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          league_id: string
          user_id: string
          team_name: string
          draft_position: number | null
          waiver_priority: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          league_id: string
          user_id: string
          team_name: string
          draft_position?: number | null
          waiver_priority: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          league_id?: string
          user_id?: string
          team_name?: string
          draft_position?: number | null
          waiver_priority?: number
          updated_at?: string
        }
      }
      players: {
        Row: {
          id: string
          name: string
          position: string
          nfl_team: string
          stats: Json
          projections: Json
          injury_status: string | null
          bye_week: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          position: string
          nfl_team: string
          stats?: Json
          projections?: Json
          injury_status?: string | null
          bye_week?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          position?: string
          nfl_team?: string
          stats?: Json
          projections?: Json
          injury_status?: string | null
          bye_week?: number
          updated_at?: string
        }
      }
      rosters: {
        Row: {
          id: string
          team_id: string
          player_id: string
          position_slot: string
          acquired_date: string
          dropped_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          player_id: string
          position_slot: string
          acquired_date?: string
          dropped_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          player_id?: string
          position_slot?: string
          acquired_date?: string
          dropped_date?: string | null
          updated_at?: string
        }
      }
      lineup_entries: {
        Row: {
          id: string
          team_id: string
          week: number
          player_id: string
          position_slot: string
          points_scored: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          week: number
          player_id: string
          position_slot: string
          points_scored?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          week?: number
          player_id?: string
          position_slot?: string
          points_scored?: number | null
          updated_at?: string
        }
      }
      draft_picks: {
        Row: {
          id: string
          league_id: string
          team_id: string
          player_id: string
          round: number
          pick: number
          overall_pick: number
          created_at: string
        }
        Insert: {
          id?: string
          league_id: string
          team_id: string
          player_id: string
          round: number
          pick: number
          overall_pick: number
          created_at?: string
        }
        Update: {
          id?: string
          league_id?: string
          team_id?: string
          player_id?: string
          round?: number
          pick?: number
          overall_pick?: number
        }
      }
      waiver_claims: {
        Row: {
          id: string
          team_id: string
          player_add_id: string
          player_drop_id: string | null
          waiver_priority: number
          status: string
          processed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          player_add_id: string
          player_drop_id?: string | null
          waiver_priority: number
          status?: string
          processed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          player_add_id?: string
          player_drop_id?: string | null
          waiver_priority?: number
          status?: string
          processed_at?: string | null
          updated_at?: string
        }
      }
      trades: {
        Row: {
          id: string
          proposing_team_id: string
          receiving_team_id: string
          proposed_players: Json
          requested_players: Json
          status: string
          expires_at: string
          processed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          proposing_team_id: string
          receiving_team_id: string
          proposed_players: Json
          requested_players: Json
          status?: string
          expires_at: string
          processed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          proposing_team_id?: string
          receiving_team_id?: string
          proposed_players?: Json
          requested_players?: Json
          status?: string
          expires_at?: string
          processed_at?: string | null
          updated_at?: string
        }
      }
      player_projections: {
        Row: {
          id: string
          player_id: string
          season_year: number
          week: number | null
          fantasy_points: number
          adp: number | null
          projected_stats: Json
          confidence: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          player_id: string
          season_year: number
          week?: number | null
          fantasy_points: number
          adp?: number | null
          projected_stats?: Json
          confidence?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          player_id?: string
          season_year?: number
          week?: number | null
          fantasy_points?: number
          adp?: number | null
          projected_stats?: Json
          confidence?: number
          updated_at?: string
        }
      }
      player_stats: {
        Row: {
          id: string
          player_id: string
          season_year: number
          week: number
          game_stats: Json
          fantasy_points: number
          created_at: string
        }
        Insert: {
          id?: string
          player_id: string
          season_year: number
          week: number
          game_stats?: Json
          fantasy_points: number
          created_at?: string
        }
        Update: {
          id?: string
          player_id?: string
          season_year?: number
          week?: number
          game_stats?: Json
          fantasy_points?: number
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Type helpers for database operations
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']