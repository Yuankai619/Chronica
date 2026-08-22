import type { DesignSystem, Page, SlideMeta } from '@open-slide/core';
import { useSlidePageNumber } from '@open-slide/core';

import introPic from '@assets/intro_pic.jpg';

// ─── Webfont: injected once, keyed to this slide (see webfonts.md) ─────────
const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+TC:wght@400;500;700&display=swap';
const FONT_LINK_ID = 'osd-webfont-chronica-final';
if (typeof document !== 'undefined' && !document.getElementById(FONT_LINK_ID)) {
  const link = document.createElement('link');
  link.id = FONT_LINK_ID;
  link.rel = 'stylesheet';
  link.href = FONT_HREF;
  document.head.appendChild(link);
}

// ─── Panel-tweakable design tokens (theme: indigo-brief) ──────────────────
export const design: DesignSystem = {
  palette: { bg: '#FAFBFC', text: '#1B2A4A', accent: '#3D6BE5' },
  fonts: {
    display:
      'Inter, "Noto Sans TC", -apple-system, BlinkMacSystemFont, "PingFang TC", system-ui, sans-serif',
    body: 'Inter, "Noto Sans TC", -apple-system, BlinkMacSystemFont, "PingFang TC", system-ui, sans-serif',
  },
  typeScale: { hero: 132, body: 34 },
  radius: 6,
};

const c = {
  bg: design.palette.bg,
  text: design.palette.text,
  accent: design.palette.accent,
  surface: '#FFFFFF',
  surfaceAlt: '#F1F4F8',
  muted: '#6B7789',
  faint: '#8A94A6',
  line: '#E6EAF0',
  lineStrong: '#D8DEE8',
  positive: '#127C71',
};

const mono = 'ui-monospace, "SF Mono", "Cascadia Mono", Consolas, monospace';

const styles = `
@keyframes ibFadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
.ib-rise { animation: ibFadeUp 480ms cubic-bezier(0.22, 0.61, 0.36, 1) both; }
`;

// ═══════════════════════════ Theme components ═══════════════════════════════
const Title = ({ children }: { children: React.ReactNode }) => (
  <h1
    style={{
      fontSize: 'var(--osd-size-hero)',
      fontWeight: 700,
      lineHeight: 1.15,
      letterSpacing: '-0.01em',
      margin: 0,
      color: 'var(--osd-text)',
    }}
  >
    {children}
  </h1>
);

const Heading = ({ children }: { children: React.ReactNode }) => (
  <h2
    style={{
      fontSize: 60,
      fontWeight: 700,
      lineHeight: 1.3,
      margin: 0,
      color: 'var(--osd-text)',
    }}
  >
    {children}
  </h2>
);

const Lede = ({
  children,
  size = 34,
}: {
  children: React.ReactNode;
  size?: number;
}) => (
  <p
    style={{
      fontSize: size,
      lineHeight: 1.85,
      color: c.muted,
      margin: '24px 0 0',
      maxWidth: 1180,
    }}
  >
    {children}
  </p>
);

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
        borderTop: `1px solid ${c.line}`,
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 22,
        color: c.faint,
      }}
    >
      <span>Chronica</span>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>
        {String(current).padStart(2, '0')} / {String(total).padStart(2, '0')}
      </span>
    </div>
  );
};

const Tags = ({ items }: { items: string[] }) => (
  <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
    {items.map((t) => (
      <span
        key={t}
        style={{
          fontSize: 24,
          color: c.text,
          paddingBottom: 6,
          borderBottom: `1px solid ${c.lineStrong}`,
        }}
      >
        {t}
      </span>
    ))}
  </div>
);

const Shell = ({
  children,
  center = false,
}: {
  children: React.ReactNode;
  center?: boolean;
}) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      position: 'relative',
      background: 'var(--osd-bg)',
      color: 'var(--osd-text)',
      fontFamily: 'var(--osd-font-body)',
    }}
  >
    <style>{styles}</style>
    <div
      className="ib-rise"
      style={{
        position: 'absolute',
        inset: 0,
        padding: '116px 140px 132px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: center ? 'center' : 'flex-start',
      }}
    >
      {children}
    </div>
    <Footer />
  </div>
);

// ═══════════════════════════ Page 1 — 封面 ══════════════════════════════════
const SpecRow = ({ label, value }: { label: string; value: string }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'baseline',
      gap: 48,
      padding: '22px 0',
      borderTop: `1px solid ${c.line}`,
    }}
  >
    <span style={{ width: 120, flexShrink: 0, fontSize: 24, color: c.faint }}>{label}</span>
    <span style={{ fontSize: 30, color: c.text }}>{value}</span>
  </div>
);

const Cover: Page = () => (
  <Shell>
    <div style={{ marginTop: 'auto' }}>
      <Title>Chronica</Title>
      <p
        style={{
          fontSize: 44,
          fontWeight: 500,
          lineHeight: 1.45,
          color: c.muted,
          margin: '32px 0 0',
          maxWidth: 1300,
        }}
      >{''}</p>
    </div>

    <div style={{ marginTop: 'auto', paddingTop: 64 }}>
      <SpecRow label="隊名" value="Chronica" />
      <SpecRow label="主題" value="用時間統計法與 AI，更高效地管理時間" />
      <SpecRow label="成員" value="劉元楷　資訊科學與工程　升碩一" />
      <div style={{ marginTop: 28, fontSize: 24, fontFamily: mono, color: c.faint }}>https://chronica-yk.vercel.app</div>
    </div>
  </Shell>
);

