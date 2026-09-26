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
    <aside className="w-64 bg-[var(--color-idea-deep-blue)] text-white p-6 flex flex-col justify-between shrink-0 h-full overflow-y-auto relative select-none">
      <div className="idea-accent-bar absolute top-0 left-0 w-full" />
      <div className="space-y-8 mt-2">
        <div>
          <h3 className="text-[10px] font-bold text-white uppercase tracking-[0.25em] mb-4 px-2">Navigation</h3>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectView(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                    isActive ? 'bg-white/20 text-white shadow-sm' : 'text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[var(--color-idea-blue)]' : 'text-white/50'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="bg-[var(--color-idea-blue)] text-white text-[9px] px-2 py-0.5 rounded-full font-bold">
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
