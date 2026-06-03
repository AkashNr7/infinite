/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  ShoppingCart, 
  FileText, 
  BarChart3, 
  Settings, 
  LogOut, 
  User as UserIcon,
  ShieldAlert,
  ShieldCheck,
  FlameKindling,
  X,
  Key
} from 'lucide-react';
import { ActiveTab, User } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  user: User;
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  onChangePasswordClick?: () => void;
}

export default function Sidebar({ activeTab, onTabChange, user, onLogout, isOpen = false, onClose, onChangePasswordClick }: SidebarProps) {
  const isAdmin = user.role === 'admin';

  // Navigation Items
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: true },
    { id: 'billing', label: 'Create Bill (POS)', icon: ShoppingCart, adminOnly: false },
    { id: 'invoices', label: 'Invoices', icon: FileText, adminOnly: false },
    { id: 'products', label: 'Inventory Items', icon: Package, adminOnly: false }, // Staff can view items, Admin can CRUD
    { id: 'customers', label: 'Customers', icon: Users, adminOnly: false },
    { id: 'reports', label: 'Sales Reports', icon: BarChart3, adminOnly: true },
    { id: 'settings', label: 'Settings', icon: Settings, adminOnly: true },
  ] as const;

  return (
    <aside 
      id="sidebar_nav" 
      className={`w-64 bg-[#0F172A] text-slate-300 flex flex-col h-screen fixed top-0 z-40 font-sans border-r border-slate-800 transition-transform duration-300 md:translate-x-0 ${
        isOpen ? 'translate-x-0 left-0' : '-translate-x-full md:left-0'
      }`}
    >
      {/* Header Logo */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 bg-blue-600 rounded-[10px] flex items-center justify-center text-white shrink-0">
            <FlameKindling className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide text-white leading-none">SmartBill</h1>
            <span className="text-[9px] font-medium text-slate-500 tracking-wider uppercase">POS & BILLING</span>
          </div>
        </div>
        {onClose && (
          <button 
            type="button"
            onClick={onClose}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* User Information */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/25">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
            {isAdmin ? (
              <ShieldCheck className="h-4 w-4 text-blue-400" />
            ) : (
              <UserIcon className="h-4 w-4 text-emerald-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate capitalize">
              {user.username}
            </p>
            <span className={`inline-flex items-center px-1.5 py-0.5 mt-1 rounded-sm text-[9px] font-bold uppercase tracking-wider ${
              isAdmin ? 'bg-blue-900/40 text-blue-350 border border-blue-800/50' : 'bg-emerald-900/40 text-emerald-355 border border-emerald-800/50'
            }`}>
              {isAdmin ? 'Admin' : 'Staff'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav id="nav_items" className="flex-1 px-4 mt-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isSelected = activeTab === item.id;
          const isLocked = item.adminOnly && !isAdmin;

          if (isLocked) {
            return (
              <div
                key={item.id}
                className="flex items-center justify-between px-4 py-3 text-xs font-medium text-slate-500 rounded-[10px] cursor-not-allowed bg-slate-950/20"
                title="Only Administrators have access to this module"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-4 w-4 opacity-40" />
                  <span>{item.label}</span>
                </div>
                <ShieldAlert className="h-3.5 w-3.5 opacity-60 text-amber-500" />
              </div>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-[10px] transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-800 text-white font-medium'
                  : 'text-slate-300 hover:bg-slate-800/50'
              }`}
            >
              <item.icon className={`h-4.5 w-4.5 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-slate-800 space-y-2">
        {onChangePasswordClick && (
          <button
            onClick={onChangePasswordClick}
            id="sidebar_change_pass_btn"
            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent rounded-[10px] transition-all cursor-pointer"
          >
            <Key className="h-4 w-4 shrink-0 text-slate-400" />
            <span>Change Password</span>
          </button>
        )}
        <button
          onClick={onLogout}
          id="logout_btn"
          className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white hover:bg-red-900/20 hover:border-red-800/40 border border-transparent rounded-[10px] transition-all cursor-pointer"
        >
          <LogOut className="h-4 w-4 shrink-0 text-red-150" />
          <span>Exit System</span>
        </button>
      </div>
    </aside>
  );
}
