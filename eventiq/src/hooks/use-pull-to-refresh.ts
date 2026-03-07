"use client";

import { useRef, useEffect, useCallback, useState } from "react";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number; // px to pull before triggering (default 80)
  maxPull?: number; // max pull distance (default 120)
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 120,
}: UsePullToRefreshOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const pulling = useRef(false);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (isRefreshing) return;
      const el = containerRef.current;
      if (!el || el.scrollTop > 0) return;
      touchStartY.current = e.touches[0].clientY;
      pulling.current = true;
    },
    [isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!pulling.current || isRefreshing) return;
      const el = containerRef.current;
      if (!el || el.scrollTop > 0) {
        pulling.current = false;
        setPullDistance(0);
        return;
      }
      const deltaY = e.touches[0].clientY - touchStartY.current;
      if (deltaY > 0) {
        // Apply resistance — pull slows as it extends
        const distance = Math.min(deltaY * 0.5, maxPull);
        setPullDistance(distance);
        if (distance > 10) e.preventDefault();
      }
    },
    [isRefreshing, maxPull]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold * 0.5); // Settle at half threshold during refresh
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd);

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    containerRef,
    pullDistance,
    isRefreshing,
    isPulling: pullDistance > 0,
    isReady: pullDistance >= threshold,
  };
}
