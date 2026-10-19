import React, { useRef } from 'react';
import { ChevronRight } from 'lucide-react';

interface SidebarSwipeRevealProps {
  isCollapsed: boolean;
  onExpand: () => void;
}

/**
 * SidebarSwipeReveal renders an edge gesture detector and docked reveal button
 * allowing users to swipe or click to bring back the collapsed left panel.
 */
export const SidebarSwipeReveal: React.FC<SidebarSwipeRevealProps> = ({
  isCollapsed,
  onExpand,
}) => {
  const edgeTouchStartXRef = useRef<number | null>(null);
  const edgeTouchStartYRef = useRef<number | null>(null);

  if (!isCollapsed) return null;

  const handleEdgeTouchStart = (e: React.TouchEvent) => {
    edgeTouchStartXRef.current = e.touches[0].clientX;
    edgeTouchStartYRef.current = e.touches[0].clientY;
  };

  const handleEdgeTouchEnd = (e: React.TouchEvent) => {
    if (edgeTouchStartXRef.current === null) return;
    const clientX = e.changedTouches[0].clientX;
    const clientY = e.changedTouches[0].clientY;
    const deltaX = clientX - edgeTouchStartXRef.current;
    const deltaY = clientY - (edgeTouchStartYRef.current || 0);

    if (deltaX > 35 && Math.abs(deltaX) > Math.abs(deltaY)) {
      onExpand();
    }
    edgeTouchStartXRef.current = null;
    edgeTouchStartYRef.current = null;
  };

  return (
    <>
      {/* Edge swipe detector when sidebar is collapsed */}
      <div
        onTouchStart={handleEdgeTouchStart}
        onTouchEnd={handleEdgeTouchEnd}
        className="fixed top-0 left-0 w-8 h-full z-25 pointer-events-auto"
        aria-hidden="true"
      />

      
    </>
  );
};