// ═══════════════════════════ Page 2 — 我是誰 ════════════════════════════════
const WhoIAm: Page = () => (
  <Shell>
    <div style={{ display: 'flex', gap: 96, flex: 1, alignItems: 'center' }}>
      <div style={{ flex: 1 }}>
        <Heading>我同時在做三件事</Heading>
        <div style={{ marginTop: 56, display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            ['Corvo AI', '共同創辦人'],
            ['陽明交大資工所', '升碩一'],
            ['LINE Taiwan', 'SWE 實習生'],
          ].map(([org, role]) => (
            <div
              key={org}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 28,
                padding: '24px 0',
                borderTop: `1px solid ${c.line}`,
              }}
            >
              <span style={{ fontSize: 36, fontWeight: 600 }}>{org}</span>
              <span style={{ fontSize: 26, color: c.muted }}>{role}</span>
            </div>
          ))}
        </div>
        <p
          style={{
            fontSize: 32,
            lineHeight: 1.85,
            color: c.muted,
            margin: '48px 0 0',
            maxWidth: 780,
          }}
        >
          三張時間表疊在一起之後，時間管理對我來說從一個習慣變成一個必要條件。
        </p>
      </div>
      <div
        style={{
          width: 520,
          height: 686,
          flexShrink: 0,
          borderRadius: 6,
          overflow: 'hidden',
          border: `1px solid ${c.line}`,
        }}
      >
        <img
          src={introPic}
          alt="劉元楷在台上分享"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    </div>
  </Shell>
);

