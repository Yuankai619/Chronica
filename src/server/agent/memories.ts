import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, MemoryKind } from "@/lib/database.types";
import {
  decayedConfidence,
  selectMemoriesToPrune,
  MAX_MEMORIES,
} from "@/lib/agent-memory";

type Client = SupabaseClient<Database>;

export interface MemoryRow {
  id: string;
  kind: MemoryKind;
  /** Stored value, unadjusted — the raw weight the agent last wrote. */
  confidence: number;
  /** Same value decayed for how long it's gone unconfirmed; what to show/use. */
  displayConfidence: number;
  content: string;
  categoryId: string | null;
  lastConfirmedAt: string;
}

/** All of the user's memories, most (decayed) confident first. */
export async function listMemories(
  supabase: Client,
  userId: string,
): Promise<MemoryRow[]> {
  const { data } = await supabase
    .from("ai_memories")
    .select("id, kind, content, confidence, category_id, last_confirmed_at")
    .eq("user_id", userId);
  const rows = (data ?? []).map((row): MemoryRow => ({
    id: row.id,
    kind: row.kind,
    content: row.content,
    confidence: row.confidence,
    displayConfidence: decayedConfidence(row.confidence, row.last_confirmed_at),
    categoryId: row.category_id,
    lastConfirmedAt: row.last_confirmed_at,
  }));
  return rows.sort((a, b) => b.displayConfidence - a.displayConfidence);
}

export interface UpsertMemoryInput {
  /** Provide to update an existing memory (also bumps last_confirmed_at); omit to create one. */
  id?: string;
  kind: MemoryKind;
  content: string;
  categoryId?: string | null;
  confidence?: number;
}

/**
 * Creates or reconfirms a memory, then prunes the least-confident rows
 * beyond MAX_MEMORIES so the store doesn't grow without bound.
 */
export async function upsertMemory(
  supabase: Client,
  userId: string,
  input: UpsertMemoryInput,
): Promise<MemoryRow> {
  const now = new Date().toISOString();
  const row = {
    ...(input.id ? { id: input.id } : {}),
    user_id: userId,
    kind: input.kind,
    content: input.content,
    category_id: input.categoryId ?? null,
    confidence: input.confidence ?? 0.7,
    last_confirmed_at: now,
  };
  const { data, error } = await supabase
    .from("ai_memories")
    .upsert(row, { onConflict: "id" })
    .select("id, kind, content, confidence, category_id, last_confirmed_at")
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to save memory");
  }

  await pruneMemories(supabase, userId);

  return {
    id: data.id,
    kind: data.kind,
    content: data.content,
    confidence: data.confidence,
    displayConfidence: decayedConfidence(
      data.confidence,
      data.last_confirmed_at,
    ),
    categoryId: data.category_id,
    lastConfirmedAt: data.last_confirmed_at,
  };
}

export async function deleteMemory(
  supabase: Client,
  userId: string,
  id: string,
): Promise<void> {
  await supabase
    .from("ai_memories")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
}

async function pruneMemories(supabase: Client, userId: string): Promise<void> {
  const { data } = await supabase
    .from("ai_memories")
    .select("id, confidence, last_confirmed_at")
    .eq("user_id", userId);
  const toPrune = selectMemoriesToPrune(
    (data ?? []).map((r) => ({
      id: r.id,
      confidence: r.confidence,
      lastConfirmedAt: r.last_confirmed_at,
    })),
    MAX_MEMORIES,
  );
  if (toPrune.length > 0) {
    await supabase.from("ai_memories").delete().in("id", toPrune);
  }
}
