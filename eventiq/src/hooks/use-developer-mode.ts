"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "eventiq_developer_mode";

export function useDeveloperMode() {
  const [devMode, setDevMode] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "true") setDevMode(true);
    } catch {}
  }, []);

  const toggleDevMode = useCallback(() => {
    setDevMode((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  }, []);

  return { devMode, toggleDevMode };
}