// ═══════════════════════════ Page 3 — 問題 ══════════════════════════════════
const Problem: Page = () => (
  <Shell>
    <Heading>排好的時間表，幾乎沒有一天照著跑</Heading>
    <Lede>我試過把每天排到幾點做什麼。排程方式本身撐不住臨時插進來的事。</Lede>
    <div style={{ marginTop: 48, display: 'flex', justifyContent: 'center' }}>
      <svg viewBox="0 0 1560 440" width={1560} height={440} xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="ct-title ct-desc">
      <title id="ct-title">同一天：事前排定與實際發生</title>
      <desc id="ct-desc">上排是事前排好的四個時段，下排是同一天實際發生的紀錄。上午一件計畫外的事插進來之後，後面的每一段都往後推，晚上的論文時間只剩一半。</desc>
      <rect width="1560" height="440" fill="#FAFBFC"/>
      <line x1="240" y1="72" x2="240" y2="300" stroke="#E6EAF0" strokeWidth="1"/>
      <text x="240" y="56" fill="#8A94A6" fontSize="15" textAnchor="middle" fontFamily="'Geist Mono', ui-monospace, monospace">08</text>
      <line x1="400" y1="72" x2="400" y2="300" stroke="#E6EAF0" strokeWidth="1"/>
      <text x="400" y="56" fill="#8A94A6" fontSize="15" textAnchor="middle" fontFamily="'Geist Mono', ui-monospace, monospace">10</text>
      <line x1="560" y1="72" x2="560" y2="300" stroke="#E6EAF0" strokeWidth="1"/>
      <text x="560" y="56" fill="#8A94A6" fontSize="15" textAnchor="middle" fontFamily="'Geist Mono', ui-monospace, monospace">12</text>
      <line x1="720" y1="72" x2="720" y2="300" stroke="#E6EAF0" strokeWidth="1"/>
      <text x="720" y="56" fill="#8A94A6" fontSize="15" textAnchor="middle" fontFamily="'Geist Mono', ui-monospace, monospace">14</text>
      <line x1="880" y1="72" x2="880" y2="300" stroke="#E6EAF0" strokeWidth="1"/>
      <text x="880" y="56" fill="#8A94A6" fontSize="15" textAnchor="middle" fontFamily="'Geist Mono', ui-monospace, monospace">16</text>
      <line x1="1040" y1="72" x2="1040" y2="300" stroke="#E6EAF0" strokeWidth="1"/>
      <text x="1040" y="56" fill="#8A94A6" fontSize="15" textAnchor="middle" fontFamily="'Geist Mono', ui-monospace, monospace">18</text>
      <line x1="1200" y1="72" x2="1200" y2="300" stroke="#E6EAF0" strokeWidth="1"/>
      <text x="1200" y="56" fill="#8A94A6" fontSize="15" textAnchor="middle" fontFamily="'Geist Mono', ui-monospace, monospace">20</text>
      <line x1="1360" y1="72" x2="1360" y2="300" stroke="#E6EAF0" strokeWidth="1"/>
      <text x="1360" y="56" fill="#8A94A6" fontSize="15" textAnchor="middle" fontFamily="'Geist Mono', ui-monospace, monospace">22</text>
      <line x1="1520" y1="72" x2="1520" y2="300" stroke="#E6EAF0" strokeWidth="1"/>
      <text x="1520" y="56" fill="#8A94A6" fontSize="15" textAnchor="middle" fontFamily="'Geist Mono', ui-monospace, monospace">24</text>
      <text x="200" y="128" fill="#6B7789" fontSize="22" fontWeight="600" textAnchor="end" fontFamily="Inter, 'Noto Sans TC', sans-serif">計畫</text>
      <rect x="320" y="88" width="160" height="64" rx="6" fill="#F1F4F8" stroke="#D8DEE8" strokeWidth="1"/>
      <text x="400.0" y="128" fill="#6B7789" fontSize="19" fontWeight="500" textAnchor="middle" fontFamily="Inter, 'Noto Sans TC', sans-serif">公司</text>
      <rect x="480" y="88" width="160" height="64" rx="6" fill="#F1F4F8" stroke="#D8DEE8" strokeWidth="1"/>
      <text x="560.0" y="128" fill="#6B7789" fontSize="19" fontWeight="500" textAnchor="middle" fontFamily="Inter, 'Noto Sans TC', sans-serif">學校</text>
      <rect x="720" y="88" width="320" height="64" rx="6" fill="#F1F4F8" stroke="#D8DEE8" strokeWidth="1"/>
      <text x="880.0" y="128" fill="#6B7789" fontSize="19" fontWeight="500" textAnchor="middle" fontFamily="Inter, 'Noto Sans TC', sans-serif">實習</text>
      <rect x="1200" y="88" width="160" height="64" rx="6" fill="#F1F4F8" stroke="#D8DEE8" strokeWidth="1"/>
      <text x="1280.0" y="128" fill="#6B7789" fontSize="19" fontWeight="500" textAnchor="middle" fontFamily="Inter, 'Noto Sans TC', sans-serif">論文</text>
      <text x="200" y="240" fill="#1B2A4A" fontSize="22" fontWeight="600" textAnchor="end" fontFamily="Inter, 'Noto Sans TC', sans-serif">實際</text>
      <rect x="320" y="200" width="80" height="64" rx="6" fill="rgba(27,42,74,0.05)" stroke="#6B7789" strokeWidth="1"/>
      <text x="360.0" y="240" fill="#1B2A4A" fontSize="19" fontWeight="500" textAnchor="middle" fontFamily="Inter, 'Noto Sans TC', sans-serif">公司</text>
      <rect x="400" y="200" width="120.0" height="64" rx="6" fill="rgba(61,107,229,0.08)" stroke="#3D6BE5" strokeWidth="1.2"/>
      <text x="460.0" y="240" fill="#3D6BE5" fontSize="19" fontWeight="600" textAnchor="middle" fontFamily="Inter, 'Noto Sans TC', sans-serif">臨時的事</text>
      <rect x="520.0" y="200" width="120.0" height="64" rx="6" fill="rgba(27,42,74,0.05)" stroke="#6B7789" strokeWidth="1"/>
      <text x="580.0" y="240" fill="#1B2A4A" fontSize="19" fontWeight="500" textAnchor="middle" fontFamily="Inter, 'Noto Sans TC', sans-serif">學校</text>
      <rect x="720" y="200" width="360.0" height="64" rx="6" fill="rgba(27,42,74,0.05)" stroke="#6B7789" strokeWidth="1"/>
      <text x="900.0" y="240" fill="#1B2A4A" fontSize="19" fontWeight="500" textAnchor="middle" fontFamily="Inter, 'Noto Sans TC', sans-serif">實習</text>
      <rect x="1280" y="200" width="80" height="64" rx="6" fill="rgba(27,42,74,0.05)" stroke="#6B7789" strokeWidth="1"/>
      <text x="1320.0" y="240" fill="#1B2A4A" fontSize="19" fontWeight="500" textAnchor="middle" fontFamily="Inter, 'Noto Sans TC', sans-serif">論文</text>
      <line x1="460.0" y1="264" x2="460.0" y2="316" stroke="#3D6BE5" strokeWidth="1" strokeDasharray="4 3"/>
      <text x="460.0" y="340" fill="#3D6BE5" fontSize="18" fontWeight="500" textAnchor="middle" fontFamily="Inter, 'Noto Sans TC', sans-serif">一件插進來的事，後面每一段都往後推</text>
      <line x1="1200" y1="152" x2="1200" y2="200" stroke="#D8DEE8" strokeWidth="1" strokeDasharray="4 3"/>
      <text x="1384" y="240" fill="#6B7789" fontSize="17" textAnchor="start" fontFamily="Inter, 'Noto Sans TC', sans-serif">少了一小時</text>
      <line x1="40" y1="376" x2="1520" y2="376" stroke="#E6EAF0" strokeWidth="1"/>
      <rect x="40" y="396" width="18" height="14" rx="3" fill="#F1F4F8" stroke="#D8DEE8"/>
      <text x="68" y="409" fill="#6B7789" fontSize="16" textAnchor="start" fontFamily="Inter, 'Noto Sans TC', sans-serif">事前排定</text>
      <rect x="172" y="396" width="18" height="14" rx="3" fill="rgba(27,42,74,0.05)" stroke="#6B7789"/>
      <text x="200" y="409" fill="#6B7789" fontSize="16" textAnchor="start" fontFamily="Inter, 'Noto Sans TC', sans-serif">實際發生</text>
      <rect x="304" y="396" width="18" height="14" rx="3" fill="rgba(61,107,229,0.08)" stroke="#3D6BE5"/>
      <text x="332" y="409" fill="#6B7789" fontSize="16" textAnchor="start" fontFamily="Inter, 'Noto Sans TC', sans-serif">計畫外的事</text>
      </svg>
    </div>
  </Shell>
);

