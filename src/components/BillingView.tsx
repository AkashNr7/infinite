/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Coins, 
  CreditCard, 
  Check, 
  User, 
  ShoppingBag, 
  Minus, 
  Flame,
  CheckCircle,
  AlertCircle,
  FileCheck2,
  PhoneCall
} from 'lucide-react';
import { Product, Customer, ActiveTab, BusinessSettings } from '../types';
import { getApiUrl } from '../lib/api';

interface CartItem {
  product: Product;
  quantity: number;
}

interface BillingViewProps {
  token: string;
  settings: BusinessSettings;
  checkoutPrefilledCustomerId?: string | null;
  onClearPrefilledCustomerId: () => void;
  onInvoiceCreated: (invoiceId: string) => void;
}

export default function BillingView({ 
  token, 
  settings, 
  checkoutPrefilledCustomerId,
  onClearPrefilledCustomerId,
  onInvoiceCreated 
}: BillingViewProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Shell State
  const [searchProductQuery, setSearchProductQuery] = useState('');
  const [selectedProductCategory, setSelectedProductCategory] = useState('All');
  const [productCategories, setProductCategories] = useState<string[]>([]);
  
  // Checkout Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid'>('paid');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi'>('cash');
  
  // Quick clients add
  const [showQuickCustomerModal, setShowQuickCustomerModal] = useState(false);
  const [quickCustError, setQuickCustError] = useState<string | null>(null);
  const [quickCustLoading, setQuickCustLoading] = useState(false);
  const [quickCustForm, setQuickCustForm] = useState({ name: '', phone: '', email: '' });

  // Checkout submission state
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const { currency, taxRate } = settings;

  const loadBillingData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      
      const [productsRes, customersRes] = await Promise.all([
        fetch(getApiUrl('/api/products'), { headers }),
        fetch(getApiUrl('/api/customers'), { headers })
      ]);

      const prodsData = await productsRes.json();
      const custData = await customersRes.json();

      if (productsRes.ok) {
        setProducts(prodsData);
        const uniqCats: string[] = Array.from(new Set(prodsData.map((p: Product) => p.category)));
        setProductCategories(uniqCats);
      }
      
      if (customersRes.ok) {
        setCustomers(custData);
        // Default to first customer if any
        if (custData.length > 0 && !selectedCustomerId) {
          setSelectedCustomerId(custData[0].id);
        }
      }

    } catch (err) {
      console.error('Error fetching billing details databases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillingData();
  }, [token]);

  // Handle customer prefilling from outer navigation
  useEffect(() => {
    if (checkoutPrefilledCustomerId && customers.length > 0) {
      const match = customers.find((c) => c.id === checkoutPrefilledCustomerId);
      if (match) {
        setSelectedCustomerId(match.id);
      }
      onClearPrefilledCustomerId(); // Reset
    }
  }, [checkoutPrefilledCustomerId, customers]);

  // Cart actions
  const addToCart = (product: Product) => {
    const existingIndex = cart.findIndex((item) => item.product.id === product.id);

    // Validate overall Stock constraints
    const currentQtyInCart = existingIndex !== -1 ? cart[existingIndex].quantity : 0;
    if (product.stock <= currentQtyInCart) {
      alert(`POS Constraint: There is only ${product.stock} unit(s) of "${product.name}" in physical warehouses.`);
      return;
    }

    if (existingIndex !== -1) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      setCart(newCart);
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const updateQty = (productId: string, delta: number) => {
    const itemIndex = cart.findIndex((item) => item.product.id === productId);
    if (itemIndex === -1) return;

    const currentItem = cart[itemIndex];
    const newQty = currentItem.quantity + delta;

    if (newQty <= 0) {
      // Remove from cart
      const newCart = cart.filter((item) => item.product.id !== productId);
      setCart(newCart);
      return;
    }

    // Verify stock ceiling constraints
    if (delta > 0 && currentItem.product.stock <= currentItem.quantity) {
      alert(`POS Limit reached: Physical stock count of "${currentItem.product.name}" stands at ${currentItem.product.stock}.`);
      return;
    }

    const newCart = [...cart];
    newCart[itemIndex].quantity = newQty;
    setCart(newCart);
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const handleQuickCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustForm.name || !quickCustForm.phone) {
      setQuickCustError('Customer Name and primary Phone Number are mandatory.');
      return;
    }

    setQuickCustError(null);
    setQuickCustLoading(true);

    try {
      const response = await fetch(getApiUrl('/api/customers'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(quickCustForm)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fast create customer');
      }

      // Add to regional list and pre-select
      setCustomers([...customers, data]);
      setSelectedCustomerId(data.id);
      setShowQuickCustomerModal(false);
      setQuickCustForm({ name: '', phone: '', email: '' });
    } catch (err: any) {
      setQuickCustError(err.message);
    } finally {
      setQuickCustLoading(false);
    }
  };

  // Process and transmit POS Bill
  const handleProcessCheckout = async () => {
    if (cart.length === 0) {
      setCheckoutError('POS Cart is empty. Please add items to invoice.');
      return;
    }

    if (!selectedCustomerId) {
      setCheckoutError('Please assign a customer profile for details.');
      return;
    }

    setCheckoutLoading(true);
    setCheckoutError(null);

    const invoiceItemsPayload = cart.map((item) => ({
      product_id: item.product.id,
      quantity: item.quantity,
    }));

    try {
      const response = await fetch(getApiUrl('/api/invoices'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          customer_id: selectedCustomerId,
          items: invoiceItemsPayload,
          discount: discountPercent,
          payment_status: paymentStatus,
          payment_method: paymentMethod,
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Invoice transaction process failed');
      }

      // POS Success: clear cart and callback redirecting to Invoice preview!
      setCart([]);
      setDiscountPercent(0);
      onInvoiceCreated(data.id);

    } catch (err: any) {
      setCheckoutError(err.message || 'Payment system transmission timed out.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Math Calculations
  const calculatedSubtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const calculatedDiscountAmt = calculatedSubtotal * (discountPercent / 100);
  const taxableAmt = calculatedSubtotal - calculatedDiscountAmt;
  const calculatedTaxAmt = Number((taxableAmt * (taxRate / 100)).toFixed(2));
  const finalBillSum = Number((taxableAmt + calculatedTaxAmt).toFixed(2));

  // Product Filter
  const filteredProductsShelf = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchProductQuery.toLowerCase()) ||
                          p.category.toLowerCase().includes(searchProductQuery.toLowerCase());
    const matchesCat = selectedProductCategory === 'All' || p.category === selectedProductCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div id="billing_pos_module" className="space-y-5 h-full">
      
      {/* Title section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-100">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">POS Invoicing Checkout</h2>
          <p className="text-slate-500 text-sm">Add catalog items, calculate tax discounts, choose payment states, and print immediate client bills</p>
        </div>
      </div>

      {checkoutError && (
        <div className="p-3 bg-red-50 border border-red-100 text-red-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          {checkoutError}
        </div>
      )}

      {/* Divided Grid layout: Shelf left, Cart Checkout right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Side: Product catalog cards (span 7) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Internal Catalog filters */}
          <div className="bg-white p-3.5 border border-slate-200 rounded-[10px] shadow-sm flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Lookup SKU, Code, Brand or Item description..."
                value={searchProductQuery}
                onChange={(e) => setSearchProductQuery(e.target.value)}
                className="block w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-[10px] focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs text-slate-700 bg-slate-50 focus:bg-white"
              />
            </div>
            <select
              value={selectedProductCategory}
              onChange={(e) => setSelectedProductCategory(e.target.value)}
              className="appearance-none pr-8 pl-3 py-1.5 border border-slate-200 rounded-[10px] text-xs text-slate-700 bg-slate-50 hover:bg-slate-100/50 cursor-pointer focus:outline-hidden"
            >
              <option value="All">All Categories</option>
              {productCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Product Items catalog Grid */}
          {loading ? (
            <div className="text-center py-12 text-xs font-semibold text-slate-400">
              Retrieving catalog database shelf...
            </div>
          ) : filteredProductsShelf.length === 0 ? (
            <div className="bg-white rounded-[10px] p-8 text-center text-xs text-slate-400 border border-slate-200 shadow-sm">
              No matching SKUs currently found in this category.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 max-h-[70vh] overflow-y-auto pr-1">
              {filteredProductsShelf.map((p) => {
                const isOutOfStock = p.stock === 0;
                const isLowStock = p.stock > 0 && p.stock <= 4;
                const inCartItem = cart.find(item => item.product.id === p.id);
                const inCartCount = inCartItem ? inCartItem.quantity : 0;

                return (
                  <div 
                    key={p.id}
                    onClick={() => !isOutOfStock && addToCart(p)}
                    className={`bg-white border rounded-[10px] p-3.5 flex flex-col justify-between font-sans text-xs transition-all relative shadow-sm ${
                      isOutOfStock 
                        ? 'opacity-60 bg-slate-50/50 border-slate-200 cursor-not-allowed' 
                        : 'border-slate-200 hover:border-blue-550 hover:shadow-md cursor-pointer hover:shadow-slate-100'
                    }`}
                  >
                    {/* Floating Cart Indicator */}
                    {inCartCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 h-6 w-6 bg-blue-600 text-white font-bold text-[10px] rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                        {inCartCount}
                      </span>
                    )}

                    <div>
                      <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-sm uppercase tracking-wide">
                        {p.category}
                      </span>
                      <h4 className="font-bold text-slate-900 leading-snug mt-1.5 line-clamp-2 h-8 text-xs">{p.name}</h4>
                      {p.description && (
                        <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{p.description}</p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-50 mt-3 flex items-center justify-between">
                      <span className="font-extrabold text-[13px] text-slate-900">
                        {currency}{p.price.toFixed(2)}
                      </span>
                      
                      {isOutOfStock ? (
                        <span className="text-[10px] text-red-500 font-bold uppercase tracking-wide bg-red-50 px-2 py-0.5 rounded-sm">
                          SOLD OUT
                        </span>
                      ) : (
                        <div className="text-right">
                          <span className={`text-[9px] font-bold block ${
                            isLowStock ? 'text-amber-500' : 'text-slate-400'
                          }`}>
                            Qty: {p.stock} in store
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: POS Cart compilation (span 5) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-[10px] shadow-sm overflow-hidden flex flex-col font-sans">
          
          {/* Assign Customer panel */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between gap-2 mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase">Customer Profile</label>
              <button
                type="button"
                onClick={() => setShowQuickCustomerModal(true)}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-850 flex items-center gap-0.5 cursor-pointer"
              >
                + Register Client
              </button>
            </div>
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="appearance-none block w-full pl-8 pr-8 py-2 border border-slate-200 focus:outline-hidden bg-white rounded-[10px] text-xs text-slate-705 cursor-pointer"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Cart Items listing section */}
          <div className="p-4 flex-1 space-y-3 overflow-y-auto max-h-[16rem] min-h-[12rem] border-b border-slate-200">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Shopping Cart List</h3>
            
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center h-full text-slate-400">
                <ShoppingBag className="h-8 w-8 text-slate-350 stroke-[1.5] mb-2" />
                <span className="text-xs font-semibold">POS Cart is Empty</span>
                <p className="text-[10px] text-slate-400 max-w-[150px] mt-0.5">Click items in catalog shelf on the left to add them to this bill.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {cart.map((item) => (
                  <div key={item.product.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-slate-800 truncate">{item.product.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {currency}{item.product.price.toFixed(2)} each
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Qty edit switcher */}
                      <div className="flex items-center border border-slate-200/80 rounded-lg overflow-hidden bg-slate-50">
                        <button
                          type="button"
                          onClick={() => updateQty(item.product.id, -1)}
                          className="px-2 py-1 text-slate-500 hover:bg-slate-100 focus:outline-hidden transition-colors cursor-pointer"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-1.5 font-bold text-slate-800 text-[11px] w-6 text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQty(item.product.id, 1)}
                          className="px-2 py-1 text-slate-500 hover:bg-slate-100 focus:outline-hidden transition-colors cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Recalculated Item Subtotal */}
                      <span className="font-bold text-slate-900 w-16 text-right font-mono">
                        {currency}{(item.product.price * item.quantity).toFixed(2)}
                      </span>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                        title="Remove Item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pricing Details Calculations */}
          <div className="p-4 bg-slate-50/50 space-y-3.5 border-b border-slate-200">
            {/* Discount Inputs */}
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-650">Subtotal Price</label>
              <span className="font-bold text-slate-800 font-mono">{currency}{calculatedSubtotal.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-200">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-650">Apply Discount</span>
                <div className="flex items-center border border-slate-200 rounded-[10px] overflow-hidden bg-white max-w-[65px] px-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={discountPercent || ''}
                    onChange={(e) => setDiscountPercent(Math.max(0, Math.min(100, Number(e.target.value))))}
                    className="w-full text-right bg-transparent text-xs font-bold text-slate-805 outline-hidden border-none"
                    placeholder="0"
                  />
                  <span className="text-[10px] text-slate-400 font-bold ml-0.5">%</span>
                </div>
              </div>
              <span className="font-medium text-red-600 font-mono">
                -{currency}{calculatedDiscountAmt.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-500">Tax Dues ({taxRate}%)</span>
              <span className="font-medium text-slate-700 font-mono">+{currency}{calculatedTaxAmt.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-205">
              <span className="font-bold text-slate-900 text-sm">Invoice Final SUM</span>
              <span className="font-extrabold text-blue-700 text-base font-sans leading-none">
                {currency}{finalBillSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Checkout Controls */}
          <div className="p-4 space-y-4">
            
            {/* Checkout parameters options grids */}
            <div className="grid grid-cols-2 gap-3 pb-1">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 block uppercase mb-1.5">Payment Ledger Status</span>
                <div className="grid grid-cols-2 border border-slate-200 rounded-[10px] overflow-hidden text-center text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setPaymentStatus('paid')}
                    className={`py-1.5 cursor-pointer ${
                      paymentStatus === 'paid' 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-r border-slate-200'
                    }`}
                  >
                    PAID
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentStatus('unpaid')}
                    className={`py-1.5 cursor-pointer ${
                      paymentStatus === 'unpaid' 
                        ? 'bg-amber-500 text-white' 
                        : 'bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    UNPAID
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-extrabold text-slate-400 block uppercase mb-1.5">Instrument / Mode</span>
                <div className="grid grid-cols-3 border border-slate-200 rounded-[10px] overflow-hidden text-center text-[10px] font-bold">
                  {['cash', 'card', 'upi'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      disabled={paymentStatus === 'unpaid'}
                      onClick={() => setPaymentMethod(m as any)}
                      className={`py-1.5 uppercase cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        paymentMethod === m && paymentStatus === 'paid'
                          ? 'bg-slate-900 text-white' 
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-r border-slate-200 last:border-none'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Direct Checkout Transaction Submit */}
            <button
              onClick={handleProcessCheckout}
              disabled={checkoutLoading || cart.length === 0}
              id="checkout_pos_btn"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm tracking-wide rounded-[10px] flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
            >
              {checkoutLoading ? (
                'Processing order...'
              ) : (
                <>
                  <FileCheck2 className="h-4 w-4" />
                  Process &amp; Print Invoice Receipt
                </>
              )}
            </button>
          </div>

        </div>

      </div>

      {/* Quick Register Customer Modal popup */}
      {showQuickCustomerModal && (
        <div id="quick_customer_modal" className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[10px] max-w-sm w-full shadow-2xl overflow-hidden border border-slate-205"
          >
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
              <h4 className="text-sm font-bold text-slate-900">Quick Register Customer</h4>
              <button
                type="button"
                onClick={() => setShowQuickCustomerModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickCustomerSubmit} className="p-5 space-y-4 font-sans text-xs">
              {quickCustError && (
                <div className="p-2.5 bg-red-50 border border-red-100 text-red-800 text-xs rounded-[10px] font-medium">
                  {quickCustError}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Full Customer Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Robert De Niro"
                  value={quickCustForm.name}
                  onChange={(e) => setQuickCustForm({ ...quickCustForm, name: e.target.value })}
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
                  placeholder="e.g. 555-019-3388"
                  value={quickCustForm.phone}
                  onChange={(e) => setQuickCustForm({ ...quickCustForm, phone: e.target.value })}
                  className="block w-full px-3 py-2 border border-slate-200 focus:ring-2 focus:ring-blue-500 rounded-[10px] text-xs text-slate-800 focus:outline-hidden bg-slate-50/50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. client.email@mail.com"
                  value={quickCustForm.email}
                  onChange={(e) => setQuickCustForm({ ...quickCustForm, email: e.target.value })}
                  className="block w-full px-3 py-2 border border-slate-200 focus:ring-2 focus:ring-blue-500 rounded-[10px] text-xs text-slate-800 focus:outline-hidden bg-slate-50/50 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 flex-row">
                <button
                  type="button"
                  onClick={() => setShowQuickCustomerModal(false)}
                  className="py-1.5 px-3 border border-slate-200 text-slate-705 text-xs font-semibold rounded-[10px] cursor-pointer bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickCustLoading}
                  className="py-1.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-[10px] disabled:opacity-50 shadow-md shadow-blue-200/50 cursor-pointer"
                >
                  {quickCustLoading ? 'Saving...' : 'Register Profile'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
