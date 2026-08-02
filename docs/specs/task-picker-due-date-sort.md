# Attach to-do 清單依到期日排序

對應 [#61](https://github.com/Yuankai619/Chronica/issues/61)。沒有 schema 變更，不需要 ADR。

## 現況與既有問題

`TaskPicker`（`src/components/task-picker.tsx`）用 `groupTasksByList()` 依清單分組，組內完全不排序。它有兩個使用者：timer 面板與 entries 的表單。

順帶查到三件事，都在這一票的路徑上：

- **`dueDateKey()` 用本地時區，而它同時跑在 client 與 server。** 它用 `getFullYear()` 那組 API，在 `task-picker.tsx` 是瀏覽器時區，在 `tasks/page.tsx` 是伺服器時區（UTC）。同一個到期日在兩處算出不同日期。
- **`tasks/page.tsx` 已經混用兩套曆法**：拿 `dueDateKey(t.dueDate)`（伺服器時區）去跟 `shiftedDayKey(1, tz)`（使用者設定時區）比較。同一個檔案裡還有兩個時區來源——直接查 `user_settings.timezone`，以及呼叫 `getUserTimeZone()`。
- **`src/lib/tz.ts` 與 `src/lib/timezone.ts` 各有一個 `dayKeyInTz`**，實作重疊，差別只在後者有預設值 `"Asia/Taipei"`。

另外，`getOpenTasks()` 的 Graph 查詢沒有 `$orderby`，[#59 的研究筆記](../research/microsoft-todo-external-completion.md)已查明**回傳順序不保證**。所以「維持原順序」不是一個順序。

## 日期判定

**到期日直接取字串的日期部分，不做任何時區換算。**

```ts
/** Graph 的 dueDateTime 是 UTC 午夜，表達的是一個日期而非時刻。 */
export function dueDateKey(dueDate: string | null): string | null {
  return dueDate ? dueDate.slice(0, 10) : null;
}
```

Microsoft To Do 的到期日在 UI 上是純日期，Graph 回傳 `2026-07-20T00:00:00` 這種 UTC 午夜。對一個本質是日期的值做時區換算本身就是錯的：現行做法換算到 Asia/Taipei（UTC+8）會得到同一天 08:00，日期不變，所以看起來是對的——但那是巧合。換算到任何 UTC 以西的時區（例如 America/Los_Angeles）會變成前一天 17:00，到期日整個往前推一天，並且提早一天被判為逾期。

**「今天」則必須用使用者設定的時區算**，因為那才是「逾期了沒」的判準：

```ts
const todayKey = dayKeyInTz(new Date(), await getUserTimeZone());
```

兩者都是 `YYYY-MM-DD` 字串，直接字串比較，不需要任何 `Date` 物件。

### 收斂 `src/lib/timezone.ts`

`shiftedDayKey()` 搬進 `src/lib/tz.ts`，**不保留預設參數**，強迫呼叫端明確傳時區。刪掉 `src/lib/timezone.ts`。`tasks/page.tsx` 統一從 `tz.ts` import，並把兩個時區來源合併成一個。

留著它的風險跟 #57 刪掉 `week.ts` 一樣：下一個處理時區的人看到兩個 `dayKeyInTz` 得先搞懂哪個才對，而且很可能選錯——`timezone.ts` 那個有預設值，看起來更好用，但預設值本身就是陷阱，會悄悄套用 Asia/Taipei 而不是使用者的設定。

## 排序規則

`src/lib/tasks.ts` 新增純函式：

```ts
export interface PickerSections {
  /** Overdue and due-today tasks, flattened across lists. */
  due: TodoTask[];
  groups: { list: string; tasks: TodoTask[] }[];
}

export function sortTasksForPicker(
  tasks: TodoTask[],
  todayKey: string,
): PickerSections;
```

### 置頂區 `due`

收錄 `dueKey !== null && dueKey <= todayKey` 的任務，也就是逾期與今天到期的。依 `dueKey` 遞增排，同日再依 `title.localeCompare()`。

這些任務**從原清單組移出，不重複出現**。同一個任務出現兩次會讓使用者以為有兩筆——選單的每一列長得一樣（標題、到期日、清單名），沒有任何線索能表達「這是同一筆的第二次出現」。

`due` 為空時整區不渲染，沒有逾期任務的使用者看到的畫面跟今天完全一樣。

置頂區的每一列要顯示清單名稱（標題旁的次要位置），因為那一區的任務來自不同清單，不標會失去脈絡。區塊標題用 `Due now`，與其他組的清單名稱視覺同層。

### 其餘任務 `groups`

保留依清單分組。組序沿用 `groupTasksByList()` 的 encounter order，等同 Graph 的清單順序，也就是使用者在 To Do 裡的清單排列——這是穩定且對使用者有意義的順序。

組內排序：

1. 有到期日的在前，依 `dueKey` 遞增
2. 同一天到期的依 `title.localeCompare()`
3. 無到期日的墊底，彼此依 `title.localeCompare()`

無到期日墊底的理由：整份排序的依據是急迫性，而沒有到期日代表沒有急迫訊號。使用者真的急會設到期日；把未設定的排到有明確截止日的前面，跟他的意圖相反。

同日次序用標題而非建立時間，是因為 `TodoTask` 目前沒有建立時間欄位（Graph 有 `createdDateTime`，但 `getOpenTasks()` 沒撈），而標題序是唯一對人有意義的選項——掃視時可以用首字定位。`src/lib/categories.ts` 的 `sortCategories()` 已經用 `a.name.localeCompare(b.name)`，這個 codebase 對「沒有更好依據時用名稱排」有先例。用 task id 排雖然穩定，但順序對使用者等同亂數。

組內為空時整組不渲染。某個清單的任務全部逾期而被抽走時，那一組會整個消失，這是對的——它們都在上面了。

### 為什麼不做全域扁平排序

分組保留，是為了讓清單名稱維持可辨識、位置維持穩定。置頂區則兌現了「逾期與今天到期的排在最上面」這個核心需求，而被抽走的是一個明確且短暫的集合，不影響其餘任務的分組結構。

## 排序在 server 端

首頁與 entries 頁（都是 Server Component）在把 `tasks` 傳給 `TaskPicker` 前呼叫 `sortTasksForPicker()`，並額外傳入 `todayKey`。

不在 client 排的兩個理由：「今天」必須用使用者設定時區算，而那個設定在 server 上是一行 `getUserTimeZone()`；`localeCompare` 不帶 locale 參數時依執行環境的預設語系，在 client 排等於讓每個瀏覽器的語系決定順序，同一份資料在不同裝置上排出不同結果。

不放進 `getOpenTasks()`：那是資料存取函式，排序是選單的呈現需求。`tasks/page.tsx` 也呼叫它，而那個頁面有自己的排序規則（有時間紀錄的優先、再依總時數）。[#60](https://github.com/Yuankai619/Chronica/issues/60) 才剛把它的回傳形狀改成 `{ tasks, truncated }`，再往上堆呈現邏輯會讓職責更模糊。

## `DueBadge` 不改

維持現狀：顯示絕對日期，逾期時 `text-danger`。

置頂區的位置本身已經是最強的視覺區隔，比顏色或標籤都明確。再加 `Overdue` 文字標籤等於同一件事講三次（位置、顏色、文字），而且那個字會在置頂區每一列重複出現，反而降低訊息量。改成相對天數（`Overdue 3d`）則會丟掉絕對日期的用處——挑「這週五要交的那個」時日期直接對得上，相對天數要自己換算。

唯一的改動是 `task-picker.tsx` 裡的區域函式 `dayKeyToday()` 刪掉，改用傳入的 `todayKey` prop。

## 案例表

`todayKey = "2026-08-02"`，Graph 清單順序為 Work、Home。

| 任務 | 清單 | dueDate               | dueKey       | 落點                      |
| ---- | ---- | --------------------- | ------------ | ------------------------- |
| A    | Work | `2026-07-28T00:00:00` | `2026-07-28` | `due[0]`                  |
| B    | Home | `2026-08-02T00:00:00` | `2026-08-02` | `due[1]`                  |
| C    | Work | `2026-08-02T00:00:00` | `2026-08-02` | `due[2]`（同日，C > B）   |
| D    | Work | `2026-08-05T00:00:00` | `2026-08-05` | Work 組 `[0]`             |
| E    | Work | `null`                | `null`       | Work 組 `[1]`（無到期日） |
| F    | Home | `null`                | `null`       | Home 組 `[0]`             |

補充案例：

- 只有 F 存在時，`due` 為空陣列，該區不渲染。
- 移除 F 後 Home 組為空，該組不渲染，`groups` 只剩 Work。
- 兩筆同為 `2026-08-05`、標題 `apple` 與 `Banana`：`localeCompare` 不區分大小寫地把 `apple` 排在 `Banana` 前，與 `sortCategories()` 行為一致。
- `dueDate = "2026-08-02T23:59:00"`：`dueKey` 仍是 `2026-08-02`，進 `due` 區。取子字串不看時間部分。
- 使用者時區為 `America/Los_Angeles`、UTC 時間為 `2026-08-03T05:00:00Z`：`todayKey` 是 `2026-08-02`，所以 B 與 C 仍算「今天到期」而非逾期。

## 測試

`src/lib/tasks.test.ts`（新檔）涵蓋上表每一列，以及：

- `dueDateKey()` 對 null、有時間、只有日期三種輸入。
- `sortTasksForPicker()` 不改動輸入陣列（用 `toSorted`）。
- 空輸入回傳 `{ due: [], groups: [] }`。

`src/lib/tz.test.ts` 補 `shiftedDayKey()` 搬家後的案例。

## PR 切分

**PR 1 — 時區與日期基礎。** 收斂 `timezone.ts` 進 `tz.ts`、`dueDateKey()` 改成取子字串、`tasks/page.tsx` 統一時區來源與 import。

這本身是 bug 修復：到期日不再隨執行環境的時區飄移。驗收時要知道 tasks 頁「今天到期」的篩選結果可能與現在不同——現在是伺服器 UTC 時區算的，改完是資料上寫的日期。那是修正而非退步。

**PR 2 — 排序與置頂區。** `sortTasksForPicker()` 與測試、`TaskPicker` 的呈現改動與 `todayKey` prop、首頁與 entries 頁傳入排序結果。

拆開是因為兩者的失敗模式不同：第一個是日期換算正確性，第二個是排序規則是否符合案例表與置頂區的抽取去重。

與其他 ticket 沒有相依。
