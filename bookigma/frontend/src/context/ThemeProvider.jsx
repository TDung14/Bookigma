import { useCallback, useEffect, useMemo, useState } from 'react';
import { ThemeContext } from './contexts';
import { load, save } from '../lib/storage';

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => load('theme', 'light') === 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    save('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = useCallback(() => setIsDark((v) => !v), []);
  const value = useMemo(() => ({ isDark, toggleTheme }), [isDark, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
