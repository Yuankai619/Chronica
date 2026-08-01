# 已刪除的 time entry 採軟刪除，過濾靠應用層而非資料庫

回收站與 restore 需要保留被刪除的 time entry。可行做法有兩種：在 `time_entries` 加 `deleted_at`，或另建一張 `deleted_time_entries` 回收桶表。我們選軟刪除，因為 `time_entries` 未來還會加欄位，兩張表的 schema 會持續發散，而 restore 也會從「改一個欄位」變成需要 transaction 的跨表搬遷。軟刪除讓 id、外鍵與所有欄位天然保留，也沿用了 `categories.archived_at` 已經建立的慣例。

## 考慮過但沒選的過濾方式

軟刪除的代價是 12 處讀取路徑都得自己排除已刪除的列，漏一處不會報錯，只會讓統計悄悄變錯 —— 而時間統計正是這個 app 的全部意義。我們仍然選擇在每個查詢加 `.is("deleted_at", null)`，而不是用資料庫層的手段收斂：

- **另建 `active_time_entries` view**：一樣要改 12 處呼叫點，多付一個 migration 與手寫型別的成本，但 `time_entries` 這個名字還在，下一個寫程式的人或 agent 依然會直接伸手去拿它。付了成本卻沒買到保證。
- **把表改名成 `time_entries_all`，再建一個叫 `time_entries` 的 view 頂替**：唯一有硬保證的方案，讀取路徑一行都不用改。但「看起來是表、其實是 view」對一個實作 agent 要讀的 codebase 太隱晦，而且手寫的 `database.types.ts` 得把 `time_entries` 從 `Tables` 搬到 `Views`，`src/lib/entries.ts` 的 `Tables<"time_entries">` 會斷。

替代的防呆手段是把「讀 `time_entries` 一律排除 `deleted_at is not null`」寫進 `AGENTS.md` 的 Domain Rules That Bite。這個 repo 本來就靠那份清單維持其他同類不變式（週一起算、跨午夜歸屬、category 封存不刪），多一條與既有做法一致。

## 明確的例外

`deleteCategory()` 用來判斷「有沒有 entries」的 count 查詢**不套用**這條過濾。它問的不是「要顯示什麼」，而是「這個 category 能不能安全地從世上消失」，已軟刪的列仍然指著它。若這裡跟著加過濾，一個 entries 全被軟刪的 category 會被判定為 0 筆而走硬刪，然後撞上 `time_entries.category_id` 的 `NO ACTION` 外鍵，讓使用者看到一則原始的 Postgres 錯誤。
