import React, { useState, useEffect, useRef } from 'react';
import { QrCode, ChevronDown, Menu, LogOut, Keyboard, Bell } from 'lucide-react';
import { isStudent } from '../../../shared/lib';
import { User } from '../../../shared/types/inventory';
import { Link } from 'react-router-dom';
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../../../firebase';

interface InAppNotification {
  id: string;
  title: string;
  message: string;
  created_at?: { toMillis?: () => number; toDate?: () => Date } | string;
  read?: boolean;
}

function notificationTime(notification: InAppNotification): number {
  const timestamp = notification.created_at;
  if (timestamp && typeof timestamp === 'object') {
    if (typeof timestamp.toMillis === 'function') return timestamp.toMillis();
    if (typeof timestamp.toDate === 'function') return timestamp.toDate().getTime();
  }
  return new Date(String(timestamp ?? '')).getTime() || 0;
}

function formatNotificationTime(notification: InAppNotification): string {
  const timestamp = notificationTime(notification);
  return timestamp ? new Date(timestamp).toLocaleString() : 'Just now';
}

export interface NavbarProps {
  activeUser: User;
  users: User[];
  onUserChange: (user: User) => void;
  onOpenScanner: () => void;
  onOpenNewRequest?: () => void;
  onSearch?: (query: string) => void;
  onResetData?: () => void;
  onLogout?: () => void;
  lockIdentity?: boolean;
  onToggleMobileMenu?: () => void;
  onOpenShortcuts?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeUser,
  users,
  onUserChange,
  onOpenScanner,
  onLogout,
  lockIdentity = false,
  onToggleMobileMenu,
  onOpenShortcuts,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

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
  const unreadNotifications = notifications.filter((notification) => !notification.read).length;

  useEffect(() => {
    const notificationsQuery = query(collection(db, 'notifications'), where('user_id', '==', activeUser.id));
    return onSnapshot(
      notificationsQuery,
      (snapshot) => {
        setNotifications(
          snapshot.docs
            .map((notification) => ({ id: notification.id, ...notification.data() }) as InAppNotification)
            .sort((a, b) => notificationTime(b) - notificationTime(a))
            .slice(0, 20)
        );
      },
      (error) => {
        console.error('Could not load in-app notifications:', error);
      }
    );
  }, [activeUser.id]);

  const markNotificationRead = async (notification: InAppNotification) => {
    if (notification.read) return;
    try {
      await updateDoc(doc(db, 'notifications', notification.id), { read: true });
    } catch (error) {
      console.error('Could not mark notification as read:', error);
    }
  };