// ═══════════════════════════ Page 4 — 顆粒度 ════════════════════════════════
const Granularity: Page = () => (
  <Shell>
    <div style={{ display: 'flex', gap: 64, flex: 1, alignItems: 'center' }}>
      <div style={{ width: 460, flexShrink: 0 }}>
        <Heading>問題出在顆粒度</Heading>
        <p style={{ fontSize: 30, lineHeight: 1.85, color: c.muted, margin: '28px 0 0' }}>
          柳比歇夫的做法給了我答案：開始做一件事就按下計時，結束再按一次，時間的去向由紀錄決定。
        </p>
        <p style={{ fontSize: 30, lineHeight: 1.85, color: c.text, margin: '28px 0 0' }}>
          規劃要粗到一週，記錄要細到每一段。
        </p>
      </div>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <svg viewBox="0 0 1096 672" width={1096} height={672} xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="cm-title cm-desc">
        <title id="cm-title">規劃顆粒度與記錄顆粒度的四種組合</title>
        <desc id="cm-desc">橫軸是規劃的顆粒度，從一週到每個時段；縱軸是記錄的顆粒度，從不記錄到每一段都記。Chronica 落在規劃到週、每段都記的左上角。</desc>
        <rect width="1096" height="672" fill="#FAFBFC"/>
        <defs>
        <marker id="cm-tip" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#1B2A4A"/></marker>
        </defs>
        <line x1="132" y1="312" x2="964" y2="312" stroke="#1B2A4A" strokeWidth="1.2" markerStart="url(#cm-tip)" markerEnd="url(#cm-tip)"/>
        <line x1="548" y1="36" x2="548" y2="588" stroke="#1B2A4A" strokeWidth="1.2" markerStart="url(#cm-tip)" markerEnd="url(#cm-tip)"/>
        <text x="120" y="318" fill="#1B2A4A" fontSize="17" fontWeight="500" textAnchor="end" fontFamily="Inter, 'Noto Sans TC', sans-serif">規劃到週</text>
        <text x="976" y="318" fill="#1B2A4A" fontSize="17" fontWeight="500" textAnchor="start" fontFamily="Inter, 'Noto Sans TC', sans-serif">規劃到時段</text>
        <text x="548" y="22" fill="#1B2A4A" fontSize="17" fontWeight="500" textAnchor="middle" fontFamily="Inter, 'Noto Sans TC', sans-serif">每一段都記</text>
        <text x="548" y="614" fill="#1B2A4A" fontSize="17" fontWeight="500" textAnchor="middle" fontFamily="Inter, 'Noto Sans TC', sans-serif">不記錄</text>
        <rect x="164" y="68" width="340" height="200" rx="8" fill="rgba(61,107,229,0.08)" stroke="#3D6BE5" strokeWidth="1.2"/>
        <text x="192" y="132" fill="#3D6BE5" fontSize="28" fontWeight="600" textAnchor="start" fontFamily="Inter, 'Noto Sans TC', sans-serif">Chronica</text>
        <text x="192" y="176" fill="#6B7789" fontSize="18" textAnchor="start" fontFamily="Inter, 'Noto Sans TC', sans-serif">週預算配上完整紀錄</text>
        <text x="192" y="208" fill="#6B7789" fontSize="18" textAnchor="start" fontFamily="Inter, 'Noto Sans TC', sans-serif">下一週的預算來自上週實際</text>
        <rect x="592" y="68" width="340" height="200" rx="8" fill="rgba(27,42,74,0.04)" stroke="rgba(27,42,74,0.28)" strokeWidth="1"/>
        <text x="620" y="132" fill="#1B2A4A" fontSize="28" fontWeight="600" textAnchor="start" fontFamily="Inter, 'Noto Sans TC', sans-serif">番茄鐘</text>
        <text x="620" y="176" fill="#6B7789" fontSize="18" textAnchor="start" fontFamily="Inter, 'Noto Sans TC', sans-serif">專注切片有記到</text>
        <text x="620" y="208" fill="#6B7789" fontSize="18" textAnchor="start" fontFamily="Inter, 'Noto Sans TC', sans-serif">整週的比例還是看不出來</text>
        <rect x="592" y="356" width="340" height="200" rx="8" fill="rgba(27,42,74,0.04)" stroke="rgba(27,42,74,0.28)" strokeWidth="1"/>
        <text x="620" y="420" fill="#1B2A4A" fontSize="28" fontWeight="600" textAnchor="start" fontFamily="Inter, 'Noto Sans TC', sans-serif">行事曆排程</text>
        <text x="620" y="464" fill="#6B7789" fontSize="18" textAnchor="start" fontFamily="Inter, 'Noto Sans TC', sans-serif">排到幾點幾分</text>
        <text x="620" y="496" fill="#6B7789" fontSize="18" textAnchor="start" fontFamily="Inter, 'Noto Sans TC', sans-serif">事後沒有留下任何紀錄</text>
        <rect x="164" y="356" width="340" height="200" rx="8" fill="rgba(27,42,74,0.04)" stroke="rgba(27,42,74,0.28)" strokeWidth="1"/>
        <text x="192" y="420" fill="#1B2A4A" fontSize="28" fontWeight="600" textAnchor="start" fontFamily="Inter, 'Noto Sans TC', sans-serif">憑感覺</text>
        <text x="192" y="464" fill="#6B7789" fontSize="18" textAnchor="start" fontFamily="Inter, 'Noto Sans TC', sans-serif">不排也不記</text>
        <text x="192" y="496" fill="#6B7789" fontSize="18" textAnchor="start" fontFamily="Inter, 'Noto Sans TC', sans-serif">時間去哪說不出來</text>
        <line x1="40" y1="624" x2="1056" y2="624" stroke="#E6EAF0" strokeWidth="1"/>
        <rect x="40" y="642" width="18" height="14" rx="3" fill="rgba(61,107,229,0.08)" stroke="#3D6BE5"/>
        <text x="68" y="655" fill="#6B7789" fontSize="16" textAnchor="start" fontFamily="Inter, 'Noto Sans TC', sans-serif">我現在的做法</text>
        <rect x="204" y="642" width="18" height="14" rx="3" fill="rgba(27,42,74,0.04)" stroke="rgba(27,42,74,0.28)"/>
        <text x="232" y="655" fill="#6B7789" fontSize="16" textAnchor="start" fontFamily="Inter, 'Noto Sans TC', sans-serif">我試過或原本的狀態</text>
        </svg>
      </div>
    </div>
  </Shell>
);

