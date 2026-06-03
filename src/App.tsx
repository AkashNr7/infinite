/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Menu, 
  X, 
  Bell, 
  CalendarDays,
  Flame,
  CircleUser,
  Key
} from 'lucide-react';
import { ActiveTab, User, BusinessSettings, Product } from './types';

// Component view sheets imports
import LoginView from './components/LoginView';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import ProductsView from './components/ProductsView';
import CustomersView from './components/CustomersView';
import BillingView from './components/BillingView';
import InvoicesView from './components/InvoicesView';
import ReportsView from './components/ReportsView';
import SettingsView from './components/SettingsView';
import ChangePasswordModal from './components/ChangePasswordModal';
import { getApiUrl } from './lib/api';

const DEFAULT_SETTINGS: BusinessSettings = {
  companyName: 'Apex Retail Solutions',
  companyAddress: '101 Business Park, Suite A, New York, NY 10001',
  companyPhone: '+1 (555) 019-9000',
  companyEmail: 'billing@apexsolutions.com',
  companyTaxNo: 'US-8833928-TX',
  taxRate: 8.25,
  currency: '₹',
};

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('billing_token'));
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Layout View Tabs
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  
  // Custom global profile configurations
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_SETTINGS);

  // Deep cross-linking state variables
  const [preselectedInvoiceId, setPreselectedInvoiceId] = useState<string | null>(null);
  const [preselectedProductToAdjust, setPreselectedProductToAdjust] = useState<Product | null>(null);
  const [checkoutPrefilledCustomerId, setCheckoutPrefilledCustomerId] = useState<string | null>(null);

  // Authentication validity probe
  const checkSession = async () => {
    const savedToken = localStorage.getItem('billing_token');
    if (!savedToken) {
      setAuthChecking(false);
      return;
    }

    try {
      const response = await fetch(getApiUrl('/api/auth/me'), {
        headers: { Authorization: `Bearer ${savedToken}` }
      });
      const data = await response.json();

      if (response.ok && data.user) {
        setToken(savedToken);
        setUser(data.user);
        
        // Staff members are immediately default routed to POST Billing, Admins to Dashboard
        if (data.user.role === 'staff') {
          setActiveTab('billing');
        } else {
          setActiveTab('dashboard');
        }

        // Pull company tax & pricing configs on success
        fetchGlobalSettings(savedToken);
      } else {
        // Stale session
        handleLogoutClean();
      }
    } catch (err) {
      console.error('Network error during session probe:', err);
    } finally {
      setAuthChecking(false);
    }
  };

  const fetchGlobalSettings = async (sessionToken: string) => {
    try {
      const response = await fetch(getApiUrl('/api/settings'), {
        headers: { Authorization: `Bearer ${sessionToken}` }
      });
      const data = await response.json();
      if (response.ok) {
        setSettings(data);
      }
    } catch (err) {
      console.error('Error fetching global configurations options:', err);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const handleLoginSuccess = (newToken: string, loginUser: User) => {
    localStorage.setItem('billing_token', newToken);
    setToken(newToken);
    setUser(loginUser);
    
    // Setup tabs routing defaults
    if (loginUser.role === 'staff') {
      setActiveTab('billing');
    } else {
      setActiveTab('dashboard');
    }

    fetchGlobalSettings(newToken);
  };

  const handleLogoutClean = () => {
    localStorage.removeItem('billing_token');
    setToken(null);
    setUser(null);
    setCartCountIndicator(0);
  };

  // Safe tab changing triggers
  const handleTabChange = (targetTab: ActiveTab) => {
    // Guards: Staff members barred from Reports or Settings
    if (user && user.role === 'staff' && (targetTab === 'reports' || targetTab === 'settings' || targetTab === 'dashboard')) {
      setActiveTab('billing');
      setSidebarOpen(false);
      return;
    }
    setActiveTab(targetTab);
    setSidebarOpen(false);
  };

  // Mini helpers to adjust cart indicator counts in POS
  const [cartCountIndicator, setCartCountIndicator] = useState(0);

  // Deep linking triggers
  const handleSelectInvoiceAndRedirect = (invoiceId: string) => {
    setPreselectedInvoiceId(invoiceId);
    handleTabChange('invoices');
  };

  const handleAdjustProductAndRedirect = (prod: Product) => {
    setPreselectedProductToAdjust(prod);
    handleTabChange('products');
  };

  const handleCheckoutCustomerAndRedirect = (customerId: string) => {
    setCheckoutPrefilledCustomerId(customerId);
    handleTabChange('billing');
  };

  if (authChecking) {
    return (
      <div id="startup_loader" className="min-h-screen bg-slate-100 flex flex-col items-center justify-center font-sans">
        <div className="h-12 w-12 rounded-xl bg-blue-600 animate-pulse flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-200">
          <Flame className="h-6 w-6" />
        </div>
        <p className="text-slate-500 font-semibold text-sm">Initializing Smart POS systems...</p>
      </div>
    );
  }

  if (!token || !user) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  // Find human title for active tabs header
  const getTabHeaderTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'POS Dashboard Dashboard';
      case 'billing': return 'Billing POS Console';
      case 'invoices': return 'Customer Invoice Receipts';
      case 'products': return 'Product SKUs Master';
      case 'customers': return 'Customer Information Catalog';
      case 'reports': return 'Financial Analysis Reporting';
      case 'settings': return 'System Configurations variables';
      default: return 'Store Console';
    }
  };

  return (
    <div id="apex_app_shell" className="min-h-screen bg-[#F8FAFC] flex font-sans text-[#1E293B] overflow-x-hidden w-full">
      
      {/* Persistent Left Sidebar with Drawer overrides for mobile */}
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
        user={user} 
        onLogout={handleLogoutClean} 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onChangePasswordClick={() => setChangePasswordOpen(true)}
      />

      {/* Backdrop overlay filter for mobile sidebar */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-35 md:hidden transition-opacity duration-350 cursor-pointer"
        />
      )}

      {/* Main Structural Right content box with responsive offset padding pl-0 on mobile */}
      <div className="flex-1 md:pl-64 pl-0 flex flex-col min-h-screen w-full overflow-x-hidden">
        
        {/* Global sticky top Dashboard Header */}
        <header id="app_header" className="h-16 border-b border-slate-200 bg-white sticky top-0 z-30 px-4 md:px-8 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-1.5 md:gap-2">
            {/* Hamburger trigger menu button */}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-1 rounded-lg text-slate-500 hover:bg-slate-150 hover:text-slate-800 md:hidden mr-1 cursor-pointer transition-colors shrink-0"
              aria-label="Open Sidebar Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse hidden sm:inline-block"></span>
            <h1 className="text-xs md:text-sm font-extrabold text-slate-900 tracking-tight capitalize select-none leading-none truncate max-w-[150px] sm:max-w-none">
              {getTabHeaderTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-3 md:gap-4 shrink-0">
            {/* Quick date display header widget */}
            <div className="flex items-center gap-1.5 text-[11px] md:text-xs text-slate-500 font-medium font-sans">
              <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
              <span className="hidden xs:inline">{new Date('2026-06-03').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <span className="xs:hidden">{new Date('2026-06-03').toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}</span>
            </div>

            <div className="h-4 w-[1px] bg-slate-200"></div>

            {/* Quick profile indicators */}
            <div className="flex items-center gap-1.5 md:gap-2.5 text-[11px] md:text-xs">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-150 px-2 md:px-3 py-1.5 rounded-[10px]">
                <CircleUser className="h-4.5 w-4.5 text-slate-500 shrink-0" />
                <span className="font-semibold text-slate-750 capitalize leading-none truncate max-w-[80px] sm:max-w-none">{user.username}</span>
              </div>
              <button
                type="button"
                onClick={() => setChangePasswordOpen(true)}
                className="flex items-center gap-1.5 text-slate-550 hover:text-blue-600 transition-colors text-[11px] font-bold bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-200 px-2.5 md:px-3 py-1.5 rounded-[10px] shrink-0 cursor-pointer shadow-xs whitespace-nowrap"
                title="Update your account password"
              >
                <Key className="h-3.5 w-3.5 text-slate-400" />
                <span className="hidden xs:inline">Change Password</span>
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic tabs pane element wrapper with responsive p-4 on mobile */}
        <main id="app_main_canvas" className="flex-1 p-4 md:p-8 overflow-y-auto print:p-0 print:bg-white bg-[#F8FAFC]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {activeTab === 'dashboard' && (
                <DashboardView 
                  token={token} 
                  onTabChange={handleTabChange} 
                  settings={settings} 
                  onSelectInvoice={handleSelectInvoiceAndRedirect}
                  onAdjustStockProduct={handleAdjustProductAndRedirect}
                />
              )}

              {activeTab === 'billing' && (
                <BillingView 
                  token={token} 
                  settings={settings} 
                  checkoutPrefilledCustomerId={checkoutPrefilledCustomerId}
                  onClearPrefilledCustomerId={() => setCheckoutPrefilledCustomerId(null)}
                  onInvoiceCreated={handleSelectInvoiceAndRedirect}
                />
              )}

              {activeTab === 'invoices' && (
                <InvoicesView 
                  token={token} 
                  user={user}
                  settings={settings} 
                  preselectedInvoiceId={preselectedInvoiceId}
                  onClearPreselectedInvoiceId={() => setPreselectedInvoiceId(null)}
                />
              )}

              {activeTab === 'products' && (
                <ProductsView 
                  token={token} 
                  user={user} 
                  settings={settings} 
                  preselectedProductToAdjust={preselectedProductToAdjust}
                  onClearPreSelectedAdjustment={() => setPreselectedProductToAdjust(null)}
                />
              )}

              {activeTab === 'customers' && (
                <CustomersView 
                  token={token} 
                  settings={settings} 
                  onSelectInvoice={handleSelectInvoiceAndRedirect}
                  onOpenCheckoutWithCustomer={handleCheckoutCustomerAndRedirect}
                />
              )}

              {activeTab === 'reports' && (
                <ReportsView 
                  token={token} 
                  settings={settings} 
                />
              )}

              {activeTab === 'settings' && (
                <SettingsView 
                  token={token} 
                  user={user} 
                  onSettingsUpdated={(newSet) => setSettings(newSet)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

      </div>

      {/* Add Change Credentials Modal */}
      {token && user && (
        <ChangePasswordModal
          token={token}
          user={user}
          isOpen={changePasswordOpen}
          onClose={() => setChangePasswordOpen(false)}
        />
      )}
    </div>
  );
}
