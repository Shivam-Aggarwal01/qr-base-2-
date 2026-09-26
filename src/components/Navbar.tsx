import React, { useState } from 'react';
import { QrCode, Search, Plus, RefreshCw, ChevronDown } from 'lucide-react';
import { isStudent } from '../services/authRoles';
import { User } from '../types/inventory';

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
  const [searchVal, setSearchVal] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    setSearchVal(value);
    onSearch(value);
  };

  const getInitials = (name: string) => {
    return name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const studentAccount = isStudent(activeUser.role);

  return (
    <nav className="flex items-center gap-6 px-8 py-3 bg-white border-b border-[var(--color-idea-border)] shrink-0 z-30 relative">
      {/* Brand */}
      <div className="flex items-center gap-3 shrink-0">
        <img src="/logo.png" alt="AICTE IDEA Lab" className="h-12 w-auto object-contain" />

        <div className="hidden sm:block">
          <span className="text-lg font-bold tracking-tight text-idea-text whitespace-nowrap">
            AICTE <span className="text-idea-blue font-normal">IDEA LAB</span>
          </span>

          <p className="text-[10px] text-idea-muted tracking-wide uppercase">Inventory Management System</p>
        </div>
      </div>

      {/* Search and Quick Actions */}
      <div className="flex items-center justify-center gap-4 flex-1 min-w-0">
        <div className="relative w-full max-w-xl">
          <Search className="w-4 h-4 text-[var(--color-idea-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />

          <input
            type="text"
            value={searchVal}
            onChange={handleSearchChange}
            placeholder="Search assets, boxes, serials, QR..."
            aria-label="Search inventory"
            className="idea-input w-full pl-9 pr-4 py-2 text-xs"
          />
        </div>

        <button
          type="button"
          onClick={onOpenScanner}
          className="idea-button shrink-0 flex items-center gap-2 px-4 py-2 text-xs font-semibold cursor-pointer"
        >
          <QrCode className="w-4 h-4" />
          <span>Scan QR</span>
        </button>
      </div>

      {/* Active User */}
      <div className="relative flex items-center shrink-0 border-l border-[var(--color-idea-border)] pl-6">
        <button
          type="button"
          onClick={() => setShowUserDropdown((current) => !current)}
          aria-expanded={showUserDropdown}
          aria-haspopup="menu"
          className="flex items-center gap-3 hover:bg-[var(--color-idea-light-grey)] px-3 py-2 rounded-xl transition-colors text-left cursor-pointer"
        >
          <div className="text-right">
            <p className="text-xs font-semibold text-[var(--color-idea-text)] whitespace-nowrap">{activeUser.name}</p>

            <div className="flex items-center justify-end gap-1.5 mt-0.5">
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-[var(--color-idea-blue)] text-white font-medium uppercase tracking-wide whitespace-nowrap">
                {activeUser.role.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          <div className="idea-gradient w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0">
            {getInitials(activeUser.name)}
          </div>

          <ChevronDown
            className={`w-3.5 h-3.5 text-[var(--color-idea-muted)] transition-transform ${
              showUserDropdown ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* User Dropdown */}
        {showUserDropdown && (
          <div
            className="absolute right-0 top-[calc(100%+8px)] w-80 bg-white border border-[var(--color-idea-border)] shadow-2xl rounded-2xl py-2 z-50"
            role="menu"
          >
            {/* Dropdown Header */}
            <div className="px-4 py-2 border-b border-[var(--color-idea-border)] flex items-center justify-between">
              <span className="text-[10px] text-[var(--color-idea-muted)] uppercase tracking-wider">
                {lockIdentity || studentAccount ? 'Account' : 'Switch Active User'}
              </span>
            </div>

            {/* User List */}
            <div className="max-h-64 overflow-y-auto divide-y divide-[var(--color-idea-border)]">
              {(lockIdentity || studentAccount ? [activeUser] : users).map((user) => {
                const isActive = user.id === activeUser.id;

                return (
                  <button
                    type="button"
                    key={user.id}
                    onClick={() => {
                      onUserChange(user);
                      setShowUserDropdown(false);
                    }}
                    className={`w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-[var(--color-idea-light-grey)] text-left transition-colors cursor-pointer ${
                      isActive ? 'bg-[var(--color-idea-light-grey)] border-l-4 border-[var(--color-idea-blue)]' : ''
                    }`}
                    role="menuitem"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[var(--color-idea-text)] truncate">{user.name}</p>

                      <p className="text-[10px] text-[var(--color-idea-muted)] font-mono truncate">{user.email}</p>
                    </div>

                    <span className="shrink-0 text-[9px] px-2 py-0.5 rounded-full bg-[var(--color-idea-light-grey)] text-[var(--color-idea-text)] font-medium uppercase border border-[var(--color-idea-border)]">
                      {user.role.replace(/_/g, ' ')}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Logout */}
            {onLogout && (
              <div className="px-3 pt-2 border-t border-[var(--color-idea-border)]">
                <button
                  type="button"
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