// ═══════════════════════════ Page 5 — 一週循環 ══════════════════════════════
const SprintLoop: Page = () => (
  <Shell>
    <div style={{ display: 'flex', gap: 80, flex: 1, alignItems: 'center' }}>
      <div style={{ flex: 1 }}>
        <Heading>一週就是一個 Sprint</Heading>
        <p style={{ fontSize: 30, lineHeight: 1.85, color: c.muted, margin: '28px 0 0' }}>
          週初把這週要忙的事分類，替每個類別編一份時間預算；週間只做一件事，就是按下計時；
          週末讓結算結果告訴我哪裡差最多。
        </p>
        <div style={{ marginTop: 44 }}>
          <Tags items={['不排幾點幾分', '每週結算一次']} />
        </div>
      </div>
      <div style={{ flexShrink: 0 }}><svg viewBox="0 0 760 652" width={760} height={652} xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="cl-title cl-desc">
                                     <title id="cl-title">Chronica 的一週循環</title>
                                     <desc id="cl-desc">五個站點順時針循環：週初分類、設定時間預算、計時記錄、週結算對照、AI Retro 對談，最後回到週初分類。每一站都把結果寫回中央的長期記憶。</desc>
                                     <defs>
                                     <marker id="cl-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#6B7789"/></marker>
                                     <marker id="cl-arrow-soft" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#8A94A6"/></marker>
                                     </defs>
                                     <rect width="760" height="652" fill="#FAFBFC"/>
                                     <path d="M468 89.864 A252 252 0 0 1 606.198 214.922" fill="none" stroke="#6B7789" strokeWidth="1.2" markerEnd="url(#cl-arrow)"/>
                                     <path d="M628.475 284 A252 252 0 0 1 566.829 495.112" fill="none" stroke="#6B7789" strokeWidth="1.2" markerEnd="url(#cl-arrow)"/>
                                     <path d="M462.825 564 A252 252 0 0 1 298.309 564.392" fill="none" stroke="#6B7789" strokeWidth="1.2" markerEnd="url(#cl-arrow)"/>
                                     <path d="M193.978 496 A252 252 0 0 1 131.327 285.184" fill="none" stroke="#6B7789" strokeWidth="1.2" markerEnd="url(#cl-arrow)"/>
                                     <path d="M153.275 216 A252 252 0 0 1 290.877 90.286" fill="none" stroke="#6B7789" strokeWidth="1.2" markerEnd="url(#cl-arrow)"/>
                                     <path d="M380 108 L380 272" fill="none" stroke="#8A94A6" strokeWidth="1" strokeDasharray="5 4" markerEnd="url(#cl-arrow-soft)"/>
                                     <path d="M531.666 276.721 L483.706 292.304" fill="none" stroke="#8A94A6" strokeWidth="1" strokeDasharray="5 4" markerEnd="url(#cl-arrow-soft)"/>
                                     <path d="M503.419 495.872 L418.401 378.854" fill="none" stroke="#8A94A6" strokeWidth="1" strokeDasharray="5 4" markerEnd="url(#cl-arrow-soft)"/>
                                     <path d="M256.581 495.872 L341.599 378.854" fill="none" stroke="#8A94A6" strokeWidth="1" strokeDasharray="5 4" markerEnd="url(#cl-arrow-soft)"/>
                                     <path d="M228.334 276.721 L276.294 292.304" fill="none" stroke="#8A94A6" strokeWidth="1" strokeDasharray="5 4" markerEnd="url(#cl-arrow-soft)"/>
                                     <rect x="403.876" y="441.646" width="72" height="22" rx="4" fill="#FAFBFC"/>
                                     <text x="439.876" y="457.646" fill="#8A94A6" fontSize="14" fontWeight="500" textAnchor="middle" fontFamily="Inter, 'Noto Sans TC', sans-serif">實際時數</text>
                                     <rect x="242.055" y="411.081" width="72" height="22" rx="4" fill="#FAFBFC"/>
                                     <text x="278.055" y="427.081" fill="#8A94A6" fontSize="14" fontWeight="500" textAnchor="middle" fontFamily="Inter, 'Noto Sans TC', sans-serif">計畫落差</text>
                                     <rect x="292" y="40" width="176" height="68" rx="6" fill="#FAFBFC"/>
                                     <rect x="292" y="40" width="176" height="68" rx="6" fill="#FAFBFC" stroke="#1B2A4A" strokeWidth="1"/>
                                     <text x="380" y="82" fill="#1B2A4A" fontSize="22" fontWeight="600" textAnchor="middle" fontFamily="Inter, 'Noto Sans TC', sans-serif">週初分類</text>
                                     <rect x="532" y="216" width="176" height="68" rx="6" fill="#FAFBFC"/>
                                     <rect x="532" y="216" width="176" height="68" rx="6" fill="#FAFBFC" stroke="#1B2A4A" strokeWidth="1"/>
                                     <text x="620" y="258" fill="#1B2A4A" fontSize="22" fontWeight="600" textAnchor="middle" fontFamily="Inter, 'Noto Sans TC', sans-serif">設定時間預算</text>
                                     <rect x="440" y="496" width="176" height="68" rx="6" fill="#FAFBFC"/>
                                     <rect x="440" y="496" width="176" height="68" rx="6" fill="#FAFBFC" stroke="#1B2A4A" strokeWidth="1"/>
                                     <text x="528" y="538" fill="#1B2A4A" fontSize="22" fontWeight="600" textAnchor="middle" fontFamily="Inter, 'Noto Sans TC', sans-serif">計時記錄</text>
                                     <rect x="144" y="496" width="176" height="68" rx="6" fill="#FAFBFC"/>
                                     <rect x="144" y="496" width="176" height="68" rx="6" fill="#FAFBFC" stroke="#1B2A4A" strokeWidth="1"/>
                                     <text x="232" y="538" fill="#1B2A4A" fontSize="22" fontWeight="600" textAnchor="middle" fontFamily="Inter, 'Noto Sans TC', sans-serif">週結算對照</text>
                                     <rect x="52" y="216" width="176" height="68" rx="6" fill="#FAFBFC"/>
                                     <rect x="52" y="216" width="176" height="68" rx="6" fill="rgba(61,107,229,0.08)" stroke="#3D6BE5" strokeWidth="1.2"/>
                                     <text x="140" y="258" fill="#3D6BE5" fontSize="22" fontWeight="600" textAnchor="middle" fontFamily="Inter, 'Noto Sans TC', sans-serif">AI Retro 對談</text>
                                     <rect x="282" y="278" width="196" height="96" rx="8" fill="#1B2A4A"/>
                                     <text x="380" y="322" fill="#FAFBFC" fontSize="24" fontWeight="600" textAnchor="middle" fontFamily="Inter, 'Noto Sans TC', sans-serif">長期記憶</text>
                                     <text x="380" y="354" fill="#FAFBFC" opacity="0.72" fontSize="17" textAnchor="middle" fontFamily="Inter, 'Noto Sans TC', sans-serif">我的真實速度</text>
                                     </svg></div>
    </div>
  </Shell>
);

