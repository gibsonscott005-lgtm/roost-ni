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
          in_app_enabled: boolean
          muted_types: Database["public"]["Enums"]["notification_type"][]
          updated_at: string
          user_id: string
        }
        Insert: {
          in_app_enabled?: boolean
          muted_types?: Database["public"]["Enums"]["notification_type"][]
          updated_at?: string
          user_id: string
        }
        Update: {
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
          deposit_payment_method: string | null
          deposit_protected_at: string | null
          deposit_scheme: string | null
          deposit_status: string
          id: string
          inventory_completed_at: string | null
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
          tenant_id: string
        }
        Insert: {
          deposit_cert_number?: string | null
          deposit_payment_method?: string | null
          deposit_protected_at?: string | null
          deposit_scheme?: string | null
          deposit_status?: string
          id?: string
          inventory_completed_at?: string | null
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
          tenant_id: string
        }
        Update: {
          deposit_cert_number?: string | null
          deposit_payment_method?: string | null
          deposit_protected_at?: string | null
          deposit_scheme?: string | null
          deposit_status?: string
          id?: string
          inventory_completed_at?: string | null
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
          tenant_id?: string
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
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          created_at?: string
          full_name?: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      property_listings: {
        Row: {
          address: string
          created_at: string
          deposit: number
          enforce_empty_in_full_out: boolean
          heating_type: string
          id: string
          is_published: boolean
          landlord_id: string
          location: string | null
          monthly_rent: number
          ni_landlord_reg_number: string
          status: string
          tenant_preferences: string[]
          title: string
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          deposit: number
          enforce_empty_in_full_out?: boolean
          heating_type: string
          id?: string
          is_published?: boolean
          landlord_id: string
          location?: string | null
          monthly_rent: number
          ni_landlord_reg_number: string
          status?: string
          tenant_preferences?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          deposit?: number
          enforce_empty_in_full_out?: boolean
          heating_type?: string
          id?: string
          is_published?: boolean
          landlord_id?: string
          location?: string | null
          monthly_rent?: number
          ni_landlord_reg_number?: string
          status?: string
          tenant_preferences?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      tenancy_inventory_items: {
        Row: {
          condition: string | null
          created_at: string
          id: string
          notes: string | null
          photo_path: string | null
          room: string
          share_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          condition?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          photo_path?: string | null
          room: string
          share_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          condition?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          photo_path?: string | null
          room?: string
          share_id?: string
          sort_order?: number
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
      tenancy_receipts: {
        Row: {
          amount: number
          created_at: string
          id: string
          issued_at: string
          kind: string
          method: string
          notes: string | null
          share_id: string
          statutory_cash: boolean
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          issued_at?: string
          kind: string
          method: string
          notes?: string | null
          share_id: string
          statutory_cash?: boolean
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          issued_at?: string
          kind?: string
          method?: string
          notes?: string | null
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
          id_document_number: string | null
          id_document_path: string | null
          id_document_type: string | null
          id_provider: string | null
          id_session_id: string | null
          id_status: Database["public"]["Enums"]["verification_status"]
          id_verified_at: string | null
          identity_verified: boolean
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
          right_to_rent_verified: boolean
          tenancy_duration: string | null
          tenancy_end_date: string | null
          tenancy_end_date_2: string | null
          tenancy_start_date: string | null
          tenancy_start_date_2: string | null
          updated_at: string
          user_id: string
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
          id_document_number?: string | null
          id_document_path?: string | null
          id_document_type?: string | null
          id_provider?: string | null
          id_session_id?: string | null
          id_status?: Database["public"]["Enums"]["verification_status"]
          id_verified_at?: string | null
          identity_verified?: boolean
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
          right_to_rent_verified?: boolean
          tenancy_duration?: string | null
          tenancy_end_date?: string | null
          tenancy_end_date_2?: string | null
          tenancy_start_date?: string | null
          tenancy_start_date_2?: string | null
          updated_at?: string
          user_id: string
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
          id_document_number?: string | null
          id_document_path?: string | null
          id_document_type?: string | null
          id_provider?: string | null
          id_session_id?: string | null
          id_status?: Database["public"]["Enums"]["verification_status"]
          id_verified_at?: string | null
          identity_verified?: boolean
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
          right_to_rent_verified?: boolean
          tenancy_duration?: string | null
          tenancy_end_date?: string | null
          tenancy_end_date_2?: string | null
          tenancy_start_date?: string | null
          tenancy_start_date_2?: string | null
          updated_at?: string
          user_id?: string
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
      share_status: "pending" | "reviewed" | "accepted"
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
      ],
      share_status: ["pending", "reviewed", "accepted"],
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
