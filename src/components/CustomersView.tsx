/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  History, 
  ChevronRight, 
  FileCheck2,
  CalendarDays
} from 'lucide-react';
import { Customer, Invoice, BusinessSettings } from '../types';
import { getApiUrl } from '../lib/api';

interface ExtendedCustomer extends Customer {
  purchaseCount: number;
  totalSpent: number;
}

interface CustomersViewProps {
  token: string;
  settings: BusinessSettings;
  onSelectInvoice: (invoiceId: string) => void;
  onOpenCheckoutWithCustomer: (customerId: string) => void;
}

export default function CustomersView({ 
  token, 
  settings, 
  onSelectInvoice,
  onOpenCheckoutWithCustomer 
}: CustomersViewProps) {
  const [customers, setCustomers] = useState<ExtendedCustomer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedCustomer, setSelectedCustomer] = useState<ExtendedCustomer | null>(null);

  // Form parameters
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });

  const [modalError, setModalError] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [successAlert, setSuccessAlert] = useState<string | null>(null);

  // Customer purchase history drawer
  const [inspectingHistoryCustomer, setInspectingHistoryCustomer] = useState<ExtendedCustomer | null>(null);

  const { currency } = settings;

  const loadData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      
      const [customersRes, invoicesRes] = await Promise.all([
        fetch(getApiUrl('/api/customers'), { headers }),
        fetch(getApiUrl('/api/invoices'), { headers })
      ]);

      const customersData = await customersRes.json();
      const invoicesData = await invoicesRes.json();

      if (customersRes.ok) setCustomers(customersData);
      if (invoicesRes.ok) setInvoices(invoicesData);
    } catch (err) {
      console.error('Error fetching customers/orders databases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const handleOpenAdd = () => {
    setModalMode('add');
    setSelectedCustomer(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
    });
    setModalError(null);
    setShowCustomerModal(true);
  };

  const handleOpenEdit = (cust: ExtendedCustomer) => {
    setModalMode('edit');
    setSelectedCustomer(cust);
    setFormData({
      name: cust.name,
      phone: cust.phone,
      email: cust.email,
      address: cust.address,
    });
    setModalError(null);
    setShowCustomerModal(true);
  };

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      setModalError('Customer Name and primary Phone Number are mandatory.');
      return;
    }

    setModalError(null);
    setModalLoading(true);

    try {
      const isEdit = modalMode === 'edit';
      const endpoint = isEdit ? `/api/customers/${selectedCustomer?.id}` : '/api/customers';
      const response = await fetch(getApiUrl(endpoint), {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Server error saving customer');
      }

      setSuccessAlert(`Customer "${data.name}" successfully ${isEdit ? 'updated' : 'registered'}!`);
      setShowCustomerModal(false);
      loadData();

      // If we are inspecting this customer, sync metadata
      if (inspectingHistoryCustomer && inspectingHistoryCustomer.id === data.id) {
        setInspectingHistoryCustomer({
          ...inspectingHistoryCustomer,
          ...data
        });
      }

      setTimeout(() => setSuccessAlert(null), 4000);
    } catch (err: any) {
      setModalError(err.message || 'Transmission failed.');
    } finally {
      setModalLoading(false);
    }
  };

  // Inspect client purchases filter
  const clientPurchases = invoices.filter(
    (inv) => inspectingHistoryCustomer && inv.customer_id === inspectingHistoryCustomer.id
  );

  // Filter clients list
  const filteredCustomers = customers.filter((c) => {
    const s = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(s) ||
      c.phone.includes(s) ||
      c.email.toLowerCase().includes(s) ||
      c.address.toLowerCase().includes(s)
    );
  });

  return (
    <div id="customers_module" className="space-y-6">
      
      {/* Title & Add Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Customer Directory</h2>
          <p className="text-slate-500 text-sm">Register store clients, audit purchase histories, and check pending balances</p>
        </div>
        <button
          onClick={handleOpenAdd}
          id="add_customer_btn"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-[10px] shadow-sm transition-all cursor-pointer shrink-0 shadow-blue-200/50"
        >
          <Plus className="h-4 w-4" />
          Add Customer Profile
        </button>
      </div>

      {/* Success Alert toast notification */}
      {successAlert && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-[10px] text-xs font-semibold flex items-center gap-2"
        >
          <span className="p-1 rounded-full bg-emerald-500 text-white text-[8px]">✓</span>
          {successAlert}
        </motion.div>
      )}

      {/* Grid wrapper for core Customers list + Customer Purchase History Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Customer Directory Table */}
        <div className={`bg-white border border-slate-200 rounded-[10px] shadow-sm overflow-hidden ${
          inspectingHistoryCustomer ? 'lg:col-span-2' : 'lg:col-span-3'
        }`}>
          {/* Dynamic Search Box */}
          <div className="p-4 border-b border-slate-200 relative">
            <div className="absolute inset-y-0 left-0 pl-7 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search customers by name, phone numbers, email, or street..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-[10px] focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs text-slate-705 bg-slate-50 focus:bg-white transition-colors"
            />
          </div>

          <div className="overflow-x-auto min-w-full">
            <table className="min-w-full text-left border-collapse font-sans">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-455 text-[10px] font-extrabold uppercase tracking-wider">
                  <th className="py-3 px-6 font-medium">Customer particulars</th>
                  <th className="py-3 px-6 font-medium">Contact</th>
                  <th className="py-3 px-6 font-medium text-center">Invoices</th>
                  <th className="py-3 px-6 font-medium text-right">Loyalty Spending</th>
                  <th className="py-3 px-6 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                      Loading Customer Database...
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                      No customer registers correspond to search terms.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c) => {
                    const isInspected = inspectingHistoryCustomer?.id === c.id;
                    return (
                      <tr 
                        key={c.id} 
                        className={`hover:bg-slate-50/50 text-slate-800 transition-colors ${
                          isInspected ? 'bg-blue-50/20 hover:bg-blue-50/30' : ''
                        }`}
                      >
                        <td className="py-3.5 px-6">
                          <div className="font-bold text-slate-950 font-sans">{c.name}</div>
                          {c.address && (
                            <div className="text-[10px] text-slate-400 max-w-[180px] break-words flex items-center gap-1 mt-0.5">
                              <MapPin className="h-2.5 w-2.5 shrink-0 text-slate-300" />
                              <span className="truncate">{c.address}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-6">
                          <div className="font-mono text-slate-700 flex items-center gap-1">
                            <Phone className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                            {c.phone}
                          </div>
                          {c.email && (
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Mail className="h-2.5 w-2.5 text-slate-300 shrink-0" />
                              {c.email}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-center">
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200/50">
                            {c.purchaseCount} bill{c.purchaseCount !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-right font-bold text-slate-900 font-mono">
                          {currency}{c.totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-6">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => setInspectingHistoryCustomer(c)}
                              className="p-1 px-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:text-slate-900 font-semibold rounded-[10px] text-slate-550 cursor-pointer text-[10px] flex items-center gap-1 transition-all"
                            >
                              <History className="h-3 w-3 shrink-0" />
                              History
                            </button>
                            <button
                              onClick={() => handleOpenEdit(c)}
                              className="p-1 px-2.5 bg-blue-50 border border-blue-150 hover:bg-blue-100 font-semibold rounded-[10px] text-blue-700 cursor-pointer text-[10px] transition-all"
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Customer Ledger Purchase History Panel */}
        {inspectingHistoryCustomer && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            id="history_panel"
            className="bg-white border border-slate-100 rounded-2xl shadow-xs p-5 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Purchase Log</h3>
                <p className="text-[10px] text-slate-400">Order audit for <span className="text-slate-700 font-bold">{inspectingHistoryCustomer.name}</span></p>
              </div>
              <button
                onClick={() => setInspectingHistoryCustomer(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xs"
              >
                ✕ Close
              </button>
            </div>

            {/* Loyalty Quick Card */}
            <div className="bg-slate-900 text-slate-200 rounded-xl p-3 flex justify-between items-center text-xs">
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-extrabold tracking-wider">SALES RECAP</span>
                <div className="text-base font-bold text-white mt-0.5">
                  {currency}{inspectingHistoryCustomer.totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-slate-400 uppercase font-extrabold tracking-wider">CHECKOUT COUNT</span>
                <div className="text-sm font-semibold text-white mt-0.5">
                  {inspectingHistoryCustomer.purchaseCount} order{inspectingHistoryCustomer.purchaseCount !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            {/* Direct Quick POS checkout with prefilled customer */}
            <button
              onClick={() => onOpenCheckoutWithCustomer(inspectingHistoryCustomer.id)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileCheck2 className="h-3.5 w-3.5" />
              Open POS Checkout Bill
            </button>

            {/* Ledger history items */}
            <div className="space-y-2.5 overflow-y-auto max-h-[18rem] pr-1">
              <h4 className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Past Orders History</h4>
              
              {clientPurchases.length === 0 ? (
                <div className="text-center py-6 text-[10px] text-slate-400 font-semibold font-sans">
                  No billing history recorded for this user.
                </div>
              ) : (
                clientPurchases.map((inv) => (
                  <div key={inv.id} className="border border-slate-100 hover:border-slate-200 p-2.5 rounded-xl flex items-center justify-between text-xs transition-colors">
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800">{inv.invoice_no}</span>
                        <span className={`px-1 rounded-sm text-[8px] font-extrabold uppercase tracking-wide select-none ${
                          inv.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-650'
                        }`}>
                          {inv.payment_status}
                        </span>
                      </div>
                      <div className="text-[9px] text-slate-400 flex items-center gap-1 mt-1">
                        <CalendarDays className="h-3 w-3 shrink-0" />
                        {new Date(inv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 font-sans shrink-0">
                      <span className="font-bold text-slate-900">{currency}{inv.total.toFixed(2)}</span>
                      <button
                        onClick={() => onSelectInvoice(inv.id)}
                        className="p-1 hover:bg-slate-50 hover:text-blue-600 rounded text-slate-400 cursor-pointer"
                        title="View Detailed Invoice Receipt"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

      </div>

      {/* Reg/Edit Customer Modal */}
      {showCustomerModal && (
        <div id="customer_form_modal" className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[10px] max-w-sm w-full shadow-2xl overflow-hidden border border-slate-200"
          >
            <div className="bg-slate-50 px-5 opacity-100 py-3.5 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900">
                {modalMode === 'add' ? 'Register Store Client' : 'Update Customer profile'}
              </h3>
              <button
                type="button"
                onClick={() => setShowCustomerModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-0.5 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCustomerSubmit} className="p-5 space-y-4 font-sans focus:outline-hidden text-xs">
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-800 text-xs rounded-[10px] font-medium">
                  {modalError}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Janet Jackson"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="block w-full px-3 py-2 border border-slate-200 focus:ring-2 focus:ring-blue-500 rounded-[10px] text-xs text-slate-800 focus:outline-hidden bg-slate-50/50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Mobile/Phone Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 555-010-4493"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="block w-full px-3 py-2 border border-slate-200 focus:ring-2 focus:ring-blue-500 rounded-[10px] text-xs text-slate-800 focus:outline-hidden bg-slate-50/50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. client@domain.com (optional)"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="block w-full px-3 py-2 border border-slate-200 focus:ring-2 focus:ring-blue-500 rounded-[10px] text-xs text-slate-800 focus:outline-hidden bg-slate-50/50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Postal / Shipping Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. 104 Main road, Suite C, Austin, TX"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="block w-full px-3 py-2 border border-slate-200 focus:ring-2 focus:ring-blue-500 rounded-[10px] text-xs text-slate-800 focus:outline-hidden bg-slate-50/50 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 flex-row">
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(false)}
                  className="py-1.5 px-3 border border-slate-200 text-slate-700 text-xs font-semibold rounded-[10px] cursor-pointer bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="py-1.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-[10px] disabled:opacity-50 shadow-md shadow-blue-200/50 cursor-pointer"
                >
                  {modalLoading ? 'Saving...' : 'Register Profile'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
