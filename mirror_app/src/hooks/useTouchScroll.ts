import { useEffect, useRef } from 'react';

/**
 * Custom hook to enable drag-to-scroll on elements.
 * Uses the Pointer Events API instead of Touch Events because
 * Chromium on Wayland (RPi) does not reliably fire touchstart/touchmove.
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
    let isDragging = false;

    const handlePointerDown = (e: PointerEvent) => {
      startY = e.clientY;
      startX = e.clientX;
      startScrollTop = element.scrollTop;
      startScrollLeft = element.scrollLeft;
      isDragging = true;
      // Capture so pointermove keeps firing even if pointer leaves the element
      element.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return;

      const deltaY = startY - e.clientY;
      const deltaX = startX - e.clientX;

      if (element.scrollHeight > element.clientHeight) {
        element.scrollTop = startScrollTop + deltaY;
      }
      if (element.scrollWidth > element.clientWidth) {
        element.scrollLeft = startScrollLeft + deltaX;
      }
    };

    const handlePointerUp = () => {
      isDragging = false;
    };

    element.addEventListener('pointerdown', handlePointerDown);
    element.addEventListener('pointermove', handlePointerMove);
    element.addEventListener('pointerup', handlePointerUp);
    element.addEventListener('pointercancel', handlePointerUp);

    return () => {
      element.removeEventListener('pointerdown', handlePointerDown);
      element.removeEventListener('pointermove', handlePointerMove);
      element.removeEventListener('pointerup', handlePointerUp);
      element.removeEventListener('pointercancel', handlePointerUp);
    };
  }, []);

  return ref;
}

export default useTouchScroll;
