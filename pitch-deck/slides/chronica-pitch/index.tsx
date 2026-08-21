import type { DesignSystem, Page, SlideMeta } from '@open-slide/core';
import { useSlidePageNumber } from '@open-slide/core';

import introPic from '@assets/intro_pic.jpg';
import planningDemo from '@assets/planning_demo.png';
import executionTimerImg from '@assets/execution_timer.png';
import executionEntriesImg from '@assets/execution_entries.png';
import executionTasksImg from '@assets/execution_tasks.png';
import summaryWeekImg from '@assets/summary_week.png';
import summaryAverageImg from '@assets/summary_average.png';
import aiRetroMock from '@assets/ai_retro_mock.png';

// ─── Panel-tweakable design tokens ─────────────────────────────────────────
export const design: DesignSystem = {
  palette: { bg: '#14151b', text: '#eae8e2', accent: '#e0a63f' },
  fonts: {
    display:
      '-apple-system, BlinkMacSystemFont, "PingFang TC", "Noto Sans TC", system-ui, sans-serif',
    body: '-apple-system, BlinkMacSystemFont, "PingFang TC", "Noto Sans TC", system-ui, sans-serif',
  },
  typeScale: { hero: 150, body: 32 },
  radius: 6,
};

// ─── Local constants (outside the panel's tweakable shape) ────────────────
const palette = {
  bg: design.palette.bg,
  text: design.palette.text,
  accent: design.palette.accent,
  surface: '#191a22',
  border: '#262832',
  muted: '#9c9fac',
  faint: '#6f7180',
  good: '#7fae6a',
  over: '#c9705a',
  blue: '#6d8fc9',
  pink: '#c97fa8',
};

const mono = 'ui-monospace, "SF Mono", "Cascadia Mono", Consolas, monospace';

const fill = {
  width: '100%',
  height: '100%',
  background: 'var(--osd-bg)',
  color: 'var(--osd-text)',
  fontFamily: 'var(--osd-font-body)',
} as const;

// ═══════════════════════════ Shared page chrome ═════════════════════════════
const Pad = ({
  children,
  pad = '130px 150px',
}: {
  children: React.ReactNode;
  pad?: string;
}) => (
  <div style={{ ...fill, position: 'relative' as const }}>
    <div
      style={{
        position: 'absolute',
        inset: 0,
        padding: pad,
        display: 'flex',
        flexDirection: 'column' as const,
      }}
    >
      {children}
    </div>
  </div>
);

const H = ({ children, mb = 48 }: { children: React.ReactNode; mb?: number }) => (
  <h2
    style={{
      fontFamily: 'var(--osd-font-display)',
      fontSize: 64,
      fontWeight: 800,
      letterSpacing: '-0.01em',
      lineHeight: 1.2,
      margin: `0 0 ${mb}px`,
    }}
  >
    {children}
  </h2>
);

const Body = ({
  children,
  size = 32,
  color = palette.text,
  maxWidth,
}: {
  children: React.ReactNode;
  size?: number;
  color?: string;
  maxWidth?: number;
}) => (
  <p style={{ fontSize: size, lineHeight: 1.75, color, margin: 0, maxWidth }}>{children}</p>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      fontFamily: mono,
      fontSize: 22,
      letterSpacing: '0.06em',
      color: palette.faint,
      marginBottom: 16,
    }}
  >
    {children}
  </div>
);

const Footer = () => {
  const { current, total } = useSlidePageNumber();
  return (
    <div
      style={{
        position: 'absolute',
        right: 150,
        bottom: 56,
        fontFamily: mono,
        fontSize: 22,
        color: palette.faint,
      }}
    >
      {String(current).padStart(2, '0')} / {String(total).padStart(2, '0')}
    </div>
  );
};

