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
| Universal background | `#FEF6DA` | warm cream/ivory — confirmed app-wide screen background, 2026-08-13 |
| Button active-state ("Saffron") | `#FF6B00` | vivid saffron/deep orange — the `Button` atom's `primary` (default) filled/active state, `goldenTempleTheme.colors.primary.DEFAULT`; was already live in code but undocumented until confirmed 2026-08-13 |
| Sub-header / accent color | `#CA3500` | deep orange-red — confirmed from Figma, 2026-08-13 |
| Text — primary (headings) | `#4A2C2A` | deep brown — `goldenTempleTheme.colors.text.primary`; the shared `Text` atom's default color, confirmed live via the phone-login investigation, 2026-08-13 |
| Text — secondary (body/subtitle) | `#8B6F47` | muted brown — `goldenTempleTheme.colors.text.secondary`, the `Text` atom's `color="secondary"` |

Only the first two colors above are labeled on the Figma frame itself. No accent, success/error/warning, neutral/gray scale, or dark-mode colors are documented here. Text elsewhere on the frame is plain black (`#000000`) and the background is plain white (`#FFFFFF`), but neither is called out as an explicit design-system token — treat those as incidental, not confirmed tokens.

**Universal background — `#FEF6DA` (confirmed decision, 2026-08-13):** not part of the original Figma frame extraction; added as a separate confirmed product decision. In code today this is almost exactly matched by the existing hardcoded value `#fff6da` (differs by 1 in the red channel — visually indistinguishable) sprinkled across ~14 screen files and a same-valued, unused `goldenTempleTheme.colors.background` token. See the investigation findings below (§7) before changing this in code.

