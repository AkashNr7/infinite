/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'staff';
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  description: string;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string;
  product_name: string; // denormalized for historical accuracy if product name changes
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Invoice {
  id: string;
  invoice_no: string;
  customer_id: string;
  customer_name: string; // denormalized
  customer_phone: string; // denormalized
  subtotal: number;
  tax: number; // calculated tax amount
  discount: number; // discount percentage or absolute amount
  total: number;
  payment_status: 'paid' | 'unpaid';
  payment_method: 'cash' | 'card' | 'upi';
  items?: InvoiceItem[];
  created_at: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  invoice_no: string;
  amount: number;
  payment_method: 'cash' | 'card' | 'upi';
  payment_date: string;
}

export type ActiveTab = 'dashboard' | 'products' | 'customers' | 'billing' | 'invoices' | 'reports' | 'settings';

export interface BusinessSettings {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyTaxNo: string;
  taxRate: number; // standard VAT/GST/Sales tax rate in %
  currency: string; // e.g. "$" or "₹"
}
