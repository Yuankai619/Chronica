<!-- diagram-design-profile
name: Indigo Brief
slug: indigo-brief
source-url: none
created: 2026-08-22
updated: 2026-08-22
notes: Chronica pitch deck light theme — themes/indigo-brief.md
-->

# Style Guide

**The single source of truth for colors, typography, and tokens.** Every diagram draws from this — not from hex values inlined in other reference files. If you want to change the visual skin of Diagram Design, change this file.

**Active profile: `indigo-brief` (Chronica 決賽簡報).** This copy has been skinned to the `themes/indigo-brief.md` slide theme — cool-white paper, deep-indigo ink, steel-blue accent. Diagrams generated here drop straight onto an `indigo-brief` slide without recoloring. Do not run the first-time onboarding gate; these tokens are the customized skin.

To generate your own from a website URL, see [`onboarding.md`](onboarding.md).

---

## Tokens

### Semantic roles

Every token is referred to by **semantic role**, not by its hex value. Type references (`type-*.md`) and SKILL.md say `accent`, not `#3d6be5`.

| Role | Purpose | Default (light) | Default (dark) |
|---|---|---|---|
| `paper` | Page background, default node fill | `#fafbfc` (cool-white) | `#141a26` (midnight) |
| `paper-2` | Diagram container bg, secondary fill | `#f1f4f8` | `#1c2434` |
| `ink` | Primary text, primary stroke | `#1b2a4a` (deep-indigo) | `#e9edf4` (paper-white) |
| `muted` | Secondary text, default arrow stroke | `#6b7789` (slate-grey) | `#a8b2c2` |
| `soft` | Sublabels, boundary labels | `#8a94a6` | `#7d879a` |
| `rule` | Hairline borders | `rgba(27,42,74,0.12)` | `rgba(233,237,244,0.12)` |
| `rule-solid` | Stronger borders, baselines | `#d8dee8` | `rgba(216,222,232,0.25)` |
| `accent` | Focal / 1–2 max per diagram | `#3d6be5` (steel-blue) | `#7fa0f0` |
| `accent-tint` | Fill for accent-bordered boxes | `rgba(61,107,229,0.08)` | `rgba(127,160,240,0.12)` |
| `link` | HTTP/API calls, external arrows | `#127c71` (deep-teal) | `#4fb3a5` |

> **Brand palette source:** these values are lifted verbatim from `themes/indigo-brief.md` — `bg #fafbfc`, `text #1b2a4a`, `accent #3d6be5`, `muted #6b7789`, `line #e6eaf0`. `soft`, `rule`, `rule-solid`, and `accent-tint` are derived from those five. `link` is the one deliberate second hue (deep teal): the accent is already blue, so external calls need a hue that cannot be mistaken for a focal node. Any change to the theme palette must be mirrored here in the same commit.

> **Note:** The pre-baked example HTML files in `assets/` were built under an earlier skin. Regenerating them against the current `style-guide.md` is a v5.1 task. New diagrams the skill produces will use the tokens above.

### Inversion rule (light → dark)

Any `rgba(27,42,74, X)` in light becomes `rgba(233,237,244, X)` in dark. Same opacities, RGB flipped. The accent lightens to `#7fa0f0` to read on dark paper. The deck itself is light-only — the dark column exists for diagrams exported for other surfaces.

### Series palette (multi-series chart types only)

A small set of desaturated, editorial-tone colors for chart types that genuinely need to distinguish multiple overlapping entities (currently: **radar**). The "1-focal" rule still holds — `accent` is reserved for the focal series; the palette below covers the rest.

| Token | Light | Dark | Notes |
|---|---|---|---|
| `series-1` | `#5f7a8c` (steel-slate) | `#8aa3b4` | Non-focal series |
| `series-2` | `#7c8f6f` (sage) | `#9caf8f` | Non-focal series |
| `series-3` | `#b8915a` (mustard) | `#d3ad7a` | Non-focal series |
| `series-4` | `#9c6b50` (rust-brown) | `#b88670` | Non-focal series |
| `series-5` | `#6e6479` (slate) | `#8d8298` | Non-focal series |

Fills sit at `0.18` opacity light, `0.22` dark; strokes use the full color. **Don't backfill these tokens to non-chart types** — architecture, swimlane, etc. continue to use muted-ink variants. The series palette is opt-in for diagrams where overlapping shapes demand distinguishable color, not a license to add color elsewhere.

### Terminal skin (opt-in alternate)

A self-contained palette for the terminal-window primitive (see [primitive-terminal.md](primitive-terminal.md)) — a CLI-chrome register for dev-tool posts and technical social cards. It does not replace the default skin above and isn't affected by onboarding; it's a second, fixed skin you opt into per-diagram.

| Token | Hex | Purpose |
|---|---|---|
| `terminal-page` | `#0a0a0a` | Page background behind the window |
| `terminal-paper` | `#141414` | Window body, node fill |
| `terminal-bar` | `#1b1b1b` | Titlebar strip |
| `terminal-border` | `#2b2b2b` | Window border, hairlines |
| `terminal-ink` | `#f5f5f5` | Primary text, primary stroke (same white-smoke as default `ink`) |
| `terminal-muted` | `#9a9a9a` | Secondary text, sublabels, ring stroke |
| `terminal-soft` | `#5c5c5c` | Tertiary — inactive dots, spokes |
| `terminal-accent` | `#ff5a36` | The one accent — focal station, prompt sign, active dot |
| `terminal-accent-tint` | `rgba(255,90,54,0.12)` | Fill for accent-bordered boxes |

