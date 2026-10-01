import React from 'react';
import { LayoutDashboard, Box, Layers, ClipboardList, MapPin, History, Users } from 'lucide-react';
import { User, ViewMode } from '../types/inventory';
import { isStudent } from '../services/authRoles';

interface SidebarProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  pendingRequestsCount: number;
  pendingAccountCount?: number;
  userRole?: User['role'];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  pendingRequestsCount,
  pendingAccountCount = 0,
  userRole = 'STUDENT',
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
  ];

  const menuItems = studentMode ? studentMenuItems : staffMenuItems;
  return (
    <aside className="w-full md:w-64 bg-[var(--color-idea-deep-blue)] text-white p-2 md:p-6 flex flex-row md:flex-col shrink-0 md:h-full overflow-x-auto md:overflow-y-auto relative select-none border-t md:border-t-0 border-white/10 z-40">
      <div className="idea-accent-bar absolute top-0 left-0 w-full hidden md:block" />
      <div className="w-full md:mt-2">
        <div className="w-full">
          <h3 className="hidden md:block text-[10px] font-bold text-white uppercase tracking-[0.25em] mb-4 px-2">Navigation</h3>
          <nav className="flex flex-row md:flex-col gap-2 md:gap-0 md:space-y-1 w-full justify-around md:justify-start">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectView(item.id)}
                  className={`relative flex flex-col md:flex-row items-center justify-center md:justify-between px-3 md:px-3.5 py-2 md:py-3 text-xs font-semibold rounded-xl transition-all cursor-pointer shrink-0 md:w-full ${
                    isActive ? 'bg-white/20 text-white shadow-sm' : 'text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex flex-col md:flex-row items-center gap-1 md:gap-3">
                    <Icon className={`w-5 h-5 md:w-4 md:h-4 ${isActive ? 'text-[var(--color-idea-blue)]' : 'text-white/50'}`} />
                    <span className="text-[10px] md:text-xs whitespace-nowrap">{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="absolute md:static top-0 right-0 md:translate-x-0 md:translate-y-0 translate-x-1/4 -translate-y-1/4 bg-[var(--color-idea-blue)] text-white text-[9px] px-1.5 md:px-2 py-0.5 rounded-full font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </aside>
  );
};
