// frontend/src/config/themes/types.ts

export interface ColorSet {
  brand: {
    primary: string;
    secondary: string;
    tertiary: string;
    alternate: string;
  };
  utility: {
    primaryText: string;
    secondaryText: string;
    primaryBackground: string;
    secondaryBackground: string;
  };
  accent: {
    accent1: string;
    accent2: string;
    accent3: string;
    accent4: string;
  };
  semantic: {
    success: string;
    error: string;
    warning: string;
    info: string;
  };
}

export interface ThemeConfig {
  id: string;
  name: string;
  colors: ColorSet;
  darkMode?: {
    colors: ColorSet;
  };
}