// ═══════════════════════════ Shared diagram primitives ══════════════════════
const Seg = ({
  left,
  width,
  color,
  label,
}: {
  left: number;
  width: number;
  color: string;
  label: string;
}) => (
  <div
    style={{
      position: 'absolute',
      left: `${left}%`,
      width: `${width}%`,
      top: 0,
      height: 46,
      borderRadius: 6,
      background: color,
      color: palette.bg,
      fontSize: 20,
      fontWeight: 700,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    {label}
  </div>
);

const Track = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
    <span style={{ width: 70, fontSize: 22, color: palette.faint, fontFamily: mono }}>
      {label}
    </span>
    <div style={{ position: 'relative', flex: 1, height: 46 }}>{children}</div>
  </div>
);

const Bar = ({ height, color, label }: { height: number; color: string; label: string }) => (
  <div
    style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12,
      height: '100%',
      justifyContent: 'flex-end',
    }}
  >
    <div
      style={{ width: '100%', height: `${height}%`, borderRadius: '6px 6px 0 0', background: color }}
    />
    <span style={{ fontSize: 20, color: palette.faint, fontFamily: mono }}>{label}</span>
  </div>
);

const HBox = ({
  children,
  strong = false,
  flex = 1,
}: {
  children: React.ReactNode;
  strong?: boolean;
  flex?: number;
}) => (
  <div
    style={{
      flex,
      border: `1px solid ${strong ? palette.accent : palette.border}`,
      borderRadius: 6,
      background: strong ? `${palette.accent}14` : palette.surface,
      color: strong ? palette.accent : palette.text,
      fontWeight: strong ? 700 : 500,
      padding: '22px 20px',
      fontSize: 28,
      textAlign: 'center' as const,
    }}
  >
    {children}
  </div>
);

const HArrow = () => (
  <span style={{ fontSize: 24, color: palette.faint, padding: '0 10px' }}>→</span>
);

const HRow = ({ tag, children }: { tag: string; children: React.ReactNode }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
    {tag && (
      <span
        style={{ width: 210, fontSize: 22, color: palette.faint, fontFamily: mono, lineHeight: 1.5 }}
      >
        {tag}
      </span>
    )}
    {children}
  </div>
);

const MapRow = ({ left, right }: { left: string; right: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
    <div
      style={{
        width: 340,
        border: `1px solid ${palette.border}`,
        borderRadius: 6,
        background: palette.surface,
        padding: '18px 24px',
        fontSize: 28,
        fontFamily: mono,
        color: palette.muted,
      }}
    >
      {left}
    </div>
    <span style={{ fontSize: 26, color: palette.faint }}>→</span>
    <div
      style={{
        flex: 1,
        border: `1px solid ${palette.border}`,
        borderRadius: 6,
        background: palette.surface,
        padding: '18px 24px',
        fontSize: 28,
        color: palette.text,
      }}
    >
      {right}
    </div>
  </div>
);

const StageBox = ({ title, text }: { title: string; text: string }) => (
  <div
    style={{
      flex: 1,
      border: `1px solid ${palette.border}`,
      borderRadius: 8,
      background: palette.surface,
      padding: '40px 34px',
      display: 'flex',
      flexDirection: 'column',
      gap: 18,
    }}
  >
    <div style={{ fontSize: 38, fontWeight: 800, color: palette.accent }}>{title}</div>
    <div style={{ fontSize: 26, lineHeight: 1.6, color: palette.muted }}>{text}</div>
  </div>
);

const Chip = ({ color, label, hours }: { color: string; label: string; hours: string }) => (
  <div
    style={{
      borderRadius: 6,
      padding: '14px 12px',
      background: color,
      color: palette.bg,
      fontSize: 22,
      fontWeight: 700,
      lineHeight: 1.3,
    }}
  >
    {label}
    <div style={{ fontSize: 18, fontWeight: 500, opacity: 0.75, marginTop: 2 }}>{hours}</div>
  </div>
);

const DayColumn = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
    <div
      style={{
        textAlign: 'center' as const,
        fontSize: 22,
        color: palette.faint,
        fontFamily: mono,
        marginBottom: 6,
      }}
    >
      {label}
    </div>
    {children}
  </div>
);