// ═══════════════════════════ Page 6 — AI Retro ══════════════════════════════
const AiRetro: Page = () => (
  <Shell>
    <Heading>AI 拿我自己的數字回答我</Heading>
    <Lede size={28}>每週 Retro 問出來的東西會變成它的長期記憶，下一週規劃時直接用來校準我的時間規劃。</Lede>
    <div style={{ marginTop: 40, display: 'flex', justifyContent: 'center' }}>
      <svg viewBox="0 0 1472 608" width={1472} height={608} xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="cs-title cs-desc">
      <title id="cs-title">AI 用我的歷史速度擋掉一次低估</title>
      <desc id="cs-desc">我提出三小時的預算，Agent 查出我過去四次平均花七點五小時，提醒我改預算；我確認之後，它才寫入下週計畫，並把這個低估模式存進長期記憶。</desc>
      <defs>
      <marker id="cs-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#6B7789"/></marker>
      <marker id="cs-arrow-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#3D6BE5"/></marker>
      <marker id="cs-arrow-open" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polyline points="0 0, 8 3, 0 6" fill="none" stroke="#6B7789" strokeWidth="1.2"/></marker>
      </defs>
      <rect width="1472" height="608" fill="#FAFBFC"/>
      <rect x="168" y="348" width="1164" height="156" rx="4" fill="rgba(27,42,74,0.02)" stroke="rgba(27,42,74,0.22)" strokeWidth="1"/>
      <rect x="168" y="348" width="52" height="22" rx="2" fill="#FAFBFC" stroke="rgba(27,42,74,0.22)" strokeWidth="1"/>
      <text x="194" y="364" fill="#6B7789" fontSize="12" textAnchor="middle" fontFamily="'Geist Mono', ui-monospace, monospace" letterSpacing="0.12em">OPT</text>
      <text x="234" y="365" fill="#6B7789" fontSize="15" textAnchor="start" fontFamily="Inter, 'Noto Sans TC', sans-serif">我確認之後才寫入</text>
      <line x1="180" y1="104" x2="180" y2="520" stroke="#D8DEE8" strokeWidth="1" strokeDasharray="5 5"/>
      <line x1="560" y1="104" x2="560" y2="520" stroke="#D8DEE8" strokeWidth="1" strokeDasharray="5 5"/>
      <line x1="940" y1="104" x2="940" y2="520" stroke="#D8DEE8" strokeWidth="1" strokeDasharray="5 5"/>
      <line x1="1320" y1="104" x2="1320" y2="520" stroke="#D8DEE8" strokeWidth="1" strokeDasharray="5 5"/>
      <rect x="556" y="156" width="8" height="348" fill="rgba(27,42,74,0.05)" stroke="#6B7789" strokeWidth="0.8"/>
      <rect x="936" y="208" width="8" height="52" fill="rgba(27,42,74,0.05)" stroke="#6B7789" strokeWidth="0.8"/>
      <line x1="184" y1="156" x2="556" y2="156" stroke="#6B7789" strokeWidth="1.2" markerEnd="url(#cs-arrow)"/>
      <rect x="252.8" y="128" width="234.4" height="22" rx="4" fill="#FAFBFC"/>
      <text x="370.0" y="144" fill="#1B2A4A" fontSize="16" textAnchor="middle" fontFamily="Inter, 'Noto Sans TC', sans-serif">/plan　Demo 準備排 3 小時</text>
      <line x1="564" y1="208" x2="936" y2="208" stroke="#6B7789" strokeWidth="1.2" markerEnd="url(#cs-arrow)"/>
      <rect x="658.0" y="180" width="184.0" height="22" rx="4" fill="#FAFBFC"/>
      <text x="750.0" y="196" fill="#1B2A4A" fontSize="16" textAnchor="middle" fontFamily="Inter, 'Noto Sans TC', sans-serif">查這類任務的實際速度</text>
      <line x1="936" y1="260" x2="564" y2="260" stroke="#6B7789" strokeWidth="1.2" strokeDasharray="5 4" markerEnd="url(#cs-arrow)"/>
      <rect x="654.8" y="232" width="190.4" height="22" rx="4" fill="#FAFBFC"/>
      <text x="750.0" y="248" fill="#1B2A4A" fontSize="16" textAnchor="middle" fontFamily="Inter, 'Noto Sans TC', sans-serif">前 4 次平均 7.5 小時</text>
      <line x1="556" y1="312" x2="184" y2="312" stroke="#3D6BE5" strokeWidth="1.2" markerEnd="url(#cs-arrow-accent)"/>
      <rect x="256.0" y="284" width="228.0" height="22" rx="4" fill="#FAFBFC"/>
      <text x="370.0" y="300" fill="#3D6BE5" fontSize="16" fontWeight="600" textAnchor="middle" fontFamily="Inter, 'Noto Sans TC', sans-serif">3 小時不夠，建議排 7 小時</text>
      <line x1="184" y1="388" x2="556" y2="388" stroke="#6B7789" strokeWidth="1.2" markerEnd="url(#cs-arrow)"/>
      <rect x="288.8" y="360" width="162.4" height="22" rx="4" fill="#FAFBFC"/>
      <text x="370.0" y="376" fill="#1B2A4A" fontSize="16" textAnchor="middle" fontFamily="Inter, 'Noto Sans TC', sans-serif">確認，改成 7 小時</text>
      <line x1="564" y1="440" x2="1316" y2="440" stroke="#6B7789" strokeWidth="1.2" strokeDasharray="5 4" markerEnd="url(#cs-arrow-open)"/>
      <rect x="864.0" y="412" width="152.0" height="22" rx="4" fill="#FAFBFC"/>
      <text x="940.0" y="428" fill="#1B2A4A" fontSize="16" textAnchor="middle" fontFamily="Inter, 'Noto Sans TC', sans-serif">記下這個低估模式</text>
      <line x1="556" y1="484" x2="184" y2="484" stroke="#6B7789" strokeWidth="1.2" strokeDasharray="5 4" markerEnd="url(#cs-arrow)"/>
      <rect x="302.0" y="456" width="136.0" height="22" rx="4" fill="#FAFBFC"/>
      <text x="370.0" y="472" fill="#1B2A4A" fontSize="16" textAnchor="middle" fontFamily="Inter, 'Noto Sans TC', sans-serif">下週計畫已寫入</text>
      <rect x="70.0" y="40" width="220" height="64" rx="6" fill="#FFFFFF" stroke="#1B2A4A" strokeWidth="1"/>
      <text x="180" y="80" fill="#1B2A4A" fontSize="20" fontWeight="600" textAnchor="middle" fontFamily="Inter, 'Noto Sans TC', sans-serif">我</text>
      <rect x="450.0" y="40" width="220" height="64" rx="6" fill="rgba(61,107,229,0.08)" stroke="#3D6BE5" strokeWidth="1.2"/>
      <text x="560" y="80" fill="#3D6BE5" fontSize="20" fontWeight="600" textAnchor="middle" fontFamily="Inter, 'Noto Sans TC', sans-serif">Chronica Agent</text>
      <rect x="830.0" y="40" width="220" height="64" rx="6" fill="#FFFFFF" stroke="#1B2A4A" strokeWidth="1"/>
      <text x="940" y="80" fill="#1B2A4A" fontSize="20" fontWeight="600" textAnchor="middle" fontFamily="Inter, 'Noto Sans TC', sans-serif">時間紀錄</text>
      <rect x="1210.0" y="40" width="220" height="64" rx="6" fill="#FFFFFF" stroke="#1B2A4A" strokeWidth="1"/>
      <text x="1320" y="80" fill="#1B2A4A" fontSize="20" fontWeight="600" textAnchor="middle" fontFamily="Inter, 'Noto Sans TC', sans-serif">長期記憶</text>
      <line x1="40" y1="548" x2="1432" y2="548" stroke="#E6EAF0" strokeWidth="1"/>
      <line x1="40" y1="576" x2="74" y2="576" stroke="#6B7789" strokeWidth="1.2" markerEnd="url(#cs-arrow)"/>
      <text x="86" y="582" fill="#6B7789" fontSize="16" textAnchor="start" fontFamily="Inter, 'Noto Sans TC', sans-serif">呼叫</text>
      <line x1="158" y1="576" x2="192" y2="576" stroke="#6B7789" strokeWidth="1.2" strokeDasharray="5 4" markerEnd="url(#cs-arrow)"/>
      <text x="204" y="582" fill="#6B7789" fontSize="16" textAnchor="start" fontFamily="Inter, 'Noto Sans TC', sans-serif">回覆</text>
      <line x1="276" y1="576" x2="310" y2="576" stroke="#6B7789" strokeWidth="1.2" strokeDasharray="5 4" markerEnd="url(#cs-arrow-open)"/>
      <text x="322" y="582" fill="#6B7789" fontSize="16" textAnchor="start" fontFamily="Inter, 'Noto Sans TC', sans-serif">寫入</text>
      <line x1="394" y1="576" x2="428" y2="576" stroke="#3D6BE5" strokeWidth="1.2" markerEnd="url(#cs-arrow-accent)"/>
      <text x="440" y="582" fill="#6B7789" fontSize="16" textAnchor="start" fontFamily="Inter, 'Noto Sans TC', sans-serif">關鍵提醒</text>
      </svg>
    </div>
  </Shell>
);

