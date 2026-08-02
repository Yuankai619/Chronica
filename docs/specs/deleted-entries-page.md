# 已刪除 entry 頁面：位置、呈現與 restore

對應 [#58](https://github.com/Yuankai619/Chronica/issues/58)。沒有 schema 變更，不需要 ADR。

資料層（`deleted_at`、14 天保留、cutoff 計算、restore 語意）由 [#55 的規格](./soft-delete-time-entries.md)定義，本文只涵蓋使用者看到與能做的部分。

## 路由與入口

新頁面 `src/app/(app)/entries/deleted/page.tsx`。

`src/components/app-nav.tsx` **不加項目**。頂層導覽已有 8 項，手機版是可捲動的 icon rail，多一項就多一分找不到常用頁的機會；而回收站是出事才去的地方。`isActive()` 用的是 `pathname.startsWith(href)`，所以 `/entries/deleted` 會讓 Entries 維持高亮，導覽程式碼一行都不用改。

入口放在 entries 頁標題列、跟 [#57](https://github.com/Yuankai619/Chronica/issues/57) 定案的週導覽（Prev / This week / Next）同一排的最右邊，純文字連結 `Deleted`，用 `text-muted` 表示比週導覽次要。

**不顯示筆數**，也**不依內容有無而隱藏**。筆數要在 entries 頁多一次 count 查詢，換來的卻是一個沒有行動價值的數字——回收站有東西是正常狀態，不是待辦事項。依內容隱藏則會讓入口的位置隨資料浮動，使用者上週看過的連結這週不見，會以為功能被拿掉。

## 查詢

```ts
supabase
  .from("time_entries")
  .select("*")
  .not("deleted_at", "is", null)
  .gte("deleted_at", retentionCutoff().toISOString())
  .order("deleted_at", { ascending: false });
```

依 `deleted_at` 倒序，**不分組不分頁**。14 天保留期本身就是邊界，#57 給 entries 頁分頁的理由（資料無限成長）在這裡不成立。#55 建的 `time_entries_user_deleted_idx` 是 `(user_id, deleted_at desc) where deleted_at is not null`，這個查詢直接吃它。

不依 `started_at` 排序：使用者走進這個頁面的心智幾乎只有「我剛剛刪錯了」，最近刪的必須第一眼看到。按原本開始時間排會把剛刪的那筆丟到清單中間。

### 過期列的雙重處理

進頁面時順手清除，查詢再用同一個 cutoff 過濾一次。

清除沿用 `tasks` 頁對 `completed_tasks` 的懶惰清除先例（`src/app/(app)/tasks/page.tsx`）。#55 把清除掛在 `deleteEntry()` 裡，所以使用者一個月沒刪過東西的話，資料庫裡會躺著超過保留期、沒人觸發清除的列。回收站是跟這批資料最相關的頁面，把它加成第二個觸發點，讓保留期的承諾不再只依賴「使用者有沒有再刪東西」。

查詢層的 `.gte()` 是顯示層的最後防線。清除是寫入操作，可能因權限、網路或未來的改動而失敗；過濾是純讀取，幾乎不會壞。有它在，就算清除完全沒運作，畫面上也絕不會出現超過保留期的列。

兩處與 `deleteEntry()` 共用 #55 規格裡抽成純函式的那個 cutoff 計算，不各自寫一次日期減法。

## 每列呈現

顯示：原本的 `started_at`、`duration_minutes`、category badge、note、`todo_task_title`（有值時）、以及「還剩 N 天」。

刪除時間的絕對值放進該列的 `title` 屬性。category 已封存時沿用主列表的 `(archived)` 後綴。**不顯示 `source`**，它對「這是不是我要救的那一筆」沒有幫助。

保留使用者在主列表上認得的那組欄位，是因為這裡要做的判斷就是辨識。砍掉 note 與開始時間的話，兩筆同分類同時長的紀錄會無法區分——而那正是最容易誤刪的情況。

「還剩 N 天」比刪除時間的絕對值有用：使用者關心的是什麼時候會永久消失，而不是什麼時候被刪的。要從絕對時間心算到期日等於逼他做減法。

## restore

**單筆一鍵還原，不 confirm，不做批次。** 按鈕放該列右側，沿用主列表編輯與刪除的位置慣例。

不加確認框是因為 `ConfirmDialog` 的確認鈕寫死了 `bg-danger` 紅色樣式，那是給「做了會失去東西」的操作用的。restore 是把資料放回去，做錯再刪一次即可。給非破壞性操作加確認，會把使用者訓練成無腦點確認，等真正的刪除跳出來時也照點。

不做批次是因為回收站在正常使用下只有零星幾筆——它裝的是最近 14 天內誤刪的東西，不是垃圾堆。批次要一整套勾選狀態、全選與「已選 N 筆」工具列，為罕見量級預先建互動狀態不划算。

`restoreEntry()` 放既有的 `src/app/(app)/entries/actions.ts`，跟 `deleteEntry()` 相鄰：

```ts
export async function restoreEntry(id: string): Promise<ActionResult> {
  const { supabase } = await getAuthed();

  const { error } = await supabase
    .from("time_entries")
    .update({ deleted_at: null })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/entries/deleted");
  revalidatePath("/entries");
  return {};
}
```

兩個路徑都要 revalidate。只 revalidate 回收站的話，使用者接著切回 entries 頁會看到快取的舊列表、還原的那筆不在裡面——那才是真正會讓人以為還原失敗的情況。

### 還原後留在原頁

不導向。該列從回收站消失就是回饋，因果清楚，不會被誤解成失敗。這與 #57 定的規則一致：只在使用者否則得不到任何回饋時才導向。

導向到該筆所屬的那一週會踢出使用者。誤刪很少只誤刪一筆——手滑刪掉三筆想全部救回時，導向會在還原第一筆之後就把人趕走，得按上一頁回來再救第二筆。還原本質上是連續操作。

## 不做永久刪除與一鍵清空

回收站的內容已被所有統計路徑過濾（#55 的 12 處），不影響任何數字、不佔畫面、不會被搜尋到，所以提早清掉的收益接近零。

代價則是實在的。永久刪除會是這個 app 裡唯一不可逆的操作，要配確認框、配講清楚後果的文案，還要承受使用者在「還原」旁邊誤點的風險——兩個按鈕會並排在同一列，一個救回資料一個銷毀資料。一鍵清空更甚，一次點擊就能毀掉 14 天內所有誤刪的紀錄，正好是回收站存在意義的反面。

若之後真的需要，單筆永久刪除隨時可加，並且應該放進該列的次要選單而不是主要按鈕。

## 過渡與骨架

不需要 `<Suspense>`。這個頁面沒有分頁，沒有 #57 那種「換頁時導覽列被卸載導致連點落空」的問題，`(app)/loading.tsx` 的共用骨架就夠。

## 文案

沿用 app 現有的英文 UI：

- 空狀態：`Nothing deleted in the last 14 days.`，底下一個回 Entries 的連結
- 剩餘天數：`3 days left`；最後一天顯示 `Last day`
- 還原按鈕：`Restore`

## 測試

- 剩餘天數計算抽成純函式放 `src/lib/entries.ts`，測邊界：剛刪除、第 13 天、最後一天、已過期。
- `restoreEntry()` 的行為沿用 `src/server/timer.test.ts` 既有的 Supabase mock 模式。

## PR

一個 PR：頁面、清單元件、`restoreEntry()`、entries 頁標題列的連結、測試。約 150 行。

**必須排在 #55 的第一個 PR 之後**，那個 PR 才會建出 `deleted_at`、`time_entries_user_deleted_idx` 與 cutoff 純函式。

建議也排在 #57 的 PR 2 之後。兩者都會改 entries 頁標題列的同一段 JSX，先後都可行，但週導覽是主體、`Deleted` 連結是附掛，讓附掛的那個去適應主體比較合理。
