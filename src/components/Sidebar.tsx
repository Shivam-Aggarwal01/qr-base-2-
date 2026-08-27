import React from "react";
import {
  LayoutDashboard,
  Box,
  Layers,
  ClipboardList,
  MapPin,
  History,
  QrCode,
  Users,
} from "lucide-react";
import { ViewMode } from "../types/inventory";

interface SidebarProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  pendingRequestsCount: number;
  pendingAccountCount?: number;
  onOpenScanner: () => void;
  userRole?: "ADMIN" | "STUDENT_AMBASSADOR" | "STUDENT_LEAD" | "STUDENT";
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  pendingRequestsCount,
  pendingAccountCount = 0,
  onOpenScanner,
  userRole = "STUDENT",
}) => {
  const isStudent = userRole === "STUDENT";
  const menuItems = isStudent
    ? [
        {
          id: "requests" as ViewMode,
          label: "Requests",
          icon: ClipboardList,
          badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
        },
        {
          id: "dashboard" as ViewMode,
          label: "Dashboard",
          icon: LayoutDashboard,
        },
      ]
    : [
        {
          id: "dashboard" as ViewMode,
          label: "Dashboard",
          icon: LayoutDashboard,
        },
        { id: "inventory" as ViewMode, label: "Inventory", icon: Box },
        { id: "assets" as ViewMode, label: "Assets", icon: Layers },
        {
          id: "requests" as ViewMode,
          label: "Requests",
          icon: ClipboardList,
          badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
        },
        { id: "locations" as ViewMode, label: "Locations", icon: MapPin },
        { id: "activity" as ViewMode, label: "Activity", icon: History },
        { id: "qr-sheet" as ViewMode, label: "QR Labels", icon: QrCode },
        {
          id: "users" as ViewMode,
          label: "User Directory",
          icon: Users,
          badge: pendingAccountCount > 0 ? pendingAccountCount : undefined,
        },
      ];

  return (
    <aside className="w-64 bg-[var(--color-idea-deep-blue)] text-white p-6 flex flex-col justify-between shrink-0 h-full overflow-y-auto relative select-none">
      {/* Brand Accent Bar */}
      <div className="idea-accent-bar absolute top-0 left-0 w-full" />

      <div className="space-y-8 mt-2">
        {/* Navigation Category Label */}
        <div>
          <h3 className="text-[10px] font-bold text-white/50 uppercase tracking-[0.25em] mb-4 px-2">
            Navigation
          </h3>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectView(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                    isActive
                      ? "bg-white/20 text-white shadow-sm"
                      : "text-white/60 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 ${isActive ? "text-[var(--color-idea-blue)]" : "text-white/50"}`}
                    />
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

      {/* QR Quick Scanner Widget */}
      <div className="mt-8 pt-6 border-t border-white/10 space-y-4">
        <div className="idea-gradient-soft border border-[var(--color-idea-blue)]/30 rounded-xl p-4 text-white relative overflow-hidden">
          <p className="text-[9px] font-bold text-[var(--color-idea-blue)] uppercase tracking-[0.2em] mb-1">
            Live QR Scanner
          </p>
          <p className="text-xs font-semibold text-white leading-snug mb-3">
            Scan Box QR or Fixed Asset Tag
          </p>
          <button
            onClick={onOpenScanner}
            className="w-full py-2.5 idea-button flex items-center justify-center gap-2 rounded-xl font-semibold text-xs cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span>Launch Scanner</span>
          </button>
        </div>

        <div className="text-center pt-2">
          <p className="text-[9px] tracking-[0.25em] text-white/30 uppercase">
            AICTE IDEA Lab • 2026
          </p>
        </div>
      </div>
    </aside>
  );
};
