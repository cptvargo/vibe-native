import { createContext, useContext, useState, useCallback } from 'react';

const DEFAULT_ACCENT = '#7C3AED';

function buildTheme(accent) {
  return {
    accent,
    accentBright:   accent,
    accentGlow:     accent,
    background:     '#080810',
    surface:        '#0f0f1a',
    card:           'rgba(255,255,255,0.05)',
    border:         'rgba(255,255,255,0.08)',
    text:           '#ffffff',
    textDim:        'rgba(255,255,255,0.55)',
    textFaint:      'rgba(255,255,255,0.28)',
    navBg:          'rgba(8,8,16,0.92)',
  };
}

const ThemeContext = createContext({
  theme:     buildTheme(DEFAULT_ACCENT),
  setAccent: () => {},
  resetTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [accent, setAccentColor] = useState(DEFAULT_ACCENT);

  const setAccent   = useCallback((color) => setAccentColor(color || DEFAULT_ACCENT), []);
  const resetTheme  = useCallback(() => setAccentColor(DEFAULT_ACCENT), []);

  return (
    <ThemeContext.Provider value={{ theme: buildTheme(accent), setAccent, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
