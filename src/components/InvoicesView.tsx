/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { jsPDF } from 'jspdf';
import { 
  Search, 
  Eye, 
  Printer, 
  Download, 
  Coins, 
  Calendar, 
  User, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp,
  Receipt,
  FileSpreadsheet,
  FileCheck2
} from 'lucide-react';
import { Invoice, BusinessSettings, User as UserType } from '../types';
import { getApiUrl } from '../lib/api';

interface InvoicesViewProps {
  token: string;
  user: UserType;
  settings: BusinessSettings;
  preselectedInvoiceId?: string | null;
  onClearPreselectedInvoiceId: () => void;
}

export default function InvoicesView({ 
  token, 
  user, 
  settings, 
  preselectedInvoiceId,
  onClearPreselectedInvoiceId 
}: InvoicesViewProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [paymentModeFilter, setPaymentModeFilter] = useState('All');

  // Inspector States
  const [inspectedInvoice, setInspectedInvoice] = useState<Invoice | null>(null);
  const [inspectedInvoiceDetails, setInspectedInvoiceDetails] = useState<Invoice | null>(null);
  
  // Action loadings
  const [payLoading, setPayLoading] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);

  const { currency, companyName, companyAddress, companyEmail, companyPhone, companyTaxNo } = settings;

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl('/api/invoices'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setInvoices(data);
      }
    } catch (err) {
      console.error('Error fetching invoices ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [token]);

  // Load selected invoice details when selected from master tables
  const fetchInvoiceDetails = async (invId: string) => {
    try {
      const response = await fetch(getApiUrl(`/api/invoices/${invId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setInspectedInvoiceDetails(data);
        setInspectedInvoice(data);
      }
    } catch (err) {
      console.error('Error fetching deep invoice elements:', err);
    }
  };

  // Listen to outer navigation deep links (from Dashboard or Customer purchase history!)
  useEffect(() => {
    if (preselectedInvoiceId) {
      fetchInvoiceDetails(preselectedInvoiceId);
      onClearPreselectedInvoiceId(); // Clear deep link
    }
  }, [preselectedInvoiceId]);

  // Record Cashier payment manually
  const handleRecordPayment = async (invId: string, method: 'cash' | 'card' | 'upi') => {
    if (!window.confirm(`Do you want to confirm cash register payout and mark ${invId} as PAID?`)) {
      return;
    }

    setPayLoading(true);
    try {
      const response = await fetch(getApiUrl(`/api/invoices/${invId}/pay`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ payment_method: method })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update payment status');
      }

      // Refresh listings
      fetchInvoices();

      // If we are currently inspecting this invoice, refresh details
      if (inspectedInvoice && inspectedInvoice.id === invId) {
        fetchInvoiceDetails(invId);
      }

    } catch (err: any) {
      alert(err.message);
    } finally {
      setPayLoading(false);
    }
  };

  // Launch standard native print dialog with high-precision CSS
  const handlePrintReceipt = () => {
    window.print();
  };

  // Real high-precision PDF generator with progress counters
  const handleDownloadPDF = () => {
    if (!inspectedInvoice) return;
    setPdfDownloading(true);
    setPdfProgress(0);

    const interval = setInterval(() => {
      setPdfProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setPdfDownloading(false);
          
          try {
            const doc = new jsPDF('p', 'mm', 'a4');
            const pdfCurrency = currency === '₹' ? 'INR ' : (currency + ' ');
            const dateStr = new Date(inspectedInvoice.created_at).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            });

            // 1. Tax box visual decoration
            doc.setFillColor(15, 23, 42); // slate-900 color
            if (companyTaxNo) {
              doc.rect(15, 15, 38, 6, 'F');
              doc.setFont('Helvetica', 'bold');
              doc.setFontSize(7);
              doc.setTextColor(255, 255, 255);
              doc.text(companyTaxNo.slice(0, 20), 18, 19.3);
            }

            // 2. Company Info (Left)
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(15, 23, 42);
            doc.text(companyName || 'Business Name', 15, 28);
            
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(100, 116, 139); // slate-400
            
            if (companyAddress) {
              doc.text(companyAddress.slice(0, 65), 15, 33);
            }
            doc.text(`Phone: ${companyPhone || 'N/A'} | Email: ${companyEmail || 'N/A'}`, 15, 37.5);

            // 3. Right Header: Invoice Title & metadata
            doc.setFillColor(239, 246, 255); // light-blue shade
            doc.setDrawColor(191, 219, 254); // blue-200 boundary
            doc.roundedRect(138, 15, 57, 7, 1, 1, 'FD');
            
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(29, 78, 216); // blue-700
            doc.text('INVOICE RECEIPT', 142, 20);

            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(15, 23, 42);
            doc.text(inspectedInvoice.invoice_no, 195, 28, { align: 'right' });
            
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(100, 116, 139);
            doc.text(`Date: ${dateStr}`, 195, 33, { align: 'right' });

            // Horizontal splitter rule
            doc.setDrawColor(226, 232, 240); // slate-200
            doc.line(15, 43, 195, 43);

            // 4. Particulars rows (Customer vs Cashier profile details)
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(148, 163, 184); // slate-400
            doc.text('CUSTOMER BILL TO', 15, 50);
            
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(15, 23, 42);
            doc.text(inspectedInvoice.customer_name || 'Walk-in Client', 15, 55);
            
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(100, 116, 139);
            doc.text(`Phone: ${inspectedInvoice.customer_phone || 'N/A'}`, 15, 59.5);

            // Right billing transaction panel details
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(148, 163, 184);
            doc.text('TRANSACTION PARTICULARS', 138, 50);

            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(100, 116, 139);
            doc.text(`Cashier Profile: staff`, 138, 55);
            doc.text(`Instrument Mode: ${inspectedInvoice.payment_method.toUpperCase()}`, 138, 59.5);

            // Payment status container badge
            const isPaid = inspectedInvoice.payment_status === 'paid';
            if (isPaid) {
              doc.setFillColor(240, 253, 250); // emerald-50
              doc.setDrawColor(167, 243, 208); // emerald-200
              doc.roundedRect(138, 62.5, 20, 5, 1, 1, 'FD');
              doc.setFont('Helvetica', 'bold');
              doc.setFontSize(7);
              doc.setTextColor(4, 120, 87); // emerald-700
              doc.text('PAID', 144, 66);
            } else {
              doc.setFillColor(254, 242, 242); // red-50
              doc.setDrawColor(254, 202, 202); // red-200
              doc.roundedRect(138, 62.5, 20, 5, 1, 1, 'FD');
              doc.setFont('Helvetica', 'bold');
              doc.setFontSize(7);
              doc.setTextColor(185, 28, 28); // red-700
              doc.text('UNPAID', 142.5, 66);
            }

            // Divider rule
            doc.setDrawColor(226, 232, 240);
            doc.line(15, 71, 195, 71);

            // 5. Item list header
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(148, 163, 184); // slate-400
            doc.text('ITEM PARTICULARS / PRODUCTS', 15, 77);
            doc.text('UNIT PRICE', 130, 77, { align: 'right' });
            doc.text('QTY', 155, 77, { align: 'center' });
            doc.text('AMOUNT', 195, 77, { align: 'right' });

            doc.setDrawColor(148, 163, 184);
            doc.line(15, 80, 195, 80);

            // 6. Loop all item rows
            let y = 86;
            const items = (inspectedInvoiceDetails && inspectedInvoiceDetails.items) || [];
            
            if (items.length > 0) {
              items.forEach((item) => {
                doc.setFont('Helvetica', 'bold');
                doc.setFontSize(8.5);
                doc.setTextColor(15, 23, 42);
                
                // Truncate long name safely
                const trimmedProdName = item.product_name.length > 55 
                  ? item.product_name.slice(0, 52) + '...' 
                  : item.product_name;
                doc.text(trimmedProdName, 15, y);

                doc.setFont('Helvetica', 'normal');
                doc.setTextColor(71, 85, 105); // slate-600
                doc.text(`${pdfCurrency}${item.price.toFixed(2)}`, 130, y, { align: 'right' });
                
                doc.setFont('Helvetica', 'bold');
                doc.text(String(item.quantity), 155, y, { align: 'center' });
                
                doc.setTextColor(15, 23, 42);
                doc.text(`${pdfCurrency}${item.subtotal.toFixed(2)}`, 195, y, { align: 'right' });

                doc.setDrawColor(241, 245, 249); // slate-50 divider
                doc.line(15, y + 3, 195, y + 3);
                y += 8.5;
              });
            } else {
              // Fallback row of overall transaction values
              doc.setFont('Helvetica', 'normal');
              doc.setFontSize(9);
              doc.setTextColor(100, 116, 139);
              doc.text('Subtotal Items Ledger Account', 15, y);
              doc.text(`${pdfCurrency}${inspectedInvoice.subtotal.toFixed(2)}`, 195, y, { align: 'right' });
              
              doc.setDrawColor(241, 245, 249);
              doc.line(15, y + 3, 195, y + 3);
              y += 8.5;
            }

            // 7. Summary calculations blocks
            y += 5;
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(100, 116, 139);
            
            // Subtotal
            doc.text('Gross Subtotal', 138, y, { align: 'right' });
            doc.setFont('Helvetica', 'bold');
            doc.setTextColor(51, 65, 85);
            doc.text(`${pdfCurrency}${inspectedInvoice.subtotal.toFixed(2)}`, 195, y, { align: 'right' });
            y += 6;

            // Discount
            if (inspectedInvoice.discount > 0) {
              doc.setFont('Helvetica', 'normal');
              doc.setTextColor(100, 116, 139);
              doc.text(`Discounted savings (${inspectedInvoice.discount}%)`, 138, y, { align: 'right' });
              doc.setFont('Helvetica', 'bold');
              doc.setTextColor(220, 38, 38); // red-600
              const savings = (inspectedInvoice.subtotal * (inspectedInvoice.discount / 100)).toFixed(2);
              doc.text(`-${pdfCurrency}${savings}`, 195, y, { align: 'right' });
              y += 6;
            }

            // Taxes
            doc.setFont('Helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text('State Taxes Rates', 138, y, { align: 'right' });
            doc.setFont('Helvetica', 'bold');
            doc.setTextColor(51, 65, 85);
            doc.text(`+${pdfCurrency}${inspectedInvoice.tax.toFixed(2)}`, 195, y, { align: 'right' });
            y += 7;

            // Split line
            doc.setDrawColor(226, 232, 240);
            doc.line(115, y - 2, 195, y - 2);

            // Grand Total (Highly emphasized)
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(9.5);
            doc.setTextColor(15, 23, 42);
            doc.text('TOTAL AMOUNT PAID', 115, y + 3);
            
            doc.setFontSize(11.5);
            doc.setTextColor(29, 78, 216); // blue-700
            doc.text(`${pdfCurrency}${inspectedInvoice.total.toFixed(2)}`, 195, y + 3, { align: 'right' });

            // 8. Footer legal terms statement
            doc.setDrawColor(241, 245, 249);
            doc.line(15, 255, 195, 255);

            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(100, 116, 139);
            doc.text('Receipt terms and conditions', 105, 262, { align: 'center' });

            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(148, 163, 184);
            doc.text('Please retain this printed receipt for warranties and product exchanges. All return claims', 105, 267, { align: 'center' });
            doc.text('are subject to store policy variables. Thank you for your business!', 105, 271, { align: 'center' });

            // Save standard compliant binary PDF!
            doc.save(`Invoice_${inspectedInvoice.invoice_no}.pdf`);
          } catch (pdfErr) {
            console.error('Failed to compile standard jsPDF layout:', pdfErr);
            alert('Something went wrong generating the billing PDF, downloading clean plain-text fallback instead.');
            
            // Text plain backup file trigger
            const fallbackTxt = `Apex Invoice ${inspectedInvoice.invoice_no}\nTotal sum: ${currency}${inspectedInvoice.total}\nGenerated for: ${inspectedInvoice.customer_name}`;
            const blob = new Blob([fallbackTxt], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Invoice_${inspectedInvoice.invoice_no}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }
          
          return 0;
        }
        return prev + 25;
      });
    }, 150);
  };

  // Sorting invoices (newest first)
  const sortedInvoices = [...invoices].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Filter lists
  const filteredInvoices = sortedInvoices.filter((inv) => {
    const s = searchQuery.toLowerCase();
    const matchesSearch = 
      inv.invoice_no.toLowerCase().includes(s) ||
      inv.customer_name.toLowerCase().includes(s) ||
      inv.customer_phone.includes(s) ||
      inv.id.toLowerCase().includes(s);

    const matchesStatus = statusFilter === 'All' || inv.payment_status === statusFilter;
    const matchesMode = paymentModeFilter === 'All' || inv.payment_method === paymentModeFilter;

    return matchesSearch && matchesStatus && matchesMode;
  });

  return (
    <div id="invoices_module" className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Invoices Log</h2>
          <p className="text-slate-500 text-sm">Review purchase receipts, record client payments, print POS tickets, and download PDF outputs</p>
        </div>
      </div>

      {/* Grid container: master lists left, deep inspector right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Invoices master lists panel (spans 7 when inspecting, or 12 when clean) */}
        <div id="invoices_list_component" className={`bg-white border border-slate-205 rounded-[10px] shadow-sm overflow-hidden print:hidden ${
          inspectedInvoice ? 'lg:col-span-7' : 'lg:col-span-12'
        }`}>
          {/* Combined search filters panel */}
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search by invoice ID, number code, client name, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-[10px] focus:ring-2 focus:ring-blue-500 text-xs text-slate-705 bg-slate-50 focus:bg-white"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pr-8 pl-3 py-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-[10px] text-xs text-slate-705 cursor-pointer focus:outline-hidden"
              >
                <option value="All">Payment: All</option>
                <option value="paid">Paid Only</option>
                <option value="unpaid">Unpaid Only</option>
              </select>

              <select
                value={paymentModeFilter}
                onChange={(e) => setPaymentModeFilter(e.target.value)}
                className="pr-8 pl-3 py-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-[10px] text-xs text-slate-705 cursor-pointer focus:outline-hidden"
              >
                <option value="All">Instrument: All</option>
                <option value="cash">Cash Only</option>
                <option value="card">Card Only</option>
                <option value="upi">UPI Only</option>
              </select>
            </div>
          </div>

          {/* Table index results */}
          <div className="overflow-x-auto min-w-full">
            <table className="min-w-full text-left border-collapse font-sans">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-455 text-[10px] font-extrabold uppercase tracking-wider">
                  <th className="py-3 px-4 font-medium">Receipt Code</th>
                  <th className="py-3 px-4 font-medium">Purchased by</th>
                  <th className="py-3 px-4 font-medium">Date</th>
                  <th className="py-3 px-4 font-medium">Bill sum</th>
                  <th className="py-3 px-4 font-medium text-center">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center font-semibold text-slate-400">
                      Syncing receipt records indices...
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center font-semibold text-slate-400">
                      No invoices logged yet. Use billing terminal to checkout client.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => {
                    const isSelected = inspectedInvoice?.id === inv.id;
                    return (
                      <tr 
                        key={inv.id} 
                        className={`hover:bg-slate-50/40 text-slate-800 transition-colors ${
                          isSelected ? 'bg-blue-50/30' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-bold text-slate-900">{inv.invoice_no}</td>
                        <td className="py-3 px-4 font-semibold text-slate-700 leading-tight">
                          <div>{inv.customer_name}</div>
                          <div className="text-[9px] text-slate-400 font-normal font-mono">{inv.customer_phone}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-500 leading-tight">
                          <div>{new Date(inv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                          {currency}{inv.total.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center select-none">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide capitalize border ${
                            inv.payment_status === 'paid' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {inv.payment_status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => fetchInvoiceDetails(inv.id)}
                              className="p-1 px-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-[10px] text-slate-750 font-semibold text-[10px] transition-all cursor-pointer shadow-xs"
                              title="Audit details receipt"
                            >
                              Inspect
                            </button>
                            {inv.payment_status === 'unpaid' && (
                              <button
                                onClick={() => handleRecordPayment(inv.id, 'cash')}
                                className="p-1 px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-[10px] text-[10px] font-bold cursor-pointer transition-all shadow-xs"
                                title="Mark as fully Paid via Cash ledger"
                              >
                                Collect
                              </button>
                            )}
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

        {/* Right Side Invoices inspector view details (spans 5 when open) */}
        {inspectedInvoice && (
          <div id="receipt_panel" className="lg:col-span-12 xl:col-span-5 bg-white border border-slate-202 rounded-[10px] p-5 shadow-sm space-y-4 print:border-none print:shadow-none print:p-0">
            
            {/* Inspector Controls strip */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 print:hidden">
              <div>
                <h4 className="text-sm font-black text-slate-900 font-sans">Invoicing Inspector</h4>
                <p className="text-[10px] text-slate-400">Detailed billing voucher review</p>
              </div>
              <button
                onClick={() => {
                  setInspectedInvoice(null);
                  setInspectedInvoiceDetails(null);
                }}
                className="text-slate-450 hover:text-slate-700 text-xs font-bold cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            {/* Simulated Kit Download Progress bar */}
            {pdfDownloading && (
              <div className="bg-slate-50 border border-slate-200 rounded-[10px] p-3 text-xs flex flex-col font-sans gap-1.5 print:hidden">
                <span className="font-semibold text-slate-700 animate-pulse">Assembling PDFKit vector assets...</span>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${pdfProgress}%` }}></div>
                </div>
              </div>
            )}

            {/* Print Friendly Invoice Template Container */}
            <div className="invoice-print-container bg-white border border-slate-200 p-5 rounded-[10px] print:border-none print:p-0">
              
              {/* Receipt Header logo & store name */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="font-sans">
                  <span className="text-[9px] font-extrabold uppercase bg-slate-900 text-slate-100 px-1.5 py-0.5 rounded-sm">
                    {companyTaxNo}
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 mt-1">{companyName}</h3>
                  <p className="text-[10px] text-slate-400 leading-snug mt-1">{companyAddress}</p>
                  <p className="text-[10px] text-slate-400 leading-snug">Phone: {companyPhone} | {companyEmail}</p>
                </div>
                
                <div className="sm:text-right font-sans shrink-0">
                  <h4 className="text-xs font-extrabold text-blue-700 uppercase tracking-widest bg-blue-50/50 px-2 py-1 rounded-sm border border-blue-100 leading-none">
                    INVOICE RECEIPT
                  </h4>
                  <div className="text-sm font-black text-slate-900 mt-2">{inspectedInvoice.invoice_no}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Date: {new Date(inspectedInvoice.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              </div>

              {/* Client and Cashier particulars */}
              <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-100 font-sans text-[11px] leading-snug">
                <div>
                  <span className="text-[9px] font-extrabold uppercase text-slate-400 block mb-1">CUSTOMER BILL TO</span>
                  <span className="font-bold text-slate-900 block text-xs">{inspectedInvoice.customer_name}</span>
                  <span className="text-slate-500 block truncate">Phone: {inspectedInvoice.customer_phone}</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-extrabold uppercase text-slate-400 block mb-1">TRANSACTION DETAILS</span>
                  <span className="text-slate-500 block">Cashier Profile: <span className="font-semibold text-slate-900 capitalize">{user.username}</span></span>
                  <span className="text-slate-500 block">Instrument: <span className="font-bold text-slate-900 uppercase text-[9px]">{inspectedInvoice.payment_method}</span></span>
                  <span className="text-slate-550 mt-1 block">
                    <span className={`inline-flex px-1.5 py-0.5 rounded-xs text-[9px] font-extrabold uppercase tracking-wide border ${
                      inspectedInvoice.payment_status === 'paid' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {inspectedInvoice.payment_status}
                    </span>
                  </span>
                </div>
              </div>

              {/* Invoiced items list table */}
              <div className="py-4 font-sans text-xs">
                <table className="min-w-full text-left order-collapse">
                  <thead>
                    <tr className="border-b border-slate-150 text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">
                      <th className="py-1 bg-none">Item particulars</th>
                      <th className="py-1 text-right">Unit Price</th>
                      <th className="py-1 text-center">Qty</th>
                      <th className="py-1 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px] font-medium">
                    {inspectedInvoiceDetails && inspectedInvoiceDetails.items ? (
                      inspectedInvoiceDetails.items.map((item) => (
                        <tr key={item.id} className="text-slate-800">
                          <td className="py-2.5 font-bold text-slate-900">{item.product_name}</td>
                          <td className="py-2.5 text-right font-mono">{currency}{item.price.toFixed(2)}</td>
                          <td className="py-2.5 text-center font-bold px-1">{item.quantity}</td>
                          <td className="py-2.5 text-right font-bold text-slate-950 font-mono">{currency}{item.subtotal.toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-slate-400 animate-pulse">
                          Fetching invoice item values...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Calculations Recalculations summary */}
              <div className="border-t border-slate-100 pt-3 flex flex-col font-sans text-xs space-y-2 text-[11px]">
                <div className="flex justify-between text-slate-500 font-medium leading-none">
                  <span>Gross Subtotal</span>
                  <span className="font-semibold text-slate-800 font-mono">{currency}{inspectedInvoice.subtotal.toFixed(2)}</span>
                </div>
                {inspectedInvoice.discount > 0 && (
                  <div className="flex justify-between text-slate-500 font-medium leading-none">
                    <span>Discounted savings ({inspectedInvoice.discount}%)</span>
                    <span className="font-bold text-red-600 font-mono">
                      -{currency}{(inspectedInvoice.subtotal * (inspectedInvoice.discount / 100)).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-slate-505 font-medium leading-none">
                  <span>State Taxes Rates</span>
                  <span className="font-semibold text-slate-800 font-mono">+{currency}{inspectedInvoice.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-150">
                  <span className="font-black text-slate-905 text-sm">TOTAL AMOUNT PAID</span>
                  <span className="font-black text-[15px] text-blue-700 font-mono">
                    {currency}{inspectedInvoice.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Terms Conditions note footer */}
              <div className="mt-6 pt-4 border-t border-slate-100 text-[10px] text-slate-400 text-center leading-relaxed font-sans select-none">
                <span className="font-bold text-slate-600 block mb-1">Receipt terms and conditions</span>
                Please retain this printed receipt for warranties and product exchanges. All return claims are subject to store policy variables. Thank you for your business!
              </div>

            </div>

            {/* Document outputs triggers print & download */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200 print:hidden">
              <button
                onClick={handlePrintReceipt}
                className="py-2.5 px-4 bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-[10px] flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Printer className="h-4 w-4" />
                Print Invoice
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={pdfDownloading}
                className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-[10px] flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50 shadow-md shadow-blue-200/50"
              >
                <Download className="h-4 w-4" />
                {pdfDownloading ? 'Exporting...' : 'Download PDF'}
              </button>
            </div>

            {/* Record Payment indicator */}
            {inspectedInvoice.payment_status === 'unpaid' && (
              <div className="bg-amber-50/50 border border-amber-200 p-4 rounded-[10px] text-xs space-y-2.5 print:hidden">
                <div className="flex items-start gap-1.5 text-amber-900 font-semibold font-sans">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span>Pending Receivables Order</span>
                    <p className="text-[10px] text-amber-700 font-medium mt-0.5 leading-relaxed">
                      This bill currently sits unpaid. Record the client payment below if cash has been collected.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {['cash', 'card', 'upi'].map((m) => (
                    <button
                      key={m}
                      onClick={() => handleRecordPayment(inspectedInvoice.id, m as any)}
                      className="py-1.5 bg-white border border-slate-200 text-slate-700 text-[10px] font-black uppercase rounded-[10px] hover:bg-slate-50 cursor-pointer text-center"
                    >
                      Pay via {m}
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </div>

    </div>
  );
}
