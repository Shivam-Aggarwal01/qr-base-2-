import React from 'react';

interface KbdBadgeProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export const KbdBadge: React.FC<KbdBadgeProps> = ({ children, className = '', title }) => {
  return (
    <kbd
      title={title}
      className={`inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-mono font-medium rounded border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-xs select-none ${className}`}
    >
      {children}
    </kbd>
  );
};
