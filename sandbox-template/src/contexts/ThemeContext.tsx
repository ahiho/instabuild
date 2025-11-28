/**
 * Theme Context - Global theme management
 * Provides theme selection and application across the entire app
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { ALL_THEMES, applyTheme, type ThemeDefinition } from '@/lib/themes';

interface ThemeContextType {
  currentTheme: ThemeDefinition;
  isDarkMode: boolean;
  setTheme: (themeId: string) => void;
  toggleDarkMode: () => void;
  availableThemes: ThemeDefinition[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<ThemeDefinition>(ALL_THEMES[0]);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Apply theme to DOM whenever theme or dark mode changes
  useEffect(() => {
    applyTheme(currentTheme, isDarkMode);

    // Update dark class on document
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Persist to localStorage
    localStorage.setItem('theme-id', currentTheme.id);
    localStorage.setItem('theme-dark-mode', String(isDarkMode));
  }, [currentTheme, isDarkMode]);

  // Load saved theme on mount
  useEffect(() => {
    const savedThemeId = localStorage.getItem('theme-id');
    const savedDarkMode = localStorage.getItem('theme-dark-mode') === 'true';

    if (savedThemeId) {
      const theme = ALL_THEMES.find((t) => t.id === savedThemeId);
      if (theme) {
        setCurrentTheme(theme);
      }
    }

    setIsDarkMode(savedDarkMode);
  }, []);

  const handleSetTheme = (themeId: string) => {
    const theme = ALL_THEMES.find((t) => t.id === themeId);
    if (theme) {
      setCurrentTheme(theme);
    }
  };

  const handleToggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        isDarkMode,
        setTheme: handleSetTheme,
        toggleDarkMode: handleToggleDarkMode,
        availableThemes: ALL_THEMES,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
