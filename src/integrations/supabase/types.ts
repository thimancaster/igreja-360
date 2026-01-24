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
      authorized_pickups: {
        Row: {
          authorized_name: string
          authorized_phone: string | null
          authorized_photo: string | null
          child_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          pickup_pin: string | null
          relationship: string | null
          updated_at: string | null
        }
        Insert: {
          authorized_name: string
          authorized_phone?: string | null
          authorized_photo?: string | null
          child_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          pickup_pin?: string | null
          relationship?: string | null
          updated_at?: string | null
        }
        Update: {
          authorized_name?: string
          authorized_phone?: string | null
          authorized_photo?: string | null
          child_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          pickup_pin?: string | null
          relationship?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "authorized_pickups_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
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
      child_check_ins: {
        Row: {
          checked_in_at: string | null
          checked_in_by: string | null
          checked_out_at: string | null
          checked_out_by: string | null
          child_id: string
          church_id: string
          classroom: string | null
          created_at: string | null
          event_date: string
          event_name: string
          id: string
          label_number: string | null
          notes: string | null
          pickup_method: string | null
          pickup_person_name: string | null
          qr_code: string
        }
        Insert: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          checked_out_at?: string | null
          checked_out_by?: string | null
          child_id: string
          church_id: string
          classroom?: string | null
          created_at?: string | null
          event_date?: string
          event_name?: string
          id?: string
          label_number?: string | null
          notes?: string | null
          pickup_method?: string | null
          pickup_person_name?: string | null
          qr_code: string
        }
        Update: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          checked_out_at?: string | null
          checked_out_by?: string | null
          child_id?: string
          church_id?: string
          classroom?: string | null
          created_at?: string | null
          event_date?: string
          event_name?: string
          id?: string
          label_number?: string | null
          notes?: string | null
          pickup_method?: string | null
          pickup_person_name?: string | null
          qr_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_check_ins_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_check_ins_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      child_guardians: {
        Row: {
          can_pickup: boolean | null
          child_id: string
          created_at: string | null
          guardian_id: string
          id: string
          is_primary: boolean | null
        }
        Insert: {
          can_pickup?: boolean | null
          child_id: string
          created_at?: string | null
          guardian_id: string
          id?: string
          is_primary?: boolean | null
        }
        Update: {
          can_pickup?: boolean | null
          child_id?: string
          created_at?: string | null
          guardian_id?: string
          id?: string
          is_primary?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "child_guardians_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_guardians_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          allergies: string | null
          birth_date: string
          church_id: string
          classroom: string
          created_at: string | null
          emergency_contact: string | null
          emergency_phone: string | null
          full_name: string
          id: string
          image_consent: boolean | null
          medications: string | null
          notes: string | null
          photo_url: string | null
          special_needs: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          allergies?: string | null
          birth_date: string
          church_id: string
          classroom?: string
          created_at?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          full_name: string
          id?: string
          image_consent?: boolean | null
          medications?: string | null
          notes?: string | null
          photo_url?: string | null
          special_needs?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          allergies?: string | null
          birth_date?: string
          church_id?: string
          classroom?: string
          created_at?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          full_name?: string
          id?: string
          image_consent?: boolean | null
          medications?: string | null
          notes?: string | null
          photo_url?: string | null
          special_needs?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "children_church_id_fkey"
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
      contributions: {
        Row: {
          amount: number
          campaign_name: string | null
          church_id: string
          contribution_date: string
          contribution_type: string
          created_at: string | null
          id: string
          member_id: string | null
          notes: string | null
          receipt_generated: boolean | null
          receipt_generated_at: string | null
          receipt_number: string | null
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          campaign_name?: string | null
          church_id: string
          contribution_date?: string
          contribution_type: string
          created_at?: string | null
          id?: string
          member_id?: string | null
          notes?: string | null
          receipt_generated?: boolean | null
          receipt_generated_at?: string | null
          receipt_number?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          campaign_name?: string | null
          church_id?: string
          contribution_date?: string
          contribution_type?: string
          created_at?: string | null
          id?: string
          member_id?: string | null
          notes?: string | null
          receipt_generated?: boolean | null
          receipt_generated_at?: string | null
          receipt_number?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contributions_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contributions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contributions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
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
      guardians: {
        Row: {
          access_pin: string | null
          church_id: string
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          phone: string | null
          photo_url: string | null
          profile_id: string | null
          relationship: string
          updated_at: string | null
        }
        Insert: {
          access_pin?: string | null
          church_id: string
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          photo_url?: string | null
          profile_id?: string | null
          relationship?: string
          updated_at?: string | null
        }
        Update: {
          access_pin?: string | null
          church_id?: string
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          photo_url?: string | null
          profile_id?: string | null
          relationship?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guardians_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardians_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leader_checkout_overrides: {
        Row: {
          check_in_id: string
          created_at: string | null
          id: string
          leader_id: string
          pickup_person_document: string | null
          pickup_person_name: string
          reason: string
        }
        Insert: {
          check_in_id: string
          created_at?: string | null
          id?: string
          leader_id: string
          pickup_person_document?: string | null
          pickup_person_name: string
          reason: string
        }
        Update: {
          check_in_id?: string
          created_at?: string | null
          id?: string
          leader_id?: string
          pickup_person_document?: string | null
          pickup_person_name?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "leader_checkout_overrides_check_in_id_fkey"
            columns: ["check_in_id"]
            isOneToOne: false
            referencedRelation: "child_check_ins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leader_checkout_overrides_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      member_ministries: {
        Row: {
          created_at: string | null
          id: string
          joined_at: string | null
          member_id: string
          ministry_id: string
          role: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          joined_at?: string | null
          member_id: string
          ministry_id: string
          role?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          joined_at?: string | null
          member_id?: string
          ministry_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_ministries_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_ministries_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          address: string | null
          birth_date: string | null
          church_id: string
          city: string | null
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          member_since: string | null
          notes: string | null
          phone: string | null
          state: string | null
          status: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          church_id: string
          city?: string | null
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          member_since?: string | null
          notes?: string | null
          phone?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          church_id?: string
          city?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          member_since?: string | null
          notes?: string | null
          phone?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_church_id_fkey"
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
      pickup_authorizations: {
        Row: {
          approved_by_leader: string | null
          authorization_type: string
          authorized_by: string
          authorized_person_document: string | null
          authorized_person_name: string
          authorized_person_phone: string | null
          child_id: string
          church_id: string
          created_at: string | null
          id: string
          leader_approval_required: boolean | null
          reason: string | null
          security_pin: string
          status: string | null
          updated_at: string | null
          used_at: string | null
          used_by_checkin_id: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          approved_by_leader?: string | null
          authorization_type?: string
          authorized_by: string
          authorized_person_document?: string | null
          authorized_person_name: string
          authorized_person_phone?: string | null
          child_id: string
          church_id: string
          created_at?: string | null
          id?: string
          leader_approval_required?: boolean | null
          reason?: string | null
          security_pin: string
          status?: string | null
          updated_at?: string | null
          used_at?: string | null
          used_by_checkin_id?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          approved_by_leader?: string | null
          authorization_type?: string
          authorized_by?: string
          authorized_person_document?: string | null
          authorized_person_name?: string
          authorized_person_phone?: string | null
          child_id?: string
          church_id?: string
          created_at?: string | null
          id?: string
          leader_approval_required?: boolean | null
          reason?: string | null
          security_pin?: string
          status?: string | null
          updated_at?: string | null
          used_at?: string | null
          used_by_checkin_id?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pickup_authorizations_approved_by_leader_fkey"
            columns: ["approved_by_leader"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickup_authorizations_authorized_by_fkey"
            columns: ["authorized_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickup_authorizations_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickup_authorizations_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickup_authorizations_used_by_checkin_id_fkey"
            columns: ["used_by_checkin_id"]
            isOneToOne: false
            referencedRelation: "child_check_ins"
            referencedColumns: ["id"]
          },
        ]
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
      push_subscriptions: {
        Row: {
          auth: string
          church_id: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auth: string
          church_id: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          church_id?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_church_id_fkey"
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
          installment_group_id: string | null
          installment_number: number | null
          invoice_url: string | null
          member_id: string | null
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
          installment_group_id?: string | null
          installment_number?: number | null
          invoice_url?: string | null
          member_id?: string | null
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
          installment_group_id?: string | null
          installment_number?: number | null
          invoice_url?: string | null
          member_id?: string | null
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
            foreignKeyName: "transactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
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
      check_and_update_overdue: { Args: never; Returns: Json }
      cleanup_expired_oauth_sessions: { Args: never; Returns: undefined }
      generate_receipt_number: {
        Args: { p_church_id: string }
        Returns: string
      }
      get_birthdays_this_month: {
        Args: { p_church_id: string }
        Returns: {
          birth_date: string
          days_until: number
          email: string
          full_name: string
          id: string
          phone: string
        }[]
      }
      get_decrypted_integration_v2: {
        Args: { integration_id: string; requesting_user_id: string }
        Returns: {
          access_token: string
          refresh_token: string
        }[]
      }
      get_decrypted_oauth_session_v2: {
        Args: { requesting_user_id: string; session_id: string }
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
      trigger_auto_sync_overdue: { Args: never; Returns: undefined }
      update_overdue_transactions: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "tesoureiro" | "pastor" | "lider" | "user" | "parent"
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
      app_role: ["admin", "tesoureiro", "pastor", "lider", "user", "parent"],
    },
  },
} as const
