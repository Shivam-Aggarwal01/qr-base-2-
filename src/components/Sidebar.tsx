import React from 'react';
import { LayoutDashboard, Box, Layers, ClipboardList, MapPin, History, Users, X } from 'lucide-react';
import { User, ViewMode } from '../types/inventory';
import { isStudent } from '../services/authRoles';
import { Link } from 'react-router-dom';

interface SidebarProps {
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

  const menuItems: MenuItem[] = studentMode
    ? [
        {
          id: 'dashboard',
          label: 'Overview',
          icon: LayoutDashboard,
        },
        {
          id: 'inventory',
          label: 'Inventory',
          icon: Box,
        },
        {
          id: 'requests',
          label: 'Requests',
          icon: ClipboardList,
          badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
        },
      ]
    : [
        {
          id: 'dashboard',
          label: 'Overview',
          icon: LayoutDashboard,
        },
        {
          id: 'inventory',
          label: 'Inventory',
          icon: Box,
        },
        {
          id: 'assets',
          label: 'Equipment',
          icon: Layers,
        },
        {
          id: 'requests',
          label: 'Requests',
          icon: ClipboardList,
          badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
        },
        {
          id: 'locations',
          label: 'Locations',
          icon: MapPin,
        },
        {
          id: 'activity',
          label: 'Activity',
          icon: History,
        },
        ...(userRole === 'ADMIN'
          ? [
              {
                id: 'users' as ViewMode,
                label: 'Directory',
                icon: Users,
                badge: pendingAccountCount > 0 ? pendingAccountCount : undefined,
              },
            ]
          : []),
      ];

  const handleItemClick = (view: ViewMode) => {
    onSelectView(view);
    onCloseMobile?.();
  };

  const renderMenuItem = (item: MenuItem, mobile = false) => {
    const Icon = item.icon;
    const isActive = currentView === item.id;

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => handleItemClick(item.id)}
        className={`
          ${mobile ? 'shrink-0 min-w-[78px] px-3' : 'w-full px-3.5'}
          flex items-center
          ${mobile ? 'justify-center' : 'justify-between'}
          gap-2.5
          ${mobile ? 'h-14 rounded-xl' : 'py-3 rounded-xl'}
          text-left
          text-xs
          font-medium
          transition-colors
          cursor-pointer
          ${
            isActive
              ? mobile
                ? 'bg-white/15 text-white'
                : 'bg-white/15 text-white'
              : 'text-white/70 hover:bg-white/10 hover:text-white'
          }
        `}
      >
        <span
          className={`
            flex
            ${mobile ? 'flex-col' : 'flex-row'}
            items-center
            justify-center
            gap-1.5
            min-w-0
          `}
        >
          <Icon
            className={`
              w-[18px] h-[18px]
              shrink-0
              ${isActive ? 'text-[var(--color-idea-blue)]' : 'text-white/55'}
            `}
          />

          <span
            className={`
              ${mobile ? 'text-[10px]' : ''}
              truncate
              ${mobile ? 'max-w-[72px]' : ''}
            `}
          >
            {item.label}
          </span>
        </span>

        {item.badge !== undefined && (
          <span
            className={`
              ${mobile ? 'absolute top-1 right-2' : ''}
              min-w-5
              h-5
              px-1.5
              flex items-center justify-center
              rounded-full
              bg-[var(--color-idea-blue)]
              text-white
              text-[9px]
              font-bold
              shrink-0
            `}
          >
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className="
          hidden md:flex
          w-60
          bg-[var(--color-idea-deep-blue)]
          text-white
          shrink-0
          h-full
          flex-col
          relative
          z-30
        "
      >
        <div className="idea-accent-bar absolute top-0 left-0 w-full" />

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 pt-6 space-y-1">{menuItems.map((item) => renderMenuItem(item))}</nav>

        {/* Footer */}
        <div className="shrink-0 px-4 py-4 border-t border-white/10">
          <p className="text-[10px] text-white/50 mb-2">© {new Date().getFullYear()} AICTE IDEA LAB</p>

          <div className="flex items-center gap-3 text-[10px]">
            <Link to="/privacy" className="text-white/60 hover:text-white transition-colors">
              Privacy Policy
            </Link>

            <span className="text-white/20">•</span>

            <Link to="/terms" className="text-white/60 hover:text-white transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close navigation"
            onClick={onCloseMobile}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
          />

          {/* Drawer */}
          <aside
            className="
              absolute
              left-0
              top-0
              bottom-0
              w-[280px]
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
                className="
                  w-9 h-9
                  flex items-center justify-center
                  rounded-xl
                  bg-white/10
                  text-white/70
                  hover:bg-white/15
                  hover:text-white
                  transition-colors
                  cursor-pointer
                "
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
                <Link
                  to="/privacy"
                  onClick={onCloseMobile}
                  className="text-white/60 hover:text-white transition-colors"
                >
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
