/**
 * Hand-maintained database types mirroring supabase/migrations.
 * Regenerate with `supabase gen types typescript` once a project is linked,
 * keeping the shape below.
 */

export type EntrySource = "timer" | "manual";
export type MemoryKind = "pattern" | "preference" | "trend" | "constraint";
export type AgentMessageRole = "user" | "assistant" | "system";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      microsoft_accounts: {
        Row: {
          user_id: string;
          access_token: string;
          refresh_token: string;
          expires_at: string;
          account_username: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          access_token: string;
          refresh_token: string;
          expires_at: string;
          account_username?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          access_token?: string;
          refresh_token?: string;
          expires_at?: string;
          account_username?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      principles: {
        Row: {
          id: string;
          user_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          content?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      ai_memories: {
        Row: {
          id: string;
          user_id: string;
          content: string;
          kind: MemoryKind;
          category_id: string | null;
          confidence: number;
          last_confirmed_at: string;
          source_week: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          content: string;
          kind?: MemoryKind;
          category_id?: string | null;
          confidence?: number;
          last_confirmed_at?: string;
          source_week?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          content?: string;
          kind?: MemoryKind;
          category_id?: string | null;
          confidence?: number;
          last_confirmed_at?: string;
          source_week?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      agent_conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          created_at: string;
          last_message_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          created_at?: string;
          last_message_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          created_at?: string;
          last_message_at?: string;
        };
        Relationships: [];
      };
      agent_messages: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          role: AgentMessageRole;
          parts: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id: string;
          role: AgentMessageRole;
          parts: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          user_id?: string;
          role?: AgentMessageRole;
          parts?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      planned_items: {
        Row: {
          id: string;
          user_id: string;
          day: string;
          category_id: string | null;
          expected_minutes: number;
          position: number;
          gcal_event_id: string | null;
          title: string | null;
          start_at: string | null;
          end_at: string | null;
          auto_timer_done: boolean;
          is_all_day: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          day: string;
          category_id?: string | null;
          expected_minutes: number;
          position?: number;
          gcal_event_id?: string | null;
          title?: string | null;
          start_at?: string | null;
          end_at?: string | null;
          auto_timer_done?: boolean;
          is_all_day?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          day?: string;
          category_id?: string | null;
          expected_minutes?: number;
          position?: number;
          gcal_event_id?: string | null;
          title?: string | null;
          start_at?: string | null;
          end_at?: string | null;
          auto_timer_done?: boolean;
          is_all_day?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      google_accounts: {
        Row: {
          user_id: string;
          access_token: string;
          refresh_token: string;
          expires_at: string;
          account_email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          access_token: string;
          refresh_token: string;
          expires_at: string;
          account_email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          access_token?: string;
          refresh_token?: string;
          expires_at?: string;
          account_email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      completed_tasks: {
        Row: {
          id: string;
          user_id: string;
          task_id: string;
          list_id: string;
          title: string;
          completed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          task_id: string;
          list_id: string;
          title: string;
          completed_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          task_id?: string;
          list_id?: string;
          title?: string;
          completed_at?: string;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          user_id: string;
          timer_cap_minutes: number;
          daily_target_minutes: number;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          timer_cap_minutes?: number;
          daily_target_minutes?: number;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          timer_cap_minutes?: number;
          daily_target_minutes?: number;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string | null;
          description: string | null;
          archived_at: string | null;
          excluded_from_totals: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color?: string | null;
          description?: string | null;
          archived_at?: string | null;
          excluded_from_totals?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          color?: string | null;
          description?: string | null;
          archived_at?: string | null;
          excluded_from_totals?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      time_entries: {
        Row: {
          id: string;
          user_id: string;
          category_id: string;
          started_at: string;
          duration_minutes: number;
          note: string | null;
          source: EntrySource;
          needs_confirmation: boolean;
          todo_task_id: string | null;
          todo_task_title: string | null;
          todo_list_id: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id: string;
          started_at: string;
          duration_minutes: number;
          note?: string | null;
          source?: EntrySource;
          needs_confirmation?: boolean;
          todo_task_id?: string | null;
          todo_task_title?: string | null;
          todo_list_id?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category_id?: string;
          started_at?: string;
          duration_minutes?: number;
          note?: string | null;
          source?: EntrySource;
          needs_confirmation?: boolean;
          todo_task_id?: string | null;
          todo_task_title?: string | null;
          todo_list_id?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      timer_sessions: {
        Row: {
          id: string;
          user_id: string;
          category_id: string;
          started_at: string;
          expected_minutes: number | null;
          cap_minutes: number;
          planned_item_id: string | null;
          planned_item_title: string | null;
          todo_task_id: string | null;
          todo_task_title: string | null;
          todo_list_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id: string;
          started_at?: string;
          expected_minutes?: number | null;
          cap_minutes: number;
          planned_item_id?: string | null;
          planned_item_title?: string | null;
          todo_task_id?: string | null;
          todo_task_title?: string | null;
          todo_list_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category_id?: string;
          started_at?: string;
          expected_minutes?: number | null;
          cap_minutes?: number;
          planned_item_id?: string | null;
          planned_item_title?: string | null;
          todo_task_id?: string | null;
          todo_task_title?: string | null;
          todo_list_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      entry_source: EntrySource;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