const FeatureRow = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 16,
      padding: '15px 0',
      borderTop: `1px solid ${palette.border}`,
    }}
  >
    <span
      style={{ width: 8, height: 8, borderRadius: 2, background: palette.accent, marginTop: 9, flexShrink: 0 }}
    />
    <span style={{ fontSize: 24, lineHeight: 1.6, color: palette.text }}>{children}</span>
  </div>
);

const Callout = ({
  x,
  y,
  label,
}: {
  x: number;
  y: number;
  label: string;
}) => (
  <>
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 16,
        height: 16,
        marginLeft: -8,
        marginTop: -8,
        borderRadius: '50%',
        border: `2px solid ${palette.accent}`,
        background: `${palette.accent}33`,
      }}
    />
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 56,
        height: 1,
        background: palette.accent,
      }}
    />
    <div
      style={{
        position: 'absolute',
        left: x + 60,
        top: y,
        transform: 'translateY(-50%)',
        maxWidth: 280,
        background: `${palette.bg}e8`,
        border: `1px solid ${palette.accent}`,
        borderRadius: 4,
        padding: '8px 12px',
        fontSize: 20,
        lineHeight: 1.45,
        color: palette.text,
      }}
    >
      {label}
    </div>
  </>
);

const Shot = ({ src, alt, height = 560 }: { src: string; alt: string; height?: number }) => (
  <div
    style={{
      border: `1px solid ${palette.border}`,
      borderRadius: 8,
      overflow: 'hidden',
      lineHeight: 0,
    }}
  >
    <img src={src} alt={alt} style={{ width: '100%', height: height, objectFit: 'contain', objectPosition: '50% 50%' }} />
  </div>
);

// ══════════════════════════════ Page 1: Cover ════════════════════════════════
const Cover: Page = () => (
  <Pad pad="150px 150px">
    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column' }}>
      <h1
        style={{
          fontFamily: 'var(--osd-font-display)',
          fontSize: 'var(--osd-size-hero)',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          margin: 0,
        }}
      >
        Chronica
      </h1>
      <p
        style={{
          marginTop: 28,
          fontSize: 44,
          fontWeight: 500,
          color: palette.muted,
          lineHeight: 1.3,
        }}
      >
        時間管理的 harness，這次換我被駕馭。
      </p>
    </div>

    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <span style={{ fontSize: 30, color: palette.muted }}>https://chronica-yk.vercel.app</span>
      <span style={{ fontSize: 30, color: palette.muted }}>github.com/Yuankai619/Chronica</span>
      <span style={{ fontSize: 30, color: palette.text }}>劉元楷 / 交大 Pitch 黑客松 2026 Fall</span>
    </div>
  </Pad>
);

// ═══════════════════════ Page 2: 我與這個題目的關係 ═══════════════════════════
const Relationship: Page = () => (
  <Pad>
    <H>我與這個題目的關係</H>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <Body maxWidth={1620}>
        我同時經營一間新創公司、在交大資工念研究所，也在 LINE
        實習。三份時間表疊在一起後，精準的時間管理是活下去的必要條件。我試過把每天、每週提前排好，幾點到幾點做什麼，但執行結果幾乎從來對不上安排。番茄鐘也試過，撐了一陣子就沒用了。
      </Body>
      <Body maxWidth={1620}>
        為什麼是柳比楔夫的方法？因為它不要求我事先想好每個時段要做什麼，只要求我誠實記錄事情發生的當下。我要的改變很單純：清楚知道自己的時間到底花到哪裡去了。
      </Body>
      <Body maxWidth={1620}>
        市面上已經有幾款做柳比楔夫式時間管理的
        App，但功能都還不夠深。我想把這套方法跟軟體工程的思維結合，也想讓 AI
        實際參與進來，幫我一起把時間管理這件事做得更好。
      </Body>
    </div>
    <Footer />
  </Pad>
);

