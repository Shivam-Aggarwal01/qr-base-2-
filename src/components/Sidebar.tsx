import React from 'react';
import {
  LayoutDashboard,
  Box,
  Layers,
  ClipboardList,
  MapPin,
  History,
  QrCode,
  Users
} from 'lucide-react';
import { ViewMode } from '../types/inventory';

interface SidebarProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  pendingRequestsCount: number;
  onOpenScanner: () => void;
  userRole?: 'ADMIN' | 'STUDENT_AMBASSADOR' | 'STUDENT';
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  pendingRequestsCount,
  onOpenScanner,
  userRole = 'STUDENT'
}) => {
  const isStudent = userRole === 'STUDENT';
  const menuItems = isStudent
    ? [
        { id: 'requests' as ViewMode, label: 'Requests', icon: ClipboardList, badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined },
        { id: 'dashboard' as ViewMode, label: 'Dashboard', icon: LayoutDashboard }
      ]
    : [
        { id: 'dashboard' as ViewMode, label: 'Dashboard', icon: LayoutDashboard },
        { id: 'inventory' as ViewMode, label: 'Inventory', icon: Box },
        { id: 'assets' as ViewMode, label: 'Assets', icon: Layers },
        {
          id: 'requests' as ViewMode,
          label: 'Requests',
          icon: ClipboardList,
          badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined
        },
        { id: 'locations' as ViewMode, label: 'Locations', icon: MapPin },
        { id: 'activity' as ViewMode, label: 'Activity', icon: History },
        { id: 'qr-sheet' as ViewMode, label: 'QR Labels', icon: QrCode },
        { id: 'users' as ViewMode, label: 'User Directory', icon: Users }
      ];

  return (
    <aside className="w-64 bg-[#1A1A1A] text-white p-6 flex flex-col justify-between shrink-0 h-full overflow-y-auto border-r border-[#1A1A1A] relative select-none">
      {/* Decorative Gold Top Accent Line */}
      <div className="absolute top-0 left-0 w-full h-1 bg-[#D4AF37]" />

      <div className="space-y-8 mt-2">
        {/* Navigation Category Label */}
        <div>
          <h3 className="text-[10px] font-mono font-bold text-[#D4AF37] uppercase tracking-[0.25em] mb-4 px-2">
            System Index
          </h3>
          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectView(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                    isActive
                      ? 'bg-[#D4AF37] text-[#1A1A1A] border-[#D4AF37]'
                      : 'text-[#EBE5DE]/70 border-transparent hover:border-[#D4AF37]/40 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#1A1A1A]' : 'text-[#D4AF37]'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="bg-[#D4AF37] text-[#1A1A1A] text-[9px] px-2 py-0.5 font-mono font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* QR Quick Scanner Widget & Vertical Editorial Tag */}
      <div className="mt-8 pt-6 border-t border-white/10 space-y-4">
        <div className="border border-[#D4AF37]/30 bg-white/5 p-4 text-white relative overflow-hidden">
          <p className="text-[9px] font-mono uppercase text-[#D4AF37] tracking-[0.2em] mb-1">Live QR Scanner</p>
          <p className="text-xs font-serif font-bold text-[#F9F8F6] leading-snug mb-3">
            Scan Box QR or Fixed Asset Tag
          </p>
          <button
            onClick={onOpenScanner}
            className="w-full py-3 bg-[#D4AF37] hover:bg-white text-[#1A1A1A] border border-[#D4AF37] flex items-center justify-center gap-2 transition-colors cursor-pointer font-mono text-xs font-bold uppercase tracking-wider"
          >
            <QrCode className="w-4 h-4" />
            <span>Launch Scanner</span>
          </button>
        </div>

        <div className="text-center pt-2">
          <p className="text-[9px] font-mono tracking-[0.25em] text-[#EBE5DE]/40 uppercase">
            LABLOGIC • VOL. 01 • 2026
          </p>
        </div>
      </div>
    </aside>
  );
};
