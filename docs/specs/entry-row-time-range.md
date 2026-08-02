# Entry 列顯示起訖時段與總時數

對應 [#63](https://github.com/Yuankai619/Chronica/issues/63)。版面經原型驗證，三個變體與切換器留在 throwaway 分支 [`prototype/entry-row-layout`](https://github.com/Yuankai619/Chronica/tree/prototype/entry-row-layout)，不進 main。沒有 schema 變更，不需要 ADR。

## 勝出的版面：Content first

原型的三個變體分別以時間、內容、時長為主軸。選定的是 **B — Content first**：分類與 note 是標題，起訖與總時數退到 muted 的第三行。

`EntryRow`（`src/components/entries-manager.tsx`）的顯示區塊結構：

```
[分類名稱]  [timer] [needs confirmation] [to-do 標題]
note 全文，不截斷
09:00 → 10:30 · 1h 30m
```

- 第一行：分類名稱（`font-medium`）與既有的三種 badge，`flex-wrap`。
- 第二行：`entry.note`，`text-sm text-muted`，**不截斷、不 clamp**。
- 第三行：`font-mono text-xs text-muted tabular-nums` 的時間列，總時數用 `text-accent` 與前面的起訖區隔。
- 操作按鈕（Confirm / Edit / Delete）在寬螢幕靠右垂直置中，窄螢幕落到內容下方。整列是 `flex flex-col gap-1 ... sm:flex-row sm:items-center sm:gap-4`。

沒有 note 的 entry 就少一行，不留空位。

### 這個版面放棄了什麼

起訖時間不再是列首的固定欄位，所以同一天的各列**無法靠時間垂直對齊**。原型的變體 A 有這個特性，但代價是分類與 note 被推到右邊、note 必須單行截斷。選 B 等於判定「這筆是什麼」比「掃視時間軸」重要。

## 結束時間用推算，不進 schema

```ts
/** started_at + duration_minutes; nothing is stored. */
export function entryEndAt(entry: TimeEntry): Date {
  return new Date(
    Date.parse(entry.started_at) + entry.duration_minutes * 60_000,
  );
}
```

放進 `src/lib/entries.ts` 並補測試。

不存進資料庫的理由：那會是一個必須永遠跟 `duration_minutes` 保持同步的衍生欄位，任何一次只改其中一邊的寫入都會讓兩者不一致，而不一致的那一刻沒有任何東西會報錯。它也不帶來查詢能力——沒有任何頁面需要用結束時間做範圍查詢，週歸屬（[#57](https://github.com/Yuankai619/Chronica/issues/57)）明確只看 `started_at`。

## 時區

時間一律以使用者設定的時區呈現，與 entries 頁的日期分組同一套曆法（#57 定案）。

```ts
function hhmm(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
```

24 小時制、`HH:mm`，與 app 其他等寬數字一致。現行程式碼用的是 `toLocaleTimeString([], ...)`，會跟著瀏覽器語系在 12 與 24 小時制之間跳動，改掉。

`timeZone` 由頁面呼叫 `getUserTimeZone()` 後傳給 `EntriesManager`。**這與 #57 的 PR 1 是同一件事**（那個 PR 也要把時區傳進 `EntriesManager` 給 `groupEntriesByDay()` 用），實作時併在一起，不要各自加一次。

## 跨午夜

結束時間落在起始日之後時，在起訖後面加一個標示：

```
23:30 → 01:15 (+1 day) · 1h 45m
```

天數差用 `src/lib/tz.ts` 的 `dayKeyInTz()` 比對起訖兩端的日期 key 算出，不是用毫秒除法——那樣才會跟週歸屬與日期分組用同一套曆法，也才處理得了日光節約時間。

原型用的是固定字串 `(next day)`，改成 `(+N day)` / `(+N days)` 的通用形式。`parseEntryInput()` 對時長沒有上限，手動輸入 5000 分鐘是合法的，所以跨越兩天以上並非不可能。

抽成純函式放 `src/lib/entries.ts`：

```ts
/** Whole days the end lands past the start day, in the user's zone. */
export function entryDayOffset(entry: TimeEntry, timeZone: string): number;
```

## Timer 面板不對齊

`TimerPanel` 維持現狀，這一票只改 entries 頁的列。

兩者回答的問題不同：entries 列講「這段時間已經花掉了，範圍在哪」，timer 面板講「現在跑了多久」。把一個穩定的區間格式套到不斷變動的值上，`→ 現在` 那個字會停在那裡不動，看起來像壞掉。

也不顯示預計結束時間。`expected_minutes` 是可選的（`startTimer()` 允許不填），而且它是提醒用的期望值不是承諾——顯示成結束時間會讓使用者以為計時到那裡會自己停，但只有行事曆 session 才有那個行為。

## 每日小計

分組標題右邊的當日總時數維持現狀，不動。

注意它是 [#56](https://github.com/Yuankai619/Chronica/issues/56) 那份規格漏列的第五個總時數入口——標記 `excluded_from_totals` 的分類要排除在它之外。那屬於 #56 的 PR 2 範圍，已在該 issue 補充說明，本規格不處理。

## 測試

`src/lib/entries.test.ts`：

- `entryEndAt()`：整點、跨小時、零長度。
- `entryDayOffset()`：同日、跨一天、跨兩天、以及在日光節約時間切換日的行為（用 `America/New_York` 的 3 月與 11 月切換日各一例）。
- 同一筆 entry 在 `Asia/Taipei` 與 `America/Los_Angeles` 下 offset 不同。

## PR

一個 PR，約 90 行：`entryEndAt()` 與 `entryDayOffset()` 兩個純函式加測試、`EntryRow` 的顯示區塊重寫、`hhmm()` 取代 `toLocaleTimeString()`。

**與 #57 的 PR 1 併著做或排在它之後**：兩者都要把 `timeZone` 從 entries 頁傳進 `EntriesManager`，分開做會重複改同一段 props。
