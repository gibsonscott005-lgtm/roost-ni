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
      passport_shares: {
        Row: {
          id: string
          listing_id: string
          shared_at: string
          status: Database["public"]["Enums"]["share_status"]
          tenant_id: string
        }
        Insert: {
          id?: string
          listing_id: string
          shared_at?: string
          status?: Database["public"]["Enums"]["share_status"]
          tenant_id: string
        }
        Update: {
          id?: string
          listing_id?: string
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
          tenant_preferences?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
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
          identity_verified: boolean
          income_document_path: string | null
          income_verified: boolean
          is_first_time_renter: boolean
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
          identity_verified?: boolean
          income_document_path?: string | null
          income_verified?: boolean
          is_first_time_renter?: boolean
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
          identity_verified?: boolean
          income_document_path?: string | null
          income_verified?: boolean
          is_first_time_renter?: boolean
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      account_type: "tenant" | "landlord" | "admin"
      share_status: "pending" | "reviewed" | "accepted"
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
      share_status: ["pending", "reviewed", "accepted"],
    },
  },
} as const
