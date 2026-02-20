import { useCallback, useRef } from 'react';

/**
 * Custom hook to enable drag-to-scroll with momentum on elements.
 * Uses a callback ref so it works on conditionally-rendered elements
 * (e.g. popups/modals that don't exist at component mount time).
 * Uses the Pointer Events API for Chromium/Wayland compatibility.
 */
export function useTouchScroll<T extends HTMLElement>() {
  // Holds the cleanup function for the currently attached element
  const cleanupRef = useRef<(() => void) | null>(null);

  const ref = useCallback((element: T | null) => {
    // Clean up listeners from the previous element (or on unmount)
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    if (!element) return;

    let startY = 0;
    let startX = 0;
    let startScrollTop = 0;
    let startScrollLeft = 0;
    let isDragging = false;
    let isCapturing = false; // true only after scroll intent confirmed
    let activePointerId: number | null = null;
    let velocityY = 0;
    let velocityX = 0;
    let lastY = 0;
    let lastX = 0;
    let lastTime = 0;
    let rafId: number | null = null;

    // Minimum pixels of movement before we commit to a scroll gesture.
    // Keeps taps/clicks on child buttons working normally.
    const SCROLL_THRESHOLD = 8;

    const cancelMomentum = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      cancelMomentum();
      startY = e.clientY;
      startX = e.clientX;
      startScrollTop = element.scrollTop;
      startScrollLeft = element.scrollLeft;
      lastY = e.clientY;
      lastX = e.clientX;
      lastTime = Date.now();
      velocityY = 0;
      velocityX = 0;
      isDragging = true;
      isCapturing = false; // don't capture yet — wait for scroll intent
      activePointerId = e.pointerId;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging || e.pointerId !== activePointerId) return;

      const deltaY = startY - e.clientY;
      const deltaX = startX - e.clientX;

      // Only commit to scroll once the finger has moved past the threshold.
      // This allows taps/clicks on child elements to fire normally.
      if (!isCapturing) {
        if (Math.abs(deltaY) > SCROLL_THRESHOLD || Math.abs(deltaX) > SCROLL_THRESHOLD) {
          element.setPointerCapture(e.pointerId);
          isCapturing = true;
        } else {
          return;
        }
      }

      const now = Date.now();
      const dt = now - lastTime;
      if (dt > 0) {
        velocityY = (lastY - e.clientY) / dt;
        velocityX = (lastX - e.clientX) / dt;
      }
      lastY = e.clientY;
      lastX = e.clientX;
      lastTime = now;

      if (element.scrollHeight > element.clientHeight) {
        element.scrollTop = startScrollTop + deltaY;
      }
      if (element.scrollWidth > element.clientWidth) {
        element.scrollLeft = startScrollLeft + deltaX;
      }
    };

    const handlePointerUp = () => {
      if (!isDragging) return;
      isDragging = false;
      activePointerId = null;

      if (!isCapturing) {
        // Was a tap, not a scroll — no momentum needed
        isCapturing = false;
        return;
      }
      isCapturing = false;

      const decay = 0.92;
      const minVelocity = 0.05;

      const momentum = () => {
        velocityY *= decay;
        velocityX *= decay;

        if (Math.abs(velocityY) > minVelocity || Math.abs(velocityX) > minVelocity) {
          if (element.scrollHeight > element.clientHeight) {
            element.scrollTop += velocityY * 16;
          }
          if (element.scrollWidth > element.clientWidth) {
            element.scrollLeft += velocityX * 16;
          }
          rafId = requestAnimationFrame(momentum);
        } else {
          rafId = null;
        }
      };

      rafId = requestAnimationFrame(momentum);
    };

    element.addEventListener('pointerdown', handlePointerDown);
    element.addEventListener('pointermove', handlePointerMove);
    element.addEventListener('pointerup', handlePointerUp);
    element.addEventListener('pointercancel', handlePointerUp);

    cleanupRef.current = () => {
      cancelMomentum();
      element.removeEventListener('pointerdown', handlePointerDown);
      element.removeEventListener('pointermove', handlePointerMove);
      element.removeEventListener('pointerup', handlePointerUp);
      element.removeEventListener('pointercancel', handlePointerUp);
    };
  }, []);

  return ref;
}

export default useTouchScroll;