// ═══════════════════════════ Page 7 — Live Demo ═════════════════════════════
const Demo: Page = () => (
  <Shell center>
    <Title>Live Demo</Title>
    <p
      style={{
        fontSize: 38,
        lineHeight: 1.6,
        color: c.muted,
        margin: '40px 0 0',
        maxWidth: 1200,
      }}
    >{' '}</p>
    <div style={{ marginTop: 56, fontSize: 26, fontFamily: mono, color: c.accent }}>https://chronica-yk.vercel.app</div>
  </Shell>
);

// ═══════════════════════════ Page 8 — 結尾 ══════════════════════════════════
const Closing: Page = () => (
  <Shell center>
    <Title>先記錄，再規劃</Title>
    <p
      style={{
        fontSize: 34,
        lineHeight: 1.85,
        color: c.muted,
        margin: '40px 0 0',
        maxWidth: 1280,
      }}
    >
      我每天在用它。<br />它讓我知道時間到底花去哪裡，也讓下一週的安排建立在我自己的真實速度上。
    </p>
    <div
      style={{
        marginTop: 72,
        paddingTop: 32,
        borderTop: `1px solid ${c.line}`,
        display: 'flex',
        alignItems: 'baseline',
        gap: 48,
      }}
    >
      <span style={{ fontSize: 44, fontWeight: 600 }}>Thank you</span>
      <span style={{ fontSize: 24, fontFamily: mono, color: c.faint }}>
        chronica-yk.vercel.app　　github.com/Yuankai619/Chronica
      </span>
    </div>
  </Shell>
);

