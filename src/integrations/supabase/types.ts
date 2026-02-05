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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          church_id: string
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          ministry_id: string | null
          priority: string
          published_at: string | null
          scheduled_at: string | null
          target_audience: string
          target_child_ids: string[] | null
          target_classrooms: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          church_id: string
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          ministry_id?: string | null
          priority?: string
          published_at?: string | null
          scheduled_at?: string | null
          target_audience?: string
          target_child_ids?: string[] | null
          target_classrooms?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          church_id?: string
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          ministry_id?: string | null
          priority?: string
          published_at?: string | null
          scheduled_at?: string | null
          target_audience?: string
          target_child_ids?: string[] | null
          target_classrooms?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
        ]
      }
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
      child_anamnesis: {
        Row: {
          behavioral_notes: string | null
          blood_type: string | null
          child_id: string
          chronic_conditions: string | null
          church_id: string
          consent_signed_at: string | null
          consent_signed_by: string | null
          created_at: string | null
          current_medications: string | null
          dietary_restrictions: string | null
          emergency_transport_consent: boolean | null
          health_insurance: string | null
          health_insurance_number: string | null
          hospitalizations: string | null
          id: string
          last_reviewed_at: string | null
          medical_treatment_consent: boolean | null
          pediatrician_name: string | null
          pediatrician_phone: string | null
          photo_consent: boolean | null
          physical_restrictions: string | null
          previous_surgeries: string | null
          reviewed_by: string | null
          updated_at: string | null
          vaccination_notes: string | null
          vaccination_up_to_date: boolean | null
        }
        Insert: {
          behavioral_notes?: string | null
          blood_type?: string | null
          child_id: string
          chronic_conditions?: string | null
          church_id: string
          consent_signed_at?: string | null
          consent_signed_by?: string | null
          created_at?: string | null
          current_medications?: string | null
          dietary_restrictions?: string | null
          emergency_transport_consent?: boolean | null
          health_insurance?: string | null
          health_insurance_number?: string | null
          hospitalizations?: string | null
          id?: string
          last_reviewed_at?: string | null
          medical_treatment_consent?: boolean | null
          pediatrician_name?: string | null
          pediatrician_phone?: string | null
          photo_consent?: boolean | null
          physical_restrictions?: string | null
          previous_surgeries?: string | null
          reviewed_by?: string | null
          updated_at?: string | null
          vaccination_notes?: string | null
          vaccination_up_to_date?: boolean | null
        }
        Update: {
          behavioral_notes?: string | null
          blood_type?: string | null
          child_id?: string
          chronic_conditions?: string | null
          church_id?: string
          consent_signed_at?: string | null
          consent_signed_by?: string | null
          created_at?: string | null
          current_medications?: string | null
          dietary_restrictions?: string | null
          emergency_transport_consent?: boolean | null
          health_insurance?: string | null
          health_insurance_number?: string | null
          hospitalizations?: string | null
          id?: string
          last_reviewed_at?: string | null
          medical_treatment_consent?: boolean | null
          pediatrician_name?: string | null
          pediatrician_phone?: string | null
          photo_consent?: boolean | null
          physical_restrictions?: string | null
          previous_surgeries?: string | null
          reviewed_by?: string | null
          updated_at?: string | null
          vaccination_notes?: string | null
          vaccination_up_to_date?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "child_anamnesis_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: true
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_anamnesis_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_anamnesis_consent_signed_by_fkey"
            columns: ["consent_signed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_anamnesis_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          {
            foreignKeyName: "child_guardians_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians_safe"
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
      classroom_settings: {
        Row: {
          church_id: string
          classroom_name: string
          created_at: string | null
          id: string
          is_active: boolean | null
          max_age_months: number | null
          max_capacity: number
          min_age_months: number | null
          ratio_children_per_adult: number | null
          updated_at: string | null
        }
        Insert: {
          church_id: string
          classroom_name: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_age_months?: number | null
          max_capacity?: number
          min_age_months?: number | null
          ratio_children_per_adult?: number | null
          updated_at?: string | null
        }
        Update: {
          church_id?: string
          classroom_name?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_age_months?: number | null
          max_capacity?: number
          min_age_months?: number | null
          ratio_children_per_adult?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classroom_settings_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
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
      department_volunteers: {
        Row: {
          church_id: string
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          invited_at: string | null
          invited_by: string | null
          is_active: boolean | null
          ministry_id: string
          notes: string | null
          phone: string | null
          profile_id: string | null
          role: string
          skills: string[] | null
          status: Database["public"]["Enums"]["volunteer_status"]
          term_accepted_at: string | null
          term_version: string | null
          updated_at: string | null
        }
        Insert: {
          church_id: string
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          ministry_id: string
          notes?: string | null
          phone?: string | null
          profile_id?: string | null
          role?: string
          skills?: string[] | null
          status?: Database["public"]["Enums"]["volunteer_status"]
          term_accepted_at?: string | null
          term_version?: string | null
          updated_at?: string | null
        }
        Update: {
          church_id?: string
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          ministry_id?: string
          notes?: string | null
          phone?: string | null
          profile_id?: string | null
          role?: string
          skills?: string[] | null
          status?: Database["public"]["Enums"]["volunteer_status"]
          term_accepted_at?: string | null
          term_version?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "department_volunteers_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_volunteers_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_volunteers_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_volunteers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          child_id: string
          event_id: string
          guardian_id: string
          id: string
          notes: string | null
          registered_at: string | null
          status: string
        }
        Insert: {
          child_id: string
          event_id: string
          guardian_id: string
          id?: string
          notes?: string | null
          registered_at?: string | null
          status?: string
        }
        Update: {
          child_id?: string
          event_id?: string
          guardian_id?: string
          id?: string
          notes?: string | null
          registered_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "ministry_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians_safe"
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
      incident_reports: {
        Row: {
          check_in_id: string | null
          child_id: string
          church_id: string
          created_at: string | null
          description: string
          first_aid_administered: boolean | null
          first_aid_details: string | null
          follow_up_completed_at: string | null
          follow_up_notes: string | null
          follow_up_required: boolean | null
          id: string
          immediate_action_taken: string | null
          incident_date: string
          incident_time: string
          incident_type: string
          location: string | null
          medical_attention_details: string | null
          medical_attention_required: boolean | null
          parent_notified_at: string | null
          parent_notified_by: string | null
          parent_response: string | null
          reported_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string
          staff_present: string[] | null
          status: string | null
          updated_at: string | null
          witnesses: string[] | null
        }
        Insert: {
          check_in_id?: string | null
          child_id: string
          church_id: string
          created_at?: string | null
          description: string
          first_aid_administered?: boolean | null
          first_aid_details?: string | null
          follow_up_completed_at?: string | null
          follow_up_notes?: string | null
          follow_up_required?: boolean | null
          id?: string
          immediate_action_taken?: string | null
          incident_date?: string
          incident_time?: string
          incident_type: string
          location?: string | null
          medical_attention_details?: string | null
          medical_attention_required?: boolean | null
          parent_notified_at?: string | null
          parent_notified_by?: string | null
          parent_response?: string | null
          reported_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          staff_present?: string[] | null
          status?: string | null
          updated_at?: string | null
          witnesses?: string[] | null
        }
        Update: {
          check_in_id?: string | null
          child_id?: string
          church_id?: string
          created_at?: string | null
          description?: string
          first_aid_administered?: boolean | null
          first_aid_details?: string | null
          follow_up_completed_at?: string | null
          follow_up_notes?: string | null
          follow_up_required?: boolean | null
          id?: string
          immediate_action_taken?: string | null
          incident_date?: string
          incident_time?: string
          incident_type?: string
          location?: string | null
          medical_attention_details?: string | null
          medical_attention_required?: boolean | null
          parent_notified_at?: string | null
          parent_notified_by?: string | null
          parent_response?: string | null
          reported_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          staff_present?: string[] | null
          status?: string | null
          updated_at?: string | null
          witnesses?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_reports_check_in_id_fkey"
            columns: ["check_in_id"]
            isOneToOne: false
            referencedRelation: "child_check_ins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_reports_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_reports_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_reports_parent_notified_by_fkey"
            columns: ["parent_notified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_reports_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
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
      medication_logs: {
        Row: {
          administered_at: string
          administered_by: string
          child_id: string
          church_id: string
          created_at: string | null
          dosage_given: string
          id: string
          notes: string | null
          schedule_id: string
          witnessed_by: string | null
        }
        Insert: {
          administered_at?: string
          administered_by: string
          child_id: string
          church_id: string
          created_at?: string | null
          dosage_given: string
          id?: string
          notes?: string | null
          schedule_id: string
          witnessed_by?: string | null
        }
        Update: {
          administered_at?: string
          administered_by?: string
          child_id?: string
          church_id?: string
          created_at?: string | null
          dosage_given?: string
          id?: string
          notes?: string | null
          schedule_id?: string
          witnessed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medication_logs_administered_by_fkey"
            columns: ["administered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_logs_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_logs_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_logs_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "medication_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_logs_witnessed_by_fkey"
            columns: ["witnessed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_schedules: {
        Row: {
          administration_times: string[] | null
          authorized_by: string | null
          child_id: string
          church_id: string
          created_at: string | null
          dosage: string
          end_date: string | null
          frequency: string
          id: string
          instructions: string | null
          is_active: boolean | null
          medication_name: string
          parent_authorization_date: string | null
          requires_refrigeration: boolean | null
          start_date: string
          updated_at: string | null
        }
        Insert: {
          administration_times?: string[] | null
          authorized_by?: string | null
          child_id: string
          church_id: string
          created_at?: string | null
          dosage: string
          end_date?: string | null
          frequency: string
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          medication_name: string
          parent_authorization_date?: string | null
          requires_refrigeration?: boolean | null
          start_date?: string
          updated_at?: string | null
        }
        Update: {
          administration_times?: string[] | null
          authorized_by?: string | null
          child_id?: string
          church_id?: string
          created_at?: string | null
          dosage?: string
          end_date?: string | null
          frequency?: string
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          medication_name?: string
          parent_authorization_date?: string | null
          requires_refrigeration?: boolean | null
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medication_schedules_authorized_by_fkey"
            columns: ["authorized_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_schedules_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_schedules_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
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
      ministry_events: {
        Row: {
          all_day: boolean | null
          church_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          end_datetime: string | null
          event_type: string
          id: string
          location: string | null
          max_capacity: number | null
          ministry_id: string | null
          recurrence_rule: string | null
          recurring: boolean | null
          registration_required: boolean | null
          start_datetime: string
          title: string
          updated_at: string | null
        }
        Insert: {
          all_day?: boolean | null
          church_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_datetime?: string | null
          event_type?: string
          id?: string
          location?: string | null
          max_capacity?: number | null
          ministry_id?: string | null
          recurrence_rule?: string | null
          recurring?: boolean | null
          registration_required?: boolean | null
          start_datetime: string
          title: string
          updated_at?: string | null
        }
        Update: {
          all_day?: boolean | null
          church_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_datetime?: string | null
          event_type?: string
          id?: string
          location?: string | null
          max_capacity?: number | null
          ministry_id?: string | null
          recurrence_rule?: string | null
          recurring?: boolean | null
          registration_required?: boolean | null
          start_datetime?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ministry_events_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministry_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministry_events_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
        ]
      }
      ministry_staff: {
        Row: {
          background_check_date: string | null
          certifications: string | null
          church_id: string
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean | null
          notes: string | null
          phone: string | null
          profile_id: string | null
          role: string
          trained_classrooms: string[] | null
          updated_at: string | null
        }
        Insert: {
          background_check_date?: string | null
          certifications?: string | null
          church_id: string
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          phone?: string | null
          profile_id?: string | null
          role?: string
          trained_classrooms?: string[] | null
          updated_at?: string | null
        }
        Update: {
          background_check_date?: string | null
          certifications?: string | null
          church_id?: string
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          phone?: string | null
          profile_id?: string | null
          role?: string
          trained_classrooms?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ministry_staff_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministry_staff_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      staff_schedules: {
        Row: {
          church_id: string
          classroom: string | null
          confirmed: boolean | null
          confirmed_at: string | null
          created_at: string | null
          event_id: string | null
          id: string
          notes: string | null
          role: string
          shift_end: string
          shift_start: string
          staff_id: string
          updated_at: string | null
        }
        Insert: {
          church_id: string
          classroom?: string | null
          confirmed?: boolean | null
          confirmed_at?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          notes?: string | null
          role?: string
          shift_end: string
          shift_start: string
          staff_id: string
          updated_at?: string | null
        }
        Update: {
          church_id?: string
          classroom?: string | null
          confirmed?: boolean | null
          confirmed_at?: string | null
          created_at?: string | null
          event_id?: string | null
          id?: string
          notes?: string | null
          role?: string
          shift_end?: string
          shift_start?: string
          staff_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_schedules_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_schedules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "ministry_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_schedules_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "ministry_staff"
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
      volunteer_announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          read_at: string | null
          volunteer_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string | null
          volunteer_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string | null
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "volunteer_announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_announcement_reads_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "department_volunteers"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_announcements: {
        Row: {
          church_id: string
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_published: boolean | null
          meeting_date: string | null
          ministry_id: string
          priority: Database["public"]["Enums"]["announcement_priority"]
          title: string
          updated_at: string | null
        }
        Insert: {
          church_id: string
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_published?: boolean | null
          meeting_date?: string | null
          ministry_id: string
          priority?: Database["public"]["Enums"]["announcement_priority"]
          title: string
          updated_at?: string | null
        }
        Update: {
          church_id?: string
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_published?: boolean | null
          meeting_date?: string | null
          ministry_id?: string
          priority?: Database["public"]["Enums"]["announcement_priority"]
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_announcements_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_announcements_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_commitment_terms: {
        Row: {
          church_id: string
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          title: string
          version: string
        }
        Insert: {
          church_id: string
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          title: string
          version: string
        }
        Update: {
          church_id?: string
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          title?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_commitment_terms_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_commitment_terms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_schedules: {
        Row: {
          church_id: string
          confirmed: boolean | null
          confirmed_at: string | null
          created_at: string | null
          created_by: string | null
          id: string
          ministry_id: string
          notes: string | null
          schedule_date: string
          schedule_type: Database["public"]["Enums"]["schedule_type"]
          shift_end: string
          shift_start: string
          updated_at: string | null
          volunteer_id: string
        }
        Insert: {
          church_id: string
          confirmed?: boolean | null
          confirmed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          ministry_id: string
          notes?: string | null
          schedule_date: string
          schedule_type?: Database["public"]["Enums"]["schedule_type"]
          shift_end: string
          shift_start: string
          updated_at?: string | null
          volunteer_id: string
        }
        Update: {
          church_id?: string
          confirmed?: boolean | null
          confirmed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          ministry_id?: string
          notes?: string | null
          schedule_date?: string
          schedule_type?: Database["public"]["Enums"]["schedule_type"]
          shift_end?: string
          shift_start?: string
          updated_at?: string | null
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_schedules_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_schedules_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_schedules_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "department_volunteers"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          child_id: string
          church_id: string
          classroom: string
          created_at: string | null
          id: string
          notes: string | null
          notified_at: string | null
          position: number
          requested_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          child_id: string
          church_id: string
          classroom: string
          created_at?: string | null
          id?: string
          notes?: string | null
          notified_at?: string | null
          position?: number
          requested_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          child_id?: string
          church_id?: string
          classroom?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          notified_at?: string | null
          position?: number
          requested_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      guardians_safe: {
        Row: {
          church_id: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          photo_url: string | null
          profile_id: string | null
          relationship: string | null
          updated_at: string | null
        }
        Insert: {
          church_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          photo_url?: string | null
          profile_id?: string | null
          relationship?: string | null
          updated_at?: string | null
        }
        Update: {
          church_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          photo_url?: string | null
          profile_id?: string | null
          relationship?: string | null
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
      get_guardians_for_management: {
        Args: never
        Returns: {
          church_id: string
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string
          photo_url: string
          profile_id: string
          relationship: string
          updated_at: string
        }[]
      }
      get_user_church_id: { Args: { _user_id: string }; Returns: string }
      get_volunteer_ministries: {
        Args: { _user_id: string }
        Returns: string[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_volunteer_of_ministry: {
        Args: { _ministry_id: string; _user_id: string }
        Returns: boolean
      }
      is_ministry_leader: {
        Args: { _ministry_id: string; _user_id: string }
        Returns: boolean
      }
      is_volunteer: { Args: { _user_id: string }; Returns: boolean }
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
      verify_guardian_pin: {
        Args: { p_guardian_id: string; p_pin: string }
        Returns: boolean
      }
    }
    Enums: {
      announcement_priority: "normal" | "urgent" | "meeting"
      app_role: "admin" | "tesoureiro" | "pastor" | "lider" | "user" | "parent"
      schedule_type: "primary" | "backup"
      volunteer_status: "pending" | "active" | "inactive"
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
      announcement_priority: ["normal", "urgent", "meeting"],
      app_role: ["admin", "tesoureiro", "pastor", "lider", "user", "parent"],
      schedule_type: ["primary", "backup"],
      volunteer_status: ["pending", "active", "inactive"],
    },
  },
} as const
