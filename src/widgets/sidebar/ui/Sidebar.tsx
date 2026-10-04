import React, { useEffect, useRef } from 'react';
import { LayoutDashboard, Box, Layers, ClipboardList, MapPin, History, Users, X } from 'lucide-react';
import { User, ViewMode } from '../../../shared/types/inventory';
import { isStudent } from '../../../shared/lib';
import { Link } from 'react-router-dom';

export interface SidebarProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  pendingRequestsCount: number;
  pendingAccountCount?: number;
  userRole?: User['role'];
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface MenuItem {
  id: ViewMode;
  label: string;
  icon: React.ElementType;
  badge?: number;
  shortcutNumber?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  pendingRequestsCount,
  pendingAccountCount = 0,
  userRole = 'STUDENT',
  mobileOpen = false,
  onCloseMobile,
}) => {
  const studentMode = isStudent(userRole);
  const mobileDrawerRef = useRef<HTMLDivElement | null>(null);

  // Close mobile drawer on Escape key
  useEffect(() => {
    if (!mobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onCloseMobile) {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, onCloseMobile]);

  const menuItems: MenuItem[] = studentMode
    ? [
        {
          id: 'dashboard',
          label: 'Overview',
          icon: LayoutDashboard,
          shortcutNumber: '1',
        },
        {
          id: 'inventory',
          label: 'Inventory',
          icon: Box,
          shortcutNumber: '2',
        },
        {
          id: 'requests',
          label: 'Requests',
          icon: ClipboardList,
          badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
          shortcutNumber: '4',
        },
      ]
    : [
        {
          id: 'dashboard',
          label: 'Overview',
          icon: LayoutDashboard,
          shortcutNumber: '1',
        },
        {
          id: 'inventory',
          label: 'Inventory',
          icon: Box,
          shortcutNumber: '2',
        },
        {
          id: 'assets',
          label: 'Equipment',
          icon: Layers,
          shortcutNumber: '3',
        },
        {
          id: 'requests',
          label: 'Requests',
          icon: ClipboardList,
          badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
          shortcutNumber: '4',
        },
        {
          id: 'locations',
          label: 'Locations',
          icon: MapPin,
          shortcutNumber: '5',
        },
        {
          id: 'activity',
          label: 'Activity',
          icon: History,
          shortcutNumber: '6',
        },
        {
          id: 'users',
          label: 'Directory',
          icon: Users,
          badge: pendingAccountCount > 0 ? pendingAccountCount : undefined,
          shortcutNumber: '7',
        },
      ];

  const handleItemClick = (id: ViewMode) => {
    onSelectView(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const renderMenuItem = (item: MenuItem, isMobileBar = false) => {
    const Icon = item.icon;
    const isActive = currentView === item.id;

    if (isMobileBar) {
      return (
        <button
          key={item.id}
          type="button"
          onClick={() => handleItemClick(item.id)}
          aria-current={isActive ? 'page' : undefined}
          aria-label={item.label}
          className={`
            relative flex flex-col items-center justify-center
            min-w-[64px] py-1.5 px-1 rounded-xl
            transition-all duration-150 cursor-pointer
            focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none
            ${isActive ? 'bg-white/15 text-white font-medium' : 'text-white/60 hover:text-white hover:bg-white/5'}
          `}
        >
          <div className="relative">
            <Icon className="w-5 h-5 shrink-0" />
            {item.badge !== undefined && item.badge > 0 && (
              <span className="absolute -top-1 -right-2 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[var(--color-idea-amber)] text-white">
                {item.badge}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 leading-tight tracking-tight truncate max-w-[60px]">
            {item.label}
          </span>
        </button>
      );
    }

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => handleItemClick(item.id)}
        aria-current={isActive ? 'page' : undefined}
        className={`
          w-full flex items-center justify-between
          px-3.5 py-2.5 rounded-xl
          text-xs font-medium
          transition-all duration-150 group cursor-pointer
          focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none
          ${
            isActive
              ? 'bg-white/15 text-white shadow-sm font-semibold'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }
        `}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
          <span className="truncate">{item.label}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {item.badge !== undefined && item.badge > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--color-idea-amber)] text-white animate-pulse">
              {item.badge}
            </span>
          )}
        </div>
      </button>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        aria-label="Desktop Navigation"
        className="
          hidden md:flex flex-col
          w-60 lg:w-64 shrink-0
          bg-[var(--color-idea-deep-blue)]
          text-white
          border-r border-white/10
          relative select-none
        "
      >
        <div className="idea-accent-bar absolute top-0 left-0 w-full" />

        <div className="p-4 border-b border-white/10">
          <p className="text-[10px] uppercase font-bold tracking-wider text-white/50">Navigation</p>
        </div>

        <nav aria-label="Main Menu" className="flex-1 overflow-y-auto p-3 space-y-1">
          {menuItems.map((item) => renderMenuItem(item))}
        </nav>

        <div className="shrink-0 p-4 border-t border-white/10">
          <p className="text-[10px] text-white/40 mb-2">© {new Date().getFullYear()} AICTE IDEA LAB</p>
          <div className="flex items-center gap-2 text-[10px]">
            <Link to="/privacy" className="text-white/60 hover:text-white transition-colors focus-visible:underline">
              Privacy
            </Link>
            <span className="text-white/20">•</span>
            <Link to="/terms" className="text-white/60 hover:text-white transition-colors focus-visible:underline">
              Terms
            </Link>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 flex animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation drawer"
        >
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          <aside
            ref={mobileDrawerRef}
            className="
              relative
              w-72
              max-w-[82vw]
              bg-[var(--color-idea-deep-blue)]
              text-white
              shadow-2xl
              flex flex-col
              animate-in
              slide-in-from-left
              duration-200
            "
          >
            <div className="idea-accent-bar absolute top-0 left-0 w-full" />

            {/* Drawer Header */}
            <div className="h-16 px-5 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <img src="/logo.png" alt="AICTE IDEA Lab" className="h-8 w-auto object-contain" />
                <div>
                  <p className="text-xs font-bold">AICTE IDEA LAB</p>
                  <p className="text-[9px] text-white/50 uppercase tracking-wider mt-0.5">Inventory Management</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onCloseMobile}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 text-white/70 hover:bg-white/15 hover:text-white transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">{menuItems.map((item) => renderMenuItem(item))}</nav>

            {/* Mobile Footer */}
            <div className="shrink-0 px-5 py-4 border-t border-white/10">
              <p className="text-[10px] text-white/50 mb-2.5">© {new Date().getFullYear()} AICTE IDEA LAB</p>
              <div className="flex items-center gap-3 text-[10px]">
                <Link to="/privacy" onClick={onCloseMobile} className="text-white/60 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
                <span className="text-white/20">•</span>
                <Link to="/terms" onClick={onCloseMobile} className="text-white/60 hover:text-white transition-colors">
                  Terms
                </Link>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile Navigation"
        className="
          md:hidden
          shrink-0
          z-40
          bg-[var(--color-idea-deep-blue)]
          text-white
          border-t border-white/10
          overflow-x-auto
          overscroll-x-contain
          scrollbar-none
        "
      >
        <div className="flex items-center gap-1 px-2 py-1.5 min-w-max">
          {menuItems.map((item) => (
            <div key={item.id} className="relative">
              {renderMenuItem(item, true)}
            </div>
          ))}
        </div>
      </nav>
    </>
  );
};
