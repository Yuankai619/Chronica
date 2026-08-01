# time entry 軟刪除：資料層規格

對應 [#55](https://github.com/Yuankai619/Chronica/issues/55)。取捨理由見 [ADR 0001](../adr/0001-soft-delete-time-entries.md)。

本文只涵蓋資料層。回收站頁面、restore 按鈕與相關 UI 屬於 [#58](https://github.com/Yuankai619/Chronica/issues/58)。

## Schema

新增 migration `supabase/migrations/20260713190000_soft_delete_time_entries.sql`：

```sql
alter table public.time_entries
  add column deleted_at timestamptz;

-- 12 條讀取路徑都帶 deleted_at is null，讓主索引只涵蓋未刪除的列。
drop index if exists time_entries_user_started_idx;
create index time_entries_user_started_idx
  on public.time_entries (user_id, started_at desc)
  where deleted_at is null;

-- 回收站頁面依刪除時間排序。
create index time_entries_user_deleted_idx
  on public.time_entries (user_id, deleted_at desc)
  where deleted_at is not null;
```

RLS 不動。現有的 `time_entries_owner` policy 是 `for all` 加擁有者檢查，軟刪除的列一樣通得過，排除已刪除的列**完全由應用層負責**。

`src/lib/database.types.ts` 是手寫的，要在 `time_entries` 的 `Row` 加 `deleted_at: string | null`，`Insert` 與 `Update` 加 `deleted_at?: string | null`。

## 刪除

`deleteEntry()`（`src/app/(app)/entries/actions.ts`）由硬刪改為寫入時間戳，並在同一次呼叫裡順手清掉過期的列：

```ts
export async function deleteEntry(id: string): Promise<ActionResult> {
  const { supabase } = await getAuthed();

  const { error } = await supabase
    .from("time_entries")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };

  await purgeExpiredEntries(supabase);

  revalidatePath("/entries");
  return {};
}
```

保留期 **14 天**。過期的列在刪除時被真正移除，做法沿用 `src/app/(app)/tasks/page.tsx` 對 `completed_tasks` 的懶惰清除：

```ts
const RETENTION_DAYS = 14;

async function purgeExpiredEntries(supabase: SupabaseClient<Database>) {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await supabase
    .from("time_entries")
    .delete()
    .lt("deleted_at", cutoff.toISOString());
}
```

清除掛在 `deleteEntry` 而不是回收站頁面，是為了讓「14 天後清除」這個承諾不依賴使用者是否想起來去看回收站。刪得越多、清得越勤；不刪就沒東西需要清。清除失敗不擋刪除本身。

## 復原

restore 就是把時間戳清掉，**不加任何阻擋條件**：

```ts
await supabase.from("time_entries").update({ deleted_at: null }).eq("id", id);
```

- **時段重疊**：不擋。`requirement.md` 第 147 行已定調 warn but allow，理由是柏里奇夫法追蹤的是時長而非獨佔時段。現行的 quick add 連警告都沒實作，restore 也不需要先補上。
- **Category 已封存**：不擋，也不要求先改綁 category。`src/components/entries-manager.tsx` 本來就會把封存的 category 標成 `(archived)` 照常顯示。
- **id**：沿用原本的。軟刪除模型下沒有第二種選擇。

## 讀取路徑

以下 12 處全部加上 `.is("deleted_at", null)`：

| 檔案                              | 行  | 用途                        |
| --------------------------------- | --- | --------------------------- |
| `src/app/(app)/entries/page.tsx`  | 23  | entries 列表                |
| `src/app/(app)/page.tsx`          | 31  | 首頁今日面板                |
| `src/app/(app)/planning/page.tsx` | 74  | 上週 entries（week status） |
| `src/app/(app)/planning/page.tsx` | 84  | 上週 entries 筆數           |
| `src/app/(app)/summary/page.tsx`  | 114 | 指定期間 entries            |
| `src/app/(app)/summary/page.tsx`  | 120 | 本週 entries                |
| `src/app/(app)/summary/page.tsx`  | 130 | 近一年趨勢                  |
| `src/app/(app)/tasks/page.tsx`    | 76  | task 成本計算               |
| `src/app/(app)/week/page.tsx`     | 49  | 週結算表                    |
| `src/server/planning.ts`          | 48  | 週歷史（accuracy）          |
| `src/server/retro.ts`             | 67  | AI 週回顧                   |
| `src/server/retro.ts`             | 167 | 空週檢查                    |

`src/lib/unrecorded.ts` 與 `src/lib/accuracy.ts` 不查資料庫，吃的是上游傳進來的陣列，所以只要上游過濾正確就無須改動。

`src/server/timer.ts` 只 insert 不 read，不受影響。`updateEntry()` 與 `confirmEntry()` 都是針對單一 id 的寫入，UI 不會對已刪除的列提供入口，不加過濾。

### 唯一的例外

`src/app/(app)/categories/actions.ts` 第 98 行的 count 查詢**不加**過濾：

```ts
const { count } = await supabase
  .from("time_entries")
  .select("id", { count: "exact", head: true })
  .eq("category_id", id);
```

它問的是「這個 category 能不能安全地從世上消失」，不是「要顯示哪些 entries」。已軟刪的列仍然指著它，所以也要算數。加了過濾的話，entries 全被軟刪的 category 會被判定為 0 筆而走硬刪，接著撞上 `category_id` 的 `NO ACTION` 外鍵，使用者會看到一則原始的 Postgres 錯誤訊息。

實作時不要「順手補齊」這一處。

## AGENTS.md

在 Domain Rules That Bite 加一條：

> 刪除 time entry 是**軟刪除**（`deleted_at`），保留 14 天。所有讀取 `time_entries` 的查詢都必須帶 `deleted_at is null`；唯一的例外是 `deleteCategory()` 判斷 category 是否還有 entries 的 count 查詢。

## 測試

- `purgeExpiredEntries` 的 cutoff 計算抽成 `src/lib/entries.ts` 的純函式並補單元測試，維持 `src/lib/` 不依賴框架的慣例。
- `src/server/timer.test.ts` 既有的 Supabase mock 可以沿用，驗證 `deleteEntry` 送出的是 update 而非 delete。

## PR 切分

兩個 PR，第一個可以單獨上線：

1. `feat(entries): 改用軟刪除保留已刪除的時間紀錄` —— migration、型別、`deleteEntry`、purge、12 處過濾、`deleteCategory` 例外的註解、AGENTS.md、測試。使用者看不出任何變化，但資料不再消失，統計數字必須與上線前完全一致。
2. 回收站頁面與 restore，規格見 [#58](https://github.com/Yuankai619/Chronica/issues/58)。

第一個 PR 的驗收重點是「統計沒變」：上線前後比對 summary、week、首頁與 settlement 的數字。
