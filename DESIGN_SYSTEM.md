# Bhav Bhakti — Design System Reference

Extracted from Figma: **Bhav-bhakti** file, Page 1, frame **"Design system"** (node `7:2`).
Source: `https://www.figma.com/design/ry0ghaUpHytna58InDiOHx/Bhav-bhakti?node-id=7-2`
Extracted: 2026-07-21.

> **Scope note:** this Figma frame documents colors, one font family, a font-size scale, and an icon set — that's the entirety of what's in it. It does **not** contain button, card, input, or section-header component specs (no such elements exist on this frame). Those sections below are marked "not documented" rather than guessed. If/when the design intern documents those elsewhere in the file, re-run the extraction and fill them in — don't invent values for them from other screens without a fresh Figma read.

---

## 1. Colors

| Name | Hex | Swatch |
|---|---|---|
| Primary color | `#E76A4A` | terracotta / burnt-orange |
| Secondary color | `#FFE8D1` | pale peach |

Only these two colors are labeled on the frame. No accent, success/error/warning, neutral/gray scale, or dark-mode colors are documented here. Text elsewhere on the frame is plain black (`#000000`) and the background is plain white (`#FFFFFF`), but neither is called out as an explicit design-system token — treat those as incidental, not confirmed tokens.

No Figma **variables** are bound to this frame (`get_variable_defs` returned empty) — these are raw hex fills, not design tokens/variables in the Figma sense. If the team wants swappable theming later, these would need to be converted to variables at the source.

---

## 2. Typography

**Font family:** `Noto Sans Devanagari` (Bold weight shown) — this is the only font explicitly labeled as *the* documented font ("Font" section → "Noto Sans Devanagari"). Devanagari-script support makes sense given the app's Hindi-first content.

**Font size scale** (labeled under "Font size," left to right on the frame):

| Size | Suggested role (inferred from left→right descending order — not explicitly labeled) |
|---|---|
| 32px | Largest — likely a screen/section title (H1) |
| 24px | Likely a sub-heading (H2) |
| 20px | Likely body-emphasis or card titles |
| 16px | Likely body/default text |

⚠️ The frame shows only four numbers with no heading/body/label role labels attached — the "suggested role" column above is my inference from the size ordering, not something Figma states. Don't treat it as authoritative; confirm actual usage against real screens (or ask the design intern) before hard-coding role→size mappings.

**Weight:** Only Bold is shown for both the "Noto Sans Devanagari" sample text and the section headers. No Regular/Medium/SemiBold weight samples are documented on this frame.

**A second typeface appears on the frame but is not the documented app font:** the section headers themselves ("Font", "Font size", "Icons", "Primary color", "Secondary color" labels) render in **Inter Bold**, not Noto Sans Devanagari. This looks like the designer's default Figma text-tool font used for *labeling the design system frame itself*, not a second typeface intended for the app. Treat `Inter` as incidental UI chrome of the documentation frame, not a token — but flagging it here in case that assumption is wrong.

No line-height, letter-spacing, or paragraph-spacing values are documented.

---

## 3. Spacing / Sizing

Not documented on this frame. There is no spacing scale, padding/margin tokens, or grid/layout system labeled anywhere in the "Design system" frame — it only contains the color swatches, font sample, and icon row described above.

The only size-like values present are incidental (not labeled as spacing tokens):
- Color swatches: 146px × 100px, rounded corners
- Standard icon bounding box: 24px × 24px
- One outlier icon ("tabler:sun"): 41px × 41px — larger than the rest, unclear if intentional or an error in the frame

Don't infer a spacing scale (e.g. 4/8/16/24px grid) from this frame — it isn't there. If one exists, it lives elsewhere (or nowhere yet).

**Standing rule until a real spacing scale is defined:** component work should source spacing from `src/styles/goldenTempleTheme.ts` (its `spacing`/`borderRadius` scales), not invent new ad-hoc values per component. This is already the pattern used by the audio player bottom sheets (`src/styles/designSystemTheme.ts` — colors/fonts from this file, spacing from `goldenTempleTheme.ts`).

---

## 4. Component patterns

**Not documented.** This frame contains no button, card, input/form-field, or section-header component specs — no variants, states (hover/pressed/disabled), corner-radius tokens, elevation/shadow values, or border treatments are shown anywhere on it.

If component-level design specs exist, they're on a different frame/page in the file that wasn't part of this extraction — worth checking with the design intern or browsing the file's other pages before assuming Bhav Bhakti has no component system at all.

---

## 5. Icon set

10 icons are documented, each named by its source icon-library identifier (Iconify convention: `pack:icon-name`). Standard size 24×24px unless noted.

| Icon | Library ID | Likely use |
|---|---|---|
| ❤️ Heart (outline) | `icon-park-outline:like` | Like/favorite action |
| 🔗 Share | `ic:baseline-share` | Share action |
| ⬇️ Download | `material-symbols:download-rounded` | Download action |
| ॐ Om symbol | `mdi:om` | Devotional/category marker |
| ☀️ Sun (41×41px, larger than the rest) | `tabler:sun` | Theme toggle (light mode) — size outlier, unconfirmed if intentional |
| 🎵 Music note (two overlaid icons) | `clarity:music-note-solid` + `tdesign:music-filled` | Audio/ringtone indicator |
| 💬 WhatsApp | `ic:sharp-whatsapp` | Share-to-WhatsApp action |
| ▶️ Play | `line-md:play-filled` | Audio/media play |
| 🔍 Search | `material-symbols:search-rounded` | Search action |
| 👤 Person/profile | (unnamed "Group") | Profile/account |

All are outline or filled single-color icons (no documented color token for icon fill — they render black/currentColor by default in the exported code).

---

## 6. Known gaps in this design system (as of this extraction)

- No spacing/grid scale
- No component specs (buttons, cards, inputs, headers)
- No color tokens beyond 2 swatches (no error/success/warning, no gray/neutral scale, no dark-mode variants)
- No line-height/letter-spacing typography detail
- No Figma variables — everything is a raw hex/px value, not a swappable token
- Ambiguity between "Noto Sans Devanagari" (documented font) and "Inter" (used for the frame's own labels) — resolve with the design intern if a second UI typeface was actually intended
- Font-size-to-role mapping (which size is for headings vs. body vs. labels) is inferred, not labeled

Re-run this extraction (or check other pages/frames in the file) if the design system gets fleshed out further — this file is a snapshot, not a live sync.