// ══════════════════════════════ Page 3: 我是誰 ═══════════════════════════════
const SelfIntro: Page = () => (
  <Pad>
    <div style={{ display: 'flex', gap: 64, flex: 1 }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <SectionLabel>自我介紹</SectionLabel>
        <div
          style={{
            fontFamily: 'var(--osd-font-display)',
            fontSize: 68,
            fontWeight: 800,
            marginBottom: 40,
          }}
        >劉元楷</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 32, color: palette.text }}>陽明交大資工所　升碩一</div>
          <div style={{ fontSize: 32, color: palette.text }}>SWE Intern @LINE Taiwan</div>
          <div style={{ fontSize: 32, color: palette.text }}>Co-founder @Corvo AI</div>
        </div>
        <div style={{ marginTop: 48, fontSize: 26, fontFamily: mono, color: palette.accent }}>{''}</div>
      </div>
      <div
        style={{
          width: 493,
          height: 650,
          flexShrink: 0,
          borderRadius: 8,
          overflow: 'hidden',
          border: `1px solid ${palette.border}`,
          alignSelf: 'center',
        }}
      >
        <img
          src={introPic}
          alt="劉元凱在台上分享"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    </div>
    <Footer />
  </Pad>
);

// ═══════════════════════ Page 4: 問題：傳統規劃為什麼失效 ════════════════════════
const Problem: Page = () => (
  <Pad>
    <H mb={56}>傳統規劃在我身上為什麼失效</H>
    <div style={{ display: 'flex', gap: 80, flex: 1, minHeight: 0 }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 34, fontWeight: 700, marginBottom: 16 }}>排好的行程，幾乎對不上</div>
        <Body size={24} color={palette.muted}>
          公司臨時的事、學校臨時的 meeting，一個變動就讓整張表往後擠。
        </Body>
        <div
          style={{
            marginTop: 40,
            flex: 1,
            border: `1px solid ${palette.border}`,
            borderRadius: 8,
            background: palette.surface,
            padding: '48px 40px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 36,
          }}
        >
          <Track label="計畫">
            <Seg left={0} width={26} color={palette.good} label="公司" />
            <Seg left={30} width={22} color={palette.blue} label="Lab" />
            <Seg left={56} width={30} color={palette.accent} label="寫 code" />
          </Track>
          <Track label="實際">
            <Seg left={0} width={40} color={palette.good} label="公司" />
            <Seg left={46} width={16} color={palette.over} label="臨時會議" />
            <Seg left={66} width={20} color={palette.blue} label="Lab" />
          </Track>
          <span style={{ fontSize: 20, fontFamily: mono, color: palette.over }}>
            寫 code 那一塊，被擠到今天排不進去了。
          </span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 34, fontWeight: 700, marginBottom: 16 }}>番茄鐘，用一陣子就失效</div>
        <Body size={24} color={palette.muted}>
          一開始有新鮮感，撐不過幾週就放棄：它在乎怎麼做，沒有人管時間實際去了哪裡。
        </Body>
        <div
          style={{
            marginTop: 40,
            flex: 1,
            border: `1px solid ${palette.border}`,
            borderRadius: 8,
            background: palette.surface,
            padding: '48px 40px',
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 28 }}>
            <Bar height={82} color={palette.accent} label="第 1 週" />
            <Bar height={55} color={palette.accent} label="第 2 週" />
            <Bar height={26} color="#8a6a3a" label="第 3 週" />
            <Bar height={6} color={palette.faint} label="第 4 週" />
          </div>
          <span style={{ fontSize: 20, fontFamily: mono, color: palette.faint }}>
            還在照表操課的比例，逐週下滑。
          </span>
        </div>
      </div>
    </div>
    <Footer />
  </Pad>
);

// ═══════════════════════ Page 5: 轉折：柳比楔夫時間統計法 ═══════════════════════
const Turn: Page = () => (
  <Pad>
    <H mb={56}>轉折：柳比楔夫時間統計法</H>
    <Body maxWidth={1620}>
      柳比楔夫是蘇聯生物學家，用一輩子紙本記錄每一段時間的實際去向，回推自己的生產力與時間結構。
    </Body>
    <div style={{ marginTop: 56 }}>
      <HRow tag="">
        <HBox>事情發生</HBox>
        <HArrow />
        <HBox>按下計時器記錄</HBox>
        <HArrow />
        <HBox strong>事後回頭比對，真實對想像</HBox>
      </HRow>
    </div>
    <Body color={palette.muted} maxWidth={1500}>
      <span style={{ display: 'block', marginTop: 56 }}>
        碼表不會因為我覺得自己應該很認真，就多算時間。
      </span>
    </Body>
    <Footer />
  </Pad>
);

