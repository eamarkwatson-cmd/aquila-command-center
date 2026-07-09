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
      activity_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          performed_by: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          performed_by?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          performed_by?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      delegations: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          notes: string | null
          owner: string
          priority: string | null
          source: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          owner: string
          priority?: string | null
          source?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          owner?: string
          priority?: string | null
          source?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          end_time: string | null
          id: string
          join_url: string | null
          meeting_id: string | null
          notes: string | null
          passcode: string | null
          platform: string | null
          start_time: string
          title: string
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          id?: string
          join_url?: string | null
          meeting_id?: string | null
          notes?: string | null
          passcode?: string | null
          platform?: string | null
          start_time: string
          title: string
        }
        Update: {
          created_at?: string
          end_time?: string | null
          id?: string
          join_url?: string | null
          meeting_id?: string | null
          notes?: string | null
          passcode?: string | null
          platform?: string | null
          start_time?: string
          title?: string
        }
        Relationships: []
      }
      inbox_items: {
        Row: {
          actioned: boolean
          category: string
          created_at: string
          date: string
          id: string
          sender: string | null
          subject: string
          summary: string | null
        }
        Insert: {
          actioned?: boolean
          category?: string
          created_at?: string
          date?: string
          id?: string
          sender?: string | null
          subject: string
          summary?: string | null
        }
        Update: {
          actioned?: boolean
          category?: string
          created_at?: string
          date?: string
          id?: string
          sender?: string | null
          subject?: string
          summary?: string | null
        }
        Relationships: []
      }
      investments: {
        Row: {
          amount: number | null
          created_at: string
          custodian: string | null
          entity: string | null
          id: string
          name: string
          next_action: string | null
          next_action_due: string | null
          notes: string | null
          platform: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          custodian?: string | null
          entity?: string | null
          id?: string
          name: string
          next_action?: string | null
          next_action_due?: string | null
          notes?: string | null
          platform?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          custodian?: string | null
          entity?: string | null
          id?: string
          name?: string
          next_action?: string | null
          next_action_due?: string | null
          notes?: string | null
          platform?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      linkedin_connection: {
        Row: {
          access_token: string
          display_name: string | null
          expires_at: string
          id: string
          person_urn: string
          updated_at: string
        }
        Insert: {
          access_token: string
          display_name?: string | null
          expires_at: string
          id?: string
          person_urn: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          display_name?: string | null
          expires_at?: string
          id?: string
          person_urn?: string
          updated_at?: string
        }
        Relationships: []
      }
      linkedin_post_metadata: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          last_error: string | null
          last_synced_at: string | null
          linkedin_post_url: string | null
          notion_page_id: string
          posted_at: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          linkedin_post_url?: string | null
          notion_page_id: string
          posted_at?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          linkedin_post_url?: string | null
          notion_page_id?: string
          posted_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
        }
        Relationships: []
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
