import { useState, useCallback } from 'react';

const STORAGE_KEY = 'crestflow_sidebar_collapsed';

/**
 * useSidebarCollapse provides state and swipe/click controls for collapsing
 * and revealing the primary navigation sidebar.
 */
export function useSidebarCollapse() {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  }, []);

  const collapseSidebar = useCallback(() => {
    setIsCollapsed(true);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {}
  }, []);

  const expandSidebar = useCallback(() => {
    setIsCollapsed(false);
    try {
      localStorage.setItem(STORAGE_KEY, 'false');
    } catch {}
  }, []);

  return {
    isCollapsed,
    toggleSidebar,
    collapseSidebar,
    expandSidebar,
  };
}
