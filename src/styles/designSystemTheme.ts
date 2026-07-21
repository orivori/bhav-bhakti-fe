/**
 * Tokens sourced directly from /DESIGN_SYSTEM.md (repo root) — the only two colors
 * and the only font-size scale documented there. Spacing/shadows/border-radius are
 * NOT documented in DESIGN_SYSTEM.md, so those still come from goldenTempleTheme
 * for consistency with the rest of the app, per the standing rule in CLAUDE.md §12.
 *
 * textPrimary/textSecondary/surface are NOT DESIGN_SYSTEM.md tokens — that file
 * only documents 2 colors. These are sensible defaults (surface/text are the
 * incidental white background / black text visible on the Figma frame itself).
 */
export const designSystemTheme = {
  colors: {
    primary: '#E76A4A', // terracotta
    secondary: '#FFE8D1', // peach
    surface: '#FFFFFF',
    textPrimary: '#000000',
    textSecondary: '#666666',
  },
  fontSizes: {
    h1: 32,
    h2: 24,
    cardTitle: 20,
    body: 16,
  },
} as const;
