import React, { useState } from 'react';
import { QrCode, ChevronDown, Menu, ShieldCheck, LogOut, UserCheck } from 'lucide-react';
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
  onSearch: _onSearch,
  onResetData: _onResetData,
  onLogout,
  lockIdentity = false,
  onToggleMobileMenu,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);

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
    <nav className="h-16 flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 bg-white border-b border-[var(--color-idea-border)] shrink-0 z-30 relative select-none">
      {/* Left: Mobile Menu + Brand */}
      <div className="flex items-center gap-3 min-w-0">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="
              md:hidden
              w-10 h-10
              flex items-center justify-center
              rounded-xl
              text-[var(--color-idea-muted)]
              hover:text-[var(--color-idea-text)]
              hover:bg-[var(--color-idea-light-grey)]
              transition-colors
              cursor-pointer
            "
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <Link to="/" className="flex items-center gap-2.5 min-w-0 group">
          <img
            src="/logo.png"
            alt="AICTE IDEA Lab"
            className="
              h-9 sm:h-10
              w-auto
              object-contain
              shrink-0
              transition-transform
              group-hover:scale-[1.02]
            "
          />

          <div className="hidden sm:block min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[15px] lg:text-base font-bold tracking-tight text-[var(--color-idea-text)] whitespace-nowrap">
                AICTE
              </span>

              <span className="text-[15px] lg:text-base font-semibold tracking-tight text-[var(--color-idea-blue)] whitespace-nowrap">
                IDEA LAB
              </span>
            </div>

            <p className="text-[9px] text-[var(--color-idea-muted)] tracking-[0.12em] uppercase font-medium mt-0.5 whitespace-nowrap">
              Inventory Management System
            </p>
          </div>
        </Link>
      </div>

      {/* Right: Actions + User */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* QR Scanner */}
        <button
          type="button"
          onClick={onOpenScanner}
          className="
            inline-flex items-center justify-center
            gap-2
            h-10
            px-3.5 sm:px-4
            rounded-xl
            bg-[var(--color-idea-blue)]
            text-white
            text-xs
            font-semibold
            shadow-sm
            hover:brightness-95
            active:scale-[0.98]
            transition-all
            cursor-pointer
          "
          title="Scan QR Code"
        >
          <QrCode className="w-4 h-4" />
          <span className="hidden sm:inline">Scan QR</span>
        </button>

        {/* Divider */}
        <div className="hidden sm:block h-8 w-px bg-[var(--color-idea-border)]" />

        {/* Active User */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowUserDropdown((current) => !current)}
            aria-expanded={showUserDropdown}
            aria-haspopup="menu"
            className="
              flex items-center
              gap-2.5
              min-h-10
              px-1.5 sm:px-2
              rounded-xl
              hover:bg-[var(--color-idea-light-grey)]
              transition-colors
              text-left
              cursor-pointer
            "
          >
            {/* User information */}
            <div className="hidden lg:block text-right">
              <p className="text-xs font-semibold text-[var(--color-idea-text)] truncate max-w-[150px]">
                {activeUser.name}
              </p>

              <p className="text-[9px] text-[var(--color-idea-muted)] uppercase tracking-wide mt-0.5">
                {activeUser.role.replace(/_/g, ' ')}
              </p>
            </div>

            {/* Avatar */}
            <div
              className="
                w-9 h-9
                rounded-full
                flex items-center justify-center
                bg-[var(--color-idea-blue)]
                text-white
                text-xs
                font-bold
                shrink-0
              "
            >
              {getInitials(activeUser.name)}
            </div>

            <ChevronDown
              className={`hidden sm: block w-3.5 h-3.5 text-[var(--color-idea-muted)] transition-transform ${showUserDropdown ? 'rotate-180' : ''}`}
            />
          </button>

          {/* User Dropdown */}
          {showUserDropdown && (
            <div
              className="
                absolute
                right-0
                top-[calc(100%+10px)]
                w-72 sm:w-80
                bg-white
                border border-[var(--color-idea-border)]
                shadow-xl
                rounded-2xl
                py-2
                z-50
                animate-in
                fade-in
                zoom-in-95
                duration-100
              "
              role="menu"
            >
              {/* Account Header */}
              <div className="px-4 py-3.5 border-b border-[var(--color-idea-border)]">
                <div className="flex items-center gap-3">
                  <div
                    className="
                      w-10 h-10
                      rounded-full
                      flex items-center justify-center
                      bg-[var(--color-idea-blue)]
                      text-white
                      text-xs
                      font-bold
                      shrink-0
                    "
                  >
                    {getInitials(activeUser.name)}
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[var(--color-idea-text)] truncate">{activeUser.name}</p>

                    <p className="text-[10px] text-[var(--color-idea-muted)] truncate mt-0.5">{activeUser.email}</p>
                  </div>
                </div>

                <span
                  className="
                    inline-flex
                    mt-3
                    px-2 py-1
                    rounded-md
                    bg-[var(--color-idea-light-grey)]
                    border border-[var(--color-idea-border)]
                    text-[9px]
                    text-[var(--color-idea-text)]
                    font-semibold
                    uppercase
                    tracking-wider
                  "
                >
                  {activeUser.role.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Switch User */}
              {!lockIdentity && !studentAccount && (
                <div className="py-2">
                  <div className="px-4 py-1.5">
                    <span className="text-[9px] text-[var(--color-idea-muted)] uppercase tracking-wider font-semibold">
                      Switch Active User
                    </span>
                  </div>

                  <div className="max-h-48 overflow-y-auto">
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
                          className={`
w - full
px - 4 py - 2.5
                            flex items - center justify - between
gap - 2
text - left
text - xs
transition - colors
cursor - pointer
hover: bg - [var(--color - idea - light - grey)]
                            ${
                              isActive
                                ? 'bg-[var(--color-idea-light-grey)] text-[var(--color-idea-deep-blue)]'
                                : 'text-[var(--color-idea-text)]'
                            }
`}
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium">{user.name}</p>

                            <p className="text-[10px] text-[var(--color-idea-muted)] truncate mt-0.5">
                              {user.role.replace(/_/g, ' ')}
                            </p>
                          </div>

                          {isActive && <UserCheck className="w-4 h-4 text-[var(--color-idea-blue)] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Logout */}
              {onLogout && (
                <div className="px-2 pt-1 border-t border-[var(--color-idea-border)]">
                  <button
                    type="button"
                    onClick={() => {
                      onLogout();
                      setShowUserDropdown(false);
                    }}
                    className="
                      w-full
                      flex items-center gap-2.5
                      px-3 py-2
                      text-xs
                      font-semibold
                      text-red-600
                      hover:bg-red-50
                      rounded-xl
                      transition-colors
                      cursor-pointer
                    "
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
