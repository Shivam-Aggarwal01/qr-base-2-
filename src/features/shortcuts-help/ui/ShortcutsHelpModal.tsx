import React, { useEffect } from 'react';
import { X, Command, Keyboard } from 'lucide-react';
import { KbdBadge } from '../../../shared/ui/KbdBadge';
import { useFocusTrap } from '../../../shared/lib/focusTrap';

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

export const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({ isOpen, onClose }) => {
  const modalRef = useFocusTrap(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sections: { title: string; shortcuts: ShortcutItem[] }[] = [
    {
      title: 'Global Quick Actions',
      shortcuts: [
        { keys: ['Q'], description: 'Open QR Scanner camera' },
        { keys: ['⌘', 'K'], description: 'Open QR Scanner (or Ctrl+K)' },
        { keys: ['N'], description: 'Create new request or asset' },
        { keys: ['/'], description: 'Focus search bar' },
        { keys: ['?'], description: 'Show keyboard shortcuts help' },
        { keys: ['Esc'], description: 'Close modal, drawer, or clear search' },
      ],
    },
    {
      title: 'Navigation Keys (1 – 7)',
      shortcuts: [
        { keys: ['1'], description: 'Go to Overview / Dashboard' },
        { keys: ['2'], description: 'Go to Inventory' },
        { keys: ['3'], description: 'Go to Equipment / Assets' },
        { keys: ['4'], description: 'Go to Requests' },
        { keys: ['5'], description: 'Go to Locations' },
        { keys: ['6'], description: 'Go to Activity Log' },
        { keys: ['7'], description: 'Go to Directory / Members' },
      ],
    },
    {
      title: 'Accessibility & Forms',
      shortcuts: [
        { keys: ['Tab'], description: 'Navigate forward through interactive elements' },
        { keys: ['Shift', 'Tab'], description: 'Navigate backward' },
        { keys: ['Enter'], description: 'Activate button or submit form' },
        { keys: ['Space'], description: 'Toggle checkbox or dropdown button' },
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150 focus:outline-none"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h2 id="shortcuts-dialog-title" className="text-base font-semibold text-slate-900">
                Keyboard Shortcuts
              </h2>
              <p className="text-xs text-slate-500">Quickly navigate and operate the lab inventory</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shortcuts dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto space-y-6">
          {sections.map((section) => (
            <div key={section.title} className="space-y-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {section.title}
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {section.shortcuts.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <span className="text-xs text-slate-700">{item.description}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.keys.map((k, kIdx) => (
                        <KbdBadge key={kIdx}>{k}</KbdBadge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Command className="w-3.5 h-3.5" />
            <span>Press <KbdBadge>?</KbdBadge> anytime to open this guide</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
