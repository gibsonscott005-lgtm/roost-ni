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
      beta_feedback: {
        Row: {
          account_type: string | null
          category: string
          created_at: string
          id: string
          message: string
          page_path: string | null
          status: string
          user_id: string
        }
        Insert: {
          account_type?: string | null
          category: string
          created_at?: string
          id?: string
          message: string
          page_path?: string | null
          status?: string
          user_id: string
        }
        Update: {
          account_type?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          page_path?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      billing_config: {
        Row: {
          created_at: string
          currency: string
          id: boolean
          notice: string | null
          payments_enabled: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: boolean
          notice?: string | null
          payments_enabled?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: boolean
          notice?: string | null
          payments_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      compliance_audits: {
        Row: {
          answers: Json
          band: string
          contact_name: string | null
          created_at: string
          email: string | null
          gaps: string[]
          id: string
          property_count: string | null
          score: number
          utm: Json
        }
        Insert: {
          answers?: Json
          band: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          gaps?: string[]
          id?: string
          property_count?: string | null
          score: number
          utm?: Json
        }
        Update: {
          answers?: Json
          band?: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          gaps?: string[]
          id?: string
          property_count?: string | null
          score?: number
          utm?: Json
        }
        Relationships: []
      }
      maintenance_tickets: {
        Row: {
          created_at: string
          description: string
          id: string
          landlord_notes: string | null
          photo_urls: string[]
          property_id: string
          resolved_at: string | null
          status: Database["public"]["Enums"]["maintenance_status"]
          tenant_id: string
          title: string
          updated_at: string
          urgency: Database["public"]["Enums"]["maintenance_urgency"]
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          landlord_notes?: string | null
          photo_urls?: string[]
          property_id: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["maintenance_status"]
          tenant_id: string
          title: string
          updated_at?: string
          urgency?: Database["public"]["Enums"]["maintenance_urgency"]
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          landlord_notes?: string | null
          photo_urls?: string[]
          property_id?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["maintenance_status"]
          tenant_id?: string
          title?: string
          updated_at?: string
          urgency?: Database["public"]["Enums"]["maintenance_urgency"]
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_tickets_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          email_enabled: boolean
          email_muted_types: Database["public"]["Enums"]["notification_type"][]
          in_app_enabled: boolean
          muted_types: Database["public"]["Enums"]["notification_type"][]
          updated_at: string
          user_id: string
        }
        Insert: {
          email_enabled?: boolean
          email_muted_types?: Database["public"]["Enums"]["notification_type"][]
          in_app_enabled?: boolean
          muted_types?: Database["public"]["Enums"]["notification_type"][]
          updated_at?: string
          user_id: string
        }
        Update: {
          email_enabled?: boolean
          email_muted_types?: Database["public"]["Enums"]["notification_type"][]
          in_app_enabled?: boolean
          muted_types?: Database["public"]["Enums"]["notification_type"][]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          body: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          link_path: string
          read_at: string | null
          recipient_id: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          link_path: string
          read_at?: string | null
          recipient_id: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          link_path?: string
          read_at?: string | null
          recipient_id?: string
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: []
      }
      passport_shares: {
        Row: {
          deposit_cert_number: string | null
          deposit_cert_path: string | null
          deposit_payment_method: string | null
          deposit_protected_at: string | null
          deposit_scheme: string | null
          deposit_status: string
          final_inspection_responded_at: string | null
          final_inspection_response: string | null
          final_inspection_submitted_at: string | null
          final_meter_readings: string | null
          final_oil_level: string | null
          id: string
          inventory_completed_at: string | null
          landlord_checks_confirmed_at: string | null
          lease_document_path: string | null
          lease_kind: string
          lease_oil_clause: boolean | null
          lease_sent_at: string | null
          lease_signed_at: string | null
          lease_signed_name: string | null
          lease_status: string | null
          listing_id: string
          oil_handover_level: string | null
          rent_payment_method: string | null
          rent_status: string
          shared_at: string
          status: Database["public"]["Enums"]["share_status"]
          tenancy_completed_at: string | null
          tenancy_start_date: string | null
          tenancy_status: string
          tenant_id: string
          withdraw_count: number
          withdrawn_at: string | null
          withdrawn_reason: string | null
        }
        Insert: {
          deposit_cert_number?: string | null
          deposit_cert_path?: string | null
          deposit_payment_method?: string | null
          deposit_protected_at?: string | null
          deposit_scheme?: string | null
          deposit_status?: string
          final_inspection_responded_at?: string | null
          final_inspection_response?: string | null
          final_inspection_submitted_at?: string | null
          final_meter_readings?: string | null
          final_oil_level?: string | null
          id?: string
          inventory_completed_at?: string | null
          landlord_checks_confirmed_at?: string | null
          lease_document_path?: string | null
          lease_kind?: string
          lease_oil_clause?: boolean | null
          lease_sent_at?: string | null
          lease_signed_at?: string | null
          lease_signed_name?: string | null
          lease_status?: string | null
          listing_id: string
          oil_handover_level?: string | null
          rent_payment_method?: string | null
          rent_status?: string
          shared_at?: string
          status?: Database["public"]["Enums"]["share_status"]
          tenancy_completed_at?: string | null
          tenancy_start_date?: string | null
          tenancy_status?: string
          tenant_id: string
          withdraw_count?: number
          withdrawn_at?: string | null
          withdrawn_reason?: string | null
        }
        Update: {
          deposit_cert_number?: string | null
          deposit_cert_path?: string | null
          deposit_payment_method?: string | null
          deposit_protected_at?: string | null
          deposit_scheme?: string | null
          deposit_status?: string
          final_inspection_responded_at?: string | null
          final_inspection_response?: string | null
          final_inspection_submitted_at?: string | null
          final_meter_readings?: string | null
          final_oil_level?: string | null
          id?: string
          inventory_completed_at?: string | null
          landlord_checks_confirmed_at?: string | null
          lease_document_path?: string | null
          lease_kind?: string
          lease_oil_clause?: boolean | null
          lease_sent_at?: string | null
          lease_signed_at?: string | null
          lease_signed_name?: string | null
          lease_status?: string | null
          listing_id?: string
          oil_handover_level?: string | null
          rent_payment_method?: string | null
          rent_status?: string
          shared_at?: string
          status?: Database["public"]["Enums"]["share_status"]
          tenancy_completed_at?: string | null
          tenancy_start_date?: string | null
          tenancy_status?: string
          tenant_id?: string
          withdraw_count?: number
          withdrawn_at?: string | null
          withdrawn_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "passport_shares_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "property_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passport_shares_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_items: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          key: string
          name: string
          price_pence: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          name: string
          price_pence?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          price_pence?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      pricing_tiers: {
        Row: {
          completion_fee_pence: number
          created_at: string
          id: string
          key: string
          max_properties: number | null
          min_properties: number
          monthly_pence: number
          name: string
          per_extra_unit_pence: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          completion_fee_pence?: number
          created_at?: string
          id?: string
          key: string
          max_properties?: number | null
          min_properties?: number
          monthly_pence?: number
          name: string
          per_extra_unit_pence?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          completion_fee_pence?: number
          created_at?: string
          id?: string
          key?: string
          max_properties?: number | null
          min_properties?: number
          monthly_pence?: number
          name?: string
          per_extra_unit_pence?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          created_at: string
          full_name: string
          hear_about_us: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          created_at?: string
          full_name?: string
          hear_about_us?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          created_at?: string
          full_name?: string
          hear_about_us?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      property_certificates: {
        Row: {
          created_at: string
          document_path: string | null
          expires_on: string | null
          id: string
          issued_on: string | null
          kind: string
          landlord_id: string
          notes: string | null
          property_id: string
          reference: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_path?: string | null
          expires_on?: string | null
          id?: string
          issued_on?: string | null
          kind: string
          landlord_id: string
          notes?: string | null
          property_id: string
          reference?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_path?: string | null
          expires_on?: string | null
          id?: string
          issued_on?: string | null
          kind?: string
          landlord_id?: string
          notes?: string | null
          property_id?: string
          reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_certificates_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      property_listings: {
        Row: {
          address: string
          available_from: string | null
          bathrooms: number | null
          bedrooms: number | null
          bills_included: string[]
          created_at: string
          deposit: number
          description: string | null
          enforce_empty_in_full_out: boolean
          existing_deposit_reference: string | null
          existing_deposit_scheme: string | null
          existing_tenancy_start: string | null
          existing_tenant_email: string | null
          existing_tenant_name: string | null
          features: string[]
          furnished: string | null
          garden: string | null
          heating_type: string
          id: string
          is_published: boolean
          landlord_id: string
          location: string | null
          min_tenancy_months: number | null
          monthly_rent: number
          ni_landlord_reg_number: string
          occupancy_status: string
          parking: string | null
          photo_urls: string[]
          property_type: string | null
          status: string
          tenancy_ended_at: string | null
          tenant_preferences: string[]
          title: string
          updated_at: string
        }
        Insert: {
          address: string
          available_from?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          bills_included?: string[]
          created_at?: string
          deposit: number
          description?: string | null
          enforce_empty_in_full_out?: boolean
          existing_deposit_reference?: string | null
          existing_deposit_scheme?: string | null
          existing_tenancy_start?: string | null
          existing_tenant_email?: string | null
          existing_tenant_name?: string | null
          features?: string[]
          furnished?: string | null
          garden?: string | null
          heating_type: string
          id?: string
          is_published?: boolean
          landlord_id: string
          location?: string | null
          min_tenancy_months?: number | null
          monthly_rent: number
          ni_landlord_reg_number: string
          occupancy_status?: string
          parking?: string | null
          photo_urls?: string[]
          property_type?: string | null
          status?: string
          tenancy_ended_at?: string | null
          tenant_preferences?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          address?: string
          available_from?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          bills_included?: string[]
          created_at?: string
          deposit?: number
          description?: string | null
          enforce_empty_in_full_out?: boolean
          existing_deposit_reference?: string | null
          existing_deposit_scheme?: string | null
          existing_tenancy_start?: string | null
          existing_tenant_email?: string | null
          existing_tenant_name?: string | null
          features?: string[]
          furnished?: string | null
          garden?: string | null
          heating_type?: string
          id?: string
          is_published?: boolean
          landlord_id?: string
          location?: string | null
          min_tenancy_months?: number | null
          monthly_rent?: number
          ni_landlord_reg_number?: string
          occupancy_status?: string
          parking?: string | null
          photo_urls?: string[]
          property_type?: string | null
          status?: string
          tenancy_ended_at?: string | null
          tenant_preferences?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      reminder_log: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          kind: string
          recipient_id: string
          run_date: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          kind: string
          recipient_id: string
          run_date?: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          kind?: string
          recipient_id?: string
          run_date?: string
        }
        Relationships: []
      }
      tenancy_deposit_settlements: {
        Row: {
          created_at: string
          deductions: Json
          deposit_total: number
          id: string
          proposed_at: string | null
          proposed_return: number
          return_method: string | null
          returned_at: string | null
          scheme_dispute_ref: string | null
          share_id: string
          tenant_comment: string | null
          tenant_responded_at: string | null
          tenant_response: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deductions?: Json
          deposit_total?: number
          id?: string
          proposed_at?: string | null
          proposed_return?: number
          return_method?: string | null
          returned_at?: string | null
          scheme_dispute_ref?: string | null
          share_id: string
          tenant_comment?: string | null
          tenant_responded_at?: string | null
          tenant_response?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deductions?: Json
          deposit_total?: number
          id?: string
          proposed_at?: string | null
          proposed_return?: number
          return_method?: string | null
          returned_at?: string | null
          scheme_dispute_ref?: string | null
          share_id?: string
          tenant_comment?: string | null
          tenant_responded_at?: string | null
          tenant_response?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenancy_deposit_settlements_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: true
            referencedRelation: "passport_shares"
            referencedColumns: ["id"]
          },
        ]
      }
      tenancy_inventory_items: {
        Row: {
          condition: string | null
          created_at: string
          final_condition: string | null
          final_notes: string | null
          final_photo_path: string | null
          id: string
          notes: string | null
          photo_path: string | null
          room: string
          share_id: string
          sort_order: number
          tenant_comment: string | null
          tenant_disputed: boolean
          updated_at: string
        }
        Insert: {
          condition?: string | null
          created_at?: string
          final_condition?: string | null
          final_notes?: string | null
          final_photo_path?: string | null
          id?: string
          notes?: string | null
          photo_path?: string | null
          room: string
          share_id: string
          sort_order?: number
          tenant_comment?: string | null
          tenant_disputed?: boolean
          updated_at?: string
        }
        Update: {
          condition?: string | null
          created_at?: string
          final_condition?: string | null
          final_notes?: string | null
          final_photo_path?: string | null
          id?: string
          notes?: string | null
          photo_path?: string | null
          room?: string
          share_id?: string
          sort_order?: number
          tenant_comment?: string | null
          tenant_disputed?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenancy_inventory_items_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "passport_shares"
            referencedColumns: ["id"]
          },
        ]
      }
      tenancy_notices: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          end_date: string
          id: string
          notice_weeks: number
          reason: string | null
          served_by: string
          served_by_role: string
          served_on: string
          share_id: string
          updated_at: string
          withdrawn_at: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          end_date: string
          id?: string
          notice_weeks: number
          reason?: string | null
          served_by: string
          served_by_role: string
          served_on: string
          share_id: string
          updated_at?: string
          withdrawn_at?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          end_date?: string
          id?: string
          notice_weeks?: number
          reason?: string | null
          served_by?: string
          served_by_role?: string
          served_on?: string
          share_id?: string
          updated_at?: string
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenancy_notices_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "passport_shares"
            referencedColumns: ["id"]
          },
        ]
      }
      tenancy_receipts: {
        Row: {
          amount: number
          created_at: string
          due_date: string | null
          id: string
          issued_at: string
          kind: string
          method: string
          notes: string | null
          period_label: string | null
          share_id: string
          statutory_cash: boolean
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date?: string | null
          id?: string
          issued_at?: string
          kind: string
          method: string
          notes?: string | null
          period_label?: string | null
          share_id: string
          statutory_cash?: boolean
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          issued_at?: string
          kind?: string
          method?: string
          notes?: string | null
          period_label?: string | null
          share_id?: string
          statutory_cash?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenancy_receipts_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "passport_shares"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_passports: {
        Row: {
          accept_empty_in_full_out: boolean
          affordability_max: number | null
          annual_income: number | null
          created_at: string
          employment_status: string | null
          guarantor_address: string | null
          guarantor_email: string | null
          guarantor_employment_status: string | null
          guarantor_name: string | null
          guarantor_phone: string | null
          id: string
          id_document_expiry: string | null
          id_document_number: string | null
          id_document_path: string | null
          id_document_type: string | null
          id_failure_reason: string | null
          id_provider: string | null
          id_session_id: string | null
          id_status: Database["public"]["Enums"]["verification_status"]
          id_verified_at: string | null
          identity_verified: boolean
          income_breakdown: Json
          income_doc_signal: string | null
          income_document_path: string | null
          income_verified: boolean
          is_first_time_renter: boolean
          issuing_country: string | null
          monthly_income_net: number | null
          preferred_heating: string | null
          previous_landlord_email: string | null
          previous_landlord_email_2: string | null
          previous_landlord_name: string | null
          previous_landlord_name_2: string | null
          previous_landlord_phone: string | null
          previous_landlord_phone_2: string | null
          reference_document_path: string | null
          reference_verified: boolean
          tenancy_duration: string | null
          tenancy_end_date: string | null
          tenancy_end_date_2: string | null
          tenancy_start_date: string | null
          tenancy_start_date_2: string | null
          updated_at: string
          user_id: string
          verification_fee_paid_at: string | null
          verified_date_of_birth: string | null
          verified_full_name: string | null
          willing_direct_payment_apa: boolean
        }
        Insert: {
          accept_empty_in_full_out?: boolean
          affordability_max?: number | null
          annual_income?: number | null
          created_at?: string
          employment_status?: string | null
          guarantor_address?: string | null
          guarantor_email?: string | null
          guarantor_employment_status?: string | null
          guarantor_name?: string | null
          guarantor_phone?: string | null
          id?: string
          id_document_expiry?: string | null
          id_document_number?: string | null
          id_document_path?: string | null
          id_document_type?: string | null
          id_failure_reason?: string | null
          id_provider?: string | null
          id_session_id?: string | null
          id_status?: Database["public"]["Enums"]["verification_status"]
          id_verified_at?: string | null
          identity_verified?: boolean
          income_breakdown?: Json
          income_doc_signal?: string | null
          income_document_path?: string | null
          income_verified?: boolean
          is_first_time_renter?: boolean
          issuing_country?: string | null
          monthly_income_net?: number | null
          preferred_heating?: string | null
          previous_landlord_email?: string | null
          previous_landlord_email_2?: string | null
          previous_landlord_name?: string | null
          previous_landlord_name_2?: string | null
          previous_landlord_phone?: string | null
          previous_landlord_phone_2?: string | null
          reference_document_path?: string | null
          reference_verified?: boolean
          tenancy_duration?: string | null
          tenancy_end_date?: string | null
          tenancy_end_date_2?: string | null
          tenancy_start_date?: string | null
          tenancy_start_date_2?: string | null
          updated_at?: string
          user_id: string
          verification_fee_paid_at?: string | null
          verified_date_of_birth?: string | null
          verified_full_name?: string | null
          willing_direct_payment_apa?: boolean
        }
        Update: {
          accept_empty_in_full_out?: boolean
          affordability_max?: number | null
          annual_income?: number | null
          created_at?: string
          employment_status?: string | null
          guarantor_address?: string | null
          guarantor_email?: string | null
          guarantor_employment_status?: string | null
          guarantor_name?: string | null
          guarantor_phone?: string | null
          id?: string
          id_document_expiry?: string | null
          id_document_number?: string | null
          id_document_path?: string | null
          id_document_type?: string | null
          id_failure_reason?: string | null
          id_provider?: string | null
          id_session_id?: string | null
          id_status?: Database["public"]["Enums"]["verification_status"]
          id_verified_at?: string | null
          identity_verified?: boolean
          income_breakdown?: Json
          income_doc_signal?: string | null
          income_document_path?: string | null
          income_verified?: boolean
          is_first_time_renter?: boolean
          issuing_country?: string | null
          monthly_income_net?: number | null
          preferred_heating?: string | null
          previous_landlord_email?: string | null
          previous_landlord_email_2?: string | null
          previous_landlord_name?: string | null
          previous_landlord_name_2?: string | null
          previous_landlord_phone?: string | null
          previous_landlord_phone_2?: string | null
          reference_document_path?: string | null
          reference_verified?: boolean
          tenancy_duration?: string | null
          tenancy_end_date?: string | null
          tenancy_end_date_2?: string | null
          tenancy_start_date?: string | null
          tenancy_start_date_2?: string | null
          updated_at?: string
          user_id?: string
          verification_fee_paid_at?: string | null
          verified_date_of_birth?: string | null
          verified_full_name?: string | null
          willing_direct_payment_apa?: boolean
        }
        Relationships: []
      }
      verification_audit_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          provider: string
          session_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          provider: string
          session_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          provider?: string
          session_id?: string
          tenant_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      emit_notification: {
        Args: {
          p_actor_id: string
          p_body: string
          p_entity_id: string
          p_entity_type: string
          p_link_path: string
          p_recipient_id: string
          p_title: string
          p_type: Database["public"]["Enums"]["notification_type"]
        }
        Returns: string
      }
    }
    Enums: {
      account_type: "tenant" | "landlord" | "admin"
      maintenance_status: "reported" | "in_progress" | "resolved" | "cancelled"
      maintenance_urgency: "low" | "medium" | "high" | "emergency"
      notification_type:
        | "application_received"
        | "application_accepted"
        | "application_declined"
        | "lease_issued"
        | "lease_signed_by_tenant"
        | "lease_counter_signed"
        | "property_let_agreed"
        | "receipt_logged"
        | "receipt_confirmed"
        | "deposit_protected"
        | "deposit_deadline_approaching"
        | "inventory_submitted"
        | "inventory_approved"
        | "maintenance_reported"
        | "maintenance_updated"
        | "maintenance_resolved"
        | "rent_due_reminder"
        | "rent_overdue"
        | "identity_verified"
        | "identity_verification_failed"
        | "certificate_expiring"
        | "certificate_expired"
        | "notice_served"
        | "notice_acknowledged"
        | "final_inspection_submitted"
        | "final_inspection_agreed"
        | "final_inspection_disputed"
        | "deposit_settlement_proposed"
        | "deposit_returned"
        | "tenancy_completed"
        | "application_withdrawn"
        | "application_reapplied"
      share_status: "pending" | "reviewed" | "accepted" | "withdrawn"
      verification_status:
        | "unverified"
        | "pending"
        | "verified"
        | "failed"
        | "self_certified"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      account_type: ["tenant", "landlord", "admin"],
      maintenance_status: ["reported", "in_progress", "resolved", "cancelled"],
      maintenance_urgency: ["low", "medium", "high", "emergency"],
      notification_type: [
        "application_received",
        "application_accepted",
        "application_declined",
        "lease_issued",
        "lease_signed_by_tenant",
        "lease_counter_signed",
        "property_let_agreed",
        "receipt_logged",
        "receipt_confirmed",
        "deposit_protected",
        "deposit_deadline_approaching",
        "inventory_submitted",
        "inventory_approved",
        "maintenance_reported",
        "maintenance_updated",
        "maintenance_resolved",
        "rent_due_reminder",
        "rent_overdue",
        "identity_verified",
        "identity_verification_failed",
        "certificate_expiring",
        "certificate_expired",
        "notice_served",
        "notice_acknowledged",
        "final_inspection_submitted",
        "final_inspection_agreed",
        "final_inspection_disputed",
        "deposit_settlement_proposed",
        "deposit_returned",
        "tenancy_completed",
        "application_withdrawn",
        "application_reapplied",
      ],
      share_status: ["pending", "reviewed", "accepted", "withdrawn"],
      verification_status: [
        "unverified",
        "pending",
        "verified",
        "failed",
        "self_certified",
      ],
    },
  },
} as const
