# 行事曆自動計時的 title 落到 entry 的 note

對應 [#62](https://github.com/Yuankai619/Chronica/issues/62)。有一行 schema 變更，但取捨不深，不另留 ADR。

## ticket 上三個不存在的問題

查證後可以直接刪掉：

- **計時途中不可能改 note。** `timer_sessions` 沒有 note 欄位，`timer-actions.ts` 與 `timer-panel.tsx` 完全沒有 note 的字樣。note 只能在 entry 存好之後從 entries 頁編輯，所以不存在「途中改過的 note 被覆寫」。
- **行事曆 session 不可能帶 to-do 任務。** `ensureCalendarSession()` 插入 session 時沒有任何 todo 欄位；唯一會 attach 任務的 `startTimer()` 在行事曆 session 執行中直接回錯並拒絕。所以不需要決定兩者的優先序。
- **無標題事件已經有處理**，只是處理在錯的地方（見下）。

## Schema

新增 migration `supabase/migrations/20260713210000_planned_item_title.sql`：

```sql
-- Calendar event title snapshotted at session start, copied to the entry's
-- note when the session is saved.
alter table public.timer_sessions
  add column planned_item_title text;
```

`src/lib/database.types.ts` 是手寫的，`timer_sessions` 的 `Row` 加 `planned_item_title: string | null`，`Insert` 與 `Update` 加 `planned_item_title?: string | null`。

`timer_sessions` 是短命資料（每個使用者最多一列，存成 entry 後即刪），既有列不需要任何回填考量。

### 命名

`planned_item_title` 對齊兩條既有線索：同一張表上的 `planned_item_id` 是同一個字首，`todo_task_id` / `todo_task_title` 是同一個構詞法。兩個欄位並排時不需要說明就看得出是一組，而且是快照而非即時關聯。

不用 `calendar_title`：這張表上沒有任何欄位叫 calendar，行事曆概念一路都透過 `planned_items.gcal_event_id` 表達，多一個字首會讓人以為有另一個來源。不用 `planned_title`：它跟 `planned_item_id` 看起來像兩個不相干的欄位。

## 快照而非即時查詢

`ensureCalendarSession()` 插入 session 時帶上 `planned_item_title: dueItem.title`。`saveAndClearSession()` 插入 entry 時帶上 `note: session.planned_item_title`。

不在存 entry 時才去查 `planned_items.title`，因為那有兩個會實際發生的破法：

- **事件在計時中被從日曆刪除。** `syncCalendar()` 尾端會 `delete().in("id", removedIds)` 清掉日曆上已消失的事件，而 `timer_sessions.planned_item_id` 是 `on delete set null`。即時查詢這時什麼都查不到，note 是空的，但那段時間確實計了。
- **事件在計時中被改名。** 同步是原地更新（保留同一列 id），即時查詢會拿到新標題，記錄的就不是當時那件事。

快照兩者都免疫，而且跟 `todo_task_title` 是同一個模式——那個欄位存在的理由一模一樣：外部資料會變，但紀錄要反映當下。

### 不追蹤來源變更

entry 的 note 是計時當下的快照。事後在 Google Calendar 改標題不會回頭改寫已存的 entry。這是快照模型的直接結果，也與「Google Calendar 同步策略重構不在範圍內」一致。

## note 寫純 title

不加 `[Calendar]` 這類來源前綴。note 是使用者的欄位，塞進系統 metadata 之後，他在 entries 頁編輯這一列時得自己決定要不要保留前綴——刪掉來源標記就沒了，留著每次編輯都要繞過它。而 entries 頁每一列本來就顯示 category，行事曆事件的標題通常自解釋。

也不在 `time_entries` 加 `planned_item_id`。用結構化欄位記錄來源才是對的做法，但那超出這一票：加了要決定它在 UI 上怎麼用、以及 `planned_items` 被同步刪除時外鍵怎麼處理，而目前沒有任何功能需要這個關聯。

後果是使用者分不出哪些 note 是自動填的。這是可接受的——那本來就是他當時在做的事，來源是實作細節。

## 無標題事件從源頭修

`src/server/google-calendar.ts` 第 122 行目前是 `title: item.summary ?? "(untitled event)"`，把一段顯示文字存進了資料欄位。改成：

```ts
title: item.summary?.trim() || null,
```

同檔第 57 行 `GcalEvent.title` 的型別放寬成 `string | null`。第 233 行的 `current.title === event.title` 比較對 null 照樣正確。

這行 sentinel 從一開始就是多餘的：三個顯示點都已經各自寫了 fallback——`src/components/plan-board.tsx` 第 169 行、`src/components/timer-panel.tsx` 第 369 行、`src/app/(app)/page.tsx` 第 90 行。

改完之後 note 的邏輯退化成一行賦值，無標題事件自然得到 `null`，不需要拿字串跟 magic value 比對。用比對的話，哪天有人把 sentinel 改成 `(no title)`，note 會靜默開始出現雜訊而沒有測試抓得到。

既有資料庫裡已存字面字串的列不回填。它們顯示起來一樣，只是那幾筆若正好被計時，note 會是 `(untitled event)`。實務上這批列應該是零。

## 不回填既有 entry

由行事曆自動計時產生的既有 entry，note 維持 null。

唯一的比對線索是 `time_entries.started_at` 等於 `planned_items.start_at`、同一個 user、同一個 category、`auto_timer_done = true`。這是啟發式的，會誤配：一筆手動新增、起始時間剛好等於某個行程開始時間、分類也相同的 entry 會被寫上那個行程的標題。時間戳相等聽起來嚴格，但行事曆事件多半落在整點或半點，而人也習慣在整點開始記錄。

而且能回填的範圍本來就殘缺：日曆上已刪除或改期的事件，`planned_items` 那列早被同步清掉，對應的 entry 永遠配不到。回填只會製造「一部分有、一部分沒有、有些是錯的」。

使用者本來就能在 entries 頁自己補，而 [#57](https://github.com/Yuankai619/Chronica/issues/57) 的週分頁讓翻回去變得容易。

## Edge case

- **事件在計時中被刪除**：`planned_item_id` 被設為 null，於是 `isCalendar` 變 false、`needs_confirmation` 改用一般規則。但 `planned_item_title` 是 session 上的快照，不受影響，**note 照樣寫入**。那段時間確實花在那件事上。
- **cap 對帳自動存檔**：`getReconciledSession()` 發現超時而存檔時走的是同一個 `saveAndClearSession()`，note 一樣會寫入，不需要另外處理。

## 測試

沿用 `src/server/timer.test.ts` 既有的 Supabase mock 模式：

- `ensureCalendarSession()` 把 `dueItem.title` 快照進 session。
- `saveAndClearSession()` 把 `planned_item_title` 寫進 entry 的 `note`。
- `planned_item_title` 為 null 時 note 為 null。
- `planned_item_id` 為 null 但 `planned_item_title` 有值時，note 仍寫入。
- 手動計時的 session（`planned_item_title` 為 null）行為完全不變。

## PR

一個 PR，約 70 行：migration、型別、`ensureCalendarSession()`、`saveAndClearSession()`、`google-calendar.ts` 的 sentinel 移除與型別放寬、測試。

不拆開 sentinel 的移除，因為它正是為了讓 note 邏輯退化成一行賦值而做的；單獨切出去的話，審查者看不出為什麼要動那行。

與其他 ticket 沒有相依。
