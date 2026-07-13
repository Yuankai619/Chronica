/**
 * Hand-maintained database types mirroring supabase/migrations.
 * Regenerate with `supabase gen types typescript` once a project is linked,
 * keeping the shape below.
 */

export type CategoryGroup = "core" | "supportive" | "social" | "rest";
export type EntrySource = "timer" | "manual";

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
      retros: {
        Row: {
          id: string;
          user_id: string;
          week_start: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          week_start: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          week_start?: string;
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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          content: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      planned_items: {
        Row: {
          id: string;
          user_id: string;
          day: string;
          category_id: string;
          expected_minutes: number;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          day: string;
          category_id: string;
          expected_minutes: number;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          day?: string;
          category_id?: string;
          expected_minutes?: number;
          position?: number;
          created_at?: string;
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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          timer_cap_minutes?: number;
          daily_target_minutes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          timer_cap_minutes?: number;
          daily_target_minutes?: number;
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
          category_group: CategoryGroup;
          description: string | null;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          category_group: CategoryGroup;
          description?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          category_group?: CategoryGroup;
          description?: string | null;
          archived_at?: string | null;
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
      category_group: CategoryGroup;
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