**1-accent rule still holds.** Everything that isn't `terminal-ink` or `terminal-muted`/`terminal-soft` should be `terminal-accent` — never introduce a second hue.

---

## Typography

| Role | Family | Size | Weight | Usage |
|---|---|---|---|---|
| `title` | Inter + Noto Sans TC | 1.75rem | 700 | Page H1 |
| `node-name` | Inter + Noto Sans TC | 12px | 600 | Human-readable labels (Chinese included) |
| `sublabel` | Geist Mono | 9px | 400 | Port, protocol, URL, field type — Latin/digits only |
| `eyebrow` | Geist Mono | 7–8px | 500, tracked 0.18em, uppercase | Type tags, axis labels |
| `arrow-label` | Geist Mono | 8px | 400, tracked 0.06em | Arrow annotations |
| `callout` | Inter + Noto Sans TC | 14px | 400, `muted` | Editorial asides only |

### Font stack

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+TC:wght@400;500;700&family=Geist+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

**Load-bearing rule:** Mono is for *technical* content (ports, commands, URLs, field types) and never carries Chinese — Geist Mono has no CJK coverage, so a Chinese label in a mono role falls back to a mismatched system face. Names, titles, and every Chinese string go in `Inter, "Noto Sans TC"` — Inter serves the Latin and digits, Noto Sans TC picks up the Han glyphs. **No italic anywhere**: Chinese has no true italic and the browser will synthesize a skew. Callouts separate themselves by `muted` color and smaller size instead (see [primitive-annotation.md](primitive-annotation.md)). **Never JetBrains Mono** as a blanket "dev" font.

**Full sans stack to paste into generated HTML:**

```css
font-family: Inter, "Noto Sans TC", -apple-system, BlinkMacSystemFont, "PingFang TC", system-ui, sans-serif;
```

---

## Stroke, radius, spacing

| Token | Value | Use |
|---|---|---|
| `stroke-thin` | `0.8` | Tag-box outlines, leaf nodes |
| `stroke-default` | `1` | Most strokes |
| `stroke-strong` | `1.2` | Emphasis strokes |
| `radius-sm` | `4` | Small tags |
| `radius-md` | `6` | Node boxes |
| `radius-lg` | `8` | Containers, rings |
| `grid` | `4` | Every coord, size, and gap is divisible by 4 (hard rule) |

---

## Node type → treatment

Semantic role combinations — reference these by name in type specs.

| Type | Fill | Stroke |
|---|---|---|
| `focal` (1–2 max) | `accent-tint` | `accent` |
| `backend` | `#ffffff` (white) | `ink` |  <!-- reads as a lifted card on cool-white paper -->
| `store` | `ink @ 0.05` | `muted` |
| `external` | `ink @ 0.03` | `ink @ 0.30` |
| `input` | `muted @ 0.10` | `soft` |
| `optional` | `ink @ 0.02` | `ink @ 0.20` dashed `4,3` |
| `security` | `accent @ 0.05` | `accent @ 0.50` dashed `4,4` |

---

## Customizing the skin

Four options:

1. **Run onboarding** — see [`onboarding.md`](onboarding.md). Drop a URL; the skill extracts the palette + fonts and rewrites this file.
2. **Edit by hand** — change the hex values in the tables above. Run the pre-output taste gate afterward to verify the accent still reads as "focal" against the new paper color.
3. **Brand handoff** — paste your existing design-token JSON into a new section here and map its tokens to the semantic roles above.
4. **Client profiles** — save and switch named skins, or bind one to a project, using [`profiles.md`](profiles.md).

### Constraints (don't break these)

- **Contrast**: `ink` must hit WCAG AA on `paper`. `muted` must hit AA on `paper` for 11px+ text.
- **One accent**: pick one color for `accent`. Two accents erases the focal signal.
- **No rainbow palette**: if your brand ships 8 colors, pick 3 (paper, ink, accent). The rest become `muted` variants.
- **Sans + mono**: two families, not more. This skin is Chinese-first, so the serif slot is dropped — a CJK serif at 12px on a projected slide loses its strokes. Titles separate themselves by weight (700) and size, not by family.
- **Paper is off-white, not pure white**: pure white turns the design sterile. This skin uses a cool off-white (`#fafbfc`) to sit on the same ground as the slide theme; a warm cream would clash with the indigo ink.
- **Dot pattern is optional, not default**: the 22×22 dot pattern is an opt-in "dotted paper" variant (good for long-form editorial hero diagrams). The default background is a clean `paper` fill, no pattern. When the pattern is enabled, it should sit at ~10% opacity of `ink` on `paper` — visible but quiet.
- **Container is clean by default**: the diagram sits directly on the page paper, no secondary container background or border. A framed variant (`paper-2` bg + `rule` border + 8px radius + padding) is available as an opt-in for card-heavy layouts, but don't reach for it by default — the extra chrome fights the figure.
