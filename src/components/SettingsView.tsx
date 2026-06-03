/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Settings, 
  Building2, 
  Percent, 
  Coins, 
  Mail, 
  Phone, 
  MapPin, 
  CheckCircle,
  FileCheck2,
  Lock,
  Compass,
  Copy,
  AlertTriangle,
  Database
} from 'lucide-react';
import { BusinessSettings, User } from '../types';
import { getApiUrl } from '../lib/api';

interface SettingsViewProps {
  token: string;
  user: User;
  onSettingsUpdated: (newSettings: BusinessSettings) => void;
}

export default function SettingsView({ token, user, onSettingsUpdated }: SettingsViewProps) {
  const [formData, setFormData] = useState<BusinessSettings>({
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    companyTaxNo: '',
    taxRate: 0,
    currency: '₹',
  });

  const [loading, setLoading] = useState(true);
  const [savingLoading, setSavingLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [supabaseStatus, setSupabaseStatus] = useState<{
    connected: boolean;
    initialized: boolean;
    tableExists: boolean;
    errorMsg: string | null;
    url: string | null;
  } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  const isAdmin = user.role === 'admin';

  const loadSettingsAndSet = async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl('/api/settings'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setFormData(data);
        if (data.supabaseStatus) {
          setSupabaseStatus(data.supabaseStatus);
        }
      }
    } catch (err) {
      console.error('Error loading config options:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettingsAndSet();
  }, [token]);

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setErrorMsg('Unauthorized constraint: Only Administrators can adjust global tax parameters.');
      return;
    }

    if (!formData.companyName || formData.taxRate === undefined) {
      setErrorMsg('Mandatory inputs missing: Company Name and Local Tax Rate (%) represent absolute necessities.');
      return;
    }

    const rate = Number(formData.taxRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      setErrorMsg('Invalid input error: Default tax percentages must sit between 0 and 100.');
      return;
    }

    setSavingLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const response = await fetch(getApiUrl('/api/settings'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          taxRate: rate,
        })
      });

      const updated = await response.json();
      if (!response.ok) {
        throw new Error(updated.error || 'Configuration change rejected by backend');
      }

      setFormData(updated);
      onSettingsUpdated(updated);
      if (updated.supabaseStatus) {
        setSupabaseStatus(updated.supabaseStatus);
      }
      setSuccessMsg('Business settings and configurations updated successfully!');
      
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Connecting to server failed.');
    } finally {
      setSavingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-slate-500 font-medium text-sm">Syncing business variables...</span>
      </div>
    );
  }

  return (
    <div id="settings_module" className="space-y-6">
      
      {/* Upper Title */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
        <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 border border-slate-150">
          <Settings className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">System Settings</h2>
          <p className="text-slate-500 text-sm">Configure default business parameters, receipt headers, legal Tax IDs, and default currency symbols</p>
        </div>
      </div>

      {/* Supabase Connection Status Banner */}
      {supabaseStatus && (
        <div className="space-y-4">
          {(!supabaseStatus.connected) && (
            <div className="p-5 rounded-[12px] border font-sans bg-slate-50 border-slate-200/80 text-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                  <h4 className="font-bold text-sm">Standalone Local Offline Persistence</h4>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed max-w-2xl font-medium">
                  All changes are kept secure in local JSON-backed storage. Want online cloud synchronization? Just insert SUPABASE_URL and SUPABASE_ANON_KEY inside your AI Studio Secrets Panel!
                </p>
              </div>
              <span className="text-[10px] bg-slate-150 text-slate-600 font-bold px-3 py-1.5 rounded-md border border-slate-205 whitespace-nowrap">
                Offline Mode
              </span>
            </div>
          )}

          {supabaseStatus.connected && supabaseStatus.tableExists && (
            <div className="p-5 rounded-[12px] border font-sans bg-emerald-50/50 border-emerald-200 text-emerald-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fadeIn">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h4 className="font-bold text-sm">Cloud Database Synced with Supabase</h4>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed max-w-2xl font-medium">
                  Synchronized. All products, client directories, transactional invoices, and receipt ledger records are mirrored in real-time to your cloud instance at: {supabaseStatus.url}.
                </p>
              </div>
              <span className="text-[10px] bg-emerald-100/55 text-emerald-700 font-bold px-3 py-1.5 rounded-md border border-emerald-200 uppercase tracking-widest leading-none whitespace-nowrap animate-pulse">
                Active Sync
              </span>
            </div>
          )}

          {supabaseStatus.connected && !supabaseStatus.tableExists && (
            <div className="p-6 rounded-[12px] border font-sans bg-amber-50/50 border-amber-200 text-amber-950 space-y-4 animate-fadeIn">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <h4 className="font-bold text-sm text-amber-950">Action Required: Supabase Table Missing</h4>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed max-w-2xl font-medium">
                    Your Supabase keys are authenticating correctly! However, the backup relation table <code className="px-1.5 py-0.5 bg-amber-100/70 border border-amber-200 rounded-sm font-mono text-[11px] font-bold">smart_billing_store</code> does not exist in your Supabase project yet.
                  </p>
                </div>
                <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-3 py-1.5 rounded-md border border-amber-200 uppercase tracking-wider leading-none whitespace-nowrap">
                  Setup Pending
                </span>
              </div>

              <div className="bg-slate-900 rounded-[10px] p-5 text-slate-100 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-blue-400" />
                    <span className="text-xs font-bold text-slate-200 tracking-wide font-mono">SQL Table Definition Creator</span>
                  </div>
                  <button
                    onClick={() => {
                      const sql = `-- Run this in your Supabase SQL Editor to create the synchronized data store table:\nCREATE TABLE IF NOT EXISTS public.smart_billing_store (\n    key TEXT PRIMARY KEY,\n    value JSONB NOT NULL DEFAULT '{}'::jsonb,\n    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL\n);\n\n-- Turn off Row Level Security (RLS) for testing, or write appropriate policy rules\nALTER TABLE public.smart_billing_store DISABLE ROW LEVEL SECURITY;`;
                      navigator.clipboard.writeText(sql);
                      setCopiedSql(true);
                      setTimeout(() => setCopiedSql(false), 2000);
                    }}
                    type="button"
                    className="flex items-center gap-1.5 text-[10px] bg-slate-800 hover:bg-slate-750 text-slate-250 font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer border border-slate-700"
                  >
                    <Copy className="h-3 w-3" />
                    {copiedSql ? 'Copied!' : 'Copy SQL Script'}
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="text-[11.5px] text-slate-405 space-y-1 font-medium leading-relaxed">
                    <p className="font-bold text-slate-300">Quick 2-Step Setup Instructions:</p>
                    <ol className="list-decimal pl-4 space-y-1 text-slate-400">
                      <li>Open your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-0.5">Supabase Dashboard</a> and navigate to the <span className="font-bold text-slate-300 font-sans">SQL Editor</span> tab in the left sidebar.</li>
                      <li>Click <span className="font-bold text-slate-300 font-sans">"New Query"</span>, paste the SQL below directly into the query area, and click <span className="font-bold text-slate-300 bg-emerald-950/40 text-emerald-300 border border-emerald-900/40 px-1 rounded-sm uppercase tracking-wider text-[10px]">Run</span> on the bottom right.</li>
                    </ol>
                  </div>

                  <pre className="p-3 bg-slate-950 rounded-md text-[11px] font-mono whitespace-pre-wrap text-blue-300 border border-slate-800 select-all leading-relaxed overflow-x-auto">
{`CREATE TABLE IF NOT EXISTS public.smart_billing_store (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.smart_billing_store DISABLE ROW LEVEL SECURITY;`}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Access Denied Shield for Staff */}
      {!isAdmin && (
        <div className="p-5 bg-amber-50/50 border border-amber-200 text-amber-900 rounded-[10px] shadow-sm flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-3 font-sans mt-8">
          <div className="h-12 w-12 rounded-full bg-amber-100/50 text-amber-700 flex items-center justify-center border border-amber-200">
            <Lock className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-sm">Administrative Module Guarded</h3>
          <p className="text-xs text-amber-700 leading-relaxed max-w-sm font-medium">
            Staff roles are restricted to direct billing and client management only. Changing global tax rates or profile parameters is denied.
          </p>
        </div>
      )}

      {isAdmin && (
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSettingsSubmit} className="bg-white border border-slate-202 rounded-[10px] p-6 shadow-sm space-y-6 font-sans">
            
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-[10px] font-bold">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-805 text-xs rounded-[10px] font-bold flex items-center gap-2">
                <span className="p-1 rounded-full bg-emerald-600 text-white text-[8px]">✓</span>
                {successMsg}
              </div>
            )}

            {/* Profile Variables Subsection */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-slate-100">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                Receipt Branding Options
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Storefront Company name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Retail Corp"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="block w-full px-3 py-2.5 border border-slate-200 focus:ring-2 focus:ring-blue-500 rounded-[10px] text-xs text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Store Physical Address *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 101 Retail Mall, Suite B, Austin, TX"
                    value={formData.companyAddress}
                    onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
                    className="block w-full px-3 py-2.5 border border-slate-200 focus:ring-2 focus:ring-blue-500 rounded-[10px] text-xs text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Store Phone *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +1 555-019-3388"
                    value={formData.companyPhone}
                    onChange={(e) => setFormData({ ...formData, companyPhone: e.target.value })}
                    className="block w-full px-3 py-2.5 border border-slate-200 focus:ring-2 focus:ring-blue-500 rounded-[10px] text-xs text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Store Billing Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. billing@apex.corp"
                    value={formData.companyEmail}
                    onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
                    className="block w-full px-3 py-2.5 border border-slate-200 focus:ring-2 focus:ring-blue-500 rounded-[10px] text-xs text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Financial Parameters Subdivision */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-slate-100">
                <Compass className="h-3.5 w-3.5 text-slate-400" />
                Taxation &amp; Mathematical parameters
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Tax Registration Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. US-3882791-TX"
                    value={formData.companyTaxNo}
                    onChange={(e) => setFormData({ ...formData, companyTaxNo: e.target.value })}
                    className="block w-full px-3 py-2.5 border border-slate-200 focus:ring-2 focus:ring-blue-500 rounded-[10px] text-xs text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Default Tax Rate (%) *
                  </label>
                  <div className="relative rounded-[10px] overflow-hidden">
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={formData.taxRate}
                      onChange={(e) => setFormData({ ...formData, taxRate: Number(e.target.value) })}
                      className="block w-full pl-3 pr-8 py-2.5 border border-slate-200 focus:ring-2 focus:ring-blue-500 rounded-[10px] text-xs text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                      <Percent className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Store Base Currency *
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="appearance-none block w-full px-3 py-2.5 border border-slate-200 focus:ring-2 focus:ring-blue-500 rounded-[10px] text-xs text-slate-808 bg-slate-50 cursor-pointer focus:outline-hidden"
                  >
                    <option value="$">USD ($)</option>
                    <option value="₹">INR (₹)</option>
                    <option value="€">EUR (€)</option>
                    <option value="£">GBP (£)</option>
                    <option value="¥">JPY (¥)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Form submit */}
            <div className="pt-4 border-t border-slate-150 flex justify-end">
              <button
                type="submit"
                disabled={savingLoading}
                id="save_settings_btn"
                className="py-2.5 px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-[10px] shadow-sm disabled:opacity-50 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <FileCheck2 className="h-4 w-4" />
                {savingLoading ? 'Saving changes...' : 'Save Configuration Parameters'}
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  );
}
