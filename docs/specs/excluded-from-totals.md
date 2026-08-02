# Category 不計入總時數：統計口徑規格

對應 [#56](https://github.com/Yuankai619/Chronica/issues/56)。取捨理由見 [ADR 0002](../adr/0002-excluded-from-totals.md)。

## Schema

新增 migration `supabase/migrations/20260713200000_excluded_from_totals.sql`：

```sql
-- 記錄但不計入總時數的 category（例如睡眠）。列照常出現在統計中，
-- 只有總和不含它。
alter table public.categories
  add column excluded_from_totals boolean not null default false;
```

`not null default false` 讓既有列自動取得正確語意，不需要 backfill，也沒有 null 的第三態。RLS 與索引都不動。

`src/lib/database.types.ts` 是手寫的，要在 `categories` 的 `Row` 加 `excluded_from_totals: boolean`，`Insert` 與 `Update` 加 `excluded_from_totals?: boolean`。

## 設定入口

`parseCategoryInput()`（`src/lib/categories.ts`）的 `CategoryInput` 加 `excludedFromTotals: boolean`，從 form 的 checkbox 讀。checkbox 未勾選時瀏覽器不送這個欄位，所以判斷寫成 `values.excludedFromTotals === "on"` 這類存在性檢查，不要用真值轉換。

`createCategory()` 與 `updateCategory()`（`src/app/(app)/categories/actions.ts`）都是直接把 `parsed.input` 展開後寫進去，欄位加好之後不需要額外改動，但 `CategoryInput` 的 key 要對齊 DB 欄位名。

UI 是 `src/components/category-manager.tsx` 的 `CategoryForm`，在 description 底下加一個核取方塊，標籤例如 `Exclude from total hours`，附一行說明時數照常記錄與顯示、只是不計入總和。

## 統計口徑

被排除的 category **照常出現在所有統計列表中，數字照算**，只有總和不含它。這不是隱藏。

### 排除判斷放哪一層

`summarizePeriod()` 與 `computeWeekSettlement()` 已經收 `categories: Category[]`，排除判斷放在**函式內部**，簽章不動。這是必要的而非偏好：在呼叫端把 entries 濾掉會讓那些列一起消失，變成隱藏。

`weekDayGaps()`（`src/lib/unrecorded.ts`）與首頁沒有 category 概念，只能在**呼叫端**先濾。`src/lib/unrecorded.ts` 維持不碰 category。給呼叫端用的 helper 放在 `src/lib/categories.ts`：

```ts
/** Ids of categories whose time must not reach any total. */
export function excludedCategoryIds(categories: Category[]): Set<string> {
  return new Set(
    categories.filter((c) => c.excluded_from_totals).map((c) => c.id),
  );
}
```

### 四個入口

四處必須在同一個 PR 裡改完，理由見 ADR。

| 位置                                                  | 要改的數字                                  | 做法                                   |
| ----------------------------------------------------- | ------------------------------------------- | -------------------------------------- |
| `src/lib/summary.ts` `summarizePeriod()`              | `totalMinutes`                              | 函式內 reduce 時跳過被排除的列         |
| `src/lib/settlement.ts` `computeWeekSettlement()`     | `totalActualMinutes`、`totalPlannedMinutes` | 同上                                   |
| `src/app/(app)/page.tsx`                              | `recordedToday`、`plannedMinutes`           | reduce 前用 `excludedCategoryIds()` 濾 |
| `src/app/(app)/week/page.tsx` 呼叫 `weekDayGaps()` 處 | 每日 recorded 與 planned                    | 傳入前先濾 entries 與 planned items    |

`plannedMinutes` 在首頁是對 `planned_items` reduce，`planned_items.category_id` 可為 null（非行事曆項目未指定分類），null 一律視為不排除。

### 回傳型別

```ts
export interface PeriodSummary {
  categories: CategorySummary[];
  totalMinutes: number;
  /** Minutes from excluded categories, already left out of totalMinutes. */
  excludedMinutes: number;
  entryCount: number;
}

export interface WeekSettlement {
  rows: SettlementRow[];
  totalActualMinutes: number;
  totalPlannedMinutes: number | null;
  excludedMinutes: number;
  excludedPlannedMinutes: number;
  hasPlan: boolean;
}
```

`totalPlannedMinutes` 為 null 時（沒有計畫）`excludedPlannedMinutes` 為 0。

### 不受影響的計算

- `computeAccuracy()`（`src/lib/accuracy.ts`）是 per-category 的 actual/planned 比值，不牽涉跨類總和，完全不動。被排除的 category 照樣會有超支提示。
- `monthlyRecordedTrend()` 目前收的是全部 entries。它是 summary 頁的月趨勢圖，屬於總量呈現，要跟著排除，在呼叫端濾。
- `summarizePeriod()` 的 `entryCount` 與 summary 頁的 Categories 卡片**不排除**。旗標的語意是時數不計入總和，不是筆數或分類數；而且列既然照常顯示，數進去才是一致的。

## 呈現

被排除的列整列套 `opacity-70`，並加 `title` 與 `aria-label` 說明這一列不計入總和。不對已經是 `text-muted` 的欄位再疊一層淡化，否則 settlement 表的 Planned 欄會淡到看不清。

不用 `text-muted` 表達排除：settlement 表裡 muted 已經表示「這是次要欄位」，再用一次會讓同一個視覺訊號同時承載兩種意思。

要改的地方：

- `src/components/settlement-table.tsx` 的 `<tr>`
- `src/app/(app)/summary/page.tsx` 底部分類表的 `<tr>`

總和旁邊顯示未計入的量，`excludedMinutes` 為 0 時整句不渲染：

- week 頁 Recorded 卡：`+ 8h 30m not counted`
- week 頁 Planned 卡：同上，用 `excludedPlannedMinutes`
- summary 頁 Recorded 卡：同上
- 首頁兩張卡：同上

`src/components/day-gaps.tsx` 不需要改，它收到的資料在呼叫端就濾過了。

### 尚未定案

`WeekCompareChart` 與 `CategoryAverageChart`（summary 頁）是 per-category 長條圖，被排除的 category 若時數很大會成為尺度分母，把其他分類壓成幾個畫素。這與 `weekDayGaps` 遇到的是同一個問題，但那裡靠濾掉解決，這裡濾掉等於隱藏、違反本規格的前提。可能的處理是把它排除在尺度計算之外、或讓它的長條也套 `opacity-70`。實作前要先定案。

## AI retro

`src/server/retro.ts` 把 settlement 組成文字餵給 LLM。要改兩處：

- Categories 區塊的每一行，被排除者加後綴，與既有的 `(archived)` 並列：
  `- Sleep (not counted toward totals): ...`
- Settlement 區塊補一行口徑說明與數字：
  `Totals exclude categories marked "not counted": 8h 30m actual, 7h planned.`

不這樣做的話 LLM 會自己把分類數字加總並寫進回顧，那個數字必然跟畫面對不上。

## 與 archive 的關係

兩個旗標正交，互不干涉。`archived_at` 管「還能不能被選來計時」，`excluded_from_totals` 管「計不計入總和」。同時成立時各做各的：封存 category 的歷史列照常顯示、照常不計入總和。

## 不下沉到執行層

旗標只影響統計數字，不影響任何執行行為：

- timer 的 category 下拉照樣列出被排除的 category
- `ensureCalendarSession()` 的自動計時照常運作
- 首頁的 `plannedToday` 清單照常完整顯示
- plan board 照樣能排入被排除的 category

## AGENTS.md

Domain Rules That Bite 加一條：

> - 標記 `excluded_from_totals` 的 category，其時數不計入任何總和（summary、settlement、首頁、每日落差），但**列仍照常顯示**。旗標是 category 的當前屬性，改動後歷史統計立刻重算，不做快照。

## 測試

- `src/lib/summary.test.ts`：被排除的 category 有列、有自己的 `totalMinutes`，但不進 `totalMinutes` 總和；`excludedMinutes` 等於它的時數；`entryCount` 仍含它。
- 新增 `src/lib/settlement.test.ts`：實際與計畫都排除；只有計畫沒有實際時 `excludedPlannedMinutes` 正確；`hasPlan` 為 false 時 `excludedPlannedMinutes` 為 0。
- `src/lib/categories.test.ts`：`excludedCategoryIds()`；`parseCategoryInput()` 對 checkbox 缺席與存在兩種情形。
- 沒有任何 category 設旗標時，所有既有測試的數字不變。

## PR 切分

**PR 1 — 資料層。** migration、`database.types.ts`、`CategoryInput` 與 `parseCategoryInput()`、`excludedCategoryIds()` helper 與其測試。不動任何 UI，表單也不加核取方塊，避免承諾一個還沒實現的功能。使用者完全無感，驗收重點是所有既有數字一模一樣。

**PR 2 — 功能打開。** 表單核取方塊、四處統計口徑、`excludedMinutes`、`monthlyRecordedTrend` 呼叫端過濾、淡化呈現、retro prompt。四個入口一起改，main 上不留半套狀態。
