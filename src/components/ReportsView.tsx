/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart3, 
  TrendingUp, 
  ShoppingBag, 
  PieChart as PieIcon, 
  DollarSign, 
  FileSpreadsheet, 
  ArrowUpRight,
  TrendingDown,
  Printer
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { BusinessSettings } from '../types';
import { getApiUrl } from '../lib/api';

interface ReportsViewProps {
  token: string;
  settings: BusinessSettings;
}

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#6366F1', '#EC4899', '#3B82F6'];

export default function ReportsView({ token, settings }: ReportsViewProps) {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<{
    kpis: {
      totalInvoicesCount: number;
      totalRevenue: number;
      pendingReceivables: number;
      lowStockAlertsCount: number;
    };
    revenueHistory: Array<{ date: string; sales: number; invoices: number }>;
    categoryBreakdown: Array<{ name: string; value: number }>;
    topSellingProducts: Array<{ name: string; quantity: number; revenue: number }>;
  } | null>(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl('/api/reports'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setAnalytics(data);
      }
    } catch (err) {
      console.error('Error fetching analytics databases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [token]);

  if (loading || !analytics) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-slate-500 font-medium text-sm">Compiling business aggregates ledger...</span>
      </div>
    );
  }

  const { currency } = settings;

  return (
    <div id="reports_module" className="space-y-6 print:p-0">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Financial &amp; Sales Reports</h2>
          <p className="text-slate-500 text-sm">Audit daily cash positions, inspect category volumes, and inspect top-performing inventory items</p>
        </div>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-[10px] shadow-sm transition-all cursor-pointer shrink-0"
        >
          <Printer className="h-4 w-4" />
          Print Sales Audit
        </button>
      </div>

      {/* Printable Audit Header Box (ONLY visible in physical printing layout!) */}
      <div className="hidden print:block font-sans text-xs pb-4 border-b border-slate-202">
        <h1 className="text-xl font-bold text-slate-900">{settings.companyName} - Operations Sales Audit</h1>
        <p className="text-slate-500 mt-1">Generated date: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        <p className="text-slate-500">Business Registration Code: {settings.companyTaxNo} | Phone: {settings.companyPhone}</p>
      </div>

      {/* Performance KPIs grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 border border-slate-200 rounded-[10px] shadow-sm">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Gross Sales Revenue</span>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
            {currency}{analytics.kpis.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-emerald-600 font-bold mt-1.5 flex items-center gap-1 bg-emerald-50 w-fit px-1.5 py-0.5 rounded-sm">
            <TrendingUp className="h-3 w-3 shrink-0" />
            +12.4% vs past week
          </div>
        </div>

        <div className="bg-white p-5 border border-slate-200 rounded-[10px] shadow-sm">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Transactions Processed</span>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
            {analytics.kpis.totalInvoicesCount} invoices
          </div>
          <div className="text-[10px] text-slate-500 font-semibold mt-1.5 block">
            Average ticket size: {currency}{(analytics.kpis.totalRevenue / (analytics.kpis.totalInvoicesCount || 1)).toFixed(2)}
          </div>
        </div>

        <div className="bg-white p-5 border border-slate-200 rounded-[10px] shadow-sm">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Outstanding Balances</span>
          <div className="text-2xl font-black text-red-700 mt-1 font-mono">
            {currency}{analytics.kpis.pendingReceivables.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-red-500 font-bold mt-1.5 flex items-center gap-0.5 bg-red-50 w-fit px-1.5 py-0.5 rounded-sm">
            <TrendingDown className="h-3 w-3 shrink-0" />
            Pending dues tracking
          </div>
        </div>
      </div>

      {/* Main Charts double grid row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Full Area Revenue Graph chart */}
        <div className="bg-white p-5 rounded-[10px] border border-slate-200 shadow-sm flex flex-col justify-between print:break-inside-avoid">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Gross Sales Area Chart</h4>
              <p className="text-xs text-slate-400">Chronological trend representation of successful POS poyouts</p>
            </div>
            <TrendingUp className="h-4 w-4 text-slate-350" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.revenueHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'Inter' }} 
                />
                <YAxis 
                  tickFormatter={(val) => `${currency}${val}`}
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'Inter' }} 
                />
                <Tooltip 
                  formatter={(val: number) => [`${currency}${val.toFixed(2)}`, 'Sales sum']}
                  contentStyle={{ backgroundColor: '#1E293B', color: '#F8FAFC', border: 'none', borderRadius: '12px', fontSize: '11px', fontFamily: 'Inter' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#2563EB" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categories Distribution breakdown chart (Pie Chart) */}
        <div className="bg-white p-5 rounded-[10px] border border-slate-200 shadow-sm flex flex-col justify-between print:break-inside-avoid">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Category Share Distributions</h4>
              <p className="text-xs text-slate-400">Contribution ratios in store gross income</p>
            </div>
            <PieIcon className="h-4 w-4 text-slate-350" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            {/* Pie rendering */}
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.categoryBreakdown}
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {analytics.categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: number) => [`${currency}${val.toFixed(2)}`, 'Category Gross']}
                    contentStyle={{ backgroundColor: '#1E293B', color: '#F8FAFC', border: 'none', borderRadius: '12px', fontSize: '11px', fontFamily: 'Inter' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Explanatory legend table details */}
            <div className="space-y-2.5 max-h-[12rem] overflow-y-auto pr-1 text-xs">
              {analytics.categoryBreakdown.length === 0 ? (
                <div className="text-center font-semibold text-slate-400">No category tags logged.</div>
              ) : (
                analytics.categoryBreakdown.map((cat, i) => {
                  const totalVal = analytics.categoryBreakdown.reduce((sum, item) => sum + item.value, 0);
                  const share = totalVal > 0 ? ((cat.value / totalVal) * 100).toFixed(1) : '0.0';
                  return (
                    <div key={cat.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                        <span className="font-semibold text-slate-705 truncate capitalize">{cat.name}</span>
                      </div>
                      <div className="text-right shrink-0 font-bold text-slate-900 font-mono">
                        {share}% ({currency}{cat.value.toFixed(0)})
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Product performance ledger row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Top Product Bar Chart (span 7) */}
        <div className="lg:col-span-7 bg-white p-5 border border-slate-200 rounded-[10px] shadow-sm print:break-inside-avoid">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Top-Selling Product Ledger</h4>
              <p className="text-xs text-slate-400">High gross performance charts sorted by financial income totals</p>
            </div>
            <ShoppingBag className="h-4 w-4 text-slate-350" />
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.topSellingProducts} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'Inter' }} 
                  hide={false}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(val) => `${currency}${val}`}
                  tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'Inter' }} 
                />
                <Tooltip 
                  formatter={(val: number) => [`${currency}${val.toFixed(2)}`, 'Revenue gross']}
                  contentStyle={{ backgroundColor: '#1E293B', color: '#F8FAFC', border: 'none', borderRadius: '12px', fontSize: '11px', fontFamily: 'Inter' }}
                />
                <Bar dataKey="revenue" fill="#2563EB" radius={[4, 4, 0, 0]} barSize={35} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Performance numbers index (span 5) */}
        <div className="lg:col-span-5 bg-white p-5 border border-slate-200 rounded-[10px] shadow-sm flex flex-col justify-between print:break-inside-avoid">
          <div>
            <h4 className="text-sm font-bold text-slate-800">Operational Incomes List</h4>
            <p className="text-xs text-slate-400 mb-4">Highest gross volume lines in catalog database</p>
          </div>

          <div className="divide-y divide-slate-100 max-h-[13rem] overflow-y-auto pr-1 text-xs">
            {analytics.topSellingProducts.length === 0 ? (
              <div className="text-center py-6 text-slate-400 font-semibold">
                No purchases completed yet to output performance data.
              </div>
            ) : (
              analytics.topSellingProducts.map((p, index) => (
                <div key={p.name} className="py-2.5 flex items-center justify-between gap-3 text-slate-800 font-sans">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="h-6 w-6 font-bold shrink-0 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center text-[11px]">
                      {index + 1}
                    </span>
                    <span className="font-bold text-slate-850 truncate">{p.name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-slate-900 block font-mono">
                      {currency}{p.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-medium">Vol: {p.quantity} units</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
