# Entries 週分頁：導覽模型與查詢邊界

對應 [#57](https://github.com/Yuankai619/Chronica/issues/57)。沒有 schema 變更，不需要 ADR。

已刪除 entry 的過濾規則來自 [#55 的規格](./soft-delete-time-entries.md)，本文只是套用。

## 現況

entries 頁抓「今天往前推 14 天」、`.limit(300)`，整包丟給 client 元件 `EntriesManager`，沒有任何 search param 或導覽。

兩個要一併修掉的既有問題：

- `groupEntriesByDay()` 在 client 用瀏覽器時區分組，而 week、summary、首頁都用 `getUserTimeZone()` 讀到的使用者設定時區。同一筆 entry 在兩個頁面上可能被歸到不同天。
- `src/lib/week.ts` 沒有任何 import，是死模組。它的檔頭註解寫著週歸屬規則，但實作用的是伺服器本地時間，跟實際在跑的 `src/lib/tz.ts` 行為不同。

## 導覽模型

URL search param `?week=YYYY-MM-DD`，值是該週的週一。沿用 week 頁既有的模式，頁面維持 Server Component。

`parseWeekParam()` 目前是 `src/app/(app)/week/page.tsx` 裡的區域函式，抽到 `src/lib/tz.ts` 共用，兩個頁面都用它：

```ts
/** Normalizes a `?week=` param to the Monday key of that week. */
export function parseWeekParam(
  raw: string | undefined,
  todayKey: string,
): string {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return weekStartKeyOf(raw);
  return weekStartKeyOf(todayKey);
}
```

導覽是三個 `Link`：Prev、This week、Next，與 week 頁一致。**Next 在當前週為本週時 disabled**，過去方向不設限。

### 已知限制

`started_at` 落在本週之後的 entry，在 UI 上不可觸及，因此無法編輯或刪除。`parseEntryInput()` 不擋未來時間，所以手動輸入時打錯年份就會發生。這是刻意接受的取捨；若之後要修，讀取端的做法是讓本週那一頁的查詢不設上界，把未來 entry 全部收攏到本週。

## 時區

entries 頁全面改用使用者設定時區，不再有任何瀏覽器時區的計算。

- 週區間：`zonedDayStart(weekKey, timeZone)` 到 `zonedDayStart(addDaysKey(weekKey, 7), timeZone)`。
- 日期分組：`groupEntriesByDay()` 加第二個參數 `timeZone: string`，內部改用 `dayKeyInTz()`。page 呼叫 `getUserTimeZone()` 後把時區傳給 `EntriesManager`。

查詢邊界與顯示分組必須用同一套曆法。若只有其中一邊改，週邊界附近的 entry 會被 server 判定屬於這一週而查出來、卻被 client 分到上一週的最後一天，畫面上會出現超出標題所示範圍的日期。

### 刪除 `src/lib/week.ts`

連同 `src/lib/week.test.ts` 一起刪除。檔頭那段規則說明搬到 `src/lib/tz.ts` 的 `weekStartKeyOf()` 上方：

```ts
/**
 * The week starts on Monday. An entry belongs to the week in which it
 * STARTED, even if it crosses midnight into the next week.
 */
```

留著它的風險很具體：檔名與註解都指向週歸屬，實作者很容易 import 它，然後寫出用伺服器時區算週邊界的頁面。

## 查詢

```ts
supabase
  .from("time_entries")
  .select("*")
  .gte("started_at", weekStart.toISOString())
  .lt("started_at", weekEnd.toISOString())
  .is("deleted_at", null)
  .order("started_at", { ascending: false });
```

**拿掉 `.limit(300)`。** 週區間本身就是邊界，不需要第二層。原本的 300 是配合 14 天視窗設的，套到一週上沒有意義；而 limit 造成的截斷是靜默的資料遺失，對一個以時間統計為全部意義的 app 是不能接受的失敗模式。

### 週歸屬

一律以 `started_at` 判定，`duration_minutes` 不參與。跨週的 entry 只出現在起始那一頁，不會在下一頁重複出現。跨午夜的 UI 表達方式歸 [#63](https://github.com/Yuankai619/Chronica/issues/63)，本規格不處理。

## 換頁過渡

資料抓取推進一個 async 子元件，用 `<Suspense key={weekKey}>` 只包住列表區：

```tsx
<Suspense key={weekKey} fallback={<EntriesListSkeleton />}>
  <EntriesList weekKey={weekKey} timeZone={timeZone} />
</Suspense>
```

標題、週導覽與 Quick add 維持掛載不動。`entries/` 不加專屬 `loading.tsx`。

整頁重繪不可接受的理由是可操作性而非美觀：`(app)/loading.tsx` 是群組共用骨架，換頁時會把整頁換掉，週導覽的 Prev 連結在載入期間被卸載。翻閱本質上是連續操作，連按三次 Prev 時第二次點擊會落空。`key={weekKey}` 保證每次換週重新觸發 fallback。

## 空週

顯示「這週沒有紀錄」，導覽照常保留，不自動跳轉到有資料的週。

不做自動跳轉是因為它會破壞 URL 語意並困住上一頁：連到 `?week=X` 卻停在 `?week=Y`，按上一頁回到 X 又被彈到 Y，形成迴圈。「跳到上一個有紀錄的週」這類按鈕可以事後單獨加，第一版不做。

## Quick add

**只在本週那一頁顯示。** 非本週時整個表單不渲染。

`createEntry()` 成功後，依新 entry 的 `started_at` 算出週 key，**與當前頁面的週不同時 `redirect()` 到那一週**。它現在只做 `revalidatePath`，多這一步不影響既有呼叫端。

要維持的規則是「你剛存的東西一定看得到」。表單只在本週顯示並不足夠：站在本週把日期填成上個月，那筆一樣會存進去而畫面不動，使用者分不出「存好了但在別頁」與「存失敗了」，最可能的反應是再送一次，於是產生重複資料。

### 編輯不導向

`updateEntry()` 維持現狀，不加導向。把 entry 的時間改到別週時，那一列從當前列表消失即可。

規則不是「一律導向」，而是「只在使用者否則得不到任何回饋時才導向」。編輯有明確因果：你改了日期、那列就走了，這本身就是成功的回饋。而導向的代價是整理資料時被移動位置，比列消失惱人。

## 標題

只顯示週範圍，不放總時數。

該週總時數在 week 頁已經有，且旁邊有 Planned 與 Δ 可對照。在 entries 頁再放一個，就是 [#56](https://github.com/Yuankai619/Chronica/issues/56) 那份規格所列四個總時數入口之外的第五個，多一個必須保持口徑一致的地方。當日小計同理。若之後要加，應併進 #56 的第二個 PR。

## AGENTS.md

Domain Rules That Bite 補一條：

> - Entries 頁以「週」為單位分頁，週由 `?week=` 決定，日期歸屬一律用 `src/lib/tz.ts` 的時區感知函式與使用者設定時區，不要用伺服器或瀏覽器的本地時間。

## 測試

- `src/lib/tz.test.ts`：`parseWeekParam()` 對合法 key、非法字串、undefined 三種輸入。
- `src/lib/entries.test.ts`：`groupEntriesByDay()` 帶時區參數的分組，特別是同一筆 entry 在兩個不同時區下落到不同天。
- `src/lib/week.test.ts` 刪除。

## PR 切分

**PR 1 — 時區與週邏輯統一。** 刪 `src/lib/week.ts` 與 `week.test.ts`、`parseWeekParam()` 抽到 `src/lib/tz.ts` 並讓 week 頁改用、`groupEntriesByDay()` 加 `timeZone` 參數、entries 頁傳入 `getUserTimeZone()`。與 #55 無關，可並行。驗收重點是 entries 頁的日期標題開始與 week 頁一致。

**PR 2 — 分頁。** `?week=` 導覽與 Next 的本週上界、Suspense 與骨架、空週狀態、Quick add 收窄與 `createEntry()` 導向、拿掉 limit、加 `deleted_at` 過濾。**必須排在 #55 的第一個 PR 之後**，否則沒有 `deleted_at` 欄位可以過濾。
