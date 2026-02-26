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
      ai_conversations: {
        Row: {
          account_id: string
          artifact_id: string | null
          created_at: string | null
          id: string
          messages: Json
          pinned: boolean | null
          summary: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string
          artifact_id?: string | null
          created_at?: string | null
          id?: string
          messages?: Json
          pinned?: boolean | null
          summary?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          account_id?: string
          artifact_id?: string | null
          created_at?: string | null
          id?: string
          messages?: Json
          pinned?: boolean | null
          summary?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
        ]
      }
      artifact_interviews: {
        Row: {
          answer: string
          artifact_id: string
          coverage_scores: Json
          created_at: string
          dimension: string
          id: string
          question: string
          question_number: number
        }
        Insert: {
          answer: string
          artifact_id: string
          coverage_scores?: Json
          created_at?: string
          dimension: string
          id?: string
          question: string
          question_number: number
        }
        Update: {
          answer?: string
          artifact_id?: string
          coverage_scores?: Json
          created_at?: string
          dimension?: string
          id?: string
          question?: string
          question_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "artifact_interviews_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
        ]
      }
      artifact_research: {
        Row: {
          artifact_id: string
          created_at: string | null
          excerpt: string
          id: string
          relevance_score: number | null
          source_name: string
          source_type: string
          source_url: string | null
        }
        Insert: {
          artifact_id: string
          created_at?: string | null
          excerpt: string
          id?: string
          relevance_score?: number | null
          source_name: string
          source_type: string
          source_url?: string | null
        }
        Update: {
          artifact_id?: string
          created_at?: string | null
          excerpt?: string
          id?: string
          relevance_score?: number | null
          source_name?: string
          source_type?: string
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artifact_research_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
        ]
      }
      artifact_storytelling: {
        Row: {
          artifact_id: string
          created_at: string
          id: string
          narrative_framework: string | null
          recommendations: string | null
          storytelling_guidance: Json
          summary: string | null
          updated_at: string
        }
        Insert: {
          artifact_id: string
          created_at?: string
          id?: string
          narrative_framework?: string | null
          recommendations?: string | null
          storytelling_guidance?: Json
          summary?: string | null
          updated_at?: string
        }
        Update: {
          artifact_id?: string
          created_at?: string
          id?: string
          narrative_framework?: string | null
          recommendations?: string | null
          storytelling_guidance?: Json
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "artifact_storytelling_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: true
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
        ]
      }
      artifact_writing_characteristics: {
        Row: {
          artifact_id: string
          characteristics: Json
          created_at: string | null
          id: string
          recommendations: string | null
          summary: string | null
          updated_at: string | null
        }
        Insert: {
          artifact_id: string
          characteristics?: Json
          created_at?: string | null
          id?: string
          recommendations?: string | null
          summary?: string | null
          updated_at?: string | null
        }
        Update: {
          artifact_id?: string
          characteristics?: Json
          created_at?: string | null
          id?: string
          recommendations?: string | null
          summary?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artifact_writing_characteristics_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: true
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
        ]
      }
      artifacts: {
        Row: {
          account_id: string
          content: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          published_at: string | null
          published_url: string | null
          status: string
          tags: string[] | null
          title: string | null
          tone: string | null
          type: string
          updated_at: string | null
          user_id: string
          visuals_metadata: Json | null
          writing_metadata: Json | null
        }
        Insert: {
          account_id?: string
          content?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          published_at?: string | null
          published_url?: string | null
          status?: string
          tags?: string[] | null
          title?: string | null
          tone?: string | null
          type: string
          updated_at?: string | null
          user_id?: string
          visuals_metadata?: Json | null
          writing_metadata?: Json | null
        }
        Update: {
          account_id?: string
          content?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          published_at?: string | null
          published_url?: string | null
          status?: string
          tags?: string[] | null
          title?: string | null
          tone?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
          visuals_metadata?: Json | null
          writing_metadata?: Json | null
        }
        Relationships: []
      }
      customer_action_items: {
        Row: {
          created_at: string
          customer_id: string
          description: string
          due_date: string | null
          id: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          description: string
          due_date?: string | null
          id?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          description?: string
          due_date?: string | null
          id?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_action_items_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_agreements: {
        Row: {
          created_at: string | null
          customer_id: string
          end_date: string | null
          id: string
          override_status: string | null
          pricing: Json | null
          scope: string
          start_date: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          end_date?: string | null
          id?: string
          override_status?: string | null
          pricing?: Json | null
          scope: string
          start_date?: string | null
          type?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          end_date?: string | null
          id?: string
          override_status?: string | null
          pricing?: Json | null
          scope?: string
          start_date?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_agreements_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_artifacts: {
        Row: {
          content: string | null
          created_at: string | null
          customer_id: string
          id: string
          metadata: Json | null
          project_id: string
          status: string
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          metadata?: Json | null
          project_id: string
          status?: string
          title: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          metadata?: Json | null
          project_id?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_artifacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_artifacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "customer_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_chat_messages: {
        Row: {
          agent_type: string | null
          content: string
          created_at: string | null
          customer_id: string
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          agent_type?: string | null
          content: string
          created_at?: string | null
          customer_id: string
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          agent_type?: string | null
          content?: string
          created_at?: string | null
          customer_id?: string
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_chat_messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_events: {
        Row: {
          created_at: string | null
          customer_id: string
          description: string | null
          event_date: string | null
          event_type: string
          id: string
          metadata: Json | null
          participants: string[] | null
          title: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          description?: string | null
          event_date?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          participants?: string[] | null
          title: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          description?: string | null
          event_date?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          participants?: string[] | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_projects: {
        Row: {
          agreement_id: string | null
          created_at: string | null
          customer_id: string
          description: string | null
          id: string
          metadata: Json | null
          name: string
          status: string
          updated_at: string | null
        }
        Insert: {
          agreement_id?: string | null
          created_at?: string | null
          customer_id: string
          description?: string | null
          id?: string
          metadata?: Json | null
          name: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          agreement_id?: string | null
          created_at?: string | null
          customer_id?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_projects_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "customer_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_projects_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_receivables: {
        Row: {
          amount: number
          created_at: string | null
          customer_id: string
          date: string
          description: string | null
          id: string
          linked_agreement_id: string | null
          linked_invoice_id: string | null
          metadata: Json | null
          reference: string | null
          status: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          customer_id: string
          date: string
          description?: string | null
          id?: string
          linked_agreement_id?: string | null
          linked_invoice_id?: string | null
          metadata?: Json | null
          reference?: string | null
          status?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          customer_id?: string
          date?: string
          description?: string | null
          id?: string
          linked_agreement_id?: string | null
          linked_invoice_id?: string | null
          metadata?: Json | null
          reference?: string | null
          status?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_receivables_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_receivables_linked_agreement_id_fkey"
            columns: ["linked_agreement_id"]
            isOneToOne: false
            referencedRelation: "customer_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_receivables_linked_invoice_id_fkey"
            columns: ["linked_invoice_id"]
            isOneToOne: false
            referencedRelation: "customer_receivables"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          info: Json | null
          name: string
          search_vector: unknown
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          info?: Json | null
          name: string
          search_vector?: unknown
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          info?: Json | null
          name?: string
          search_vector?: unknown
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      skills: {
        Row: {
          account_id: string
          category: string
          created_at: string | null
          id: string
          name: string
          proficiency: number | null
          updated_at: string | null
          user_id: string
          years_experience: number | null
        }
        Insert: {
          account_id?: string
          category: string
          created_at?: string | null
          id?: string
          name: string
          proficiency?: number | null
          updated_at?: string | null
          user_id?: string
          years_experience?: number | null
        }
        Update: {
          account_id?: string
          category?: string
          created_at?: string | null
          id?: string
          name?: string
          proficiency?: number | null
          updated_at?: string | null
          user_id?: string
          years_experience?: number | null
        }
        Relationships: []
      }
      style_examples: {
        Row: {
          account_id: string
          analysis: Json | null
          content: string
          created_at: string | null
          id: string
          label: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string
          analysis?: Json | null
          content: string
          created_at?: string | null
          id?: string
          label: string
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          account_id?: string
          analysis?: Json | null
          content?: string
          created_at?: string | null
          id?: string
          label?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_context: {
        Row: {
          about_me: Json | null
          account_id: string
          created_at: string | null
          customers: Json | null
          goals: Json | null
          id: string
          profession: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          about_me?: Json | null
          account_id?: string
          created_at?: string | null
          customers?: Json | null
          goals?: Json | null
          id?: string
          profession?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          about_me?: Json | null
          account_id?: string
          created_at?: string | null
          customers?: Json | null
          goals?: Json | null
          id?: string
          profession?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          account_id: string
          created_at: string | null
          id: string
          preferred_interaction_mode: string | null
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string
          created_at?: string | null
          id?: string
          preferred_interaction_mode?: string | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          account_id?: string
          created_at?: string | null
          id?: string
          preferred_interaction_mode?: string | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_writing_examples: {
        Row: {
          analyzed_characteristics: Json | null
          artifact_type: string | null
          content: string
          created_at: string | null
          extraction_status: string
          id: string
          is_active: boolean | null
          name: string
          source_reference: string | null
          source_type: Database["public"]["Enums"]["writing_example_source_type"]
          source_url: string | null
          updated_at: string | null
          user_id: string
          word_count: number
        }
        Insert: {
          analyzed_characteristics?: Json | null
          artifact_type?: string | null
          content: string
          created_at?: string | null
          extraction_status?: string
          id?: string
          is_active?: boolean | null
          name: string
          source_reference?: string | null
          source_type?: Database["public"]["Enums"]["writing_example_source_type"]
          source_url?: string | null
          updated_at?: string | null
          user_id: string
          word_count: number
        }
        Update: {
          analyzed_characteristics?: Json | null
          artifact_type?: string | null
          content?: string
          created_at?: string | null
          extraction_status?: string
          id?: string
          is_active?: boolean | null
          name?: string
          source_reference?: string | null
          source_type?: Database["public"]["Enums"]["writing_example_source_type"]
          source_url?: string | null
          updated_at?: string | null
          user_id?: string
          word_count?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_customer_dashboard_stats: {
        Args: never
        Returns: {
          active_customers: number
          expiring_agreements: number
          total_customers: number
          total_outstanding: number
        }[]
      }
      get_customer_list_summary: {
        Args: { p_search?: string; p_sort?: string; p_status?: string }
        Returns: {
          active_agreements_count: number
          active_projects_count: number
          created_at: string
          deleted_at: string
          id: string
          info: Json
          last_activity: string
          name: string
          outstanding_balance: number
          status: string
          updated_at: string
          user_id: string
        }[]
      }
      get_receivables_summary: {
        Args: { cid: string }
        Returns: {
          balance: string
          total_invoiced: string
          total_paid: string
        }[]
      }
      is_customer_owner: { Args: { cid: string }; Returns: boolean }
      is_feature_active: {
        Args: { p_uid: string; p_feature_name: string }
        Returns: boolean
      }
      merge_customer_info: {
        Args: { cid: string; new_info: Json }
        Returns: number
      }
    }
    Enums: {
      writing_example_source_type: "pasted" | "file_upload" | "artifact" | "url"
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

// Aliases for backward compatibility
export type TableInsert<T extends keyof DefaultSchema["Tables"]> = TablesInsert<T>
export type TableUpdate<T extends keyof DefaultSchema["Tables"]> = TablesUpdate<T>

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
      writing_example_source_type: ["pasted", "file_upload", "artifact", "url"],
    },
  },
} as const
