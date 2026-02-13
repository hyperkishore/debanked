"use client";

import { useEffect } from "react";

interface KeyboardShortcuts {
  onNavigateUp?: () => void;
  onNavigateDown?: () => void;
  onSelect?: () => void;
  onEscape?: () => void;
  onSearch?: () => void;
  onToggleMet?: () => void;
}

export function useKeyboard(shortcuts: KeyboardShortcuts) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        shortcuts.onSearch?.();
        return;
      }

      if (e.key === "Escape") {
        shortcuts.onEscape?.();
        return;
      }

      if (isInput) return;

      switch (e.key) {
        case "j":
        case "ArrowDown":
          e.preventDefault();
          shortcuts.onNavigateDown?.();
          break;
        case "k":
        case "ArrowUp":
          e.preventDefault();
          shortcuts.onNavigateUp?.();
          break;
        case "Enter":
          e.preventDefault();
          shortcuts.onSelect?.();
          break;
        case "/":
          e.preventDefault();
          shortcuts.onSearch?.();
          break;
        case "m":
          shortcuts.onToggleMet?.();
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}
