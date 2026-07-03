// Supabase MCP `generate_typescript_types` により自動生成（2026-07-03）
// project: teaming-assessment (jsomgzvmcdnfqmtpnpew)
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assessments: {
        Row: {
          answers: Json
          created_at: string
          factor_scores: Json
          id: string
          pattern_code: string | null
          role: string | null
          total_score: number
          wave_id: string | null
        }
        Insert: {
          answers: Json
          created_at?: string
          factor_scores: Json
          id?: string
          pattern_code?: string | null
          role?: string | null
          total_score: number
          wave_id?: string | null
        }
        Update: {
          answers?: Json
          created_at?: string
          factor_scores?: Json
          id?: string
          pattern_code?: string | null
          role?: string | null
          total_score?: number
          wave_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessments_wave_id_fkey"
            columns: ["wave_id"]
            isOneToOne: false
            referencedRelation: "waves"
            referencedColumns: ["id"]
          },
        ]
      }
      factors: {
        Row: {
          code: string
          definition: string
          id: number
          name: string
          sort_order: number
        }
        Insert: {
          code: string
          definition: string
          id: number
          name: string
          sort_order: number
        }
        Update: {
          code?: string
          definition?: string
          id?: number
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      item_rules: {
        Row: {
          comment_template: string
          id: number
          params: Json
          rule_type: string
        }
        Insert: {
          comment_template: string
          id?: number
          params?: Json
          rule_type: string
        }
        Update: {
          comment_template?: string
          id?: number
          params?: Json
          rule_type?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          assessment_id: string | null
          consent: boolean
          created_at: string
          email: string
          id: string
        }
        Insert: {
          assessment_id?: string | null
          consent?: boolean
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          assessment_id?: string | null
          consent?: boolean
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      pattern_analyses: {
        Row: {
          background: string | null
          first_step: string | null
          id: number
          links: Json | null
          pattern_code: string
          sound_step: string | null
          summary: string | null
        }
        Insert: {
          background?: string | null
          first_step?: string | null
          id?: number
          links?: Json | null
          pattern_code: string
          sound_step?: string | null
          summary?: string | null
        }
        Update: {
          background?: string | null
          first_step?: string | null
          id?: number
          links?: Json | null
          pattern_code?: string
          sound_step?: string | null
          summary?: string | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          factor_id: number
          id: number
          no: number
          polarity: number
          text: string
        }
        Insert: {
          factor_id: number
          id: number
          no: number
          polarity: number
          text: string
        }
        Update: {
          factor_id?: number
          id?: number
          no?: number
          polarity?: number
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_factor_id_fkey"
            columns: ["factor_id"]
            isOneToOne: false
            referencedRelation: "factors"
            referencedColumns: ["id"]
          },
        ]
      }
      score_bands: {
        Row: {
          description: string
          id: number
          max_score: number
          min_score: number
        }
        Insert: {
          description: string
          id?: number
          max_score: number
          min_score: number
        }
        Update: {
          description?: string
          id?: number
          max_score?: number
          min_score?: number
        }
        Relationships: []
      }
      teams: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      waves: {
        Row: {
          created_at: string
          id: string
          label: string | null
          team_id: string
          wave_no: number
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          team_id: string
          wave_no?: number
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          team_id?: string
          wave_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "waves_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_benchmark: { Args: { p_total: number }; Returns: Json }
      get_team_stats: { Args: { p_code: string }; Returns: Json }
      submit_assessment: {
        Args: { p_answers: Json; p_wave_code?: string; p_role?: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
