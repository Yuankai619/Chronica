# Planning 在手機寬度下的編輯與刪除

對應 [#64](https://github.com/Yuankai619/Chronica/issues/64)。版面經原型驗證，三個變體與切換器留在 throwaway 分支 [`prototype/planning-touch-actions`](https://github.com/Yuankai619/Chronica/tree/prototype/planning-touch-actions)，不進 main。沒有 schema 變更，不需要 ADR。

## 現況與兩個破口

`ItemCard`（`src/components/plan-board.tsx`）的編輯與刪除按鈕用 `opacity-0 group-hover:opacity-100` 藏著。觸控裝置沒有 hover，這兩個按鈕在手機上**永遠不會出現**。

原型過程中查到第二個破口：卡片根容器有 `touch-none`（`touch-action: none`），而 board 在手機是 `grid-cols-1`，畫面幾乎被卡片填滿——**手指放在任何一張卡片上都無法捲動頁面**。兩者是同一個 hover-first 設計在觸控裝置上的不同破法，這一票一起修。

## 勝出的方案：Tap to reveal action row

原型的三個變體分別把重點放在拖曳把手分離、指標能力偵測、以及兩段式動作列。選定的是 **C — Tap to reveal action row**。

- **拿掉常駐的圖示按鈕。** `ItemCard` 右側那兩顆 `Pencil` 與 `X` 整組移除。
- **點一下卡片本體展開動作列**：卡片內容區下方出現一列全寬按鈕，非行事曆項目是 `Edit` 與 `Delete`，行事曆項目只有 `Delete`。再點一次卡片收合。
- **桌機與手機行為一致**，不做斷點也不做 `@media (hover: hover)` 偵測。

### 為什麼是一致而不是分裝置

原型的變體 B 用 `@media (hover: hover)` 保留桌機的 hover 行為。它對觸控筆電比 Tailwind 斷點準確，但代價是同一個元件有兩套互動模型，兩邊各自的邊界情況都要驗，而且「這台裝置算不算 hover 裝置」對使用者不可見——外接滑鼠的平板會在插拔之間改變行為。

一致的代價是桌機使用者多一次點擊。可以接受：plan board 的編輯與刪除是低頻操作，而目前 hover 才顯示的設計本來就沒有給出任何「這裡有按鈕」的提示，桌機使用者也是靠猜的。

### 為什麼不做拖曳把手

原型的變體 A 把拖曳限制在左側 grip、卡片本體不再可拖。它讓拖曳與點擊的分工最明確，但把 grip 變成唯一入口會讓拖曳在手機上變難——那是一個 16px 寬的目標，而重新排程是這個頁面的主要動作。C 讓整卡維持可拖，靠既有的 200ms 長按延遲區分點擊與拖曳。

## 動作列的行為

```
[分類名稱]
[badge] 1h 30m
[   Edit   ][  Delete  ]
```

- 兩顆按鈕 `flex-1`，垂直 padding 讓高度落在約 32px，文字用 `text-xs`。
- `Delete` 用 `text-danger`，`Edit` 用 `text-muted` 與 hover 提亮。
- 兩顆都要 `onPointerDown` 的 `stopPropagation()`，否則按下的瞬間會被 dnd-kit 的 sensor 接走。點擊 handler 也要 `stopPropagation()`，否則會冒泡回卡片而立刻把動作列收掉。

要在規格裡釘死的幾條，實作時容易各自發揮：

- **同時只展開一張。** 展開狀態提到 `PlanBoard` 層，存一個 `openItemId`，點另一張卡片時前一張自動收合。留在各自的 `ItemCard` 裡的話，手機上一路點下去會展開一整排動作列，把 board 撐得很長。
- **進入編輯表單時收合。** `setEditing(true)` 同時清掉 `openItemId`，回到卡片時是收合狀態。
- **刪除後不需要處理**，那張卡片整個消失。
- **拖曳開始時收合。** `onDragStart` 清掉 `openItemId`，否則 `DragOverlay` 會拖著一個展開的動作列跑。
- **不加 confirm。** 兩段式本身就是防護：要刪掉一個項目得先點卡片、再點 Delete，兩次點擊在不同位置。再加一層對話框是第三次確認，對一個「重新排一次就好」的低成本操作太重。

`overlay`（`DragOverlay` 用的那份）永遠不渲染動作列。

## `touch-none` 改成 `touch-pan-y`

```diff
- "group flex touch-none items-start gap-1.5 rounded-md ..."
+ "group flex touch-pan-y items-start gap-1.5 rounded-md ..."
```

`touch-none` 是 dnd-kit 對「沒有啟動延遲的 PointerSensor」的建議設定。這個 board 已經有 `activationConstraint: { delay: 200, tolerance: 6 }`，那個延遲本身就足以區分捲動與拖曳，`touch-none` 從一開始就是多餘的，而它的副作用是關掉整個畫面的平移手勢。

`touch-pan-y` 保留垂直捲動、水平留給拖曳。手機是單欄，垂直捲動是唯一需要的方向。

驗收要確認的是：手機上手指放在卡片上滑動可以捲頁，而長按 200ms 後仍能拖動卡片、且拖動過程不會觸發頁面捲動。

## 測試

`plan-board.tsx` 的互動沒有既有測試，這一票不新增測試框架層級的東西。驗收靠手動，項目寫在 PR 描述裡：

- 手機寬度：點卡片展開、再點收合、點另一張時前一張收合。
- 手機寬度：手指在卡片上滑動可捲頁。
- 手機寬度：長按卡片可拖曳，跨欄拖曳仍正常。
- 行事曆項目只出現 `Delete`，且分類下拉仍可操作。
- 桌機：同一套行為，hover 不再顯示任何按鈕。

## PR

一個 PR，約 80 行：移除兩顆圖示按鈕、加動作列與 `openItemId` 狀態、`touch-none` 改 `touch-pan-y`、`onDragStart` 收合。

與其他 ticket 沒有相依。原型程式碼是在 prototype 前提下寫的（展開狀態留在 `ItemCard` 裡、無測試），正式實作時依本規格重寫，不直接搬。
