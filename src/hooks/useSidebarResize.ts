import type React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';

export const DEFAULT_SIDEBAR_WIDTH = 256;
export const MIN_SIDEBAR_WIDTH = 68;
export const ICON_ONLY_THRESHOLD = 148;
export const MAX_SIDEBAR_WIDTH = 480;
export const SIDEBAR_WIDTH_STORAGE_KEY = 'crestflow_sidebar_width';

export interface UseSidebarResizeOptions {
  minWidth?: number;
  maxWidth?: number;
  defaultWidth?: number;
}

/**
 * useSidebarResize provides fluid drag-to-resize state and persistence
 * for the desktop navigation sidebar.
 */
export function useSidebarResize(options: UseSidebarResizeOptions = {}) {
  const minWidth = options.minWidth ?? MIN_SIDEBAR_WIDTH;
  const maxWidth = options.maxWidth ?? MAX_SIDEBAR_WIDTH;
  const defaultWidth = options.defaultWidth ?? DEFAULT_SIDEBAR_WIDTH;

  const [width, setWidth] = useState<number>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
        if (saved) {
          const parsed = parseInt(saved, 10);
          if (!isNaN(parsed) && parsed >= minWidth && parsed <= maxWidth) {
            return parsed;
          }
        }
      }
    } catch {}
    return defaultWidth;
  });

  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(width);

  useEffect(() => {
    if (!isResizing) {
      startWidthRef.current = width;
    }
  }, [width, isResizing]);

  const startResizing = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    setIsResizing(true);
  }, [width]);

  const resetWidth = useCallback(() => {
    setWidth(defaultWidth);
    try {
      window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(defaultWidth));
    } catch {}
  }, [defaultWidth]);

  const stepWidth = useCallback((delta: number) => {
    setWidth((prev) => {
      const next = Math.min(maxWidth, Math.max(minWidth, prev + delta));
      try {
        window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  }, [minWidth, maxWidth]);

  useEffect(() => {
    if (!isResizing) return;

    const handlePointerMove = (e: PointerEvent) => {
      const delta = e.clientX - startXRef.current;
      const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidthRef.current + delta));
      setWidth(newWidth);
    };

    const handlePointerUp = () => {
      setIsResizing(false);
      setWidth((currentWidth) => {
        try {
          window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(currentWidth));
        } catch {}
        return currentWidth;
      });
    };

    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isResizing, minWidth, maxWidth]);

  return {
    width,
    isIconOnly: width < ICON_ONLY_THRESHOLD,
    isResizing,
    startResizing,
    resetWidth,
    stepWidth,
    minWidth,
    maxWidth,
    defaultWidth,
  };
}
