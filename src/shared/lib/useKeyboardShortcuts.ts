import { useEffect } from 'react';

export interface ShortcutConfig {
  key: string; // e.g. '?', '/', 'q', 'k', '1', '2', etc.
  ctrlOrMeta?: boolean;
  alt?: boolean;
  shift?: boolean;
  description: string;
  category: 'Navigation' | 'Actions' | 'Dialogs';
  handler: (e: KeyboardEvent) => void;
  allowInInputs?: boolean;
}

export function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    target.isContentEditable
  );
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[], enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const inInput = isInputElement(event.target);

      for (const sc of shortcuts) {
        if (inInput && !sc.allowInInputs) continue;

        const keyMatches = event.key.toLowerCase() === sc.key.toLowerCase();
        const ctrlMetaMatches = sc.ctrlOrMeta ? event.metaKey || event.ctrlKey : !event.metaKey && !event.ctrlKey;
        const altMatches = sc.alt ? event.altKey : !event.altKey;
        const shiftMatches = sc.shift !== undefined ? event.shiftKey === sc.shift : true;

        if (keyMatches && ctrlMetaMatches && altMatches && shiftMatches) {
          event.preventDefault();
          sc.handler(event);
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}
