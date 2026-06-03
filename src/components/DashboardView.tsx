/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  IndianRupee, 
  FileText, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  ShoppingCart, 
  UserPlus, 
  PackageCheck,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { ActiveTab, Product, Invoice, BusinessSettings } from '../types';
import { getApiUrl } from '../lib/api';

interface DashboardViewProps {
  token: string;
  onTabChange: (tab: ActiveTab) => void;
  settings: BusinessSettings;
  onSelectInvoice: (invoiceId: string) => void;
  onAdjustStockProduct: (product: Product) => void;
}

export default function DashboardView({ 
  token, 
  onTabChange, 
  settings, 
  onSelectInvoice,
  onAdjustStockProduct 
}: DashboardViewProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    kpis: {
      totalInvoicesCount: number;
      totalRevenue: number;
      pendingReceivables: number;
      lowStockAlertsCount: number;
    };
    revenueHistory: Array<{ date: string; sales: number; invoices: number }>;
    topSellingProducts: Array<{ name: string; quantity: number; revenue: number }>;
  } | null>(null);

  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };

      // API calls
      const [reportsRes, invoicesRes, productsRes] = await Promise.all([
        fetch(getApiUrl('/api/reports'), { headers }),
        fetch(getApiUrl('/api/invoices'), { headers }),
        fetch(getApiUrl('/api/products'), { headers })
      ]);

      const reportsData = await reportsRes.json();
      const invoicesData = await invoicesRes.json();
      const productsData = await productsRes.json();

      setStats(reportsData);
      
      // Sort and take 4 most recent invoices
      const sortedInvoices = [...invoicesData]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 4);
      setRecentInvoices(sortedInvoices);

      // Low stock finder (stock <= 5)
      const lowStock = productsData.filter((p: Product) => p.stock <= 5);
      setLowStockProducts(lowStock);

    } catch (err) {
      console.error('Error fetching dashboard indices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-slate-500 font-medium text-sm">Collating business metrics...</span>
      </div>
    );
  }

  const { currency } = settings;

  const kpisList = [
    {
      title: 'Total Revenue',
      value: `${currency}${stats.kpis.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: 'Paid transaction aggregates',
      icon: IndianRupee,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600',
      ringColor: 'ring-emerald-100',
    },
    {
      title: 'Total Billings',
      value: stats.kpis.totalInvoicesCount,
      subtitle: 'Total processed invoices',
      icon: FileText,
      color: 'bg-blue-600',
      textColor: 'text-blue-600',
      ringColor: 'ring-blue-100',
    },
    {
      title: 'Pending Receivables',
      value: `${currency}${stats.kpis.pendingReceivables.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: 'Unpaid customer orders',
      icon: Clock,
      color: 'bg-amber-500',
      textColor: 'text-amber-600',
      ringColor: 'ring-amber-100',
    },
    {
      title: 'Low Stock Alerts',
      value: stats.kpis.lowStockAlertsCount,
      subtitle: 'Items matching stock risk threshold',
      icon: AlertTriangle,
      color: stats.kpis.lowStockAlertsCount > 0 ? 'bg-red-500' : 'bg-slate-400',
      textColor: stats.kpis.lowStockAlertsCount > 0 ? 'text-red-500' : 'text-slate-500',
      ringColor: stats.kpis.lowStockAlertsCount > 0 ? 'ring-red-100' : 'ring-slate-100',
    },
  ];

  return (
    <div id="dashboard_view" className="space-y-6">
      {/* Header Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Business Overview</h2>
          <p className="text-slate-500 text-sm">Real-time point of sale analytics, stock metrics, and billing summaries</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            type="button" 
            onClick={fetchDashboardData}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl cursor-pointer"
          >
            Refresh Feed
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpisList.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className="bg-white p-5 rounded-[10px] border border-slate-200 shadow-sm flex items-center justify-between"
          >
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{card.title}</span>
              <h3 className="text-xl font-bold text-slate-800 mt-1">{card.value}</h3>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">{card.subtitle}</p>
            </div>
            <div className={`h-10 w-10 rounded-[10px] ${card.color} text-white flex items-center justify-center shrink-0 shadow-sm`}>
              <card.icon className="h-4.5 w-4.5" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick POS System Actions */}
      <div className="bg-[#0F172A] rounded-[10px] p-6 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-5 border border-slate-800 shadow-sm">
        <div>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] bg-blue-900/60 text-blue-300 font-extrabold uppercase tracking-widest mb-2 border border-blue-800/45">
            Smart Shortcut Panel
          </span>
          <h3 className="text-lg font-bold">Fast Lane Operations</h3>
          <p className="text-slate-400 text-xs mt-1">Initiate a customer checkout, append a product catalog SKU, or adjust profile settings instantly</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => onTabChange('billing')}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 font-semibold rounded-[10px] text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-900/20"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            New POS Bill
          </button>
          <button
            onClick={() => onTabChange('products')}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 font-semibold rounded-[10px] text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
          >
            <PackageCheck className="h-3.5 w-3.5" />
            Add Catalog Item
          </button>
          <button
            onClick={() => onTabChange('customers')}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 font-semibold rounded-[10px] text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Register Customer
          </button>
        </div>
      </div>

      {/* Charts & Low Stock Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Revenue Line Chart */}
        <div className="lg:col-span-2 bg-white p-5 border border-slate-200 rounded-[10px] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-800">7-Day Sales Trend</h4>
              <p className="text-xs text-slate-400">Total revenue generated on successful checkouts</p>
            </div>
            <TrendingUp className="h-5 w-5 text-slate-300" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.revenueHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis 
                  dataKey="date" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'Inter' }} 
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(val) => `${currency}${val}`}
                  tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'Inter' }} 
                />
                <Tooltip 
                  formatter={(val: number) => [`${currency}${val.toFixed(2)}`, 'Revenue']} 
                  contentStyle={{ backgroundColor: '#1E293B', color: '#F8FAFC', borderRadius: '10px', border: 'none', fontFamily: 'Inter', fontSize: '12px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#2563EB" 
                  strokeWidth={3} 
                  dot={{ r: 4, stroke: '#2563EB', strokeWidth: 1, fill: '#FFFFFF' }}
                  activeDot={{ r: 6 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low Stock Watch alerts */}
        <div className="bg-white p-5 border border-slate-200 rounded-[10px] shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-3">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Inventory Under Risk</h4>
              <p className="text-xs text-slate-400">Items matching stock level &lt;= 5</p>
            </div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
              lowStockProducts.length > 0 ? 'bg-red-50 text-red-650' : 'bg-emerald-50 text-emerald-650'
            }`}>
              {lowStockProducts.length} Items Listed
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[14rem]">
            {lowStockProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center h-full">
                <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 mb-2">
                  ✓
                </div>
                <h5 className="text-xs font-semibold text-slate-800">Stock Levels Perfect</h5>
                <p className="text-[10px] text-slate-400 max-w-[150px] mt-0.5">All inventory counts currently stand secure.</p>
              </div>
            ) : (
              lowStockProducts.map((p) => {
                const isCritical = p.stock <= 1;
                return (
                  <div key={p.id} className="flex items-center justify-between p-2.5 border border-slate-200 hover:border-slate-300 rounded-[10px] transition-all bg-slate-50/50">
                    <div className="min-w-0 pr-2">
                      <h5 className="text-xs font-bold text-slate-800 truncate">{p.name}</h5>
                      <span className="text-[10px] text-slate-400 block capitalize">{p.category}</span>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold text-center ${
                        isCritical ? 'bg-red-55 text-red-600 border border-red-200' : 'bg-amber-55 text-amber-600 border border-amber-200'
                      }`}>
                        {p.stock} Unit{p.stock !== 1 ? 's' : ''} left
                      </span>
                      <button
                        onClick={() => onAdjustStockProduct(p)}
                        className="py-1 px-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors rounded-[10px] font-bold text-[10px] cursor-pointer"
                        title="Adjust Stock Count"
                      >
                        Adjust
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Recents Invoices Block */}
      <div className="bg-white p-5 border border-slate-200 rounded-[10px] shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-bold text-slate-800">Recent Customer Receipts</h4>
            <p className="text-xs text-slate-400">Review status logs of the latest processed billing workflows</p>
          </div>
          <button
            onClick={() => onTabChange('invoices')}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 transition-all cursor-pointer"
          >
            Review Invoices Ledger
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto min-w-full">
          <table className="min-w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-455 text-[10px] font-extrabold uppercase tracking-wider bg-slate-50">
                <th className="py-2.5 px-3 font-medium">Receipt No</th>
                <th className="py-2.5 px-3 font-medium">Purchased For</th>
                <th className="py-2.5 px-3 font-medium">Checkout Date</th>
                <th className="py-2.5 px-3 font-medium">Method</th>
                <th className="py-2.5 px-3 font-medium">Bill Sum</th>
                <th className="py-2.5 px-3 font-medium text-center">Status</th>
                <th className="py-2.5 px-3 font-medium text-right">Receipt Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-xs text-slate-400 font-medium font-sans">
                    No receipts recorded yet. Open POS billing to checkout your first customer!
                  </td>
                </tr>
              ) : (
                recentInvoices.map((inv) => (
                  <tr key={inv.id} className="text-xs text-slate-800 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900">{inv.invoice_no}</td>
                    <td className="py-3 px-3 font-medium text-slate-700">{inv.customer_name}</td>
                    <td className="py-3 px-3 text-slate-500">
                      {new Date(inv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-3 uppercase text-[10px] font-bold text-slate-500">{inv.payment_method}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {currency}{inv.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide capitalize ${
                        inv.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {inv.payment_status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onSelectInvoice(inv.id)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                      >
                        Inspect Invoice
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
