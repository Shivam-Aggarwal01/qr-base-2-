import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  category?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full';
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  closeOnOutsideClick?: boolean;
  closeOnEscape?: boolean;
  preventClose?: boolean;
  showCloseButton?: boolean;
  showKeyboardHints?: boolean;
  className?: string;
  bodyClassName?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

/**
 * Light-theme keyboard shortcut badge.
 * Hidden on mobile screens (<640px) and visible only on tablet/desktop.
 */
export const KeyboardBadge: React.FC<{
  children: React.ReactNode;
  className?: string;
  title?: string;
}> = ({ children, className = '', title }) => (
  <kbd
    title={title}
    className={`hidden sm:inline-flex items-center justify-center font-mono text-[10px] font-medium px-1.5 py-0.5 rounded border border-slate-200 bg-slate-100/90 text-slate-600 shadow-[0_1px_1px_rgba(0,0,0,0.04)] select-none pointer-events-none ${className}`}
  >
    {children}
  </kbd>
);

const MAX_WIDTH_CLASSES: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  full: 'max-w-[calc(100vw-2rem)]',
};

/**
 * Universal Modal Parent Component
 * - Unifies design across Item, Equipment, Location, Requests, and QR modules
 * - Outside click detection with drag-safety
 * - Escape key to close
 * - Light-themed keyboard indicators (hidden on mobile devices)
 * - Accessible dialog attributes
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  category,
  icon,
  children,
  maxWidth = 'md',
  headerActions,
  footer,
  closeOnOutsideClick = true,
  closeOnEscape = true,
  preventClose = false,
  showCloseButton = true,
  showKeyboardHints = false,
  className = '',
  bodyClassName = 'p-6',
  ariaLabel,
  ariaDescribedBy,
}) => {
  const modalContentRef = useRef<HTMLDivElement>(null);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  // Keyboard shortcut listener (Escape & Cmd/Ctrl+Enter for form submit)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Escape key to dismiss
      if (event.key === 'Escape' && closeOnEscape && !preventClose) {
        event.preventDefault();
        onClose();
        return;
      }

      // Cmd+Enter or Ctrl+Enter to submit closest form
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && !preventClose) {
        if (modalContentRef.current) {
          const form = modalContentRef.current.querySelector('form');
          if (form) {
            // Find submit button in form or dispatch submit
            const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;
            if (submitBtn && !submitBtn.disabled) {
              submitBtn.click();
            } else if (!submitBtn) {
              form.requestSubmit?.();
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, closeOnEscape, preventClose]);

  if (!isOpen) return null;

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    mouseDownTargetRef.current = e.target;
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if the mousedown AND mouseup both happened on the backdrop overlay itself
    if (
      closeOnOutsideClick &&
      !preventClose &&
      mouseDownTargetRef.current === e.currentTarget &&
      e.target === e.currentTarget
    ) {
      onClose();
    }
    mouseDownTargetRef.current = null;
  };

  const maxWidthClass = MAX_WIDTH_CLASSES[maxWidth] || maxWidth;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel || (typeof title === 'string' ? title : 'Modal Dialog')}
      aria-describedby={ariaDescribedBy}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[var(--color-idea-text)]/60 backdrop-blur-xs transition-opacity duration-150 overflow-y-auto"
    >
      <div
        ref={modalContentRef}
        onClick={(e) => e.stopPropagation()}
        className={`bg-white border border-[var(--color-idea-border)] shadow-2xl rounded-2xl w-full ${maxWidthClass} max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto ${className}`}
      >
        {/* Modal Header */}
        {(title || category || showCloseButton) && (
          <div className="px-5 sm:px-6 py-4 border-b border-[var(--color-idea-border)] flex items-center justify-between shrink-0 bg-white">
            <div className="flex items-center gap-3 min-w-0 pr-2">
              {icon && (
                <div className="p-2 sm:p-2.5 rounded-xl bg-[var(--color-idea-light-grey)] text-[var(--color-idea-blue)] shrink-0">
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                {category && (
                  <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-[var(--color-idea-muted)] truncate">
                    {category}
                  </p>
                )}
                {title && (
                  <h3 className="font-bold text-[var(--color-idea-text)] text-base sm:text-lg leading-tight truncate mt-0.5">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-xs text-[var(--color-idea-muted)] mt-0.5 line-clamp-1">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {headerActions}
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  disabled={preventClose}
                  className="p-1.5 sm:p-2 text-[var(--color-idea-muted)] hover:text-[var(--color-idea-text)] hover:bg-[var(--color-idea-light-grey)] rounded-xl transition-colors cursor-pointer disabled:opacity-50 min-h-[36px] min-w-[36px] flex items-center justify-center"
                  aria-label="Close dialog"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className={`overflow-y-auto flex-1 ${bodyClassName}`}>
          {children}
        </div>

        {/* Optional Modal Footer */}
        {footer && (
          <div className="px-5 sm:px-6 py-3.5 border-t border-[var(--color-idea-border)] bg-[var(--color-idea-light-grey)]/40 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
