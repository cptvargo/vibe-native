import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const DEFAULT_ACCENT = '#7C3AED';

export const EMPTY_PALETTE = {
  vibrant: null, lightVibrant: null, darkVibrant: null,
  muted: null,   lightMuted: null,   darkMuted: null,
};

// ── Color math ────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}

function relativeLuminance(r, g, b) {
  return [r, g, b].reduce((acc, c, i) => {
    const s = c / 255;
    const lin = s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    return acc + lin * [0.2126, 0.7152, 0.0722][i];
  }, 0);
}

function contrastRatio(hexA, hexB) {
  const la = relativeLuminance(...hexToRgb(hexA));
  const lb = relativeLuminance(...hexToRgb(hexB));
  const [lighter, darker] = la > lb ? [la, lb] : [lb, la];
  return (lighter + 0.05) / (darker + 0.05);
}

// WCAG AA: returns whichever of white/black has higher contrast with bgHex
function pickTextColor(bgHex) {
  if (!bgHex) return '#ffffff';
  try {
    return contrastRatio(bgHex, '#ffffff') >= contrastRatio(bgHex, '#000000')
      ? '#ffffff' : '#000000';
  } catch { return '#ffffff'; }
}

// Push a color toward black by `factor` (0 = unchanged, 1 = pure black)
function darken(hex, factor) {
  if (!hex) return '#000000';
  try {
    const f = 1 - Math.max(0, Math.min(1, factor));
    const [r, g, b] = hexToRgb(hex);
    const h = v => Math.round(v * f).toString(16).padStart(2, '0');
    return `#${h(r)}${h(g)}${h(b)}`;
  } catch { return '#000000'; }
}

// Append a two-hex-digit alpha to a #rrggbb string → "#rrggbbAA"
function withAlpha(hex, a255) {
  if (!hex) return 'rgba(0,0,0,0)';
  const [r, g, b] = hexToRgb(hex.length > 7 ? hex.slice(0, 7) : hex);
  return `rgba(${r},${g},${b},${(a255 / 255).toFixed(3)})`;
}

// ── Theme builder ─────────────────────────────────────────────────────────────

function buildTheme(palette = EMPTY_PALETTE) {
  // Accent hierarchy: vibrant → lightVibrant → darkVibrant → default purple
  const accent       = palette.vibrant ?? palette.lightVibrant ?? palette.darkVibrant ?? DEFAULT_ACCENT;
  const accentBright = palette.lightVibrant ?? palette.vibrant ?? accent;

  // Dark background derived from palette for non-blur surfaces (mini player, cards)
  const rawDark    = palette.darkVibrant ?? palette.darkMuted ?? null;
  const solidBg    = rawDark ? darken(rawDark, 0.40) : '#07070a';

  // Text color that passes WCAG AA against solidBg
  const textColor   = pickTextColor(solidBg);
  const textIsLight = textColor === '#ffffff';
  const textAlpha   = textIsLight ? 'rgba(255,255,255,' : 'rgba(0,0,0,';

  // UltraBlur overlay: two stops for the tinted gradient that sits on top of the BlurView.
  // Using dark palette swatches keeps the blur "moody" and album-colored.
  const tintBase1 = rawDark
    ? withAlpha(darken(rawDark, 0.10), 0x66)       // palette tint, 40% opacity — lets color show
    : 'rgba(0,0,0,0.40)';
  const tintBase2 = palette.darkMuted
    ? withAlpha(darken(palette.darkMuted, 0.05), 0x33)  // soft mid tint, 20% opacity
    : 'rgba(0,0,0,0.18)';

  return {
    // ── existing API — nothing in PlayerScreen/MiniPlayer should break ──────
    accent,
    accentBright,
    accentGlow:  accent,
    background:  '#000000',
    surface:     solidBg,
    card:        accent + '14',
    border:      accent + '22',
    text:        textColor,
    textDim:     textAlpha + '0.72)',
    textFaint:   textAlpha + '0.40)',
    navBg:       'rgba(0,0,0,0.92)',

    // ── full palette (exposed for consumers that want individual swatches) ──
    palette,

    // ── UltraBlur: values consumed by UltraBlurBackground ──────────────────
    ultraBlur: {
      tint1:      tintBase1,    // top + bottom gradient stop
      tint2:      tintBase2,    // centre gradient stop
      textColor,                // '#ffffff' or '#000000'
      textIsLight,              // convenience bool
    },
  };
}

// ── Context ───────────────────────────────────────────────────────────────────

const ThemeContext = createContext({
  theme:      buildTheme(EMPTY_PALETTE),
  setPalette: () => {},
  setAccent:  () => {},   // legacy single-color path
  resetTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [palette, setPaletteState] = useState(EMPTY_PALETTE);

  const setPalette = useCallback((p) => {
    setPaletteState(p && Object.values(p).some(v => v !== null) ? p : EMPTY_PALETTE);
  }, []);

  // Legacy path: BlurHash-only callers pass one hex color
  const setAccent = useCallback((color) => {
    if (!color) return;
    setPaletteState({ ...EMPTY_PALETTE, vibrant: color, lightVibrant: color });
  }, []);

  const resetTheme = useCallback(() => setPaletteState(EMPTY_PALETTE), []);

  const theme = useMemo(() => buildTheme(palette), [palette]);

  // Memoize the context value so consumers only re-render when theme changes,
  // not on every ThemeProvider render cycle.
  const value = useMemo(
    () => ({ theme, setPalette, setAccent, resetTheme }),
    [theme, setPalette, setAccent, resetTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
