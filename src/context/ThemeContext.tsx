import React, { createContext, useContext, useEffect } from 'react';

export type Theme = 'light';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  resolvedTheme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
  isDark: false,
});

/**
 * ThemeProvider enforces light theme globally across CrestFlow.
 * Modes (dark / auto) have been completely removed per design standards.
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');

    try {
      localStorage.removeItem('crestflow_theme');
    } catch {
      // Ignore storage errors
    }
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme: 'light',
        resolvedTheme: 'light',
        setTheme: () => {},
        toggleTheme: () => {},
        isDark: false,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  return useContext(ThemeContext);
};
