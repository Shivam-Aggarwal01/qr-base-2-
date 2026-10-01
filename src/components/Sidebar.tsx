import React from 'react';
import {
  LayoutDashboard,
  Box,
  Layers,
  ClipboardList,
  MapPin,
  History,
  Users,
  ShieldCheck,
  Menu,
  X,
} from 'lucide-react';
import { User, ViewMode } from '../types/inventory';
import { isStudent } from '../services/authRoles';

interface SidebarProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  pendingRequestsCount: number;
  pendingAccountCount?: number;
  userRole?: User['role'];
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  onToggleMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  pendingRequestsCount,
  pendingAccountCount = 0,
  userRole = 'STUDENT',
  mobileOpen = false,
  onCloseMobile,
  onToggleMobile,
}) => {
  const studentMode = isStudent(userRole);

  const studentMenuItems = [
    {
      id: 'inventory' as ViewMode,
      label: 'Items',
      icon: Box,
    },
    {
      id: 'requests' as ViewMode,
      label: 'Requests',
      icon: ClipboardList,
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
    },
    {
      id: 'dashboard' as ViewMode,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'legal' as ViewMode,
      label: 'Legal & Policies',
      icon: ShieldCheck,
    },
  ];

  const staffMenuItems = [
    {
      id: 'dashboard' as ViewMode,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'inventory' as ViewMode,
      label: 'Items',
      icon: Box,
    },
    {
      id: 'assets' as ViewMode,
      label: 'Assets',
      icon: Layers,
    },
    {
      id: 'requests' as ViewMode,
      label: 'Requests',
      icon: ClipboardList,
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
    },
    {
      id: 'locations' as ViewMode,
      label: 'Locations',
      icon: MapPin,
    },
    {
      id: 'activity' as ViewMode,
      label: 'Ledger',
      icon: History,
    },
    {
      id: 'users' as ViewMode,
      label: 'User Directory',
      icon: Users,
      badge: pendingAccountCount > 0 ? pendingAccountCount : undefined,
    },
    {
      id: 'legal' as ViewMode,
      label: 'Legal & Policies',
      icon: ShieldCheck,
    },
  ];

  const menuItems = studentMode ? studentMenuItems : staffMenuItems;

  // On mobile bottom bar, show top 4 primary tabs + More button
  const mobileBottomItems = studentMode
    ? studentMenuItems
    : [
        staffMenuItems[0], // Dashboard
        staffMenuItems[1], // Items
        staffMenuItems[2], // Assets
        staffMenuItems[3], // Requests
      ];

  const handleItemClick = (id: ViewMode) => {
    onSelectView(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* ============================================================== */}
      {/* 1. Desktop Permanent Sidebar (md:flex)                        */}
      {/* ============================================================== */}
      <aside className="hidden md:flex w-64 bg-[var(--color-idea-deep-blue)] text-white p-5 flex-col shrink-0 h-full overflow-y-auto relative select-none z-30">
        <div className="idea-accent-bar absolute top-0 left-0 w-full" />

        <div className="w-full mt-2 flex flex-col justify-between flex-1">
          <div>
            <div className="px-3 mb-4">
              <span className="text-[10px] font-bold text-white/70 uppercase tracking-[0.22em]">
                Lab Navigation
              </span>
            </div>

            <nav className="space-y-1.5 w-full">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className={`group w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white/20 text-white shadow-sm'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${
                          isActive ? 'text-[var(--color-idea-blue)]' : 'text-white/60'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge !== undefined && (
                      <span className="bg-[var(--color-idea-blue)] text-white text-[9px] px-2 py-0.5 rounded-full font-bold shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Institutional Stamp in Desktop Sidebar Footer */}
          <div className="mt-8 pt-4 border-t border-white/10 px-3">
            <div className="flex items-center justify-between text-[10px] text-white/60">
              <span className="font-semibold text-white/80">AICTE IDEA LAB</span>
              <span>v1.2</span>
            </div>
            <p className="mt-1 text-[9px] text-white/50 leading-relaxed">
              Standardized laboratory inventory & asset tracking.
            </p>
          </div>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* 2. Mobile Drawer Modal (when mobileOpen is true)               */}
      {/* ============================================================== */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Drawer content */}
          <div className="relative w-72 max-w-[80vw] bg-[var(--color-idea-deep-blue)] text-white h-full flex flex-col p-5 shadow-2xl z-10 overflow-y-auto">
            <div className="idea-accent-bar absolute top-0 left-0 w-full" />

            <div className="flex items-center justify-between mt-2 pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <img src="/logo.png" alt="AICTE IDEA Lab" className="h-8 w-auto object-contain" />
                <div>
                  <p className="text-xs font-bold leading-tight">AICTE IDEA LAB</p>
                  <p className="text-[9px] text-white/60 uppercase tracking-wider">Navigation Menu</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onCloseMobile}
                className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <nav className="mt-4 space-y-1.5 flex-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-3 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white/20 text-white shadow-sm'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-[var(--color-idea-blue)]' : 'text-white/60'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge !== undefined && (
                      <span className="bg-[var(--color-idea-blue)] text-white text-[9px] px-2 py-0.5 rounded-full font-bold shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-white/10 text-[10px] text-white/60">
              <p>© {new Date().getFullYear()} AICTE IDEA Lab</p>
              <button
                type="button"
                onClick={() => handleItemClick('legal')}
                className="mt-1 text-[var(--color-idea-blue)] hover:underline"
              >
                Privacy Policy & Terms
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. Mobile Bottom Tab Bar (md:hidden)                           */}
      {/* ============================================================== */}
      <div className="md:hidden bg-[var(--color-idea-deep-blue)] text-white border-t border-white/10 shrink-0 z-20 px-2 py-1.5 flex items-center justify-around select-none">
        {mobileBottomItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all min-h-[44px] min-w-[50px] cursor-pointer ${
                isActive ? 'text-white bg-white/15' : 'text-white/70 hover:text-white'
              }`}
            >
              <Icon
                className={`w-4 h-4 transition-transform ${
                  isActive ? 'text-[var(--color-idea-blue)] scale-110' : 'text-white/60'
                }`}
              />
              <span className="text-[10px] font-medium mt-1 truncate max-w-[64px]">
                {item.label}
              </span>
              {item.badge !== undefined && (
                <span className="absolute top-0.5 right-1.5 bg-[var(--color-idea-blue)] text-white text-[8px] px-1.5 py-0.2 rounded-full font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* More Menu Button for remaining items on staff mode */}
        {!studentMode && (
          <button
            type="button"
            onClick={onToggleMobile}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all min-h-[44px] min-w-[50px] cursor-pointer ${
              mobileOpen ? 'text-white bg-white/20' : 'text-white/70 hover:text-white'
            }`}
          >
            <Menu className="w-4 h-4 text-white/70" />
            <span className="text-[10px] font-medium mt-1">More</span>
            {pendingAccountCount > 0 && (
              <span className="absolute top-0.5 right-1.5 bg-[var(--color-idea-blue)] text-white text-[8px] px-1.5 py-0.2 rounded-full font-bold">
                {pendingAccountCount}
              </span>
            )}
          </button>
        )}
      </div>
    </>
  );
};
