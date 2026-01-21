import { useEffect, useRef } from 'react';

/**
 * Custom hook to enable touch scrolling on elements
 * Works around Chromium/Wayland touch scrolling issues
 */
export function useTouchScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let startY = 0;
    let startX = 0;
    let startScrollTop = 0;
    let startScrollLeft = 0;
    let isScrolling = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        startY = e.touches[0].clientY;
        startX = e.touches[0].clientX;
        startScrollTop = element.scrollTop;
        startScrollLeft = element.scrollLeft;
        isScrolling = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isScrolling || e.touches.length !== 1) return;

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const deltaY = startY - currentY;
      const deltaX = startX - currentX;

      // Check if element can scroll vertically
      const canScrollVertically = element.scrollHeight > element.clientHeight;
      // Check if element can scroll horizontally
      const canScrollHorizontally = element.scrollWidth > element.clientWidth;

      if (canScrollVertically) {
        element.scrollTop = startScrollTop + deltaY;
      }

      if (canScrollHorizontally) {
        element.scrollLeft = startScrollLeft + deltaX;
      }

      // Prevent default only if we're actually scrolling this element
      if ((canScrollVertically && Math.abs(deltaY) > 5) ||
          (canScrollHorizontally && Math.abs(deltaX) > 5)) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      isScrolling = false;
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  return ref;
}

export default useTouchScroll;
