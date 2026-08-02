# Microsoft Graph To-Do：外部完成狀態的拉取型偵測手段

調查對象是 [決定 Microsoft To-Do 外部完成狀態的同步時機與衝突策略](https://github.com/Yuankai619/Chronica/issues/60) 所需的事實。webhook 與 change notification 不在本輪範圍內，只調查拉取型手段。本文只收集事實，不下決策。

## 摘要

- `todoTask` 支援 delta query，v1.0 已 GA。一次同步一個清單一個請求，只回傳變更，是流量成本最低的拉取手段。
- delta query 的 OData 查詢參數支援極窄。官方文件沒有記載 `status`、`completedDateTime`、`lastModifiedDateTime` 可用於 delta 的 `$filter` 或 `$orderby`，所以無法只拉「已完成」的變更，必須全部收下來自行判斷。
- delta token 對 Outlook 系資源沒有固定有效期。失效時回 `410 Gone`，應用必須能重新完整同步。
- To Do 走 Outlook service 的節流額度，每個信箱同時 4 個請求。多清單同步要靠 JSON batch（單批上限 20 個請求）壓低往返。
- delta query 不需要額外的權限 scope，現有的 `Tasks.ReadWrite` delegated 權限就夠。

## 一、Delta query 支援情況

- `/me/todo/lists/{todoTaskListId}/tasks/delta` 存在且支援。來源：[todoTask: delta](https://learn.microsoft.com/en-us/graph/api/todotask-delta)
- 首次呼叫不帶 token，回傳整個集合。回應尾端帶 `@odata.nextLink`（還有下一頁）或 `@odata.deltaLink`（已取完，可存下來供下一輪使用）。來源：[Delta query overview](https://learn.microsoft.com/en-us/graph/delta-query-overview)
- 後續呼叫使用上一輪 `@odata.deltaLink` 中的 `$deltatoken`，只回傳自上次之後有變更的項目。
- Token 有效期：目錄物件是 7 天，Outlook 系資源（mail、event、contact、todoTask、todoTaskList）**沒有固定上限**，取決於服務端 delta token 快取容量。來源：[Delta query overview: Token duration](https://learn.microsoft.com/en-us/graph/delta-query-overview#token-duration)
- Token 失效時回 `410 Gone`，並在 `Location` header 給一個 `$deltatoken` 為空的重啟 URL，代表要做完整重新同步。來源：[Delta query overview: Synchronization reset](https://learn.microsoft.com/en-us/graph/delta-query-overview#synchronization-reset)
- 已刪除的項目以 `@removed` 標記回傳，形如 `{"id": "...", "@removed": {"reason": "deleted"}}`。來源：[Delta query overview: Resource representation](https://learn.microsoft.com/en-us/graph/delta-query-overview#resource-representation-in-the-delta-query-response)
- 已完成的任務不走 `@removed`，而是以 `status` 變成 `completed` 的一般變更項目回傳。這一點是由「`@removed` 只用於刪除與移出範圍」推得，官方文件沒有針對 todoTask 的完成情境另行舉例。

## 二、欄位過濾與排序支援

- todoTask 的 delta query 只記載支援 `receivedDateTime` 的 `ge` 與 `gt` 過濾，以及 `$orderby=receivedDateTime desc`。來源：[todoTask: delta — OData query parameters](https://learn.microsoft.com/en-us/graph/api/todotask-delta)
- `status`、`completedDateTime`、`lastModifiedDateTime` 在 delta query 的 `$filter` 與 `$orderby` 支援情況，**官方文件未載明**。
- 官方明說未指定 `$orderby` 時回傳順序不保證，應用不應假設特定順序。來源：同上
- `Prefer: odata.maxpagesize={n}` 可用來控制單頁筆數。來源：[Delta query overview](https://learn.microsoft.com/en-us/graph/delta-query-overview)
- 一般（非 delta）`GET /me/todo/lists/{id}/tasks` 對 `lastModifiedDateTime` 的 `$filter` 支援，**官方文件未載明**。Chronica 現行程式碼實測 `status ne 'completed'` 可用，但這不等於其他欄位也可用，要用之前需自行驗證。

## 三、批次查詢與分頁

- JSON batching 可把多個清單的查詢併成一個請求，單批上限 20 個請求。來源：[Combine multiple HTTP requests using JSON batching](https://learn.microsoft.com/en-us/graph/json-batching)
- 批次外層即使內部有失敗仍回 `200 OK`，每個子請求各自帶自己的狀態碼，錯誤要逐筆處理。來源：同上
- 批次內的子請求各自計入節流額度，超限的子請求會各自回 `429`。來源：[Throttling guidance](https://learn.microsoft.com/en-us/graph/throttling)
- 分頁：`@odata.nextLink` 代表本輪還沒取完，要繼續跟；拿到 `@odata.deltaLink` 才算一輪結束、才可以存 token。
- delta query 放進 batch 後的分頁確切行為，**官方文件未載明**。安全做法是每個清單各自循著 `nextLink` 走到 `deltaLink`。

## 四、節流與配額

- To Do 屬於 Outlook service 的節流分類。來源：[Microsoft Graph throttling limits](https://learn.microsoft.com/en-us/graph/throttling-limits)
- 每個 app 對每個信箱同時最多 4 個並行請求；每 10 分鐘 10,000 次 API 請求。來源：同上
- 租戶層級另有全域上限。來源：同上
- 被節流時回 `429 Too Many Requests`，body 的 `error.code` 是 `TooManyRequests`，並帶 `Retry-After`（秒）。來源：[Throttling guidance](https://learn.microsoft.com/en-us/graph/throttling)
- 官方建議：優先遵守 `Retry-After`；沒有該 header 時採指數退避；不要在收到 429 後立刻重試。來源：[Throttling guidance — Best practices](https://learn.microsoft.com/en-us/graph/throttling)
- 官方建議用 delta query 或 change notification 取代高頻輪詢，並用 `$select` 縮小回應。來源：同上

## 五、權限 scope

- delta query 使用與一般讀取相同的權限：delegated 的 `Tasks.Read` 或 `Tasks.ReadWrite`；application 的 `Tasks.Read.All` 或 `Tasks.ReadWrite.All`。來源：[todoTask: delta — Permissions](https://learn.microsoft.com/en-us/graph/api/todotask-delta)、[Permissions reference](https://learn.microsoft.com/en-us/graph/permissions-reference)
- 沒有 delta 專用的 scope。Chronica 目前的 delegated `Tasks.ReadWrite` 即可支援 delta，不需要使用者重新授權。

## 對 Chronica 的可行選項

以下只列出依上述事實在技術上成立的做法與各自取捨，不做推薦。

### 選項 A：改用 delta query 追蹤變更

每個清單保存一份 delta token，同步時帶 token 呼叫 `/tasks/delta`，把回傳的變更套用到本地狀態；收到 `410` 就丟掉 token 重新完整同步。

- 成本：每個清單每輪一個請求，回應只含變更，流量與節流壓力最低。
- 代價：需要一個存 delta token 的地方（目前沒有這樣的欄位），以及一條完整重新同步的路徑。
- 限制：無法只要「已完成」的變更，所有變更都得收下來自行分辨；token 失效時機不可預測。

### 選項 B：維持全量拉取，調整快取與觸發時機

沿用現行的 `getOpenTasks()` 查詢，改變的是何時拉、快取多久，例如縮短 60 秒快取、加手動重新整理、或在特定使用者動作後強制失效。

- 成本：改動最小，不需要新的儲存欄位。
- 代價：每輪每個清單都是全量，請求數與流量隨清單數線性成長，容易碰到 4 並行與 10 分鐘 10,000 次的上限。
- 限制：若想用 `lastModifiedDateTime` 做增量過濾，得先自行驗證該欄位在一般查詢是否可 filter，官方文件沒有背書。

### 選項 C：JSON batch 併發查詢

不論 A 或 B，多清單的請求都可以併進 JSON batch，單批最多 20 個。

- 成本：往返次數下降。
- 代價：要處理批次內個別子請求的失敗與 429，退避邏輯變複雜。
- 限制：子請求仍各自計入節流額度，batch 不能繞過並行上限。

## 待驗證事項

以下三點官方文件沒有明確答案，若後續決策依賴它們，需要實際打 API 驗證：

1. 一般查詢 `GET /me/todo/lists/{id}/tasks` 是否支援 `lastModifiedDateTime` 的 `$filter`。
2. delta 回應中，任務由未完成變成已完成時的實際 payload 形狀。
3. delta query 放進 JSON batch 後，`@odata.nextLink` 的續查行為。
