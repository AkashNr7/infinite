/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  Sparkles, 
  Package, 
  Check, 
  X,
  SlidersHorizontal,
  Lock
} from 'lucide-react';
import { Product, User, BusinessSettings } from '../types';
import { getApiUrl } from '../lib/api';

interface ProductsViewProps {
  token: string;
  user: User;
  settings: BusinessSettings;
  preselectedProductToAdjust?: Product | null;
  onClearPreSelectedAdjustment: () => void;
}

export default function ProductsView({ 
  token, 
  user, 
  settings, 
  preselectedProductToAdjust,
  onClearPreSelectedAdjustment 
}: ProductsViewProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering and Searching State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState<string[]>([]);

  // Modals / Editor State
  const [showProductModal, setShowProductModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    stock: '',
    description: '',
  });

  const [modalError, setModalError] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [crudSuccessMsg, setCrudSuccessMsg] = useState<string | null>(null);

  // Fast stock adjustments
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [newStockCount, setNewStockCount] = useState('');

  const isAdmin = user.role === 'admin';
  const { currency } = settings;

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl('/api/products'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setProducts(data);
        
        // Collate unique categories
        const uniqCats: string[] = Array.from(new Set(data.map((p: Product) => p.category)));
        setCategories(uniqCats);
      }
    } catch (err) {
      console.error('Error loading products list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [token]);

  // Handle pre-selected product adjustments from Dashboard
  useEffect(() => {
    if (preselectedProductToAdjust) {
      setAdjustingProduct(preselectedProductToAdjust);
      setNewStockCount(preselectedProductToAdjust.stock.toString());
      onClearPreSelectedAdjustment(); // Reset parent state
    }
  }, [preselectedProductToAdjust]);

  const handleOpenAdd = () => {
    setModalMode('add');
    setSelectedProduct(null);
    setFormData({
      name: '',
      category: '',
      price: '',
      stock: '',
      description: '',
    });
    setModalError(null);
    setShowProductModal(true);
  };

  const handleOpenEdit = (prod: Product) => {
    setModalMode('edit');
    setSelectedProduct(prod);
    setFormData({
      name: prod.name,
      category: prod.category,
      price: prod.price.toString(),
      stock: prod.stock.toString(),
      description: prod.description || '',
    });
    setModalError(null);
    setShowProductModal(true);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category || !formData.price || !formData.stock) {
      setModalError('Please fill in all mandatory fields.');
      return;
    }

    setModalError(null);
    setModalLoading(true);

    const numericPrice = Number(formData.price);
    const numericStock = Number(formData.stock);

    if (isNaN(numericPrice) || numericPrice <= 0) {
      setModalError('Price must be a valid positive number.');
      setModalLoading(false);
      return;
    }

    if (isNaN(numericStock) || numericStock < 0) {
      setModalError('Stock count must be a non-negative integer.');
      setModalLoading(false);
      return;
    }

    try {
      const isEdit = modalMode === 'edit';
      const endpoint = isEdit ? `/api/products/${selectedProduct?.id}` : '/api/products';
      const response = await fetch(getApiUrl(endpoint), {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          category: formData.category,
          price: numericPrice,
          stock: numericStock,
          description: formData.description,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Server error saving product');
      }

      setCrudSuccessMsg(`Product "${data.name}" successfully ${isEdit ? 'updated' : 'registered'}!`);
      setShowProductModal(false);
      fetchProducts();
      
      // Auto clear alert message
      setTimeout(() => setCrudSuccessMsg(null), 4000);
    } catch (err: any) {
      setModalError(err.message || 'Transmission failed.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!window.confirm(`Are you absolutely sure you want to permanently delete "${product.name}" from the systems catalog?`)) {
      return;
    }

    try {
      const response = await fetch(getApiUrl(`/api/products/${product.id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Deletion failed');
      }

      setCrudSuccessMsg(`Product catalog entry successfully removed!`);
      fetchProducts();
      setTimeout(() => setCrudSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(`Access Forbidden: ${err.message}`);
    }
  };

  const handleFastStockAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;

    const count = Number(newStockCount);
    if (isNaN(count) || count < 0) {
      alert('Stock count must be a non-negative value');
      return;
    }

    try {
      const response = await fetch(getApiUrl(`/api/products/${adjustingProduct.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ stock: count })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update stock');
      }

      setCrudSuccessMsg(`Stock counts for "${adjustingProduct.name}" recalculated to ${count}!`);
      setAdjustingProduct(null);
      fetchProducts();
      setTimeout(() => setCrudSuccessMsg(null), 4500);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Advanced query sorting & filtering
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div id="products_module" className="space-y-6">
      
      {/* Upper header action list */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Inventory Stock Ledger</h2>
          <p className="text-slate-500 text-sm">Add catalog entries, manage available stock, and track SKU indices</p>
        </div>
        <div>
          {isAdmin ? (
            <button
              onClick={handleOpenAdd}
              id="add_product_btn"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-[10px] shadow-sm transition-all cursor-pointer shadow-blue-200/50"
            >
              <Plus className="h-4 w-4" />
              Add New Product
            </button>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-[10px] px-3 py-1.5 flex items-center gap-2 text-slate-500 text-xs font-semibold">
              <Lock className="h-3.5 w-3.5 text-slate-400" />
              Staff Profile: Read-Only stock
            </div>
          )}
        </div>
      </div>

      {/* Crud Alert Message */}
      {crudSuccessMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-[10px] text-xs font-semibold flex items-center gap-2"
        >
          <span className="p-1 rounded-full bg-emerald-500 text-white text-[8px]">✓</span>
          {crudSuccessMsg}
        </motion.div>
      )}

      {/* Search & Filter bar container */}
      <div className="bg-white p-4 border border-slate-200 rounded-[10px] shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Search by Product SKU ID, Name, or General Tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-[10px] focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs text-slate-700 placeholder-slate-400 bg-slate-50 focus:bg-white transition-colors"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="appearance-none block pl-3 pr-8 py-2 border border-slate-200 rounded-[10px] text-xs text-slate-700 bg-slate-50 hover:bg-slate-100/50 cursor-pointer focus:outline-hidden"
            >
              <option value="All">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Products list visual grid */}
      <div className="bg-white border border-slate-200 rounded-[10px] shadow-sm overflow-hidden">
        <div className="overflow-x-auto min-w-full">
          <table className="min-w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-455 text-[10px] font-extrabold uppercase tracking-wider">
                <th className="py-3 px-6 font-medium">SKU ID</th>
                <th className="py-3 px-6 font-medium">Product details</th>
                <th className="py-3 px-6 font-medium">Category</th>
                <th className="py-3 px-6 font-medium text-right">Unit Price</th>
                <th className="py-3 px-6 font-medium text-center">Available Stock</th>
                <th className="py-3 px-6 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-medium font-sans">
                    Refreshing catalog indices...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-medium font-sans">
                    No products matching search parameters were found in stock ledger.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLowStock = p.stock <= 5;
                  const isCriticalStock = p.stock <= 1;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/40 text-slate-800 transition-colors">
                      <td className="py-3 px-6 font-mono text-[10px] text-slate-400">{p.id}</td>
                      <td className="py-3 px-6 pr-2">
                        <div className="font-bold text-slate-900 leading-snug">{p.name}</div>
                        {p.description && (
                          <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5" title={p.description}>
                            {p.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-6 select-none">
                        <span className="inline-flex px-1.5 py-0.5 rounded-sm text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200/50 uppercase tracking-wide">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-right font-bold text-slate-900">
                        {currency}{p.price.toFixed(2)}
                      </td>
                      <td className="py-3 px-6 text-center select-none">
                        <div className="flex flex-col items-center justify-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold ${
                            isCriticalStock 
                              ? 'bg-red-50 text-red-700 border border-red-200' 
                              : isLowStock 
                              ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {p.stock} Unit{p.stock !== 1 ? 's' : ''}
                          </span>
                          {isLowStock && (
                            <span className="text-[9px] text-red-500 font-bold mt-1 inline-flex items-center gap-0.5">
                              <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                              Reorder Prompt
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-6 text-right">
                        <div className="flex justify-end items-center gap-1.5">
                          <button
                            onClick={() => {
                              setAdjustingProduct(p);
                              setNewStockCount(p.stock.toString());
                            }}
                            className="p-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-650 rounded-[10px] transition-colors cursor-pointer font-bold text-[10px]"
                            title="Quick Stock Level Adjust"
                          >
                            Set Stock
                          </button>
                          
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => handleOpenEdit(p)}
                                className="p-1 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-[10px] border border-blue-100 transition-colors cursor-pointer font-bold text-[10px]"
                                title="Edit Product details"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p)}
                                className="p-1 px-2.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-[10px] border border-red-100 transition-colors cursor-pointer font-bold text-[10px]"
                                title="Delete Catalog item"
                              >
                                Delete
                              </button>
                            </>
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

      {/* Catalog Create/Edit Product Modal */}
      {showProductModal && (
        <div id="product_form_modal" className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative bg-white rounded-[10px] max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200"
          >
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900">
                {modalMode === 'add' ? 'Add New Product SKU' : 'Modify Product catalog entry'}
              </h3>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleProductSubmit} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-800 text-xs rounded-[10px] font-medium">
                  {modalError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Product Listing Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cordless Mechanical Keyboard"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="block w-full px-3 py-2 border border-slate-200 focus:ring-2 focus:ring-blue-500 rounded-[10px] text-xs text-slate-800 focus:outline-hidden bg-slate-50/50 focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category Type *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Accessories or Electronics"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="block w-full px-3 py-2 border border-slate-200 focus:ring-2 focus:ring-blue-500 rounded-[10px] text-xs text-slate-800 focus:outline-hidden bg-slate-50/50 focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unit Price ({currency}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="block w-full px-3 py-2 border border-slate-200 focus:ring-2 focus:ring-blue-500 rounded-[10px] text-xs text-slate-800 focus:outline-hidden bg-slate-50/50 focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Initial Stock Count *
                  </label>
                  <input
                    type="number"
                    step="1"
                    required
                    placeholder="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="block w-full px-3 py-2 border border-slate-200 focus:ring-2 focus:ring-blue-500 rounded-[10px] text-xs text-slate-800 focus:outline-hidden bg-slate-50/50 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Product Description / Specifications
                </label>
                <textarea
                  rows={3}
                  placeholder="Additional specifications, color details, warranty, or catalog annotations..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="block w-full px-3 py-2 border border-slate-200 focus:ring-2 focus:ring-blue-500 rounded-[10px] text-xs text-slate-800 focus:outline-hidden resize-none bg-slate-50/50 focus:bg-white transition-colors"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 flex-row">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="py-2 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-[10px] cursor-pointer bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-[10px] disabled:opacity-50 shadow-md shadow-blue-200/50 cursor-pointer"
                >
                  {modalLoading ? 'Saving changes...' : 'Save Catalog SKU'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Instant Stock Correction Drawer Drawer/Modal */}
      {adjustingProduct && (
        <div id="quick_stock_adjust_modal" className="fixed inset-0 z-55 overflow-y-auto bg-slate-900/60 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[10px] max-w-sm w-full shadow-2xl overflow-hidden border border-slate-200"
          >
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-900">Adjust Stock Count</h4>
              <button
                type="button"
                onClick={() => setAdjustingProduct(null)}
                className="text-slate-400 hover:text-slate-600 text-[10px] font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFastStockAdjust} className="p-5 space-y-4 font-sans text-xs">
              <div className="border border-slate-200 bg-slate-50 p-3 rounded-[10px]">
                <span className="text-[10px] text-slate-400 font-bold block uppercase font-mono">TARGET SKU</span>
                <span className="text-xs font-bold text-slate-800 block mt-0.5 truncate">{adjustingProduct.name}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Category: {adjustingProduct.category}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-705 mb-1">
                  Adjust Physical Count
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="1"
                    required
                    value={newStockCount}
                    onChange={(e) => setNewStockCount(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-200 focus:ring-2 focus:ring-blue-500 rounded-[10px] text-xs text-slate-800 focus:outline-hidden bg-slate-50/50 focus:bg-white"
                  />
                  <span className="text-xs text-slate-500 shrink-0 font-medium font-mono">units in warehouse</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  Correct current count directly. Saving will immediately update stock metrics and clear low stock status.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 flex-row">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="py-1.5 px-3 border border-slate-200 text-slate-700 text-xs font-semibold rounded-[10px] cursor-pointer bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-1.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-[10px] shadow-md shadow-blue-200/50 cursor-pointer"
                >
                  Recalculate Count
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
