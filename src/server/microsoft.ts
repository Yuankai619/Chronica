import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { expiresAtFrom, refreshTokens } from "@/server/microsoft-oauth";
import type { TodoTask } from "@/lib/tasks";

type Client = SupabaseClient<Database>;

const GRAPH = "https://graph.microsoft.com/v1.0";
const EXPIRY_MARGIN_MS = 2 * 60 * 1000;
const MAX_LISTS = 10;

/**
 * Returns a valid access token for the user's linked Microsoft account,
 * refreshing (and persisting) it when close to expiry. Null when not
 * linked or the refresh fails — callers degrade gracefully (spec).
 */
export async function getAccessToken(
  supabase: Client,
  userId: string,
): Promise<string | null> {
  const { data: account } = await supabase
    .from("microsoft_accounts")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (!account) return null;

  if (Date.parse(account.expires_at) - Date.now() > EXPIRY_MARGIN_MS) {
    return account.access_token;
  }

  const refreshed = await refreshTokens(account.refresh_token).catch(
    () => null,
  );
  if (!refreshed) return null;

  await supabase
    .from("microsoft_accounts")
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at: expiresAtFrom(refreshed.expires_in),
    })
    .eq("user_id", userId);

  return refreshed.access_token;
}

async function graphGet<T>(token: string, path: string): Promise<T | null> {
  try {
    const response = await fetch(`${GRAPH}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

interface GraphList {
  id: string;
  displayName: string;
}

interface GraphTask {
  id: string;
  title: string;
  status: string;
  body?: { content?: string };
  dueDateTime?: { dateTime?: string };
}

/**
 * Open To Do tasks across the user's lists (read-only). Null when the
 * account is not linked or the API is unavailable — core features keep
 * working and only task attachment is disabled.
 */
export async function getOpenTasks(
  supabase: Client,
  userId: string,
): Promise<TodoTask[] | null> {
  const token = await getAccessToken(supabase, userId);
  if (!token) return null;

  const lists = await graphGet<{ value: GraphList[] }>(token, "/me/todo/lists");
  if (!lists) return null;

  const tasks: TodoTask[] = [];
  for (const list of lists.value.slice(0, MAX_LISTS)) {
    const result = await graphGet<{ value: GraphTask[] }>(
      token,
      `/me/todo/lists/${list.id}/tasks?$top=50&$filter=status ne 'completed'`,
    );
    if (!result) continue;
    for (const task of result.value) {
      const body = task.body?.content?.trim() ?? "";
      tasks.push({
        id: task.id,
        title: task.title,
        listTitle: list.displayName,
        dueDate: task.dueDateTime?.dateTime ?? null,
        description: body.length > 0 ? body : null,
      });
    }
  }
  return tasks;
}
