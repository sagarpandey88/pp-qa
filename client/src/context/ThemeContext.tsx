import React, { createContext, useContext, useState, useEffect } from 'react';
import { FluentProvider, webLightTheme, webDarkTheme } from '@fluentui/react-components';

export type ThemeMode = 'system' | 'light' | 'dark';
export type EffectiveTheme = 'light' | 'dark';

interface ThemeContextType {
  themeMode: ThemeMode;
  effectiveTheme: EffectiveTheme;
  isSystemDefault: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'system',
  effectiveTheme: 'light',
  isSystemDefault: true,
  setThemeMode: () => {},
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Use system theme mode by default
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('ppqa_theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
    return 'system'; // Default to system theme mode
  });

  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else if ((mediaQuery as any).addListener) {
      (mediaQuery as any).addListener(handleChange);
      return () => (mediaQuery as any).removeListener(handleChange);
    }
  }, []);

  const effectiveTheme: EffectiveTheme =
    themeMode === 'system' ? (systemIsDark ? 'dark' : 'light') : themeMode;

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem('ppqa_theme', mode);
  };

  const toggleTheme = () => {
    // If currently dark, switch to light; if light, switch to dark
    const nextMode: ThemeMode = effectiveTheme === 'dark' ? 'light' : 'dark';
    setThemeMode(nextMode);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', effectiveTheme);
    if (effectiveTheme === 'dark') {
      document.body.style.backgroundColor = '#1f1f1f';
      document.body.style.color = '#f5f5f5';
    } else {
      document.body.style.backgroundColor = '#faf9f8';
      document.body.style.color = '#242424';
    }
  }, [effectiveTheme]);

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        effectiveTheme,
        isSystemDefault: themeMode === 'system',
        setThemeMode,
        toggleTheme,
      }}
    >
      <FluentProvider theme={effectiveTheme === 'dark' ? webDarkTheme : webLightTheme}>
        {children}
      </FluentProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

