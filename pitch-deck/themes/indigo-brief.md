---
name: Indigo Brief
description: 冷白紙面配深靛墨字的中文簡報主題，鋼藍只留給全頁一個重點，圖表一律由 diagram-design 產生。
mode: light
---

# Indigo Brief

給黑客松決賽 Pitch 用的亮色中文主題。基調是一份印得很好的技術簡報：冷白底、深靛字、細線分隔、留白夠大，鋼藍當作全頁唯一的視線終點。所有圖表與示意圖走 `diagram-design` skill，不在 slide 裡手刻。

## Palette

| Role         | Value                     | Notes                                    |
| ------------ | ------------------------- | ---------------------------------------- |
| bg           | `#FAFBFC`                 | 頁面底色，冷白偏藍                       |
| surface      | `#FFFFFF`                 | 卡片、截圖框、表格列                     |
| surfaceAlt   | `#F1F4F8`                 | 次級區塊、程式碼區、表頭                 |
| text         | `#1B2A4A`                 | 主要文字與主要線條                       |
| muted        | `#6B7789`                 | 次要說明、圖說                           |
| faint        | `#8A94A6`                 | 頁碼、標號、第三層文字                   |
| line         | `#E6EAF0`                 | 1px 分隔線、卡片邊框                     |
| lineStrong   | `#D8DEE8`                 | 基準線、表格分隔                         |
| accent       | `#3D6BE5`                 | 全頁只有一到兩處：關鍵數字、重點節點     |
| accentSoft   | `rgba(61,107,229,0.08)`   | accent 邊框方塊的填色                    |
| positive     | `#127C71`                 | 符合預算、完成、正向差值                 |
| caution      | `#C2663C`                 | 超時、超出預算、風險                     |
| series       | `#5F7A8C` `#7C8F6F` `#B8915A` `#9C6B50` `#6E6479` | 多序列圖表用，與 diagram-design 的 series 1–5 同一組 |

規則：accent 一頁最多出現兩次，出現第三次就代表這頁沒有重點。positive / caution 只用在真的有正負意義的數據上，不拿來裝飾。

## Typography

- Display font：`Inter, "Noto Sans TC", -apple-system, BlinkMacSystemFont, "PingFang TC", system-ui, sans-serif` — 標題 weight 700。
- Body font：同一組 stack，內文 weight 400–500。
- Mono（只給數字、路徑、指令）：`ui-monospace, "SF Mono", "Cascadia Mono", Consolas, monospace`，中文一律不進 mono。
- Webfont import：`https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+TC:wght@400;500;700&display=swap`
  - 依 `slide-authoring` 的 `references/webfonts.md`：在 `index.tsx` module top level 注入一次，id 用 `osd-webfont-<slide-id>`，不要寫在 component 裡。
  - Noto Sans TC 是 CJK，subset 數量很大。文案定稿後在 URL 後面加 `&text=<用到的所有中文字>` 換成單一 subset，PDF export 會快很多。
- Type scale（覆蓋 `slide-authoring` 預設的部分）：
  - Hero title：132 px / line-height 1.15 / weight 700 / letter-spacing `-0.01em`
  - Section heading：88 px / weight 700
  - Page heading：60 px / weight 700 / margin-bottom 48
  - Body：34 px / line-height 1.85（中文行距要比英文鬆）
  - Caption、圖說：24 px / muted
  - 數字（KPI）：112 px / weight 600 / `fontVariantNumeric: 'tabular-nums'`
- 中文排版：標點不另外調整字距；`letter-spacing` 只加在全英文的小字標號上，中文字串一律 `letter-spacing: 0`（中文加字距會鬆散得很不自然）。

## Layout

- 畫布 1920 × 1080，一律絕對像素。
- 內容邊界：上下 116 px，左右 140 px。Footer 另外佔底部 56 px，內容不要壓進去。
- 網格：12 欄，欄寬 107 px，間距 32 px。常用切法是 7 / 5（左文字右圖）與 5 / 7。
- 對齊：整份左對齊。置中只用在封面與結尾兩頁。
- 分隔靠 1px `line` 細線與留白，不用卡片陰影、不用圓角膠囊。圓角上限 6 px。
- 截圖一律套白底 `surface` 卡片 + 1px `line` 邊框，圖說放在圖下方 20 px、24 px muted。
- 一頁只講一件事。頁面標題以外的文字超過 5 行就該拆頁或改成圖。

