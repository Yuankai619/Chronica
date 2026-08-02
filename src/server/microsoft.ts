import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { expiresAtFrom, refreshTokens } from "@/server/microsoft-oauth";
import type { TodoTask } from "@/lib/tasks";

type Client = SupabaseClient<Database>;

const GRAPH = "https://graph.microsoft.com/v1.0";
const EXPIRY_MARGIN_MS = 2 * 60 * 1000;
const MAX_LISTS = 10;
const TASKS_PER_LIST = 50;
const TASK_CACHE_TTL_MS = 60 * 1000;

const taskCache = new Map<string, { result: OpenTasks; at: number }>();

/**
 * The open-task set, plus whether it is known to be incomplete. Callers
 * must not infer "this task was completed elsewhere" from a truncated set.
 */
export interface OpenTasks {
  tasks: TodoTask[];
  truncated: boolean;
}

/** Drops the cached open-task list (e.g. after completing a task). */
export function invalidateTaskCache(userId: string): void {
  taskCache.delete(userId);
}

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
 * Open To Do tasks across the user's lists (read-only). `truncated` marks
 * the set as incomplete — because the account is unlinked, a request
 * failed, or a cap was hit — so callers can hold back inferences.
 */
export async function getOpenTasks(
  supabase: Client,
  userId: string,
): Promise<OpenTasks> {
  const cached = taskCache.get(userId);
  if (cached && Date.now() - cached.at < TASK_CACHE_TTL_MS) {
    return cached.result;
  }

  const token = await getAccessToken(supabase, userId);
  if (!token) return { tasks: [], truncated: true };

  const lists = await graphGet<{ value: GraphList[] }>(token, "/me/todo/lists");
  if (!lists) return { tasks: [], truncated: true };

  // Fetch every list's tasks in parallel — sequential round-trips were
  // the main cost of loading the timer and entries pages.
  const perList = await Promise.all(
    lists.value.slice(0, MAX_LISTS).map(async (list) => ({
      list,
      result: await graphGet<{ value: GraphTask[] }>(
        token,
        `/me/todo/lists/${list.id}/tasks?$top=${TASKS_PER_LIST}&$filter=status ne 'completed'`,
      ),
    })),
  );

  let truncated = lists.value.length > MAX_LISTS;
  const tasks: TodoTask[] = [];
  for (const { list, result } of perList) {
    // A skipped list hides its open tasks, which would otherwise look
    // like they had been completed elsewhere.
    if (!result) {
      truncated = true;
      continue;
    }
    if (result.value.length >= TASKS_PER_LIST) truncated = true;
    for (const task of result.value) {
      const body = task.body?.content?.trim() ?? "";
      tasks.push({
        id: task.id,
        title: task.title,
        listId: list.id,
        listTitle: list.displayName,
        dueDate: task.dueDateTime?.dateTime ?? null,
        description: body.length > 0 ? body : null,
      });
    }
  }

  const result = { tasks, truncated };
  taskCache.set(userId, { result, at: Date.now() });
  return result;
}

/**
 * Marks a To Do task completed in Microsoft (write-back). Returns an
 * error message when the account is unlinked or Graph rejects the call
 * (e.g. the account was linked before write scopes were added).
 */
export async function completeTodoTask(
  supabase: Client,
  userId: string,
  listId: string,
  taskId: string,
): Promise<{ error?: string }> {
  const token = await getAccessToken(supabase, userId);
  if (!token) return { error: "Microsoft account is not linked." };

  try {
    const response = await fetch(
      `${GRAPH}/me/todo/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "completed" }),
      },
    );
    if (!response.ok) {
      return {
        error:
          response.status === 403
            ? "Microsoft rejected the update — re-link the account to grant write access."
            : `Microsoft returned ${response.status}.`,
      };
    }
  } catch {
    return { error: "Could not reach Microsoft — try again." };
  }
  return {};
}
