import type { DesignSystem, Page } from '@open-slide/core';
import { useSlidePageNumber } from '@open-slide/core';

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
  bg: '#FAFBFC',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F4F8',
  text: '#1B2A4A',
  muted: '#6B7789',
  faint: '#8A94A6',
  line: '#E6EAF0',
  lineStrong: '#D8DEE8',
  accent: '#3D6BE5',
  positive: '#127C71',
};

const font = design.fonts.body;
const mono = 'ui-monospace, "SF Mono", "Cascadia Mono", Consolas, monospace';

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+TC:wght@400;500;700&display=swap');
@keyframes ibFadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
.ib-rise { animation: ibFadeUp 480ms cubic-bezier(0.22, 0.61, 0.36, 1) both; }
`;

// ─── Fixed components (identical to themes/indigo-brief.md) ────────────────
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
        background: c.surface,
        border: `1px solid ${c.line}`,
        borderRadius: 6,
        overflow: 'hidden',
        display: 'flex',
      }}
    >
      {children}
    </div>
    {caption ? (
      <figcaption style={{ marginTop: 20, fontSize: 24, color: c.muted }}>{caption}</figcaption>
    ) : null}
  </figure>
);

const Stat = ({ value, label }: { value: string; label: string }) => (
  <div>
    <div
      style={{
        fontSize: 112,
        fontWeight: 600,
        lineHeight: 1,
        letterSpacing: '-0.02em',
        color: c.accent,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {value}
    </div>
    <div style={{ marginTop: 16, fontSize: 26, color: c.muted }}>{label}</div>
  </div>
);

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

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      position: 'relative',
      background: c.bg,
      color: c.text,
      fontFamily: font,
    }}
  >
    <style>{styles}</style>
    {children}
  </div>
);

// ─── Pages ─────────────────────────────────────────────────────────────────
const Cover: Page = () => (
  <Shell>
    <div
      className="ib-rise"
      style={{
        position: 'absolute',
        inset: 0,
        padding: '116px 140px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <Title>把時間記下來，下一週才排得準</Title>
      <p
        style={{
          fontSize: 34,
          lineHeight: 1.85,
          color: c.muted,
          maxWidth: 1100,
          margin: '40px 0 0',
        }}
      >
        Chronica 是我自己每天在用的時間統計工具。先記錄真實花費，再用歷史速度規劃下一週的時間預算。
      </p>
      <div style={{ marginTop: 56 }}>
        <Tags items={['時間統計', '週預算規劃', 'AI 回顧']} />
      </div>
    </div>
    <Footer />
  </Shell>
);

const barGroups = [
  { name: '創業', plan: 18, actual: 22, focal: true },
  { name: '課業', plan: 12, actual: 10, focal: false },
  { name: '實習', plan: 20, actual: 20, focal: false },
  { name: '寫作', plan: 6, actual: 3, focal: false },
];

const PlanChart = () => {
  const base = 340;
  const unit = 12.5; // 1 小時 = 12.5px
  return (
    <svg viewBox="0 0 720 420" width="720" height="420" role="img">
      <title>每週計畫時數與實際時數</title>
      {[0, 6, 12, 18, 24].map((v) => (
        <g key={v}>
          <line
            x1="120"
            x2="690"
            y1={base - v * unit}
            y2={base - v * unit}
            stroke={v === 0 ? c.lineStrong : c.line}
            strokeWidth="1"
          />
          <text
            x="108"
            y={base - v * unit + 4}
            textAnchor="end"
            fill={c.muted}
            fontSize="12"
            fontFamily={mono}
          >
            {v}
          </text>
        </g>
      ))}
      {barGroups.map((g, i) => {
        const x = 132 + i * 142;
        const planH = g.plan * unit;
        const actualH = g.actual * unit;
        return (
          <g key={g.name}>
            <rect
              x={x}
              y={base - planH}
              width="52"
              height={planH}
              fill={c.surfaceAlt}
              stroke={c.lineStrong}
              strokeWidth="1"
            />
            <rect
              x={x + 60}
              y={base - actualH}
              width="52"
              height={actualH}
              fill={g.focal ? 'rgba(61,107,229,0.12)' : 'rgba(27,42,74,0.05)'}
              stroke={g.focal ? c.accent : c.muted}
              strokeWidth={g.focal ? 1.2 : 1}
            />
            <text
              x={x + 86}
              y={base - actualH - 12}
              textAnchor="middle"
              fill={g.focal ? c.accent : c.muted}
              fontSize="13"
              fontFamily={mono}
            >
              {g.actual}
            </text>
            <text
              x={x + 56}
              y={base + 30}
              textAnchor="middle"
              fill={c.text}
              fontSize="16"
              fontWeight="600"
            >
              {g.name}
            </text>
          </g>
        );
      })}
      <g>
        <rect x="120" y="382" width="16" height="12" fill={c.surfaceAlt} stroke={c.lineStrong} />
        <text x="146" y="393" fill={c.muted} fontSize="13">
          計畫
        </text>
        <rect
          x="212"
          y="382"
          width="16"
          height="12"
          fill="rgba(27,42,74,0.05)"
          stroke={c.muted}
        />
        <text x="238" y="393" fill={c.muted} fontSize="13">
          實際
        </text>
      </g>
    </svg>
  );
};

const Content: Page = () => (
  <Shell>
    <div
      className="ib-rise"
      style={{
        position: 'absolute',
        inset: 0,
        padding: '116px 140px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Heading>計畫與實際的差距</Heading>
      <div style={{ display: 'flex', gap: 80, alignItems: 'flex-start' }}>
        <div style={{ width: 560, flexShrink: 0 }}>
          <p style={{ fontSize: 34, lineHeight: 1.85, color: c.text, margin: 0 }}>
            每個分類的時間預算以半小時為單位。一週結束時，系統把實際計時的結果和當初的預算擺在一起。
          </p>
          <p style={{ fontSize: 30, lineHeight: 1.85, color: c.muted, margin: '28px 0 0' }}>
            創業這一格連續四週超出預算，下一次規劃時 AI 會先把這件事提出來。
          </p>
          <div style={{ marginTop: 56 }}>
            <Stat value="+4.0 h" label="創業分類本週超出預算" />
          </div>
        </div>
        <Figure caption="第 32 週 每日計時彙整結果">
          <PlanChart />
        </Figure>
      </div>
    </div>
    <Footer />
  </Shell>
);

const Closer: Page = () => (
  <Shell>
    <div
      className="ib-rise"
      style={{
        position: 'absolute',
        inset: 0,
        padding: '116px 140px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      <h2 style={{ fontSize: 88, fontWeight: 700, lineHeight: 1.25, margin: 0 }}>
        先記錄，再規劃
      </h2>
      <p
        style={{
          fontSize: 32,
          lineHeight: 1.85,
          color: c.muted,
          margin: '36px 0 0',
          maxWidth: 900,
        }}
      >
        下一週的時間預算，來自上一週真正花掉的時間。
      </p>
      <div
        style={{
          marginTop: 48,
          fontSize: 26,
          fontFamily: mono,
          color: c.positive,
        }}
      >
        chronica-yk.vercel.app
      </div>
    </div>
    <Footer />
  </Shell>
);

export default [Cover, Content, Closer];
