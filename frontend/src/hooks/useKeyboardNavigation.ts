/**
 * ACCESSPREP-X — useKeyboardNavigation Hook
 * Registers accessible keyboard shortcuts while ignoring events inside text inputs.
 */

import { useEffect } from 'react';

export type KeyboardShortcutMap = Record<string, (event: KeyboardEvent) => void>;

export function useKeyboardNavigation(shortcuts: KeyboardShortcutMap, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isInputFocused =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (isInputFocused && event.key !== 'Escape') {
        return;
      }

      const handler = shortcuts[event.key] || shortcuts[event.key.toLowerCase()];
      if (handler) {
        handler(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}