## Copy rules（中文文案）

這是主題的一部分，違反就算沒做到主題。

- 標題上方不放小標題、不放 badge、不放色塊或底色標籤。要分段就直接用頁面標題本身，或用一條 1px 細線。
- tag、關鍵字、並列短語之間只用間距分開（flex `gap: 24`），不加逗號、句號、頓號、破折號、`·`、`|`。
- 不使用「不是……而是……」這種對比句式，也不使用它的變體（「與其……不如……」「不只是……更是……」）。要講差別就直接講事實：「先記錄，再規劃。」
- 不用行銷詞：打造、賦能、一站式、極致、革命性、無縫、顛覆。動詞用具體的：記錄、統計、提醒、比對、寫回。
- 不用 emoji、不用驚嘆號、不用問句當標題。
- 數字要有單位與時間範圍，寫「這 8 週平均每週 3.5 小時」，不寫「大幅提升效率」。
- 句子寫成第一人稱、講自己怎麼用這個工具；這是作者本人每天在用的東西，語氣要像實話，不像產品文案。
- 每頁標題用名詞短語或一句陳述句，長度控制在 14 個字以內。

## Diagrams and charts

**任何圖表、架構圖、流程圖、時間軸、對照表都走 `diagram-design` skill，不要在 slide 裡臨時手刻 SVG，也不要用 emoji 方塊或純文字排版假裝成圖。**

- Skill 位置：`.agents/skills/diagram-design/`（`.claude/skills/diagram-design` 是 symlink，和其他五個 skill 同一套機制）。
- 這份 install 已經換膚成本主題：`references/style-guide.md` 開頭帶 `slug: indigo-brief` 的 profile header，token 直接對應上面的 Palette，字體換成 Inter + Noto Sans TC，mono 保留 Geist Mono 只給拉丁字母與數字。**首次使用的 onboarding gate 直接跳過**，不要再被問一次要不要客製。
- 流程：
  1. 依內容選型別（架構圖 → `type-architecture.md`、流程 → `type-flowchart.md`、時間軸 → `type-timeline.md`、對照 → `type-quadrant.md` / `type-bar.md`，共 39 種）。
  2. 讓 skill 產出 self-contained HTML + inline SVG。
  3. 把 `<svg>` 節點原封不動貼進 slide 的 page component，外層包一個 `<Figure>`，用 `width` / `height` 或 `viewBox` 縮放到版位；不要改裡面的顏色。
  4. 圖上的中文標籤字級最小 12 px（SVG 座標系），縮放後不得小於畫布上的 20 px。
- 密度上限沿用 skill 的規則：一張圖 9 個節點以內，accent 只給 1–2 個焦點節點。超過就拆成兩張圖或兩頁。
- Palette 若有調整，`themes/indigo-brief.md` 與 `references/style-guide.md` 必須在同一個 commit 一起改。

## Fixed components

以下直接複製進使用本主題的 slide。**沒有 Eyebrow component**：本主題禁止標題上方的小標與 badge。

### Title

```tsx
const Title = ({ children }: { children: React.ReactNode }) => (
  <h1
    style={{
      fontSize: 132,
      fontWeight: 700,
      lineHeight: 1.15,
      letterSpacing: '-0.01em',
      margin: 0,
      color: '#1B2A4A',
    }}
  >
    {children}
  </h1>
);
```

### Heading（內頁標題）

```tsx
const Heading = ({ children }: { children: React.ReactNode }) => (
  <h2
    style={{
      fontSize: 60,
      fontWeight: 700,
      lineHeight: 1.3,
      margin: '0 0 48px',
      color: '#1B2A4A',
    }}
  >
    {children}
  </h2>
);
```

