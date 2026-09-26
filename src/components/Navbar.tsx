import React, { useState } from "react";
import { QrCode, Search, Plus, RefreshCw, ChevronDown } from "lucide-react";
import { isStudent } from "../services/authRoles";
import { User } from "../types/inventory";

interface NavbarProps {
  activeUser: User;
  users: User[];
  onUserChange: (user: User) => void;
  onOpenScanner: () => void;
  onOpenNewRequest: () => void;
  onSearch: (query: string) => void;
  onResetData: () => void;
  onLogout?: () => void;
  lockIdentity?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeUser,
  users,
  onUserChange,
  onOpenScanner,
  onOpenNewRequest,
  onSearch,
  onResetData,
  onLogout,
  lockIdentity = false,
}) => {
  const [searchVal, setSearchVal] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchVal(val);
    onSearch(val);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <nav className="flex items-center justify-between px-8 py-3 bg-white border-b border-[var(--color-idea-border)] shrink-0 z-30 relative">
      {/* Brand Logo */}
      <div className="flex items-center gap-3">
        <div className="idea-logo-container">
          <QrCode className="w-6 h-6 text-[var(--color-idea-blue)]" />
        </div>
        <div>
          <span className="text-lg font-bold tracking-tight text-[var(--color-idea-text)]">
            LabLogic{" "}
            <span className="text-[var(--color-idea-blue)] font-normal">
              QR
            </span>
          </span>
          <p className="text-[10px] text-[var(--color-idea-muted)] tracking-wide uppercase">
            Electronics Laboratory Inventory &amp; Ledger
          </p>
        </div>
      </div>

      {/* Center Search & Quick Actions */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <input
            type="text"
            value={searchVal}
            onChange={handleSearchChange}
            placeholder="Search assets, boxes, serials, QR..."
            className="idea-input pl-9 pr-4 py-2 text-xs w-80"
          />
          <Search className="w-4 h-4 text-[var(--color-idea-muted)] absolute left-3 top-2.5" />
        </div>

        {/* Scan QR Button */}
        <button
          onClick={onOpenScanner}
          className="idea-button flex items-center gap-2 px-4 py-2 text-xs font-semibold cursor-pointer"
        >
          <QrCode className="w-4 h-4" />
          <span>Scan QR</span>
        </button>

        {/* New Request Button */}
        <button
          onClick={onOpenNewRequest}
          className="flex items-center gap-2 border border-[var(--color-idea-blue)] text-[var(--color-idea-blue)] hover:bg-[var(--color-idea-blue)] hover:text-white px-4 py-2 text-xs font-semibold rounded-[10px] transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Requisition</span>
        </button>
      </div>

      {/* Active User Switcher */}
      <div className="flex items-center gap-4 border-l border-[var(--color-idea-border)] pl-6 relative">
        <button
          onClick={() => setShowUserDropdown(!showUserDropdown)}
          className="flex items-center gap-3 hover:bg-[var(--color-idea-light-grey)] px-3 py-2 rounded-xl transition-colors text-left cursor-pointer"
        >
          <div className="text-right">
            <p className="text-xs font-semibold text-[var(--color-idea-text)]">
              {activeUser.name}
            </p>
            <div className="flex items-center justify-end gap-1.5 mt-0.5">
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-[var(--color-idea-blue)] text-white font-medium uppercase tracking-wide">
                {activeUser.role.replace("_", " ")}
              </span>
              <span className="text-[10px] text-[var(--color-idea-muted)] font-mono">
                {activeUser.user_code}
              </span>
            </div>
          </div>
          <div className="idea-gradient w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs">
            {getInitials(activeUser.name)}
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-[var(--color-idea-muted)]" />
        </button>

        {/* User Switcher Dropdown */}
        {showUserDropdown && (
          <div className="absolute right-0 top-16 w-80 bg-white border border-[var(--color-idea-border)] shadow-2xl rounded-2xl py-2 z-50">
            <div className="px-4 py-2 border-b border-[var(--color-idea-border)] flex items-center justify-between">
              <span className="text-[10px] text-[var(--color-idea-muted)] uppercase tracking-wider">
                {lockIdentity || isStudent(activeUser.role)
                  ? "Account"
                  : "Switch Active User"}
              </span>
              {!isStudent(activeUser.role) && (
                <button
                  onClick={() => {
                    onResetData();
                    setShowUserDropdown(false);
                  }}
                  className="text-[10px] text-[var(--color-idea-red)] hover:opacity-80 flex items-center gap-1 font-medium cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Reset Demo
                </button>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-[var(--color-idea-border)]">
              {(lockIdentity || isStudent(activeUser.role)
                ? [activeUser]
                : users
              ).map(
                (u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      onUserChange(u);
                      setShowUserDropdown(false);
                    }}
                    className={`w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--color-idea-light-grey)] text-left transition-colors cursor-pointer ${
                      u.id === activeUser.id
                        ? "bg-[var(--color-idea-light-grey)] border-l-4 border-[var(--color-idea-blue)]"
                        : ""
                    }`}
                  >
                    <div>
                      <p className="text-xs font-semibold text-[var(--color-idea-text)]">
                        {u.name}
                      </p>
                      <p className="text-[10px] text-[var(--color-idea-muted)] font-mono">
                        {u.user_code} • {u.email}
                      </p>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-[var(--color-idea-light-grey)] text-[var(--color-idea-text)] font-medium uppercase border border-[var(--color-idea-border)]">
                      {u.role.replace("_", " ")}
                    </span>
                  </button>
                ),
              )}
            </div>
            {onLogout && (
              <div className="px-3 pt-2 border-t border-[var(--color-idea-border)]">
                <button
                  onClick={() => {
                    onLogout();
                    setShowUserDropdown(false);
                  }}
                  className="w-full px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-[var(--color-idea-red)] hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};