// ═══════════════════════ Page 6: 洞察：顆粒度太細 ═══════════════════════════
const Insight: Page = () => (
  <Pad>
    <H mb={48}>顆粒度太細，才是規劃失敗的真正原因</H>
    <Body maxWidth={1580}>
      規劃本身沒有錯，錯在被要求規劃到幾點幾分做什麼。這種顆粒度跟真實生活的不確定性對不上。
    </Body>
    <div
      style={{
        marginTop: 44,
        border: `1px solid ${palette.border}`,
        borderRadius: 8,
        background: palette.surface,
        padding: '44px 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: 30,
      }}
    >
      <Track label="傳統">
        <Seg left={0} width={10} color={palette.faint} label="" />
        <Seg left={12} width={10} color={palette.faint} label="" />
        <Seg left={24} width={10} color={palette.faint} label="" />
        <Seg left={36} width={10} color={palette.faint} label="" />
        <Seg left={48} width={10} color={palette.faint} label="" />
        <Seg left={60} width={10} color={palette.faint} label="" />
        <Seg left={72} width={10} color={palette.faint} label="" />
        <Seg left={84} width={10} color={palette.faint} label="" />
      </Track>
      <Track label="現在">
        <Seg left={0} width={40} color={palette.good} label="公司 10h" />
        <Seg left={42} width={25} color={palette.blue} label="Lab 5h" />
        <Seg left={69} width={15} color={palette.pink} label="運動 2h" />
      </Track>
      <span style={{ fontSize: 22, color: palette.muted }}>
        同樣一週的時間，切得越細，落差感越重；切得夠粗，才留得住彈性。
      </span>
    </div>
    <Body color={palette.muted} maxWidth={1580}>
      <span style={{ display: 'block', marginTop: 32 }}>
        以週為單位，規劃每天預計分配的時間，以半小時為配置單位。
      </span>
    </Body>
    <Footer />
  </Pad>
);

// ═══════════ Page 7: 核心構想：把敏捷思維搬進個人時間管理 ═══════════
const Tag = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      border: `1px solid ${palette.border}`,
      borderRadius: 999,
      padding: '12px 22px',
      fontSize: 24,
      color: palette.muted,
      background: palette.surface,
    }}
  >
    {children}
  </div>
);

const AgileConcept: Page = () => (
  <Pad>
    <H mb={40}>核心構想：把敏捷思維搬進個人時間管理</H>

    <SectionLabel>初始設定・一次性</SectionLabel>
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' as const, marginBottom: 40 }}>
      <Tag>設定時間類別</Tag>
      <Tag>時區設定</Tag>
      <Tag>綁定行事曆</Tag>
      <Tag>綁定 To-Do List</Tag>
      <Tag>AI 規則設定</Tag>
    </div>

    <SectionLabel>每週循環</SectionLabel>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <MapRow left="Sprint" right="一週" />
      <MapRow
        left="Sprint Planning"
        right="週初分類，設定各類別時間預算；AI 根據歷史數據幫忙建議下一週怎麼排"
      />
      <MapRow left="執行" right="柳比楔夫式計時記錄" />
      <MapRow left="Sprint Retro" right="AI Retro，檢討預估與實際的落差，附上視覺化圖表分析" />
    </div>
    <Footer />
  </Pad>
);

