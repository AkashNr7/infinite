/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Lock, 
  Key, 
  Eye, 
  EyeOff, 
  User, 
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { User as UserType } from '../types';
import { getApiUrl } from '../lib/api';

interface ChangePasswordModalProps {
  token: string;
  user: UserType;
  isOpen: boolean;
  onClose: () => void;
}

interface LimitedUser {
  id: string;
  username: string;
  role: string;
  email: string;
}

type ActiveSubTab = 'self' | 'admin_reset';

export default function ChangePasswordModal({ token, user, isOpen, onClose }: ChangePasswordModalProps) {
  const isAdmin = user.role === 'admin';
  const [activeTab, setActiveTab] = useState<ActiveSubTab>('self');
  
  // Self Password State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Admin Reset State
  const [targetUserId, setTargetUserId] = useState('');
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [usersList, setUsersList] = useState<LimitedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // General UI state
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [showAdminNewPass, setShowAdminNewPass] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load registered users if administrator toggles the targets panel
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      setErrorMsg(null);
      const res = await fetch(getApiUrl('/api/users'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        // Exclude the currently logged-in administrator from the list to avoid self-reset mistakes
        const otherUsers = data.filter((u: LimitedUser) => u.id !== user.id);
        setUsersList(otherUsers);
        if (otherUsers.length > 0) {
          setTargetUserId(otherUsers[0].id);
        }
      } else {
        throw new Error(data.error || 'Failed to retrieve accounts directory');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred loading staff.');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'admin_reset' && isAdmin) {
      fetchUsers();
    }
  }, [isOpen, activeTab]);

  // Reset inputs on show/hide
  useEffect(() => {
    if (isOpen) {
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setAdminNewPassword('');
      setErrorMsg(null);
      setSuccessMsg(null);
      setActiveTab('self');
    }
  }, [isOpen]);

  const handleSelfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      setErrorMsg('Mandatory requirements: current, new and confirmed passwords are required.');
      return;
    }

    if (newPassword.length < 4) {
      setErrorMsg('Validation flag: Your new password must be at least 4 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Validation alert: Your new password and confirmation password do not match.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(getApiUrl('/api/auth/change-password'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: oldPassword,
          newPassword: newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Request rejected by system controller');
      }

      setSuccessMsg('Your security password has been updated successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Auto-close dialog after brief pause
      setTimeout(() => {
        onClose();
      }, 2500);

    } catch (err: any) {
      setErrorMsg(err.message || 'A network error blocked processing password updates.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId || !adminNewPassword) {
      setErrorMsg('Mandatory inputs missing: Please select a user and provide their new password.');
      return;
    }

    if (adminNewPassword.length < 4) {
      setErrorMsg('Validation flag: New passwords must be at least 4 characters long.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(getApiUrl('/api/auth/admin/change-user-password'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          targetUserId,
          newPassword: adminNewPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Administrator override rejected by server');
      }

      const targetUserObj = usersList.find(u => u.id === targetUserId);
      setSuccessMsg(`Successfully reset password for staff member: "${targetUserObj?.username || 'user'}"!`);
      setAdminNewPassword('');
      
      setTimeout(() => {
        setSuccessMsg(null);
      }, 3500);

    } catch (err: any) {
      setErrorMsg(err.message || 'Action aborted. Client database rejected updates.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id="change_password_overlay"
        className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans animate-fadeIn"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-[16px] shadow-xl border border-slate-200 w-full max-w-md overflow-hidden"
        >
          {/* Header */}
          <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 bg-slate-800 rounded-lg flex items-center justify-center text-blue-400">
                <Lock className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-tight">Security Credentials</h3>
                <p className="text-slate-400 text-[10px] uppercase font-sans tracking-widest font-semibold">SmartBill Accounts Control</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={onClose}
              className="p-1 px-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Form Tabs for Admin Override */}
          {isAdmin && (
            <div className="grid grid-cols-2 border-b border-slate-100 text-xs font-semibold bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('self');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`py-3 text-center border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'self' 
                    ? 'border-blue-600 text-blue-600 bg-white font-bold' 
                    : 'border-transparent text-slate-500 hover:text-slate-950 hover:bg-slate-100/50'
                }`}
              >
                Change My Password
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('admin_reset');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`py-3 text-center border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'admin_reset' 
                    ? 'border-blue-600 text-blue-600 bg-white font-bold' 
                    : 'border-transparent text-slate-500 hover:text-slate-950 hover:bg-slate-100/50'
                }`}
              >
                Reset Staff Passwords
              </button>
            </div>
          )}

          {/* Content Space */}
          <div className="p-6">
            
            {errorMsg && (
              <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-800 text-[11.5px] rounded-[10px] font-bold flex items-start gap-2 animate-fadeIn">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 mb-4 bg-emerald-50 border border-emerald-200 text-emerald-805 text-[11.5px] rounded-[10px] font-bold flex items-start gap-2 animate-fadeIn">
                <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* TAB 1: Change My Password */}
            {activeTab === 'self' && (
              <form onSubmit={handleSelfSubmit} className="space-y-4">
                
                {/* Information row */}
                <div className="text-[11px] text-slate-400 font-medium leading-relaxed pb-2 border-b border-slate-100">
                  You are editing credentials for logged-in profile <b className="text-slate-705 capitalize">{user.username} ({user.role})</b>. Minimum required password length is 4 characters.
                </div>

                {/* Current Password */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 leading-none">
                    Current Password
                  </label>
                  <div className="relative rounded-[10px] overflow-hidden">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-3.5 w-3.5" />
                    </div>
                    <input
                      type={showOldPass ? 'text' : 'password'}
                      required
                      placeholder="Enter current password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="block w-full pl-9 pr-10 py-2.5 border border-slate-200 focus:ring-2 focus:ring-blue-500 rounded-[10px] text-xs text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPass(!showOldPass)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-405 hover:text-slate-650 cursor-pointer"
                    >
                      {showOldPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 leading-none">
                    New Password
                  </label>
                  <div className="relative rounded-[10px] overflow-hidden">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Key className="h-3.5 w-3.5" />
                    </div>
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      required
                      placeholder="Minimum 4 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="block w-full pl-9 pr-10 py-2.5 border border-slate-200 focus:ring-2 focus:ring-blue-500 rounded-[10px] text-xs text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-405 hover:text-slate-650 cursor-pointer"
                    >
                      {showNewPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 leading-none">
                    Confirm New Password
                  </label>
                  <div className="relative rounded-[10px] overflow-hidden">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Key className="h-3.5 w-3.5" />
                    </div>
                    <input
                      type={showConfirmPass ? 'text' : 'password'}
                      required
                      placeholder="Repeat new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full pl-9 pr-10 py-2.5 border border-slate-200 focus:ring-2 focus:ring-blue-500 rounded-[10px] text-xs text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-405 hover:text-slate-650 cursor-pointer"
                    >
                      {showConfirmPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Compare Check indicators */}
                {newPassword && confirmPassword && (
                  <div className={`text-[10px] font-bold flex items-center gap-1 leading-none ${
                    newPassword === confirmPassword ? 'text-emerald-600' : 'text-red-500'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${newPassword === confirmPassword ? 'bg-emerald-500' : 'bg-red-400'}`}></span>
                    {newPassword === confirmPassword ? 'New passwords match perfectly' : 'Passwords do not match yet'}
                  </div>
                )}

                {/* Submit Row */}
                <div className="pt-2 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="py-2.5 px-4 border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold text-xs rounded-[10px] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-[10px] transition-colors shadow-sm shadow-blue-100 flex items-center gap-1.5 cursor-pointer animate-press"
                  >
                    {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                    {loading ? 'Processing...' : 'Apply Changed Password'}
                  </button>
                </div>

              </form>
            )}

            {/* TAB 2: Admin managed override */}
            {activeTab === 'admin_reset' && isAdmin && (
              <form onSubmit={handleAdminResetSubmit} className="space-y-4">
                
                {/* Admin metadata notes banner */}
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-blue-900 space-y-1">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-blue-950">
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                    <span>Administrator override mode</span>
                  </div>
                  <p className="text-[10px] text-blue-800 leading-relaxed font-medium">
                    You can instantly reset passwords for your staff members. Current passwords of staff accounts are bypassed and do not need validation.
                  </p>
                </div>

                {/* Target User */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 leading-none">
                    Select Target User Account
                  </label>
                  <div className="relative rounded-[10px] overflow-hidden">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-405">
                      <User className="h-3.5 w-3.5" />
                    </div>
                    {loadingUsers ? (
                      <div className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 text-xs text-slate-400 border border-slate-200 rounded-[10px] font-semibold flex items-center gap-1">
                        <RefreshCw className="h-3 w-3 animate-spin text-blue-600" />
                        <span>Querying registered profiles directory...</span>
                      </div>
                    ) : usersList.length === 0 ? (
                      <div className="block w-full pl-9 pr-3 py-2.5 bg-amber-50 text-xs text-amber-800 border border-amber-250 rounded-[10px] font-semibold leading-relaxed">
                        No other active staff accounts registered in database.
                      </div>
                    ) : (
                      <select
                        value={targetUserId}
                        onChange={(e) => setTargetUserId(e.target.value)}
                        className="appearance-none block w-full pl-9 pr-3 py-2.5 border border-slate-200 focus:ring-2 focus:ring-blue-500 rounded-[10px] text-xs text-slate-800 bg-slate-50 font-bold focus:outline-hidden cursor-pointer"
                      >
                        {usersList.map((usr) => (
                          <option key={usr.id} value={usr.id}>
                            {usr.username.toUpperCase()} ({usr.role === 'admin' ? 'Admin' : 'Staff'}) — {usr.email}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* New Password for Target User */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 leading-none">
                    Assign New Password
                  </label>
                  <div className="relative rounded-[10px] overflow-hidden">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-404">
                      <Key className="h-3.5 w-3.5" />
                    </div>
                    <input
                      type={showAdminNewPass ? 'text' : 'password'}
                      required
                      placeholder="Assign new password (min 4 characters)"
                      value={adminNewPassword}
                      onChange={(e) => setAdminNewPassword(e.target.value)}
                      className="block w-full pl-9 pr-10 py-2.5 border border-slate-200 focus:ring-2 focus:ring-blue-500 rounded-[10px] text-xs text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminNewPass(!showAdminNewPass)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-405 hover:text-slate-650 cursor-pointer"
                    >
                      {showAdminNewPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Submit Row */}
                <div className="pt-2 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="py-2.5 px-4 border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold text-xs rounded-[10px] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || usersList.length === 0}
                    className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-xs rounded-[10px] transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer animate-press"
                  >
                    {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                    {loading ? 'SavingOverride...' : 'Override Staff Password'}
                  </button>
                </div>

              </form>
            )}

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