  // Close dropdown on outside click or Escape
  useEffect(() => {
    if (!showUserDropdown) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setShowUserDropdown(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowUserDropdown(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showUserDropdown]);

  return (
    <nav
      aria-label="Primary Navigation"
      className="h-16 flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 bg-white border-b border-[var(--color-idea-border)] shrink-0 z-30 relative select-none"
    >
      {/* Left: Mobile Menu + Brand */}
      <div className="flex items-center gap-3 min-w-0">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-xl text-[var(--color-idea-muted)] hover:text-[var(--color-idea-text)] hover:bg-[var(--color-idea-light-grey)] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <Link
          to="/"
          className="flex items-center gap-2.5 min-w-0 group focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none rounded-lg p-1"
        >
          <img
            src="/logo.png"
            alt="AICTE IDEA Lab"
            className="h-9 sm:h-10 w-auto object-contain shrink-0 transition-transform group-hover:scale-[1.02]"
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
        {/* Keyboard Shortcuts Guide Button */}
        {onOpenShortcuts && (
          <button
            type="button"
            onClick={onOpenShortcuts}
            aria-label="Open keyboard shortcuts guide"
            title="Keyboard shortcuts"
            className="hidden sm:inline-flex items-center gap-1.5 h-10 px-3 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          >
            <Keyboard className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-medium">Shortcuts</span>
          </button>
        )}

        {/* QR Scanner */}
        <button
          type="button"
          onClick={onOpenScanner}
          className="inline-flex items-center justify-center gap-2 h-10 px-3.5 sm:px-4 rounded-xl bg-[var(--color-idea-blue)] text-white text-xs font-semibold shadow-sm hover:brightness-95 active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          title="Scan QR Code"
          aria-label="Scan QR Code"
        >
          <QrCode className="w-4 h-4" />
          <span className="hidden sm:inline">Scan QR</span>
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications((shown) => !shown)}
            aria-label={`Notifications${unreadNotifications ? `, ${unreadNotifications} unread` : ''}`}
            aria-expanded={showNotifications}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50"
          >
            <Bell className="h-4 w-4" />
            {unreadNotifications > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </button>
          {showNotifications && (
            <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-80 max-w-[90vw] overflow-hidden rounded-2xl border border-[var(--color-idea-border)] bg-white shadow-xl">
              <div className="border-b border-[var(--color-idea-border)] px-4 py-3">
                <p className="text-xs font-bold text-[var(--color-idea-text)]">Notifications</p>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="p-5 text-center text-xs text-[var(--color-idea-muted)]">You’re all caught up.</p>
                ) : (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => void markNotificationRead(notification)}
                      className={`block w-full border-b border-[var(--color-idea-border)] px-4 py-3 text-left last:border-0 ${notification.read ? 'bg-white' : 'bg-blue-50/70'}`}
                    >
                      <p className="text-xs font-semibold text-[var(--color-idea-text)]">{notification.title}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-idea-muted)]">{notification.message}</p>
                      <p className="mt-1 text-[9px] text-[var(--color-idea-muted)]">{formatNotificationTime(notification)}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="hidden sm:block h-8 w-px bg-[var(--color-idea-border)]" />

        {/* Active User */}
        <div className="relative">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setShowUserDropdown((current) => !current)}
            aria-expanded={showUserDropdown}
            aria-haspopup="menu"
            aria-label={`User profile menu for ${activeUser.name}`}
            className="flex items-center gap-2.5 min-h-10 px-1.5 sm:px-2 rounded-xl hover:bg-[var(--color-idea-light-grey)] transition-colors text-left cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
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
            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--color-idea-blue)] text-white text-xs font-bold shrink-0">
              {getInitials(activeUser.name)}
            </div>

            <ChevronDown
              className={`hidden sm:block w-3.5 h-3.5 text-[var(--color-idea-muted)] transition-transform ${showUserDropdown ? 'rotate-180' : ''}`}
            />
          </button>

          {/* User Dropdown */}
          {showUserDropdown && (
            <div
              ref={dropdownRef}
              className="absolute right-0 top-[calc(100%+10px)] w-72 sm:w-80 bg-white border border-[var(--color-idea-border)] shadow-xl rounded-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
              role="menu"
              aria-label="User Account Options"
            >
              {/* Account Header */}
              <div className="px-4 py-3.5 border-b border-[var(--color-idea-border)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--color-idea-blue)] text-white text-xs font-bold shrink-0">
                    {getInitials(activeUser.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[var(--color-idea-text)] truncate">{activeUser.name}</p>
                    <p className="text-[11px] text-[var(--color-idea-muted)] truncate mt-0.5">{activeUser.email}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wide uppercase bg-[var(--color-idea-sky)] text-[var(--color-idea-blue)]">
                        {activeUser.role.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--color-idea-muted)]">{activeUser.user_code}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Switcher (Demo / Testing Mode) */}
              {!lockIdentity && users.length > 1 && (
                <div className="px-4 py-2.5 border-b border-[var(--color-idea-border)]">
                  <label htmlFor="user-switch-select" className="text-[10px] font-semibold text-[var(--color-idea-muted)] uppercase tracking-wider block mb-1.5">
                    Switch Test Account
                  </label>
                  <div className="relative">
                    <select
                      id="user-switch-select"
                      aria-label="Switch active test profile"
                      value={activeUser.id}
                      onChange={(e) => {
                        const target = users.find((u) => u.id === e.target.value);
                        if (target) {
                          onUserChange(target);
                          setShowUserDropdown(false);
                        }
                      }}
                      className="w-full bg-[var(--color-idea-light-grey)] border border-[var(--color-idea-border)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--color-idea-text)] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-idea-blue)] transition-all cursor-pointer"
                    >
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.role.replace(/_/g, ' ')})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Actions */}
              {onLogout && (
                <div className="py-1">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setShowUserDropdown(false);
                      onLogout();
                    }}
                    className="w-full px-4 py-2 flex items-center gap-2.5 text-xs text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer focus-visible:bg-red-50 focus-visible:outline-none"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}

              {/* Status Footer */}
              <div className="px-4 py-2 bg-[var(--color-idea-light-grey)]/60 border-t border-[var(--color-idea-border)] flex items-center justify-between text-[10px] text-[var(--color-idea-muted)]">
                <span>{studentAccount ? 'Student Member' : 'Staff Access'}</span>
                <span>Active</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