// ═══════ Page 8: 更準確的說法：這是一個反過來駕馭我的系統 ═══════
const Harness: Page = () => (
  <Pad>
    <H mb={36}>更準確的說法：這是一個反過來駕馭我的系統</H>
    <Body maxWidth={1620}>
      我一開始寫這個系統，是想幫自己找一套能駕馭的時間表。做到後來我發現，真正在發揮作用的是 AI
      Retro 那一層：它記得我每一週實際的節奏，我又想用「應該做得到」的樂觀心態排計畫時，它會把上週的真實數據攤在我面前。
    </Body>
    <div
      style={{
        marginTop: 32,
        fontSize: 32,
        lineHeight: 1.7,
        color: palette.accent,
        fontWeight: 700,
        maxWidth: 1620,
      }}
    >
      Chronica 是一套只為我自己設計的 Harness，套在我自己身上，逼出更高的產出。就像 AI
      需要 harness 才能有更好的 performance，我也需要一套只屬於我的 harness。
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 44 }}>
      <HRow tag="一般的 AI harness">
        <HBox>人類設計者</HBox>
        <HArrow />
        <HBox flex={1.8}>規則、工具、記憶、檢查點</HBox>
        <HArrow />
        <HBox>AI</HBox>
      </HRow>
      <HRow tag="Chronica 反過來">
        <HBox>Chronica</HBox>
        <HArrow />
        <HBox flex={1.8}>每週重置、時間預算、AI Retro、記憶</HBox>
        <HArrow />
        <HBox strong>我自己</HBox>
      </HRow>
    </div>

    <div style={{ marginTop: 40, fontSize: 30, color: palette.text }}>
      這次，被框住、被檢查、被要求對齊真實數據的人，換成了
      <span style={{ color: palette.accent, fontWeight: 700 }}>我自己</span>。
    </div>
    <Footer />
  </Pad>
);

