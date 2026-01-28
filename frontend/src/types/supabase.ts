/**
 * Supabase Database Types
 *
 * These types match the portfolio schema from:
 * backend/src/db/migrations/001_portfolio_schema.sql
 *
 * To regenerate from Supabase:
 * npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// =============================================================================
// Database Schema Types
// =============================================================================

export interface Database {
  public: {
    Tables: {
      // User Context - Profile information for AI personalization
      user_context: {
        Row: {
          id: string
          user_id: string
          account_id: string
          about_me: Json | null
          profession: Json | null
          customers: Json | null
          goals: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          account_id?: string
          about_me?: Json | null
          profession?: Json | null
          customers?: Json | null
          goals?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          about_me?: Json | null
          profession?: Json | null
          customers?: Json | null
          goals?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      // Artifacts - Content pieces (social posts, blogs, showcases)
      artifacts: {
        Row: {
          id: string
          user_id: string
          account_id: string
          type: 'social_post' | 'blog' | 'showcase'
          title: string | null
          content: string | null
          tone: string | null
          metadata: Json | null
          tags: string[]
          status: 'draft' | 'research' | 'skeleton' | 'writing' | 'creating_visuals' | 'ready' | 'published'
          published_url: string | null
          published_at: string | null
          visuals_metadata: Json | null
          writing_metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          account_id?: string
          type: 'social_post' | 'blog' | 'showcase'
          title?: string | null
          content?: string | null
          tone?: string | null
          metadata?: Json | null
          tags?: string[]
          status?: 'draft' | 'research' | 'skeleton' | 'writing' | 'creating_visuals' | 'ready' | 'published'
          published_url?: string | null
          published_at?: string | null
          visuals_metadata?: Json | null
          writing_metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          type?: 'social_post' | 'blog' | 'showcase'
          title?: string | null
          content?: string | null
          tone?: string | null
          metadata?: Json | null
          tags?: string[]
          status?: 'draft' | 'research' | 'skeleton' | 'writing' | 'creating_visuals' | 'ready' | 'published'
          published_url?: string | null
          published_at?: string | null
          visuals_metadata?: Json | null
          writing_metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      // Topics - Content ideas in kanban backlog
      topics: {
        Row: {
          id: string
          user_id: string
          account_id: string
          title: string
          description: string | null
          status: 'idea' | 'researching' | 'ready' | 'executed'
          priority: number
          source: 'manual' | 'ai_suggested'
          target_artifact_type: 'social_post' | 'blog' | 'showcase' | null
          notes: string | null
          due_date: string | null
          executed_artifact_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          account_id?: string
          title: string
          description?: string | null
          status?: 'idea' | 'researching' | 'ready' | 'executed'
          priority?: number
          source?: 'manual' | 'ai_suggested' | 'imported'
          target_artifact_type?: 'social_post' | 'blog' | 'showcase' | null
          notes?: string | null
          due_date?: string | null
          executed_artifact_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          title?: string
          description?: string | null
          status?: 'idea' | 'researching' | 'ready' | 'executed'
          priority?: number
          source?: 'manual' | 'ai_suggested' | 'imported'
          target_artifact_type?: 'social_post' | 'blog' | 'showcase' | null
          notes?: string | null
          due_date?: string | null
          executed_artifact_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      // Skills - User's skills matrix
      skills: {
        Row: {
          id: string
          user_id: string
          account_id: string
          name: string
          category: 'product' | 'technical' | 'leadership' | 'industry'
          proficiency: number
          years_experience: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          account_id?: string
          name: string
          category: 'product' | 'technical' | 'leadership' | 'industry'
          proficiency?: number
          years_experience?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          name?: string
          category?: 'product' | 'technical' | 'leadership' | 'industry'
          proficiency?: number
          years_experience?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      // Style Examples - Writing samples for AI voice matching
      style_examples: {
        Row: {
          id: string
          user_id: string
          account_id: string
          label: string
          content: string
          analysis: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          account_id?: string
          label: string
          content: string
          analysis?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          label?: string
          content?: string
          analysis?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      // AI Conversations - Chat history with context
      ai_conversations: {
        Row: {
          id: string
          user_id: string
          account_id: string
          context_type: 'general' | 'artifact' | 'topic'
          context_id: string | null
          messages: Json[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          account_id?: string
          context_type?: 'general' | 'artifact' | 'topic'
          context_id?: string | null
          messages?: Json[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          context_type?: 'general' | 'artifact' | 'topic'
          context_id?: string | null
          messages?: Json[]
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      // User Preferences - Theme, interaction mode, etc.
      user_preferences: {
        Row: {
          id: string
          user_id: string
          account_id: string
          theme: 'light' | 'dark' | 'system'
          preferred_interaction_mode: 'chat' | 'forms'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          account_id?: string
          theme?: 'light' | 'dark' | 'system'
          preferred_interaction_mode?: 'chat' | 'forms'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          theme?: 'light' | 'dark' | 'system'
          preferred_interaction_mode?: 'chat' | 'forms'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      // Topic Templates - Pre-defined topic suggestions
      topic_templates: {
        Row: {
          id: string
          name: string
          description: string | null
          category: string
          prompts: Json
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          category: string
          prompts?: Json
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          category?: string
          prompts?: Json
          is_active?: boolean
          created_at?: string
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
      artifact_type: 'social_post' | 'blog' | 'showcase'
      artifact_status: 'draft' | 'in_progress' | 'ready' | 'published' | 'archived'
      topic_status: 'idea' | 'researching' | 'ready' | 'executed'
      topic_source: 'manual' | 'ai_suggested'
      skill_category: 'product' | 'technical' | 'leadership' | 'industry'
      theme_type: 'light' | 'dark' | 'system'
      interaction_mode: 'chat' | 'forms'
      conversation_context: 'general' | 'artifact' | 'topic'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// =============================================================================
// Helper Types
// =============================================================================

/** Extract Row type for a table */
export type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

/** Extract Insert type for a table */
export type TableInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

/** Extract Update type for a table */
export type TableUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
