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
          email: string
          username: string
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          username: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          username?: string
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
          waiver_priority?: number
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
      trades: {
        Row: {
          id: string
          league_id: string
          initiator_team_id: string
          receiver_team_id: string
          status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired'
          message: string | null
          expires_at: string
          processed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          league_id: string
          initiator_team_id: string
          receiver_team_id: string
          status?: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired'
          message?: string | null
          expires_at: string
          processed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          league_id?: string
          initiator_team_id?: string
          receiver_team_id?: string
          status?: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired'
          message?: string | null
          expires_at?: string
          processed_at?: string | null
          updated_at?: string
        }
      }
      trade_items: {
        Row: {
          id: string
          trade_id: string
          player_id: string
          from_team_id: string
          to_team_id: string
          created_at: string
        }
        Insert: {
          id?: string
          trade_id: string
          player_id: string
          from_team_id: string
          to_team_id: string
          created_at?: string
        }
        Update: {
          id?: string
          trade_id?: string
          player_id?: string
          from_team_id?: string
          to_team_id?: string
        }
      }
      roster_players: {
        Row: {
          id: string
          team_id: string
          player_id: string
          acquired_date: string
          acquisition_type: 'draft' | 'waiver' | 'trade' | 'free_agent'
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          player_id: string
          acquired_date?: string
          acquisition_type?: 'draft' | 'waiver' | 'trade' | 'free_agent'
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          player_id?: string
          acquired_date?: string
          acquisition_type?: 'draft' | 'waiver' | 'trade' | 'free_agent'
        }
      }
      player_projections: {
        Row: {
          id: string
          player_id: string
          week: number | null
          season_year: number
          fantasy_points: number
          adp: number | null
          created_at: string
        }
        Insert: {
          id?: string
          player_id: string
          week?: number | null
          season_year: number
          fantasy_points: number
          adp?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          player_id?: string
          week?: number | null
          season_year?: number
          fantasy_points?: number
          adp?: number | null
        }
      }
      waiver_claims: {
        Row: {
          id: string
          team_id: string
          player_id: string
          drop_player_id: string | null
          bid_amount: number | null
          priority: number
          status: 'pending' | 'processed' | 'successful' | 'failed'
          processed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          player_id: string
          drop_player_id?: string | null
          bid_amount?: number | null
          priority: number
          status?: 'pending' | 'processed' | 'successful' | 'failed'
          processed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          player_id?: string
          drop_player_id?: string | null
          bid_amount?: number | null
          priority?: number
          status?: 'pending' | 'processed' | 'successful' | 'failed'
          processed_at?: string | null
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
  }
}