### Footer

頁碼一律從 `useSlidePageNumber()` 取，不要自己傳 `pageNum` / `total`。

```tsx
import { useSlidePageNumber } from '@open-slide/core';

const Footer = () => {
  const { current, total } = useSlidePageNumber();
  return (
    <div
      style={{
        position: 'absolute',
        left: 140,
        right: 140,
        bottom: 56,
        paddingTop: 20,
        borderTop: '1px solid #E6EAF0',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 22,
        color: '#8A94A6',
      }}
    >
      <span>Chronica</span>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>
        {String(current).padStart(2, '0')} / {String(total).padStart(2, '0')}
      </span>
    </div>
  );
};
```

### Figure（截圖與 SVG 圖表的框）

```tsx
const Figure = ({
  caption,
  children,
}: {
  caption?: string;
  children: React.ReactNode;
}) => (
  <figure style={{ margin: 0 }}>
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E6EAF0',
        borderRadius: 6,
        overflow: 'hidden',
        display: 'flex',
      }}
    >
      {children}
    </div>
    {caption ? (
      <figcaption style={{ marginTop: 20, fontSize: 24, color: '#6B7789' }}>
        {caption}
      </figcaption>
    ) : null}
  </figure>
);
```

### Stat（關鍵數字）

一頁最多一組。`accent` 就用在這裡。

```tsx
const Stat = ({ value, label }: { value: string; label: string }) => (
  <div>
    <div
      style={{
        fontSize: 112,
        fontWeight: 600,
        lineHeight: 1,
        letterSpacing: '-0.02em',
        color: '#3D6BE5',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {value}
    </div>
    <div style={{ marginTop: 16, fontSize: 26, color: '#6B7789' }}>{label}</div>
  </div>
);
```

### Tags（並列關鍵字）

之間只有間距，沒有任何分隔符號。

```tsx
const Tags = ({ items }: { items: string[] }) => (
  <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
    {items.map((t) => (
      <span
        key={t}
        style={{
          fontSize: 24,
          color: '#1B2A4A',
          paddingBottom: 6,
          borderBottom: '1px solid #D8DEE8',
        }}
      >
        {t}
      </span>
    ))}
  </div>
);
```

## Motion

- 哲學：**subtle**。只有進頁時主要區塊做一次 16 px 的上移淡入，之後畫面完全靜止；講者講話時不該有東西在動。
- 位移一律 16–24 px，時長 480 ms，`cubic-bezier(0.22, 0.61, 0.36, 1)`。不用彈跳、不用縮放、不用旋轉。
- 分段揭露用 `<Steps>`（見 `slide-authoring` 的 `references/steps.md`），每頁最多 3 段。

```css
@keyframes ibFadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

## Aesthetic

像一份排版考究的中文技術文件被放大到投影幕上：冷白紙面、深靛墨字、細到幾乎看不見的分隔線、大量留白，資訊靠位置與字級分層，而不是靠色塊。整體只有一個藍色重點色，出現的次數少到每次出現都值得看。避免的東西很明確：漸層、陰影、玻璃擬態、圓角膠囊標籤、彩色卡片牆、圖示塞滿的三欄式功能列、標題上方的小標與 badge、任何 emoji。圖表全部交給 `diagram-design`，維持同一套線寬、字級與密度。

## Example usage

```tsx
const Cover: Page = () => (
  <div
    style={{
      width: '100%',
      height: '100%',
      background: '#FAFBFC',
      color: '#1B2A4A',
      padding: '116px 140px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
    }}
  >
    <Title>把時間記下來，下一週才排得準</Title>
    <p style={{ fontSize: 34, lineHeight: 1.85, color: '#6B7789', maxWidth: 1100, marginTop: 40 }}>
      Chronica 是我自己每天在用的時間統計工具。先記錄真實花費，再用歷史速度規劃下一週的時間預算。
    </p>
    <div style={{ marginTop: 56 }}>
      <Tags items={['時間統計', '週預算規劃', 'AI 回顧']} />
    </div>
    <Footer />
  </div>
);
```
