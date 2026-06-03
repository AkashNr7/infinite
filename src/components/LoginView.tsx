/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Lock, User, Eye, EyeOff, Building2, KeyRound } from 'lucide-react';
import { User as UserType } from '../types';
import { getApiUrl } from '../lib/api';

interface LoginViewProps {
  onLoginSuccess: (token: string, user: UserType) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState<string | null>(null);
  const [forgotErrorMsg, setForgotErrorMsg] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  // Quick account switcher helper
  const handleQuickFill = (role: 'admin' | 'staff') => {
    if (role === 'admin') {
      setUsername('admin');
      setPassword('admin123');
    } else {
      setUsername('staff');
      setPassword('staff123');
    }
    setError(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in both fields.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(getApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Trigger callback
      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Connecting to server failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      setForgotErrorMsg('Please enter an email address.');
      return;
    }

    setForgotLoading(true);
    setForgotErrorMsg(null);
    setForgotSuccessMsg(null);

    try {
      const response = await fetch(getApiUrl('/api/auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Password reset request failed.');
      }

      setForgotSuccessMsg(data.message);
      setForgotEmail('');
    } catch (err: any) {
      setForgotErrorMsg(err.message || 'Failed to dispatch reset email.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div id="login_container" className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="h-12 w-12 rounded-[10px] bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200"
          >
            <Shield className="h-6 w-6 text-white" />
          </motion.div>
        </div>
        <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-slate-900">
          SmartBill System
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          Manage invoices, stock levels & business metrics in real-time
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white py-8 px-10 border border-slate-200 shadow-sm rounded-[10px]"
        >
          {error && (
            <div id="login_error" className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-[10px] px-4 py-3 text-sm flex items-start gap-2">
              <span className="font-semibold">Error:</span> {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleLoginSubmit}>
            <div>
              <label htmlFor="username_input" className="block text-sm font-medium text-slate-700 tracking-wide">
                Username
              </label>
              <div className="mt-1 relative rounded-[10px] shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="username_input"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-[10px] focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800 placeholder-slate-400 font-sans text-sm bg-slate-50 focus:bg-white"
                  placeholder="admin or staff"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center">
                <label htmlFor="password_input" className="block text-sm font-medium text-slate-700 tracking-wide">
                  Password
                </label>
                <button
                  type="button"
                  id="forgot_pwd_btn"
                  onClick={() => {
                    setShowForgotModal(true);
                    setForgotSuccessMsg(null);
                    setForgotErrorMsg(null);
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 focus:outline-hidden transition-colors"
                >
                  Forgot your password?
                </button>
              </div>
              <div className="mt-1 relative rounded-[10px] shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password_input"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-[10px] focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800 placeholder-slate-400 font-sans text-sm bg-slate-50 focus:bg-white"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  id="toggle_pwd_visibility"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-hidden"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                id="login_btn"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-[10px] shadow-lg shadow-blue-200 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 text-center transition-all cursor-pointer"
              >
                {loading ? 'Verifying...' : 'Sign In'}
              </button>
            </div>
          </form>

          {/* Quick Credential Helpers */}
          <div className="mt-6 border-t border-slate-200 pt-6">
            <p className="text-[10px] text-center text-slate-400 font-bold mb-3 tracking-wider">
              PRE-CONFIGURED DEMO USER PROFILES
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                id="fill_admin_btn"
                onClick={() => handleQuickFill('admin')}
                className="flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-200 hover:border-blue-350 rounded-[10px] text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50/30 transition-all cursor-pointer"
              >
                <Building2 className="h-3.5 w-3.5 text-slate-550" />
                Admin (Full Access)
              </button>
              <button
                type="button"
                id="fill_staff_btn"
                onClick={() => handleQuickFill('staff')}
                className="flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-200 hover:border-emerald-350 rounded-[10px] text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50/30 transition-all cursor-pointer"
              >
                <KeyRound className="h-3.5 w-3.5 text-slate-550" />
                Staff (Billing Only)
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Simulated Forgot Password Modal */}
      {showForgotModal && (
        <div id="forgot_password_modal" className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative bg-white rounded-[10px] max-w-md w-full shadow-2xl overflow-hidden border border-slate-200"
          >
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900">Reset Password</h3>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleForgotSubmit} className="p-6 space-y-4">
              <p className="text-xs text-slate-550 leading-relaxed">
                Enter your account email below. We will simulate sending a standard password reset link with a recovery token.
              </p>

              {forgotSuccessMsg && (
                <div id="forgot_success" className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-[10px] font-medium">
                  {forgotSuccessMsg}
                </div>
              )}

              {forgotErrorMsg && (
                <div id="forgot_error" className="p-3 bg-red-50 border border-red-100 text-red-800 text-xs rounded-[10px] font-medium">
                  {forgotErrorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. admin@example.com or staff@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-200 rounded-[10px] focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="py-2 px-4 border border-slate-200 hover:bg-slate-50 text-slate-705 text-xs font-semibold rounded-[10px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-[10px] cursor-pointer"
                >
                  {forgotLoading ? 'Sending...' : 'Send Link'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