export const meta: SlideMeta = {
  title: 'Chronica ・ 決賽 Pitch',
  createdAt: '2026-08-22T04:27:59.872Z',
  theme: 'indigo-brief',
};

// 逐字稿全文見 chronica-final-runbook.md。語速抓每秒 4 個字；／是換氣點。
export const notes: (string | undefined)[] = [
  // P1 封面（15 秒）
  `大家好，我是劉元楷，資訊科學與工程升碩一。／

我做的東西叫 Chronica，是一套個人時間管理系統。／
它跟市面上工具最大的差別在後面五分鐘，我會用我自己的資料講給大家看。`,

  // P2 我同時在做三件事（30 秒）
  `先講我為什麼會做這個東西。／

我現在同時在經營一間新創公司、在交大資工念研究所，還在 LINE 實習。／

這三件事都有各自的時間表。／
三張時間表疊在一起之後，時間管理對我來說從一個好習慣，變成一個做好事情的必要技能。／

我試過所有大家會想到的方法。接下來三頁，是我試過之後失敗的紀錄。`,

  // P3 排好的時間表，幾乎沒有一天照著跑（35 秒）
  `第一個方法，是提前把每天排好，幾點到幾點做什麼。／

各位看這張圖。上排是我前一天晚上排好的：早上公司、中午學校、下午實習、晚上寫論文。／

下排是那天真的發生的事。／
早上十點，公司一件臨時的事插進來，一個半小時。／
從那一刻開始，後面每一段全部往後推。學校晚了一個半小時，實習拖到八點半，／
最後被犧牲的是晚上的論文，本來兩小時，只剩一小時。／

這種一天，我每個禮拜會遇到好幾次。問題在排程方式本身撐不住臨時插進來的事。`,

  // P4 問題出在顆粒度（35 秒）
  `第二個方法是番茄鐘。撐了大概兩個禮拜，也沒了。／

後來我讀到柳比歇夫時間統計法，才想通問題在哪。／
柳比歇夫的做法是：他不預先安排時段，他只在事情開始的時候按下計時，結束再按一次。／

我把這件事畫成兩個軸：橫軸是規劃的顆粒度，縱軸是記錄的顆粒度。／

行事曆排程在右下角，規劃很細，事後零紀錄。／
番茄鐘在右上角，切片有記到，但整週的比例還是看不出來。／

Chronica 在左上角：規劃粗到一週，記錄細到每一段。`,

  // P5 一週就是一個 Sprint（30 秒）
  `具體怎麼做？我把敏捷開發的 Sprint 搬到個人時間管理上。／

一個禮拜就是一個 Sprint。／
週初把這週要忙的事分類，公司、學校、實習、Lab、運動，／
每一類給一份時間預算，單位是半小時，不排幾點幾分。／

週間我只做一件事，就是按下計時。忘了按可以補。／

週末結算，把計畫和實際擺在一起。／
這裡是關鍵：每一圈跑完的結果，都會寫回中間那個長期記憶。`,

  // P6 AI 拿我自己的數字回答我（35 秒）
  `這是我 codebase 裡的 AI Agent 實際在做的事。／

假設下週要準備 Demo，我打 /plan，跟它說我排三小時。／

它不會直接答應。它會先去查我過去這類任務真正花了多久，／
查完回我：前四次平均七點五小時，三小時大概不夠。／

我知道自己為什麼會低估——準備演講這種事，我會因為心理壓力一直拖。／
它把這件事記進長期記憶，下一次我再低估同一類任務，它會再擋我一次。／

而且它不會自己動我的行事曆。寫入下週計畫這個動作，一定要我確認過才會執行。`,

  // P7 Live Demo（100 秒）— 完整流程與備援見 chronica-final-runbook.md 第四節
  `接下來我直接開我自己每天在用的那個站。

0–20s　執行頁：指今天已記錄的時段，直接開始一個新計時。
20–35s　停掉計時，或指一段忘記按、事後補的紀錄——紀錄可以補，但不能編，時間戳是伺服器給的。
35–60s　週結算：指出計畫與實際的差距，找超支最明顯的類別。
60–90s　Agent 對話頁，打 /retro：念出它引用的具體數字與日期，強調不是它編的。
90–100s　打開 Memory 抽屜，指出幾條記下來的觀察——下週規劃時它就是拿這些擋我。`,

  // P8 先記錄，再規劃（20 秒）
  `最後回到一句話：先記錄，再規劃。／

這是我自己每天在用的東西。／
它讓我知道時間到底花去哪裡，也讓下一週的安排，建立在我自己真實的速度上。／

謝謝大家。`,
];

export default [
  Cover,
  WhoIAm,
  Problem,
  Granularity,
  SprintLoop,
  AiRetro,
  Demo,
  Closing,
] satisfies Page[];
