import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const AUTH_ROUTES = ['/login', '/register', '/verify-otp', '/forgot-password', '/reset-password', '/auth/callback'];

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('taskflow_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return 'dark'; // Default to dark theme for main app
  });

  const isAuthRoute = AUTH_ROUTES.some(
    (route) => location.pathname === route || location.pathname.startsWith(route + '/')
  );

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (isAuthRoute) {
      root.classList.remove('dark');
      body.classList.remove('dark');
      root.style.colorScheme = 'light';
      body.style.colorScheme = 'light';
    } else {
      if (theme === 'dark') {
        root.classList.add('dark');
        body.classList.add('dark');
        root.style.colorScheme = 'dark';
        body.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        body.classList.remove('dark');
        root.style.colorScheme = 'light';
        body.style.colorScheme = 'light';
      }
    }
  }, [theme, isAuthRoute]);

  useEffect(() => {
    localStorage.setItem('taskflow_theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  const value = useMemo(
    () => ({ theme, toggleTheme, setTheme }),
    [theme, toggleTheme, setTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
