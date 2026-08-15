import React, { useState } from 'react';
import { QrCode, Search, Plus, RefreshCw, ChevronDown } from 'lucide-react';
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
}

export const Navbar: React.FC<NavbarProps> = ({
  activeUser,
  users,
  onUserChange,
  onOpenScanner,
  onOpenNewRequest,
  onSearch,
  onResetData,
  onLogout
}) => {
  const [searchVal, setSearchVal] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchVal(val);
    onSearch(val);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <nav className="flex items-center justify-between px-8 py-4 bg-[#F9F8F6] border-b border-[#1A1A1A]/15 shrink-0 z-30 relative">
      {/* Brand Logo & Editorial Header */}
      <div className="flex items-center gap-4">
        <div className="bg-[#1A1A1A] p-2.5 text-white shadow-sm flex items-center justify-center border border-[#D4AF37]">
          <QrCode className="w-5 h-5 text-[#D4AF37]" />
        </div>
        <div>
          <span className="font-serif text-2xl font-bold tracking-tight text-[#1A1A1A]">
            LabLogic <span className="font-serif italic font-normal text-[#D4AF37]">QR</span>
          </span>
          <p className="text-[10px] text-[#6C6863] font-mono tracking-[0.2em] uppercase">
            Electronics Laboratory Inventory & Box Batch Ledger
          </p>
        </div>
      </div>

      {/* Center Search & Quick Actions */}
      <div className="flex items-center gap-5">
        <div className="relative">
          <input
            type="text"
            value={searchVal}
            onChange={handleSearchChange}
            placeholder="Search assets, boxes, serials, QR..."
            className="input-underline pl-9 pr-4 py-1.5 text-xs w-80 font-serif italic text-[#1A1A1A] placeholder-[#6C6863] focus:border-[#D4AF37] outline-none"
          />
          <Search className="w-4 h-4 text-[#6C6863] absolute left-1.5 top-2" />
        </div>

        {/* Scan QR Button */}
        <button
          onClick={onOpenScanner}
          className="flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#D4AF37] text-white px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-widest transition-colors cursor-pointer border border-[#1A1A1A]"
        >
          <QrCode className="w-4 h-4 text-[#D4AF37]" />
          <span>Scan QR</span>
        </button>

        {/* New Request Button */}
        <button
          onClick={onOpenNewRequest}
          className="flex items-center gap-2 border border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-widest transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Requisition</span>
        </button>
      </div>

      {/* Active User Switcher */}
      <div className="flex items-center gap-4 border-l border-[#1A1A1A]/15 pl-6 relative">
        <button
          onClick={() => setShowUserDropdown(!showUserDropdown)}
          className="flex items-center gap-3 hover:bg-[#EBE5DE] p-2 transition-colors text-left cursor-pointer border border-transparent hover:border-[#1A1A1A]/10"
        >
          <div className="text-right">
            <p className="text-xs font-serif font-bold text-[#1A1A1A]">{activeUser.name}</p>
            <div className="flex items-center justify-end gap-1.5 mt-0.5">
              <span className="text-[9px] px-2 py-0.2 border border-[#1A1A1A] bg-[#1A1A1A] text-white font-mono uppercase tracking-widest">
                {activeUser.role.replace('_', ' ')}
              </span>
              <span className="text-[10px] text-[#6C6863] font-mono">{activeUser.user_code}</span>
            </div>
          </div>
          <div className="w-9 h-9 bg-[#1A1A1A] text-[#D4AF37] border border-[#D4AF37] flex items-center justify-center font-mono font-bold text-xs">
            {getInitials(activeUser.name)}
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-[#6C6863]" />
        </button>

        {/* User Switcher Dropdown */}
        {showUserDropdown && (
          <div className="absolute right-0 top-16 w-80 bg-[#F9F8F6] border border-[#1A1A1A] shadow-2xl py-2 z-50">
            <div className="px-4 py-2 border-b border-[#1A1A1A]/10 flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#6C6863] uppercase tracking-[0.2em]">Switch Active User</span>
              <button
                onClick={() => {
                  onResetData();
                  setShowUserDropdown(false);
                }}
                className="text-[10px] text-red-700 hover:text-red-900 flex items-center gap-1 font-mono uppercase font-bold cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Reset Demo
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-[#1A1A1A]/10">
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    onUserChange(u);
                    setShowUserDropdown(false);
                  }}
                  className={`w-full px-4 py-3 flex items-center justify-between hover:bg-[#EBE5DE] text-left transition-colors cursor-pointer ${
                    u.id === activeUser.id ? 'bg-[#EBE5DE] border-l-4 border-[#D4AF37]' : ''
                  }`}
                >
                  <div>
                    <p className="text-xs font-serif font-bold text-[#1A1A1A]">{u.name}</p>
                    <p className="text-[10px] text-[#6C6863] font-mono">{u.user_code} • {u.email}</p>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 border border-[#1A1A1A] text-[#1A1A1A] font-mono uppercase">
                    {u.role.replace('_', ' ')}
                  </span>
                </button>
              ))}
            </div>
            {onLogout && (
              <div className="px-3 pt-2 border-t border-[#1A1A1A]/10">
                <button
                  onClick={() => {
                    onLogout();
                    setShowUserDropdown(false);
                  }}
                  className="w-full px-3 py-2 text-[10px] font-mono uppercase tracking-[0.2em] text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
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