**Three distinct oranges now confirmed live/intended, not one — worth keeping straight:** `#E76A4A` (primary, the original Figma swatch), `#FF6B00` (Saffron, the button's actual active-state color in code), and `#CA3500` (sub-header/accent, confirmed from Figma). These are three separate, deliberate roles, not drift/inconsistency to be merged — don't substitute one for another without confirming which role is intended.

**Primary gradient — `#E76A4A` → `#FFA241` (confirmed, 2026-08-13):** the two stop colors are fixed; the exact direction/order (e.g. top-left→bottom-right vs. left→right, or which end each color anchors) can vary by context/component — treat direction as a per-use styling choice, not itself a fixed token.

**Text color palette — `#4A2C2A`/`#8B6F47` — a separate concern from the three oranges above, don't conflate them.** The oranges are accent/interactive colors (buttons, sub-headers, gradients); `#4A2C2A`/`#8B6F47` are the actual heading/body text colors used app-wide via the shared `Text` atom's default and `color="secondary"`. Neither is black or gray, despite the Figma frame's own incidental text rendering in plain `#000000` (see below) — the real app text color is a warm brown, matching the temple theme rather than a neutral scale.

No Figma **variables** are bound to this frame (`get_variable_defs` returned empty) — these are raw hex fills, not design tokens/variables in the Figma sense. If the team wants swappable theming later, these would need to be converted to variables at the source.

---

## 2. Typography

**Font family:** `Noto Sans Devanagari` (Bold weight shown) — this is the only font explicitly labeled as *the* documented font ("Font" section → "Noto Sans Devanagari"). Devanagari-script support makes sense given the app's Hindi-first content.

**Font size scale — CONFIRMED, 2026-08-13: the real, complete scale is the 7-variant scale already implemented in the shared `Text` atom** (`src/components/atoms/Text/Text.tsx`), which every screen in the app renders through as of the Text-atom conversion (§46 in CLAUDE.md). This supersedes the incomplete 4-number reading below, which was only ever an inference from the raw Figma frame and never matched what's actually implemented.

| Variant | Font size | Notes |
|---|---|---|
| `h1` | 36px | |
| `h2` | 30px | |
| `h3` | 24px | |
| `h4` | 20px | |
| `h5` | 18px | |
| `body` | 14px | |
| `caption` | 14px | Currently identical to `body` — two names sharing one size, not two distinct sizes; worth deciding whether that's intentional or `caption` should get its own smaller size |
| `overline` | 12px | uppercase, `letterSpacing: 1.5` — an 8th variant outside the h1→caption range, included here for completeness |

**Original Figma frame reading (superseded, kept for history only — do not use):** the frame's "Font size" section showed 4 numbers, left to right: 32px, 24px, 20px, 16px, with no role labels attached. The original inference below (H1/H2/emphasis/body) does not match the real, confirmed scale above and should not be used for any future work.

| Size | Suggested role (inferred from left→right descending order — not explicitly labeled) |
|---|---|
| 32px | Largest — likely a screen/section title (H1) |
| 24px | Likely a sub-heading (H2) |
| 20px | Likely body-emphasis or card titles |
| 16px | Likely body/default text |

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
- No color tokens beyond 2 swatches (no error/success/warning, no gray/neutral scale, no dark-mode variants) — **partially resolved 2026-08-13:** universal background, button active-state (Saffron), sub-header/accent, the primary gradient, and the primary/secondary text colors are now also documented (§1); still no error/success/warning/gray-scale/dark-mode tokens
- No line-height/letter-spacing typography detail
- No Figma variables — everything is a raw hex/px value, not a swappable token
- Ambiguity between "Noto Sans Devanagari" (documented font) and "Inter" (used for the frame's own labels) — resolve with the design intern if a second UI typeface was actually intended
- ~~Font-size-to-role mapping (which size is for headings vs. body vs. labels) is inferred, not labeled~~ — **RESOLVED 2026-08-13:** the real, confirmed 7-variant scale (§2) supersedes this; the original inferred mapping was wrong and is kept only for history

Re-run this extraction (or check other pages/frames in the file) if the design system gets fleshed out further — this file is a snapshot, not a live sync.

---

## 7. Universal background color — investigated 2026-08-13, CENTRALIZED same day

**RESOLVED, same day.** The investigation below found the color was not centralized; it has since been fixed — `goldenTempleTheme.ts`'s three background tokens are now the real `#FEF6DA` value, and every screen listed in the table below was switched from a hardcoded literal to `goldenTempleTheme.colors.background` (adding the import where a file didn't already have it: `app/_layout.tsx`, `daily-status.tsx`, `ringtones.tsx`, `MiniPlayer.tsx`). A future screen that needs this background should import `goldenTempleTheme` and reference `.colors.background` — never hardcode the hex value directly. Original investigation preserved below for reference; **note the occurrence count below was later corrected from an initial miscount of "21 call sites" to the accurate 19** (13 non-theme files, summing the per-file counts in the table).

**Not centralized (as found).** `goldenTempleTheme.ts` (`src/styles/goldenTempleTheme.ts`) defined the cream background value in three separate places — `colors.background`, `colors.sacredCream`, and `colors.backgrounds.primary` — all set to `'#fff6da'`. **None of these three tokens were referenced anywhere else in the codebase** (confirmed via repo-wide grep) — they were dead theme values. Every screen instead hardcoded the literal string `'#fff6da'` directly in its own `StyleSheet.create()`, independently of the theme file.

**22 hardcoded occurrences across 14 files carried this value (as found):**

| File | Occurrences |
|---|---|
| `app/_layout.tsx` (root Stack `contentStyle` + a style block) | 3 |
| `app/(main)/mantras.tsx` | 3 |
| `app/(main)/audio-player.tsx` | 2 |
| `app/(main)/search-results.tsx` | 2 |
| `app/(main)/_layout.tsx` (Tabs `screenOptions`) | 1 |
| `app/(main)/index.tsx` (Home) | 1 |
| `app/(main)/horoscope.tsx` | 1 |
| `app/(main)/horoscope-detail.tsx` | 1 |
| `app/(main)/daily-status.tsx` (Wallpaper Hub) | 1 |
| `app/(main)/ringtones.tsx` (Audio hub) | 1 |
| `app/(main)/mantra-quiz.tsx` | 1 |
| `app/(main)/choose-start.tsx` | 1 |
| `src/components/molecules/MiniPlayer/MiniPlayer.tsx` | 1 |
| `src/styles/goldenTempleTheme.ts` (the 3 dead tokens) | 3 |

**To actually change the universal background to `#FEF6DA` (as scoped):** not a single, small change — it needed a find/replace of the literal `#fff6da` string (case-insensitive) across the 13 non-theme files above (19 call sites), since nothing read from the theme token. Updating the theme file's 3 tokens alone would have changed nothing visible, since no screen consumed them. The genuine one-place fix — screens reading `goldenTempleTheme.colors.background` instead of hardcoding — is the larger refactor that was actually done; see the RESOLVED note above.

**Note on the value itself:** the current `#fff6da` and the requested `#FEF6DA` differ by 1 in the red channel (`FF` vs `FE`) — visually indistinguishable. The practical effect of this change would be near-zero on-screen; it's really a code-cleanliness/precision change more than a visual one.
