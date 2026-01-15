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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          church_id: string
          created_at: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string | null
        }
        Insert: {
          church_id: string
          created_at?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string | null
        }
        Update: {
          church_id?: string
          created_at?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          church_id: string
          created_at: string | null
          details: Json | null
          entity_count: number | null
          entity_type: string
          id: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          action: string
          church_id: string
          created_at?: string | null
          details?: Json | null
          entity_count?: number | null
          entity_type: string
          id?: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          action?: string
          church_id?: string
          created_at?: string | null
          details?: Json | null
          entity_count?: number | null
          entity_type?: string
          id?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          church_id: string
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          name: string
          type: string
          updated_at: string | null
        }
        Insert: {
          church_id: string
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
          type: string
          updated_at?: string | null
        }
        Update: {
          church_id?: string
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      churches: {
        Row: {
          address: string | null
          city: string | null
          cnpj: string | null
          created_at: string | null
          id: string
          name: string
          owner_user_id: string
          state: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string | null
          id?: string
          name: string
          owner_user_id: string
          state?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string | null
          id?: string
          name?: string
          owner_user_id?: string
          state?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      column_mappings: {
        Row: {
          church_id: string
          created_at: string | null
          id: string
          mapping_name: string
          source_column: string
          target_field: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          church_id: string
          created_at?: string | null
          id?: string
          mapping_name: string
          source_column: string
          target_field: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          church_id?: string
          created_at?: string | null
          id?: string
          mapping_name?: string
          source_column?: string
          target_field?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "column_mappings_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      google_integrations: {
        Row: {
          access_token_enc: string | null
          church_id: string
          column_mapping: Json
          created_at: string | null
          id: string
          last_sync_at: string | null
          refresh_token_enc: string | null
          sheet_id: string
          sheet_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token_enc?: string | null
          church_id: string
          column_mapping: Json
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          refresh_token_enc?: string | null
          sheet_id: string
          sheet_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token_enc?: string | null
          church_id?: string
          column_mapping?: Json
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          refresh_token_enc?: string | null
          sheet_id?: string
          sheet_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_integrations_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      ministries: {
        Row: {
          church_id: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          church_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          church_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ministries_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          church_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          type: string | null
          user_id: string
        }
        Insert: {
          church_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          type?: string | null
          user_id: string
        }
        Update: {
          church_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_sessions: {
        Row: {
          access_token_enc: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          refresh_token_enc: string | null
          user_id: string
        }
        Insert: {
          access_token_enc?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          refresh_token_enc?: string | null
          user_id: string
        }
        Update: {
          access_token_enc?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          refresh_token_enc?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          church_id: string | null
          created_at: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          church_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          church_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      public_sheet_integrations: {
        Row: {
          church_id: string
          column_mapping: Json
          created_at: string | null
          id: string
          last_sync_at: string | null
          records_synced: number | null
          sheet_id: string
          sheet_name: string
          sheet_url: string
          sync_status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          church_id: string
          column_mapping?: Json
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          records_synced?: number | null
          sheet_id: string
          sheet_name?: string
          sheet_url: string
          sync_status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          church_id?: string
          column_mapping?: Json
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          records_synced?: number | null
          sheet_id?: string
          sheet_name?: string
          sheet_url?: string
          sync_status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_sheet_integrations_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      sheet_uploads: {
        Row: {
          church_id: string
          created_at: string | null
          error_details: string | null
          file_size: number | null
          filename: string
          id: string
          records_imported: number | null
          status: string
          updated_at: string | null
          upload_date: string | null
          user_id: string | null
        }
        Insert: {
          church_id: string
          created_at?: string | null
          error_details?: string | null
          file_size?: number | null
          filename: string
          id?: string
          records_imported?: number | null
          status?: string
          updated_at?: string | null
          upload_date?: string | null
          user_id?: string | null
        }
        Update: {
          church_id?: string
          created_at?: string | null
          error_details?: string | null
          file_size?: number | null
          filename?: string
          id?: string
          records_imported?: number | null
          status?: string
          updated_at?: string | null
          upload_date?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sheet_uploads_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_history: {
        Row: {
          church_id: string
          created_at: string | null
          error_message: string | null
          id: string
          integration_id: string
          integration_type: string
          records_inserted: number | null
          records_skipped: number | null
          records_updated: number | null
          status: string | null
          sync_type: string | null
          user_id: string | null
        }
        Insert: {
          church_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          integration_id: string
          integration_type: string
          records_inserted?: number | null
          records_skipped?: number | null
          records_updated?: number | null
          status?: string | null
          sync_type?: string | null
          user_id?: string | null
        }
        Update: {
          church_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          integration_id?: string
          integration_type?: string
          records_inserted?: number | null
          records_skipped?: number | null
          records_updated?: number | null
          status?: string | null
          sync_type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_history_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category_id: string | null
          church_id: string
          created_at: string | null
          created_by: string | null
          description: string
          due_date: string | null
          external_id: string | null
          id: string
          installment_number: number | null
          invoice_url: string | null
          ministry_id: string | null
          notes: string | null
          origin: string | null
          payment_date: string | null
          status: string
          total_installments: number | null
          type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          category_id?: string | null
          church_id: string
          created_at?: string | null
          created_by?: string | null
          description: string
          due_date?: string | null
          external_id?: string | null
          id?: string
          installment_number?: number | null
          invoice_url?: string | null
          ministry_id?: string | null
          notes?: string | null
          origin?: string | null
          payment_date?: string | null
          status?: string
          total_installments?: number | null
          type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          church_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          due_date?: string | null
          external_id?: string | null
          id?: string
          installment_number?: number | null
          invoice_url?: string | null
          ministry_id?: string | null
          notes?: string | null
          origin?: string | null
          payment_date?: string | null
          status?: string
          total_installments?: number | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ministries: {
        Row: {
          created_at: string | null
          id: string
          ministry_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          ministry_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          ministry_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_ministries_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_oauth_sessions: { Args: never; Returns: undefined }
      get_decrypted_integration: {
        Args: { integration_id: string }
        Returns: {
          access_token: string
          refresh_token: string
        }[]
      }
      get_decrypted_oauth_session: {
        Args: { session_id: string }
        Returns: {
          access_token: string
          refresh_token: string
        }[]
      }
      get_user_church_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      store_encrypted_integration_tokens: {
        Args: {
          p_access_token: string
          p_integration_id: string
          p_refresh_token: string
        }
        Returns: undefined
      }
      store_encrypted_oauth_session: {
        Args: {
          p_access_token: string
          p_refresh_token: string
          p_user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "tesoureiro" | "pastor" | "lider" | "user"
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
    Enums: {
      app_role: ["admin", "tesoureiro", "pastor", "lider", "user"],
    },
  },
} as const
