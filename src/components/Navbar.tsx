import React, { useState } from 'react';
import { QrCode, Search, ChevronDown, Menu, ShieldCheck, LogOut, UserCheck } from 'lucide-react';
import { isStudent } from '../services/authRoles';
import { User } from '../types/inventory';
import { Link } from 'react-router-dom';

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
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeUser,
  users,
  onUserChange,
  onOpenScanner,
  onOpenNewRequest: _onOpenNewRequest,
  onSearch,
  onResetData: _onResetData,
  onLogout,
  lockIdentity = false,
  onToggleMobileMenu,
}) => {
  const [searchVal, setSearchVal] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

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
    <nav className="flex items-center justify-between gap-2 sm:gap-6 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 bg-white border-b border-[var(--color-idea-border)] shrink-0 z-30 relative select-none">
      {/* Left: Mobile Menu Toggle & Brand */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-xl text-[var(--color-idea-muted)] hover:text-[var(--color-idea-text)] hover:bg-[var(--color-idea-light-grey)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <Link to="/" className="flex items-center gap-2 sm:gap-3 group">
          <img
            src="/logo.png"
            alt="AICTE IDEA Lab"
            className="h-9 sm:h-11 w-auto object-contain transition-transform group-hover:scale-102"
          />

          <div className="hidden sm:block">
            <span className="text-base sm:text-lg font-bold tracking-tight text-[var(--color-idea-text)] whitespace-nowrap">
              AICTE <span className="text-[var(--color-idea-blue)] font-medium">IDEA LAB</span>
            </span>
            <p className="text-[9px] sm:text-[10px] text-[var(--color-idea-muted)] tracking-wider uppercase font-medium">
              Inventory Management System
            </p>
          </div>
        </Link>
      </div>

      {/* Middle: Search and Quick Scan */}
      <div className="flex items-center justify-end sm:justify-center gap-2 sm:gap-3 flex-1 min-w-0 max-w-2xl px-1 sm:px-4">
        {/* Desktop / Tablet Search Input */}
        <div className="hidden sm:block relative w-full max-w-lg">
          <Search className="w-4 h-4 text-[var(--color-idea-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchVal}
            onChange={handleSearchChange}
            placeholder="Search equipment, inventory, codes, or tags…"
            aria-label="Search inventory"
            className="idea-input w-full pl-9 pr-4 py-2 text-xs"
          />
        </div>

        {/* Mobile Search Toggle */}
        <button
          type="button"
          onClick={() => setShowMobileSearch(!showMobileSearch)}
          className="sm:hidden p-2 rounded-xl text-[var(--color-idea-muted)] hover:text-[var(--color-idea-text)] hover:bg-[var(--color-idea-light-grey)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          aria-label="Search"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* QR Scanner Trigger */}
        <button
          type="button"
          onClick={onOpenScanner}
          className="idea-button shrink-0 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs font-semibold cursor-pointer rounded-xl min-h-[40px]"
          title="Scan QR Code"
        >
          <QrCode className="w-4 h-4" />
          <span className="hidden sm:inline">Scan QR</span>
        </button>
      </div>

      {/* Right: Active User Profile */}
      <div className="relative flex items-center shrink-0 border-l border-[var(--color-idea-border)] pl-2 sm:pl-4">
        <button
          type="button"
          onClick={() => setShowUserDropdown((current) => !current)}
          aria-expanded={showUserDropdown}
          aria-haspopup="menu"
          className="flex items-center gap-2 sm:gap-3 hover:bg-[var(--color-idea-light-grey)] px-2 sm:px-3 py-1.5 rounded-xl transition-colors text-left cursor-pointer min-h-[44px]"
        >
          <div className="hidden md:block text-right">
            <p className="text-xs font-semibold text-[var(--color-idea-text)] truncate max-w-[130px]">
              {activeUser.name}
            </p>
            <div className="flex items-center justify-end gap-1.5 mt-0.5">
              <span className="text-[9px] px-2 py-0.2 rounded-full bg-[var(--color-idea-blue)] text-white font-medium uppercase tracking-wide whitespace-nowrap">
                {activeUser.role.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          <div className="idea-gradient w-8 sm:w-9 h-8 sm:h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
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
            className="absolute right-0 top-[calc(100%+8px)] w-72 sm:w-80 bg-white border border-[var(--color-idea-border)] shadow-2xl rounded-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
            role="menu"
          >
            {/* Header info inside dropdown */}
            <div className="px-4 py-3 border-b border-[var(--color-idea-border)]">
              <p className="text-xs font-bold text-[var(--color-idea-text)] truncate">
                {activeUser.name}
              </p>
              <p className="text-[11px] text-[var(--color-idea-muted)] font-mono truncate mt-0.5">
                {activeUser.email}
              </p>
              <span className="inline-block mt-2 text-[9px] px-2 py-0.5 rounded-md bg-[var(--color-idea-light-grey)] text-[var(--color-idea-text)] font-semibold uppercase tracking-wider border border-[var(--color-idea-border)]">
                {activeUser.role.replace(/_/g, ' ')}
              </span>
            </div>

            {/* Switch Active User (for local testing/admin simulation) */}
            {!lockIdentity && !studentAccount && (
              <div className="py-1">
                <div className="px-4 py-1.5">
                  <span className="text-[9px] text-[var(--color-idea-muted)] uppercase tracking-wider font-semibold">
                    Switch Active User
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-[var(--color-idea-border)]/50">
                  {users.map((user) => {
                    const isActive = user.id === activeUser.id;
                    return (
                      <button
                        type="button"
                        key={user.id}
                        onClick={() => {
                          onUserChange(user);
                          setShowUserDropdown(false);
                        }}
                        className={`w-full px-4 py-2.5 flex items-center justify-between gap-2 hover:bg-[var(--color-idea-light-grey)] text-left transition-colors cursor-pointer text-xs ${
                          isActive ? 'bg-[var(--color-idea-light-grey)] font-bold text-[var(--color-idea-deep-blue)]' : ''
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{user.name}</p>
                          <p className="text-[10px] text-[var(--color-idea-muted)] font-mono truncate">{user.role}</p>
                        </div>
                        {isActive && <UserCheck className="w-4 h-4 text-[var(--color-idea-blue)] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Legal Links */}
            <div className="px-2 py-1.5 border-t border-[var(--color-idea-border)]">
              <Link
                to="/privacy"
                onClick={() => setShowUserDropdown(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--color-idea-text)] hover:bg-[var(--color-idea-light-grey)] rounded-xl transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-[var(--color-idea-blue)]" />
                <span>Privacy & Policies</span>
              </Link>
            </div>

            {/* Logout */}
            {onLogout && (
              <div className="px-2 pt-1 border-t border-[var(--color-idea-border)]">
                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    setShowUserDropdown(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Search Overlay Bar */}
      {showMobileSearch && (
        <div className="sm:hidden absolute top-full left-0 right-0 bg-white border-b border-[var(--color-idea-border)] p-3 shadow-md z-20 flex items-center gap-2 animate-in slide-in-from-top-2 duration-150">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[var(--color-idea-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={searchVal}
              onChange={handleSearchChange}
              placeholder="Search assets, items, serials..."
              className="idea-input w-full pl-9 pr-4 py-2 text-xs"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowMobileSearch(false)}
            className="px-3 py-2 text-xs font-semibold text-[var(--color-idea-muted)] hover:text-[var(--color-idea-text)]"
          >
            Close
          </button>
        </div>
      )}
    </nav>
  );
};
