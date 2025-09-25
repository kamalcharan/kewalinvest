// frontend/src/contexts/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TechySimpleTheme } from '../config/themes/techySimple';
import { BharathaVarshaTheme } from '../config/themes/bharathavarsha';
import { ProfessionalRedefinedTheme } from '../config/themes/professionalRedefined';
import { ThemeConfig } from '../config/themes/types';

interface ThemeContextType {
  theme: ThemeConfig;
  currentThemeId: string;
  isDarkMode: boolean;
  setTheme: (themeId: string) => void;
  toggleDarkMode: () => void;
  themes: ThemeConfig[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Available themes
const AVAILABLE_THEMES: ThemeConfig[] = [
  TechySimpleTheme,
  BharathaVarshaTheme,
  ProfessionalRedefinedTheme,
];

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Get initial theme from localStorage or default to techy-simple
  const [currentThemeId, setCurrentThemeId] = useState<string>(() => {
    return localStorage.getItem('theme_preference') || 'techy-simple';
  });

  // Get initial dark mode preference
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const stored = localStorage.getItem('dark_mode');
    return stored ? stored === 'true' : false;
  });

  // Get current theme object
  const getCurrentTheme = (): ThemeConfig => {
    return AVAILABLE_THEMES.find(t => t.id === currentThemeId) || TechySimpleTheme;
  };

  const [theme, setThemeState] = useState<ThemeConfig>(getCurrentTheme());

  // Update theme when currentThemeId changes
  useEffect(() => {
    const newTheme = AVAILABLE_THEMES.find(t => t.id === currentThemeId) || TechySimpleTheme;
    setThemeState(newTheme);
    localStorage.setItem('theme_preference', currentThemeId);
    
    // Apply theme to document root for CSS variables
    applyThemeToRoot(newTheme, isDarkMode);
  }, [currentThemeId, isDarkMode]);

  // Apply theme colors as CSS variables
  const applyThemeToRoot = (theme: ThemeConfig, dark: boolean) => {
    const root = document.documentElement;
    const colors = dark && theme.darkMode ? theme.darkMode.colors : theme.colors;
    
    // Set CSS variables
    root.style.setProperty('--color-primary', colors.brand.primary);
    root.style.setProperty('--color-secondary', colors.brand.secondary);
    root.style.setProperty('--color-tertiary', colors.brand.tertiary);
    root.style.setProperty('--color-text-primary', colors.utility.primaryText);
    root.style.setProperty('--color-text-secondary', colors.utility.secondaryText);
    root.style.setProperty('--color-bg-primary', colors.utility.primaryBackground);
    root.style.setProperty('--color-bg-secondary', colors.utility.secondaryBackground);
    root.style.setProperty('--color-success', colors.semantic.success);
    root.style.setProperty('--color-error', colors.semantic.error);
    root.style.setProperty('--color-warning', colors.semantic.warning);
    root.style.setProperty('--color-info', colors.semantic.info);
  };

  const setTheme = (themeId: string) => {
    setCurrentThemeId(themeId);
  };

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('dark_mode', newDarkMode.toString());
  };

  const value: ThemeContextType = {
    theme,
    currentThemeId,
    isDarkMode,
    setTheme,
    toggleDarkMode,
    themes: AVAILABLE_THEMES,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

// Custom hook to use theme
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;