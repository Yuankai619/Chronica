import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, MemoryKind } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

export interface MemoryRow {
  id: string;
  kind: MemoryKind;
  content: string;
  confidence: number;
  categoryId: string | null;
  lastConfirmedAt: string;
}

/** All of the user's memories, most confident first. */
export async function listMemories(
  supabase: Client,
  userId: string,
): Promise<MemoryRow[]> {
  const { data } = await supabase
    .from("ai_memories")
    .select("id, kind, content, confidence, category_id, last_confirmed_at")
    .eq("user_id", userId)
    .order("confidence", { ascending: false });
  return (data ?? []).map((row) => ({
    id: row.id,
    kind: row.kind,
    content: row.content,
    confidence: row.confidence,
    categoryId: row.category_id,
    lastConfirmedAt: row.last_confirmed_at,
  }));
}
