import React, { useLayoutEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useTheme } from '../../../context/ThemeContext';

export const AuthLayout: React.FC = () => {
  const { theme } = useTheme();

  useLayoutEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    const enforceLight = () => {
      if (root.classList.contains('dark')) root.classList.remove('dark');
      if (body.classList.contains('dark')) body.classList.remove('dark');
      if (root.style.colorScheme !== 'light') root.style.colorScheme = 'light';
      if (body.style.colorScheme !== 'light') body.style.colorScheme = 'light';
    };

    enforceLight();

    // Guard against any external attempts to add .dark to <html> or <body> while on auth pages
    const observer = new MutationObserver(() => {
      if (root.classList.contains('dark') || body.classList.contains('dark')) {
        enforceLight();
      }
    });

    observer.observe(root, { attributes: true, attributeFilter: ['class', 'style'] });
    observer.observe(body, { attributes: true, attributeFilter: ['class', 'style'] });

    return () => {
      observer.disconnect();

      // Restore user's global theme when navigating away to in-app pages
      const savedTheme = (localStorage.getItem('taskflow_theme') as 'dark' | 'light' | null) || theme;
      if (savedTheme === 'dark') {
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
    };
  }, [theme]);

  return (
    <div
      className="tf-auth-theme w-full min-h-screen bg-white text-[#20140F] font-sans antialiased select-none"
      style={{ colorScheme: 'light' }}
    >
      <Outlet />
    </div>
  );
};

export default AuthLayout;
