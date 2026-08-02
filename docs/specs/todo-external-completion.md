# Microsoft To-Do 外部完成狀態：同步時機與衝突策略

對應 [#60](https://github.com/Yuankai619/Chronica/issues/60)。事實基礎見 [#59 的研究筆記](../research/microsoft-todo-external-completion.md)。沒有 schema 變更，不需要 ADR。

## 根因不是快取

ticket 描述為「無法即時更新」，實際是「根本不更新」。

`src/app/(app)/tasks/page.tsx` 的 Open 列表主體是從 `time_entries` 裡有 `todo_task_id` 的紀錄聚合出來的，也就是「你花過時間的任務」。Graph 回傳的 `allTasks` 只用來補上「今天到期但還沒記過時間」的任務。最後的過濾只有 `!completedIds.has(t.id)`，而 `completedIds` 來自 Chronica 自己的 `completed_tasks` 表。

所以有時間紀錄的任務，程式碼從頭到尾沒有拿 Graph 的狀態比對過它——外部完成永遠不會讓它消失，除非你在 Chronica 裡自己打勾。只靠「今天到期」進榜的任務會正確消失，但最多慢 60 秒。

調整快取或加輪詢對第一類完全無效。

## 判定來源：補集判定

entry 衍生的列，若其 `todo_task_id` 不在 `getOpenTasks()` 回傳的 open 集合裡，視為已完成。

不用 delta query：要新增存 token 的欄位、要處理 `410 Gone` 的完整重新同步、要跟 `@odata.nextLink` 分頁，而它換來的低流量在這個低頻頁面上沒有價值——60 秒快取已經把流量壓得很低。delta 是為輪詢設計的方案，而這裡不採輪詢。

不逐一查 task 狀態：`time_entries` 的查詢上限是 2000 筆，可能對應數百個不重複 task id。就算用 JSON batch（單批 20 個請求）也要打好幾批，而 To Do 的並行上限是每信箱 4 個。

### 安全閥：`truncated`

補集判定的正確性完全押在「open 集合是完整的」這個前提上，而這個前提有三種破法。`getOpenTasks()` 改回傳 `{ tasks, truncated }`，以下任一情況 `truncated` 為真：

1. 目前回傳 null 的所有情況（未連結帳號、清單查詢失敗）
2. 清單數觸及 `MAX_LISTS = 10`，或任一清單回傳滿 `$top = 50` 筆
3. 任一清單的請求失敗

第三項現在是靜默跳過的（`if (!result) continue;`），今天無害，但補集判定上線後會變成錯誤來源：某個清單被 429 節流，它底下的未完成任務全部不在 open 集合裡，補集判定會判它們已完成而讓它們消失。

**`truncated` 為真時完全不做補集判定**，退回今天的行為。

不改抓取範圍（不加分頁、不提高上限），因為 `getOpenTasks()` 也被首頁與 entries 頁呼叫，讓它變重的代價會付在最常用的兩個頁面上，而收益只在任務多到超過 500 筆未完成時才出現。

失敗方向是刻意選的：偏向「多顯示一列」而非「少顯示一列」。多一列在 Chronica 打個勾就解決；少一列使用者只會覺得任務憑空消失，而且不會聯想到同步問題。

## 外部已完成的呈現

直接從 Open 消失，**不寫 `completed_tasks`**，不出現在 Completed today。

`getOpenTasks()` 帶的是 `$filter=status ne 'completed'`，所以 Chronica 從來沒有拿到過已完成任務的資料，包含 `completedDateTime`。補集判定只能告訴我們「它不在未完成清單裡」，給不出完成時間。

寫進 `completed_tasks` 只能填「Chronica 首次發現」的時間，而那個欄位叫 `completed_at`。這會直接違反該表的清除規則：昨天 23:50 在手機上完成的任務，今天 00:10 打開 Chronica 會被記成今天完成，出現在「Completed today」裡——一個使用者今天沒做過的東西。

另外向 Graph 撈已完成任務可以拿到真正的 `completedDateTime`，但成本不可控：每個清單各一次查詢，而已完成任務會無限累積、得再加時間範圍過濾，而 `completedDateTime` 能不能 filter 官方文件未載明（見研究筆記第二節）。

Completed today 的語意維持「今天在 Chronica 打勾的」。空狀態文案改成 `Nothing completed here today.`

## 同步時機

維持 60 秒快取，Open 分頁加一顆手動重新整理按鈕。server action 呼叫既有的 `invalidateTaskCache()` 後 `revalidatePath("/tasks")`。

不繞過快取：快取是首頁、entries、tasks 三頁共用的。tasks 頁每次繞過，等於 Open 與 Completed 兩個 tab 之間切換都要打 1 + N 個 Graph 請求，讓一個很輕的操作變成受網路延遲支配。

不背景輪詢：研究筆記第四節記錄微軟明確建議用 delta query 或 change notification 取代高頻輪詢，而 To Do 每信箱只有 4 個並行額度。為一個低頻頁面在背景燒配額，方向就是錯的。

不是什麼都不加：60 秒快取沒有出口。使用者盯著一列他確定已完成的任務時，只能等，而且看不到快取的起算點、不知道要等多久。

## 衝突：Microsoft 贏

task id 重新出現在 open 集合裡時，把它從 `completedIds` 移除並刪掉對應的 `completed_tasks` 列，任務回到 Open。與補集判定是同一個迴圈的兩面，`truncated` 為真時同樣不執行。

依據不是偏好而是既有設計：`completeTask()`（`src/app/(app)/tasks/actions.ts`）會先 write-back 到 Graph，失敗就直接 return、連本地列都不寫。也就是說 `completed_tasks` 從一開始就是 Graph 狀態的投影，不是一份獨立事實。Graph 說它開著時，Chronica 沒有立場堅持它是關的。

維持現狀的壞處很具體：你在 Chronica 打勾、發現弄錯、到 Microsoft To Do 取消勾選、回到 Chronica——什麼都沒變，而且不知道要等到午夜。那正是這張 ticket 抱怨的行為，只是方向相反。

反方向（Microsoft 完成、Chronica 沒有紀錄）由補集判定處理，不需要另外的規則。

## 計時中的任務被外部完成

什麼都不做。計時照常，結束時照常把 `todo_task_id` 寫進 entry。

不自動停止：外部的一個狀態變更不該摧毀一段正在進行的計時，那會直接造成資料遺失，也違反「計時的真相在伺服器時間戳」。計時記錄的是這段時間你在做什麼，跟任務被標成什麼狀態無關——你完全可能先勾掉任務再繼續收尾。

不加提示：timer 面板是執行面，該保持乾淨（跟 category description 不上執行面是同一種分層）。換來的只是一個罕見且無害情境下的提醒。

## 失敗與節流的 UI

`truncated` 為真時，Open 分頁上方顯示一行 muted 提示：

```
Completion status may be out of date — Microsoft data is incomplete.
```

這個 codebase 既有的風格是靜默降級（`getOpenTasks()` 回 null 時三個呼叫端都靜靜地少一個功能），但這裡不同：靜默降級的結果是「本該消失的列還在」，而那正是使用者這次要求修的行為，他會以為修復沒生效。一行文字就能把「壞掉」變成「暫時拿不到資料」。

不加重試按鈕，手動重新整理那顆就在旁邊，兩者是同一個動作。

## 已知限制

任務一旦離開 Open 列表，它累積的時間成本就沒有地方可看——Open 分頁是唯一顯示 task time cost 的地方。Chronica 端打勾也是同樣結果，這是既有行為而非本次造成，本規格不處理。

## 測試

- 補集判定：有時間紀錄、不在 open 集合 → 不顯示；在 open 集合 → 顯示。
- `truncated` 為真時，上述兩種情況都顯示。
- 三種 `truncated` 觸發條件各一個案例。
- 反向清理：`completed_tasks` 有列但 task 在 open 集合中 → 列被刪且任務回到 Open。
- `getOpenTasks()` 的 mock 沿用 `src/server/timer.test.ts` 既有的 Supabase mock 模式，Graph 呼叫用 `fetch` 的 stub。

## PR 切分

**PR 1 — 機械改動。** `getOpenTasks()` 回傳形狀改成 `{ tasks, truncated }`、三種截斷情況的偵測、首頁與 entries 與 tasks 三個呼叫端調整。行為完全不變，驗收標準是三個頁面的任務選單一模一樣。

**PR 2 — 行為。** 補集判定、`completed_tasks` 反向清理、重新整理按鈕與 server action、`truncated` 提示、Completed today 空狀態文案。

拆開是因為真正需要審查注意力的是補集判定——它會讓列消失，而讓列錯誤消失正是所有防護要防的事。跟一個橫跨三個頁面的簽章改動混在同一個 diff 裡，注意力會被稀釋。
