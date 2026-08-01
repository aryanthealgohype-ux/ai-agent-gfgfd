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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      agent_memory: {
        Row: {
          agent_id: string
          content: string
          created_at: string
          id: string
          kind: string
          org_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          agent_id: string
          content: string
          created_at?: string
          id?: string
          kind?: string
          org_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string
          content?: string
          created_at?: string
          id?: string
          kind?: string
          org_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_memory_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_memory_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_runs: {
        Row: {
          agent_id: string
          completed_at: string | null
          completion_tokens: number
          cost_usd: number
          created_at: string
          duration_ms: number | null
          error: string | null
          id: string
          input: string
          model: string | null
          org_id: string
          output: string | null
          prompt_tokens: number
          requested_by: string
          status: Database["public"]["Enums"]["run_status"]
        }
        Insert: {
          agent_id: string
          completed_at?: string | null
          completion_tokens?: number
          cost_usd?: number
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          input: string
          model?: string | null
          org_id: string
          output?: string | null
          prompt_tokens?: number
          requested_by: string
          status?: Database["public"]["Enums"]["run_status"]
        }
        Update: {
          agent_id?: string
          completed_at?: string | null
          completion_tokens?: number
          cost_usd?: number
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          input?: string
          model?: string | null
          org_id?: string
          output?: string | null
          prompt_tokens?: number
          requested_by?: string
          status?: Database["public"]["Enums"]["run_status"]
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_templates: {
        Row: {
          category: Database["public"]["Enums"]["agent_category"]
          created_at: string
          default_model: string
          escalation_rules: string | null
          id: string
          name: string
          permissions: string[]
          required_connectors: string[]
          safety_justification: string
          safety_rating: number
          slug: string
          sort_order: number
          system_prompt: string
        }
        Insert: {
          category: Database["public"]["Enums"]["agent_category"]
          created_at?: string
          default_model?: string
          escalation_rules?: string | null
          id?: string
          name: string
          permissions?: string[]
          required_connectors?: string[]
          safety_justification: string
          safety_rating: number
          slug: string
          sort_order?: number
          system_prompt: string
        }
        Update: {
          category?: Database["public"]["Enums"]["agent_category"]
          created_at?: string
          default_model?: string
          escalation_rules?: string | null
          id?: string
          name?: string
          permissions?: string[]
          required_connectors?: string[]
          safety_justification?: string
          safety_rating?: number
          slug?: string
          sort_order?: number
          system_prompt?: string
        }
        Relationships: []
      }
      agent_versions: {
        Row: {
          agent_id: string
          change_note: string | null
          changed_by: string | null
          created_at: string
          id: string
          model: string
          org_id: string
          requires_approval: boolean
          system_prompt: string
          version: number
        }
        Insert: {
          agent_id: string
          change_note?: string | null
          changed_by?: string | null
          created_at?: string
          id?: string
          model: string
          org_id: string
          requires_approval: boolean
          system_prompt: string
          version: number
        }
        Update: {
          agent_id?: string
          change_note?: string | null
          changed_by?: string | null
          created_at?: string
          id?: string
          model?: string
          org_id?: string
          requires_approval?: boolean
          system_prompt?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_versions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_versions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          category: Database["public"]["Enums"]["agent_category"]
          created_at: string
          escalation_rules: string | null
          id: string
          model: string
          name: string
          org_id: string
          permissions: string[]
          required_connectors: string[]
          requires_approval: boolean
          safety_justification: string
          safety_rating: number
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["agent_status"]
          system_prompt: string
          updated_at: string
          version: number
          webhook_url: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["agent_category"]
          created_at?: string
          escalation_rules?: string | null
          id?: string
          model?: string
          name: string
          org_id: string
          permissions?: string[]
          required_connectors?: string[]
          requires_approval?: boolean
          safety_justification: string
          safety_rating: number
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["agent_status"]
          system_prompt: string
          updated_at?: string
          version?: number
          webhook_url?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["agent_category"]
          created_at?: string
          escalation_rules?: string | null
          id?: string
          model?: string
          name?: string
          org_id?: string
          permissions?: string[]
          required_connectors?: string[]
          requires_approval?: boolean
          safety_justification?: string
          safety_rating?: number
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["agent_status"]
          system_prompt?: string
          updated_at?: string
          version?: number
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      approvals: {
        Row: {
          agent_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          org_id: string
          reason: string | null
          requested_by: string
          run_id: string
          status: Database["public"]["Enums"]["approval_status"]
        }
        Insert: {
          agent_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          org_id: string
          reason?: string | null
          requested_by: string
          run_id: string
          status?: Database["public"]["Enums"]["approval_status"]
        }
        Update: {
          agent_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          org_id?: string
          reason?: string | null
          requested_by?: string
          run_id?: string
          status?: Database["public"]["Enums"]["approval_status"]
        }
        Relationships: [
          {
            foreignKeyName: "approvals_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: true
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json
          org_id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          org_id: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          org_id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      connectors: {
        Row: {
          account_ref: string | null
          connected: boolean
          created_at: string
          env_keys: string[]
          id: string
          label: string
          org_id: string
          provider: string
          setup_notes: string | null
          updated_at: string
        }
        Insert: {
          account_ref?: string | null
          connected?: boolean
          created_at?: string
          env_keys?: string[]
          id?: string
          label: string
          org_id: string
          provider: string
          setup_notes?: string | null
          updated_at?: string
        }
        Update: {
          account_ref?: string | null
          connected?: boolean
          created_at?: string
          env_keys?: string[]
          id?: string
          label?: string
          org_id?: string
          provider?: string
          setup_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "connectors_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          org_id: string
          read_at: string | null
          severity: string
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          org_id: string
          read_at?: string | null
          severity?: string
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          org_id?: string
          read_at?: string | null
          severity?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          created_at: string
          id: string
          org_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_settings: {
        Row: {
          archive_logs: boolean
          last_retention_run_at: string | null
          log_retention_days: number
          org_id: string
          placeholders: Json
          updated_at: string
        }
        Insert: {
          archive_logs?: boolean
          last_retention_run_at?: string | null
          log_retention_days?: number
          org_id: string
          placeholders?: Json
          updated_at?: string
        }
        Update: {
          archive_logs?: boolean
          last_retention_run_at?: string | null
          log_retention_days?: number
          org_id?: string
          placeholders?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      run_log_archive: {
        Row: {
          archived_at: string
          id: string
          level: string
          logged_at: string
          message: string
          org_id: string
          run_id: string | null
        }
        Insert: {
          archived_at?: string
          id?: string
          level?: string
          logged_at: string
          message: string
          org_id: string
          run_id?: string | null
        }
        Update: {
          archived_at?: string
          id?: string
          level?: string
          logged_at?: string
          message?: string
          org_id?: string
          run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "run_log_archive_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      run_logs: {
        Row: {
          created_at: string
          id: string
          level: string
          message: string
          org_id: string
          run_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: string
          message: string
          org_id: string
          run_id: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          message?: string
          org_id?: string
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "run_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "run_logs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      spend_alerts: {
        Row: {
          agent_id: string | null
          created_at: string
          id: string
          kind: string
          limit_id: string | null
          limit_usd: number
          org_id: string
          period: Database["public"]["Enums"]["spend_period"]
          spend_usd: number
          window_start: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          limit_id?: string | null
          limit_usd?: number
          org_id: string
          period: Database["public"]["Enums"]["spend_period"]
          spend_usd?: number
          window_start: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          limit_id?: string | null
          limit_usd?: number
          org_id?: string
          period?: Database["public"]["Enums"]["spend_period"]
          spend_usd?: number
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "spend_alerts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spend_alerts_limit_id_fkey"
            columns: ["limit_id"]
            isOneToOne: false
            referencedRelation: "spend_limits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spend_alerts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      spend_limits: {
        Row: {
          agent_id: string | null
          alert_threshold_pct: number
          created_at: string
          created_by: string | null
          hard_stop: boolean
          id: string
          limit_usd: number
          org_id: string
          period: Database["public"]["Enums"]["spend_period"]
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          alert_threshold_pct?: number
          created_at?: string
          created_by?: string | null
          hard_stop?: boolean
          id?: string
          limit_usd: number
          org_id: string
          period: Database["public"]["Enums"]["spend_period"]
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          alert_threshold_pct?: number
          created_at?: string
          created_by?: string | null
          hard_stop?: boolean
          id?: string
          limit_usd?: number
          org_id?: string
          period?: Database["public"]["Enums"]["spend_period"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spend_limits_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spend_limits_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          agent_id: string | null
          attempts: number
          created_at: string
          delivered_at: string | null
          event: string
          id: string
          last_error: string | null
          last_status_code: number | null
          max_attempts: number
          next_attempt_at: string
          org_id: string
          payload: Json
          run_id: string | null
          status: string
          updated_at: string
          url: string
        }
        Insert: {
          agent_id?: string | null
          attempts?: number
          created_at?: string
          delivered_at?: string | null
          event?: string
          id?: string
          last_error?: string | null
          last_status_code?: number | null
          max_attempts?: number
          next_attempt_at?: string
          org_id: string
          payload?: Json
          run_id?: string | null
          status?: string
          updated_at?: string
          url: string
        }
        Update: {
          agent_id?: string | null
          attempts?: number
          created_at?: string
          delivered_at?: string | null
          event?: string
          id?: string
          last_error?: string | null
          last_status_code?: number | null
          max_attempts?: number
          next_attempt_at?: string
          org_id?: string
          payload?: Json
          run_id?: string | null
          status?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_deliveries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_deliveries_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_log_retention: { Args: never; Returns: number }
      can_manage: { Args: { _org_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_member: { Args: { _org_id: string }; Returns: boolean }
    }
    Enums: {
      agent_category:
        | "communication"
        | "productivity"
        | "research"
        | "sales"
        | "content"
        | "dev"
        | "security"
      agent_status: "active" | "paused"
      app_role: "admin" | "manager" | "employee" | "client"
      approval_status: "pending" | "approved" | "denied"
      run_status:
        | "pending_approval"
        | "queued"
        | "running"
        | "succeeded"
        | "failed"
        | "rejected"
      spend_period: "daily" | "monthly"
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
      agent_category: [
        "communication",
        "productivity",
        "research",
        "sales",
        "content",
        "dev",
        "security",
      ],
      agent_status: ["active", "paused"],
      app_role: ["admin", "manager", "employee", "client"],
      approval_status: ["pending", "approved", "denied"],
      run_status: [
        "pending_approval",
        "queued",
        "running",
        "succeeded",
        "failed",
        "rejected",
      ],
      spend_period: ["daily", "monthly"],
    },
  },
} as const