// ══════════════════════════ Page 9: 系統總覽 ═══════════════════════════════
const SystemOverview: Page = () => (
  <Pad>
    <H mb={56}>系統總覽</H>
    <div style={{ position: 'relative' as const, flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <StageBox title="Planning" text="把這週要忙的類型分類，設定各類別的時間預算。" />
        <span style={{ fontSize: 40, color: palette.faint }}>→</span>
        <StageBox title="Execution" text="柳比楔夫式計時，記錄實際發生的事，融合番茄鐘提醒。" />
        <span style={{ fontSize: 40, color: palette.faint }}>→</span>
        <StageBox title="AI Retro" text="比對預估與實際的落差，給下週的建議。" />
      </div>

      <svg
        width="100%"
        height="140"
        viewBox="0 0 1620 140"
        style={{ position: 'absolute', left: 0, top: 260, overflow: 'visible' as const }}
      >
        <path
          d="M 1379 0 L 1379 90 L 241 90 L 241 20"
          fill="none"
          stroke={palette.accent}
          strokeWidth={3}
          strokeDasharray="2 10"
          strokeLinecap="round"
        />
        <path d="M 231 20 L 241 0 L 251 20 Z" fill={palette.accent} />
        <text
          x={810}
          y={112}
          textAnchor="middle"
          fill={palette.accent}
          fontSize={24}
          fontFamily={mono}
        >
          AI Retro 的結論，回到下週的 Planning
        </text>
      </svg>
    </div>
    <Footer />
  </Pad>
);

// ══════════════ Page 10: Planning：週規劃看板（真實截圖＋標註） ══════════════
const PlanningBoard: Page = () => (
  <Pad>
    <H mb={40}>Planning：週規劃看板</H>
    <div style={{ display: 'flex', gap: 48, flex: 1, minHeight: 0 }}>
      <div style={{ position: 'relative' as const, width: 980, height: 516, flexShrink: 0 }}>
        <Shot src={planningDemo} alt="Chronica 週規劃看板" height={516} />
        <Callout x={353} y={77} label="上週各類別：實際對預期，一眼看差距" />
        <Callout x={218} y={151} label="行事曆事件自動帶進來，還能對應分類" />
        <Callout x={402} y={227} label="項目可以直接拖曳，調整順序或換一天" />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <FeatureRow>可複製上週行程，快速起手</FeatureRow>
        <FeatureRow>同步 Google 行事曆，直接顯示在版面上</FeatureRow>
        <FeatureRow>行事曆項目也能對應分類</FeatureRow>
        <FeatureRow>計時衝突時，自動切換到行事曆項目</FeatureRow>
        <FeatureRow>上方看得到上週每個類別的實際對預期</FeatureRow>
        <FeatureRow>可依週切換，並產生 AI Retro</FeatureRow>
        <FeatureRow>項目可拖曳調整順序</FeatureRow>
      </div>
    </div>
    <Body color={palette.muted} maxWidth={1620}>
      <span style={{ display: 'block', marginTop: 24 }}>
        每週開始前先分類、排好；行事曆事件結束，計時就自動停止，不用我自己處理。
      </span>
    </Body>
    <Footer />
  </Pad>
);

// ══════════════ Page 11: Execution：計時器 ══════════════
const ExecutionTimer: Page = () => (
  <Pad>
    <H mb={40}>Execution：計時器</H>
    <div style={{ display: 'flex', gap: 48, flex: 1, minHeight: 0 }}>
      <div style={{ width: 980, flexShrink: 0 }}>
        <Shot src={executionTimerImg} alt="Chronica 計時器頁面" height={516} />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <FeatureRow>今天排的行程直接列在下方，點一下開始計時</FeatureRow>
        <FeatureRow>設定預計時長，時間到了主動提醒，融合番茄鐘概念</FeatureRow>
        <FeatureRow>可以直接綁定 Microsoft To-Do 的項目</FeatureRow>
        <FeatureRow>綁定後會自動連到當天的 Entries 紀錄</FeatureRow>
      </div>
    </div>
    <Footer />
  </Pad>
);

// ══════════════ Page 12: Execution：Entries 執行紀錄 ══════════════
const ExecutionEntries: Page = () => (
  <Pad>
    <H mb={40}>Execution：Entries 執行紀錄</H>
    <div style={{ display: 'flex', gap: 48, flex: 1, minHeight: 0 }}>
      <div style={{ width: 980, flexShrink: 0 }}>
        <Shot src={executionEntriesImg} alt="Chronica Entries 執行紀錄頁面" height={516} />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <FeatureRow>忘記計時也能事後補登記</FeatureRow>
        <FeatureRow>補登記一樣能挑類別、綁 To-Do、寫備註</FeatureRow>
        <FeatureRow>一整天做了什麼、做了多久，一次看完</FeatureRow>
      </div>
    </div>
    <Body color={palette.accent} maxWidth={1620}>
      <span style={{ display: 'block', marginTop: 24, fontWeight: 700 }}>
        這些紀錄，之後都會變成餵給 AI 的 context。
      </span>
    </Body>
    <Footer />
  </Pad>
);

// ══════════════ Page 13: 連動 To-Do List 來整合系統 ══════════════
const ExecutionTasks: Page = () => (
  <Pad>
    <H mb={40}>連動 To-Do List 來整合系統</H>
    <div style={{ display: 'flex', gap: 48, flex: 1, minHeight: 0 }}>
      <div style={{ width: 980, flexShrink: 0 }}>
        <Shot src={executionTasksImg} alt="Chronica Tasks 任務時間成本頁面" height={516} />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <FeatureRow>綁定 Microsoft To-Do 之後，每個任務會累積總共花了多久、計時了幾回合</FeatureRow>
        <FeatureRow>在 Tasks 這頁直接打勾完成，狀態會同步回寫到 Microsoft To-Do</FeatureRow>
        <FeatureRow>不用切去 To-Do App 再勾一次，介面統一在這裡操作</FeatureRow>
      </div>
    </div>
    <Footer />
  </Pad>
);

// ══════════════ Page 14: Summary：一週的計畫對實際 ══════════════
const SummaryWeek: Page = () => (
  <Pad>
    <H mb={40}>Summary：一週的計畫對實際</H>
    <div style={{ flex: 1, minHeight: 0 }}>
      <Shot src={summaryWeekImg} alt="Chronica 週摘要，計畫對實際" height={620} />
    </div>
    <Body color={palette.muted} maxWidth={1620}>
      <span style={{ display: 'block', marginTop: 24 }}>
        這一週每個類別，預估要花多少時間、實際花了多少時間，差距一次看完。
      </span>
    </Body>
    <Footer />
  </Pad>
);

// ══════════════ Page 15: Summary：長期的平均落點 ══════════════
const SummaryAverage: Page = () => (
  <Pad>
    <H mb={40}>Summary：長期的平均落點</H>
    <div style={{ flex: 1, minHeight: 0 }}>
      <Shot src={summaryAverageImg} alt="Chronica 長期平均時間摘要" height={620} />
    </div>
    <Body color={palette.muted} maxWidth={1620}>
      <span style={{ display: 'block', marginTop: 24 }}>
        拉長時間看（一個月到一年），回測每個類別平均一週花多少時間，抓出真正的生產力落點。
      </span>
    </Body>
    <Footer />
  </Pad>
);

// ══════════════════════ Page 16: AI Retro：兩個情境 ══════════════════════════
const AiRetro: Page = () => (
  <Pad>
    <H mb={32}>AI Retro：兩個情境</H>
    <div style={{ width: 980 }}>
      <Shot src={aiRetroMock} alt="AI Retro 對話情境示意" height={549} />
    </div>
    <Body maxWidth={1620}>
      <span style={{ display: 'block', marginTop: 20, fontSize: 24, color: palette.faint }}>
        {''}
      </span>
      <span
        style={{
          display: 'block',
          marginTop: 16,
          fontSize: 30,
          lineHeight: 1.75,
          color: palette.accent,
          fontWeight: 700,
        }}
      >
        生產力用了一個多月持續往上，努力跟想像中的體感常常有落差，這才是真正卡住我的地方。
      </span>
    </Body>
    <Footer />
  </Pad>
);

// ══════════════════════ Page 17: 為什麼非做不可 ══════════════════════════════
const PromptBox = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      border: `1px dashed ${palette.border}`,
      borderRadius: 6,
      padding: '20px 28px',
      fontSize: 26,
      fontFamily: mono,
      color: palette.faint,
      lineHeight: 1.6,
    }}
  >
    {children}
  </div>
);

const WhyMustDo: Page = () => (
  <Pad>
    <H mb={48}>為什麼非做不可</H>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1620 }}>
      <PromptBox>〔什麼時候第一次在意這件事，具體的一個時間點或情境〕</PromptBox>
      <PromptBox>
        〔為了做這個，實際上犧牲了什麼，沒有就誠實留白，或寫「目前還在同時兼顧」〕
      </PromptBox>
      <PromptBox>〔如果永遠賺不到錢，還會不會做，這本來就是自己每天在用的工具〕</PromptBox>
    </div>
    <Body maxWidth={1600}>
      <span style={{ display: 'block', marginTop: 48, fontSize: 34, lineHeight: 1.7 }}>
        這套系統從一開始就是我自己每天要用的東西，就算沒有下一步，我也會繼續用、繼續改。
      </span>
    </Body>
    <Footer />
  </Pad>
);

// ══════════════════════════════ Page 18: 封底 ═══════════════════════════════
const Closing: Page = () => (
  <Pad pad="150px 150px">
    <div style={{ marginTop: 'auto' }}>
      <h1
        style={{
          fontFamily: 'var(--osd-font-display)',
          fontSize: 120,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          margin: 0,
        }}
      >
        Chronica
      </h1>
    </div>
    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <span style={{ fontSize: 30, color: palette.muted }}>chronica-yk.vercel.app</span>
      <span style={{ fontSize: 30, color: palette.muted }}>github.com/Yuankai619/Chronica</span>
      <span style={{ fontSize: 30, color: palette.text }}>劉元凱</span>
    </div>
  </Pad>
);

export const meta: SlideMeta = {
  title: 'Chronica ・ 交大 Pitch 黑客松 2026 Fall',
  createdAt: '2026-08-08T10:03:29.698Z',
};

export default [
  Cover,
  Relationship,
  SelfIntro,
  Problem,
  Turn,
  Insight,
  AgileConcept,
  Harness,
  SystemOverview,
  PlanningBoard,
  ExecutionTimer,
  ExecutionEntries,
  ExecutionTasks,
  SummaryWeek,
  SummaryAverage,
  AiRetro,
] satisfies Page[];
