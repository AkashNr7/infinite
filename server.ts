/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import { Product, Customer, Invoice, InvoiceItem, Payment, BusinessSettings } from './src/types';

const app = express();
const PORT = 3000;

function cleanEnvValue(val: string): string {
  let cleaned = (val || '').trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.substring(1, cleaned.length - 1);
  }
  if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
    cleaned = cleaned.substring(1, cleaned.length - 1);
  }
  return cleaned.trim();
}

function cleanSupabaseUrl(url: string): string {
  let cleaned = cleanEnvValue(url);
  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    try {
      const parsed = new URL(cleaned);
      // We only want the protocol and host (e.g. dxfjsriyuomvyvxfqvqa.supabase.co)
      // This completely strips any extra path like "/rest/v1" or trailing slashes,
      // which causes the "Invalid path specified in request URL" error.
      return `${parsed.protocol}//${parsed.host}`;
    } catch (e) {
      // Fallback manual cleanup
      return cleaned.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
    }
  }
  return cleaned;
}

function isValidSupabaseConfig(url: string, key: string): boolean {
  if (!url || !key) return false;
  
  const trimmedUrl = url.trim();
  const trimmedKey = key.trim();
  
  if (trimmedUrl === '' || trimmedKey === '') return false;
  
  const u = trimmedUrl.toLowerCase();
  
  // Ignore standard default placeholders
  if (
    u.includes('placeholder') || 
    u.includes('your-project') || 
    u.includes('your_supabase_url') ||
    u.includes('my-supabase-url') ||
    u.includes('my_supabase_url') ||
    trimmedKey.includes('placeholder') ||
    trimmedKey.includes('your-anon-key') ||
    trimmedKey.includes('your_supabase_anon_key')
  ) {
    return false;
  }
  
  // Ignore self APP_URL referencing (when the user mistakenly sets Supabase URL to their own Cloud Run / development URL)
  const appUrl = (process.env.APP_URL || '').trim().toLowerCase();
  if (appUrl) {
    try {
      const appHost = new URL(appUrl).hostname;
      const supaHost = new URL(trimmedUrl).hostname;
      if (supaHost === appHost || appHost.includes(supaHost) || supaHost.includes(appHost)) {
        return false;
      }
    } catch (e) {
      // ignore URL parsing error
    }
  }
  
  // Ignore general live application URLs
  if (u.includes('asia-east1.run.app') || u.includes('aistudio-preview.run.app')) {
    return false;
  }
  
  // Check if it's a valid http or https URL
  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    return false;
  }
  
  return true;
}

// Setup Supabase Client securely on server-side
const SUPABASE_URL = cleanSupabaseUrl(process.env.SUPABASE_URL || '');
const SUPABASE_ANON_KEY = cleanEnvValue(process.env.SUPABASE_ANON_KEY || '');

interface SupabaseSyncStatus {
  initialized: boolean;
  tableExists: boolean;
  errorMsg: string | null;
  url: string | null;
}

const supabaseSyncStatus: SupabaseSyncStatus = {
  initialized: false,
  tableExists: false,
  errorMsg: null,
  url: SUPABASE_URL || null,
};

let supabaseClient: any = null;
if (isValidSupabaseConfig(SUPABASE_URL, SUPABASE_ANON_KEY)) {
  try {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    supabaseSyncStatus.initialized = true;
    console.log('[Supabase] Client initialized successfully for online integration.');
  } catch (err: any) {
    supabaseSyncStatus.errorMsg = err.message || String(err);
    console.error('[Supabase] Failed to initialize Supabase client:', err);
  }
} else {
  if (SUPABASE_URL || SUPABASE_ANON_KEY) {
    console.log('[Supabase] Configured Supabase keys appear to be invalid, placeholder, or pointing to this app\'s own URL. Defaulting to standalone offline mode.');
  } else {
    console.log('[Supabase] Offline mode: SUPABASE_URL and SUPABASE_ANON_KEY not configured.');
  }
}

// Background push sync of all entity tables
async function syncToSupabase(db: any) {
  if (!supabaseClient) return;
  try {
    const keys = ['users', 'products', 'customers', 'invoices', 'invoice_items', 'payments', 'settings'];
    await Promise.all(
      keys.map(async (key) => {
        const { error } = await supabaseClient
          .from('smart_billing_store')
          .upsert({
            key,
            value: db[key],
            updated_at: new Date().toISOString()
          }, { onConflict: 'key' });
        if (error) {
          throw error;
        }
      })
    );
    console.log('[Supabase Sync] Current database successfully synchronized to Cloud.');
    supabaseSyncStatus.tableExists = true;
    supabaseSyncStatus.errorMsg = null;
  } catch (err: any) {
    const msg = err.message || String(err);
    console.error('[Supabase Sync] Skipped background seed or write. If you haven\'t run the table creation SQL, please run it in your Supabase SQL editor. Error:', msg);
    if (msg.includes('Invalid path') || msg.includes('relation') || msg.includes('does not exist')) {
      supabaseSyncStatus.tableExists = false;
      supabaseSyncStatus.errorMsg = 'Table "smart_billing_store" does not exist in your Supabase database.';
    } else {
      supabaseSyncStatus.errorMsg = msg;
    }
  }
}

// Bootload state from Supabase if table exists
async function loadFromSupabase(): Promise<any | null> {
  if (!supabaseClient) return null;
  try {
    console.log('[Supabase Sync] Pulling latest database state from cloud table "smart_billing_store"...');
    const { data, error } = await supabaseClient
      .from('smart_billing_store')
      .select('*');
    if (error) {
      const msg = error.message;
      console.warn('[Supabase Sync] "smart_billing_store" table query returned error (might not be created yet):', msg);
      if (msg.includes('Invalid path') || msg.includes('relation') || msg.includes('does not exist')) {
        supabaseSyncStatus.tableExists = false;
        supabaseSyncStatus.errorMsg = 'Table "smart_billing_store" does not exist in your Supabase database.';
      } else {
        supabaseSyncStatus.errorMsg = msg;
      }
      return null;
    }
    
    supabaseSyncStatus.tableExists = true;
    supabaseSyncStatus.errorMsg = null;
    if (data && data.length > 0) {
      const merged: any = {};
      data.forEach((row: any) => {
        if (row.key && row.value !== undefined) {
          merged[row.key] = row.value;
        }
      });
      return merged;
    }
  } catch (err: any) {
    console.error('[Supabase Sync] Bootload connection error:', err);
    supabaseSyncStatus.errorMsg = err.message || String(err);
  }
  return null;
}


// Setup directories and JSON Database
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Custom JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'smart-billing-secret-key-2026';

// Hashing helper (SHA-256)
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Token helper (emulates JWT without needing external native dependencies)
function generateSessionToken(user: { id: string; role: string; username: string }): string {
  const expiry = Date.now() + 1000 * 60 * 60 * 24; // 24 Hours
  const payload = `${user.id}:${user.role}:${user.username}:${expiry}`;
  const hmac = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}:${hmac}`).toString('base64');
}

function verifySessionToken(token: string): { id: string; role: string; username: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length < 5) return null;
    
    const id = parts[0];
    const role = parts[1];
    const username = parts[2];
    const expiry = parts[3];
    const signature = parts[4];
    
    if (Date.now() > parseInt(expiry, 10)) {
      return null;
    }
    
    const payload = `${id}:${role}:${username}:${expiry}`;
    const hmac = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('hex');
    if (hmac !== signature) {
      return null;
    }
    
    return { id, role: role as 'admin' | 'staff', username };
  } catch (err) {
    return null;
  }
}

// Express Parsers
app.use(express.json());

// Initialize Database structure
interface DBStructure {
  users: Array<{ id: string; username: string; email: string; passwordHash: string; role: 'admin' | 'staff'; created_at: string }>;
  products: Product[];
  customers: Customer[];
  invoices: Invoice[];
  invoice_items: InvoiceItem[];
  payments: Payment[];
  settings: BusinessSettings;
}

const DEFAULT_SETTINGS: BusinessSettings = {
  companyName: 'Apex Retail Solutions',
  companyAddress: '101 Business Park, Suite A, New York, NY 10001',
  companyPhone: '+1 (555) 019-9000',
  companyEmail: 'billing@apexsolutions.com',
  companyTaxNo: 'US-8833928-TX',
  taxRate: 8.25, // 8.25%
  currency: '₹',
};

function readDB(): DBStructure {
  if (!fs.existsSync(DB_FILE)) {
    // Write Seed Data
    const initialDB: DBStructure = {
      users: [
        {
          id: 'u1',
          username: 'admin',
          email: 'admin@example.com',
          passwordHash: hashPassword('admin123'),
          role: 'admin',
          created_at: new Date('2026-05-01').toISOString(),
        },
        {
          id: 'u2',
          username: 'staff',
          email: 'staff@example.com',
          passwordHash: hashPassword('staff123'),
          role: 'staff',
          created_at: new Date('2026-05-02').toISOString(),
        }
      ],
      products: [
        { id: 'p1', name: 'iPhone 15 Pro Max', category: 'Electronics', price: 1199.00, stock: 12, description: 'Apple iPhone 15 Pro Max 256GB Titanium', created_at: new Date('2026-05-10').toISOString() },
        { id: 'p2', name: 'Logitech MX Master 3S', category: 'Accessories', price: 99.99, stock: 35, description: 'Ergonomic high precision wireless office mouse', created_at: new Date('2026-05-11').toISOString() },
        { id: 'p3', name: 'Sony WH-1000XM5', category: 'Electronics', price: 348.00, stock: 3, description: 'Premium active noise cancelling over-ear headphones', created_at: new Date('2026-05-12').toISOString() },
        { id: 'p4', name: 'USB-C hub 8-in-1', category: 'Accessories', price: 45.00, stock: 24, description: 'Aluminium multi-port adaptor for laptops', created_at: new Date('2026-05-12').toISOString() },
        { id: 'p5', name: 'Samsung Ultra-Wide 34"', category: 'Electronics', price: 449.99, stock: 2, description: '34-inch curved monitor 144Hz WQHD', created_at: new Date('2026-05-13').toISOString() },
        { id: 'p6', name: 'Mechanical Keyboard RGB', category: 'Accessories', price: 129.50, stock: 15, description: 'Hot-swappable mechanical tactile brown switch keyboard', created_at: new Date('2026-05-14').toISOString() },
        { id: 'p7', name: 'Anker PowerCore 20K', category: 'Accessories', price: 49.99, stock: 1, description: '20,000mAh external laptop power bank battery', created_at: new Date('2026-05-15').toISOString() }
      ],
      customers: [
        { id: 'c1', name: 'John Doe', phone: '555-010-2394', email: 'john@example.com', address: '123 Pinecrest Lane, Seattle, WA 98101', created_at: new Date('2026-05-11').toISOString() },
        { id: 'c2', name: 'Sarah Jenkins', phone: '555-015-8833', email: 'sarah.j@example.com', address: '456 Redwood Blvd, San Francisco, CA 94107', created_at: new Date('2026-05-15').toISOString() },
        { id: 'c3', name: 'Michael Ramirez', phone: '555-018-4722', email: 'michael@ramirez.io', address: '789 Oakwood Circle, Austin, TX 78701', created_at: new Date('2026-05-20').toISOString() },
        { id: 'c4', name: 'Samantha Vance', phone: '555-019-3311', email: 'svance@finance.corp', address: '109 Wall St, Floor 14, New York, NY 10005', created_at: new Date('2026-05-25').toISOString() }
      ],
      invoices: [],
      invoice_items: [],
      payments: [],
      settings: DEFAULT_SETTINGS,
    };

    // Auto-generate some recent invoices to seed report graphics nicely
    const today = new Date('2026-06-03');
    const dayMs = 24 * 60 * 60 * 1000;

    // We generate 5 past invoices:
    const pastInvoices: { inv: Invoice; items: InvoiceItem[]; pymts: Payment[] }[] = [
      {
        inv: {
          id: 'i1',
          invoice_no: 'INV-1001',
          customer_id: 'c1',
          customer_name: 'John Doe',
          customer_phone: '555-010-2394',
          subtotal: 1298.99,
          tax: 107.17,
          discount: 10, // 10% off
          total: 1276.26,
          payment_status: 'paid',
          payment_method: 'card',
          created_at: new Date(today.getTime() - 4 * dayMs).toISOString(), // 4 days ago
        },
        items: [
          { id: 'ii1', invoice_id: 'i1', product_id: 'p1', product_name: 'iPhone 15 Pro Max', quantity: 1, price: 1199.00, subtotal: 1199.00 },
          { id: 'ii2', invoice_id: 'i1', product_id: 'p2', product_name: 'Logitech MX Master 3S', quantity: 1, price: 99.99, subtotal: 99.99 },
        ],
        pymts: [
          { id: 'pay1', invoice_id: 'i1', invoice_no: 'INV-1001', amount: 1276.26, payment_method: 'card', payment_date: new Date(today.getTime() - 4 * dayMs).toISOString() }
        ],
      },
      {
        inv: {
          id: 'i2',
          invoice_no: 'INV-1002',
          customer_id: 'c2',
          customer_name: 'Sarah Jenkins',
          customer_phone: '555-015-8833',
          subtotal: 348.00,
          tax: 28.71,
          discount: 0,
          total: 376.71,
          payment_status: 'paid',
          payment_method: 'upi',
          created_at: new Date(today.getTime() - 3 * dayMs).toISOString(), // 3 days ago
        },
        items: [
          { id: 'ii3', invoice_id: 'i2', product_id: 'p3', product_name: 'Sony WH-1000XM5', quantity: 1, price: 348.00, subtotal: 348.00 }
        ],
        pymts: [
          { id: 'pay2', invoice_id: 'i2', invoice_no: 'INV-1002', amount: 376.71, payment_method: 'upi', payment_date: new Date(today.getTime() - 3 * dayMs).toISOString() }
        ],
      },
      {
        inv: {
          id: 'i3',
          invoice_no: 'INV-1003',
          customer_id: 'c3',
          customer_name: 'Michael Ramirez',
          customer_phone: '555-018-4722',
          subtotal: 585.00,
          tax: 48.26,
          discount: 5, // 5% off
          total: 604.01,
          payment_status: 'paid',
          payment_method: 'cash',
          created_at: new Date(today.getTime() - 2 * dayMs).toISOString(), // 2 days ago
        },
        items: [
          { id: 'ii4', invoice_id: 'i3', product_id: 'p5', product_name: 'Samsung Ultra-Wide 34"', quantity: 1, price: 449.99, subtotal: 449.99 },
          { id: 'ii5', invoice_id: 'i3', product_id: 'p6', product_name: 'Mechanical Keyboard RGB', quantity: 1, price: 129.50, subtotal: 129.50 },
          { id: 'ii6', invoice_id: 'i3', product_id: 'p4', product_name: 'USB-C hub 8-in-1', quantity: 2, price: 45.00, subtotal: 90.00 }
        ],
        pymts: [
          { id: 'pay3', invoice_id: 'i3', invoice_no: 'INV-1003', amount: 604.01, payment_method: 'cash', payment_date: new Date(today.getTime() - 2 * dayMs).toISOString() }
        ],
      },
      {
        inv: {
          id: 'i4',
          invoice_no: 'INV-1004',
          customer_id: 'c1',
          customer_name: 'John Doe',
          customer_phone: '555-010-2394',
          subtotal: 99.99,
          tax: 8.25,
          discount: 0,
          total: 108.24,
          payment_status: 'unpaid',
          payment_method: 'cash',
          created_at: new Date(today.getTime() - 1 * dayMs).toISOString(), // 1 day ago
        },
        items: [
          { id: 'ii7', invoice_id: 'i4', product_id: 'p2', product_name: 'Logitech MX Master 3S', quantity: 1, price: 99.99, subtotal: 99.99 }
        ],
        pymts: [],
      },
      {
        inv: {
          id: 'i5',
          invoice_no: 'INV-1005',
          customer_id: 'c4',
          customer_name: 'Samantha Vance',
          customer_phone: '555-019-3311',
          subtotal: 129.50,
          tax: 10.68,
          discount: 15, // 15% off
          total: 120.76,
          payment_status: 'paid',
          payment_method: 'upi',
          created_at: today.toISOString(), // today
        },
        items: [
          { id: 'ii8', invoice_id: 'i5', product_id: 'p6', product_name: 'Mechanical Keyboard RGB', quantity: 1, price: 129.50, subtotal: 129.50 }
        ],
        pymts: [
          { id: 'pay4', invoice_id: 'i5', invoice_no: 'INV-1005', amount: 120.76, payment_method: 'upi', payment_date: today.toISOString() }
        ],
      }
    ];

    pastInvoices.forEach(pkg => {
      initialDB.invoices.push(pkg.inv);
      initialDB.invoice_items.push(...pkg.items);
      initialDB.payments.push(...pkg.pymts);
    });

    fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2), 'utf8');
    return initialDB;
  }
  
  const content = fs.readFileSync(DB_FILE, 'utf8');
  try {
    return JSON.parse(content);
  } catch (err) {
    console.error('Error parsing databases JSON, resetting database...', err);
    return { users: [], products: [], customers: [], invoices: [], invoice_items: [], payments: [], settings: DEFAULT_SETTINGS };
  }
}

function writeRawDB(db: DBStructure) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  if (supabaseClient) {
    syncToSupabase(db).catch(err => {
      console.error('[Supabase Sync Write Error]', err);
    });
  }
}

// REST Authentication Middleware
function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: 'Auth token required' });
    return;
  }
  const token = authHeader.replace('Bearer ', '');
  const userPayload = verifySessionToken(token);
  if (!userPayload) {
    res.status(401).json({ error: 'Invalid or expired session' });
    return;
  }
  
  // Attach user to request
  (req as any).user = userPayload;
  next();
}

// --- API ROUTES ---

// Login Endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password required' });
    return;
  }

  const db = readDB();
  const foundUser = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  
  if (!foundUser) {
    res.status(401).json({ error: 'Invalid username' });
    return;
  }

  const hashedInput = hashPassword(password);
  if (hashedInput !== foundUser.passwordHash) {
    res.status(401).json({ error: 'Invalid password' });
    return;
  }

  const token = generateSessionToken({ id: foundUser.id, role: foundUser.role, username: foundUser.username });
  res.json({
    token,
    user: {
      id: foundUser.id,
      username: foundUser.username,
      email: foundUser.email,
      role: foundUser.role,
      created_at: foundUser.created_at,
    }
  });
});

// Auth check me
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  const token = authHeader.replace('Bearer ', '');
  const userPayload = verifySessionToken(token);
  if (!userPayload) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
  res.json({ user: userPayload });
});

// Self Change Password Endpoint (for both admins and users/staff)
app.post('/api/auth/change-password', authMiddleware, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'Current password and new password are required' });
    return;
  }

  if (newPassword.length < 4) {
    res.status(400).json({ error: 'New password must be at least 4 characters long' });
    return;
  }

  const db = readDB();
  const userId = (req as any).user.id;
  const user = db.users.find(u => u.id === userId);

  if (!user) {
    res.status(404).json({ error: 'Account not found' });
    return;
  }

  const hashedCurrent = hashPassword(currentPassword);
  if (hashedCurrent !== user.passwordHash) {
    res.status(400).json({ error: 'Current password is incorrect' });
    return;
  }

  user.passwordHash = hashPassword(newPassword);
  writeRawDB(db);

  res.json({ message: 'Password updated successfully!' });
});

// Admin-mediated target user password reset endpoint
app.post('/api/auth/admin/change-user-password', authMiddleware, (req, res) => {
  const requester = (req as any).user;
  if (requester.role !== 'admin') {
    res.status(403).json({ error: 'Unauthorized constraint: only Administrators can modify other profiles' });
    return;
  }

  const { targetUserId, newPassword } = req.body;
  if (!targetUserId || !newPassword) {
    res.status(400).json({ error: 'Target user ID and new password are required' });
    return;
  }

  if (newPassword.length < 4) {
    res.status(400).json({ error: 'New password must be at least 4 characters long' });
    return;
  }

  const db = readDB();
  const targetUser = db.users.find(u => u.id === targetUserId);

  if (!targetUser) {
    res.status(404).json({ error: 'Target user not found' });
    return;
  }

  targetUser.passwordHash = hashPassword(newPassword);
  writeRawDB(db);

  res.json({ message: `Password for ${targetUser.username} updated successfully!` });
});

// Fetch all registered users (Admin Only)
app.get('/api/users', authMiddleware, (req, res) => {
  const requester = (req as any).user;
  if (requester.role !== 'admin') {
    res.status(403).json({ error: 'Unauthorized constraint: only Administrators can view user profiles list.' });
    return;
  }
  const db = readDB();
  const safeUsers = db.users.map(u => ({
    id: u.id,
    username: u.username,
    email: u.email,
    role: u.role,
    created_at: u.created_at,
  }));
  res.json(safeUsers);
});

// Forgot password reset
app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email address is required' });
    return;
  }
  const db = readDB();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    res.status(404).json({ error: 'No user account found with this email' });
    return;
  }
  // Simulate sending password reset email
  res.json({ message: `Password reset link successfully sent to ${email}` });
});

// Get all products
app.get('/api/products', authMiddleware, (req, res) => {
  const db = readDB();
  res.json(db.products);
});

// Add a product
app.post('/api/products', authMiddleware, (req, res) => {
  const { name, category, price, stock, description } = req.body;
  if (!name || !category || price === undefined || stock === undefined) {
    res.status(400).json({ error: 'Name, Category, Price, and Stock are required' });
    return;
  }

  const db = readDB();
  const newProduct: Product = {
    id: 'p_' + crypto.randomBytes(4).toString('hex'),
    name,
    category,
    price: Number(price),
    stock: Math.max(0, Number(stock)),
    description: description || '',
    created_at: new Date().toISOString(),
  };

  db.products.push(newProduct);
  writeRawDB(db);
  res.status(201).json(newProduct);
});

// Update a product
app.put('/api/products/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { name, category, price, stock, description } = req.body;

  const db = readDB();
  const prodIndex = db.products.findIndex(p => p.id === id);
  if (prodIndex === -1) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const existing = db.products[prodIndex];
  const updatedProduct: Product = {
    ...existing,
    name: name !== undefined ? name : existing.name,
    category: category !== undefined ? category : existing.category,
    price: price !== undefined ? Number(price) : existing.price,
    stock: stock !== undefined ? Math.max(0, Number(stock)) : existing.stock,
    description: description !== undefined ? description : existing.description,
  };

  db.products[prodIndex] = updatedProduct;
  writeRawDB(db);
  res.json(updatedProduct);
});

// Delete a product
app.delete('/api/products/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  
  // Security role check: Only admin can delete products
  const user = (req as any).user;
  if (user.role !== 'admin') {
    res.status(403).json({ error: 'Access denied: Only administrators can delete products' });
    return;
  }

  const db = readDB();
  const prodIndex = db.products.findIndex(p => p.id === id);
  if (prodIndex === -1) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  // Remove product from db
  db.products.splice(prodIndex, 1);
  writeRawDB(db);
  res.json({ message: 'Product deleted successfully' });
});

// Get all customers with history totals
app.get('/api/customers', authMiddleware, (req, res) => {
  const db = readDB();
  const result = db.customers.map(c => {
    // calculate lifetime purchases count and lifetime spend
    const customerInvoices = db.invoices.filter(inv => inv.customer_id === c.id);
    const purchaseCount = customerInvoices.length;
    const totalSpent = customerInvoices
      .filter(inv => inv.payment_status === 'paid')
      .reduce((sum, inv) => sum + inv.total, 0);

    return {
      ...c,
      purchaseCount,
      totalSpent,
    };
  });
  res.json(result);
});

// Create customer
app.post('/api/customers', authMiddleware, (req, res) => {
  const { name, phone, email, address } = req.body;
  if (!name || !phone) {
    res.status(400).json({ error: 'Name and Phone number are required' });
    return;
  }

  const db = readDB();
  const newCustomer: Customer = {
    id: 'c_' + crypto.randomBytes(4).toString('hex'),
    name,
    phone,
    email: email || '',
    address: address || '',
    created_at: new Date().toISOString(),
  };

  db.customers.push(newCustomer);
  writeRawDB(db);
  res.status(201).json(newCustomer);
});

// Update customer
app.put('/api/customers/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { name, phone, email, address } = req.body;

  const db = readDB();
  const idx = db.customers.findIndex(c => c.id === id);
  if (idx === -1) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }

  const existing = db.customers[idx];
  const updatedCustomer: Customer = {
    ...existing,
    name: name !== undefined ? name : existing.name,
    phone: phone !== undefined ? phone : existing.phone,
    email: email !== undefined ? email : existing.email,
    address: address !== undefined ? address : existing.address,
  };

  db.customers[idx] = updatedCustomer;
  writeRawDB(db);
  res.json(updatedCustomer);
});

// Get invoices
app.get('/api/invoices', authMiddleware, (req, res) => {
  const db = readDB();
  // Map items back onto invoices for view safety
  const resultInvoices = db.invoices.map(inv => {
    const items = db.invoice_items.filter(item => item.invoice_id === inv.id);
    return {
      ...inv,
      items,
    };
  });
  res.json(resultInvoices);
});

// Get single invoice
app.get('/api/invoices/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const foundInvoice = db.invoices.find(inv => inv.id === id || inv.invoice_no === id);
  if (!foundInvoice) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }
  const items = db.invoice_items.filter(item => item.invoice_id === foundInvoice.id);
  res.json({
    ...foundInvoice,
    items,
  });
});

// Create Invoice
app.post('/api/invoices', authMiddleware, (req, res) => {
  const { customer_id, items, discount, payment_status, payment_method } = req.body;
  if (!customer_id || !items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Customer ID and billing items are required' });
    return;
  }

  const db = readDB();
  
  // Find customer
  const customer = db.customers.find(c => c.id === customer_id);
  if (!customer) {
    res.status(404).json({ error: 'Selected customer not found' });
    return;
  }

  // Validate and calculate stock reduction and price subtotal
  let calculatedSubtotal = 0;
  const validatedItemsToCreate: Array<{ product_id: string; product_name: string; quantity: number; price: number; subtotal: number }> = [];

  for (const requestedItem of items) {
    const prod = db.products.find(p => p.id === requestedItem.product_id);
    if (!prod) {
      res.status(400).json({ error: `Product with ID ${requestedItem.product_id} not found` });
      return;
    }

    if (prod.stock < requestedItem.quantity) {
      res.status(400).json({ 
        error: `Insufficient stock for product "${prod.name}". Available stock: ${prod.stock}, Requested: ${requestedItem.quantity}` 
      });
      return;
    }

    const itemSubtotal = prod.price * Number(requestedItem.quantity);
    calculatedSubtotal += itemSubtotal;
    validatedItemsToCreate.push({
      product_id: prod.id,
      product_name: prod.name,
      quantity: Number(requestedItem.quantity),
      price: prod.price,
      subtotal: itemSubtotal,
    });
  }

  // Auto invoice number generation: Find highest previous INV-XXXX
  let lastNo = 1000;
  if (db.invoices.length > 0) {
    db.invoices.forEach(inv => {
      const match = inv.invoice_no.match(/INV-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > lastNo) lastNo = num;
      }
    });
  }
  const nextInvoiceNo = `INV-${lastNo + 1}`;
  const nextInvoiceId = 'inv_' + crypto.randomBytes(4).toString('hex');

  // Multipliers
  const taxRate = db.settings.taxRate;
  const discountPercent = Math.max(0, Math.min(100, Number(discount || 0)));
  
  const discountAmount = calculatedSubtotal * (discountPercent / 100);
  const taxableAmount = calculatedSubtotal - discountAmount;
  const taxAmount = Number((taxableAmount * (taxRate / 100)).toFixed(2));
  const finalTotal = Number((taxableAmount + taxAmount).toFixed(2));

  // Perform permanent Stock Reduction in inventory
  for (const item of validatedItemsToCreate) {
    const prod = db.products.find(p => p.id === item.product_id)!;
    prod.stock -= item.quantity;
  }

  // Create Invoice Object
  const newInvoice: Invoice = {
    id: nextInvoiceId,
    invoice_no: nextInvoiceNo,
    customer_id: customer.id,
    customer_name: customer.name,
    customer_phone: customer.phone,
    subtotal: Number(calculatedSubtotal.toFixed(2)),
    tax: taxAmount,
    discount: discountPercent,
    total: finalTotal,
    payment_status: payment_status === 'paid' ? 'paid' : 'unpaid',
    payment_method: payment_method || 'cash',
    created_at: new Date().toISOString(),
  };

  // Create Invoice Items database entries
  const generatedItemsList: InvoiceItem[] = [];
  for (const item of validatedItemsToCreate) {
    const newItem: InvoiceItem = {
      id: 'ii_' + crypto.randomBytes(4).toString('hex'),
      invoice_id: nextInvoiceId,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      price: item.price,
      subtotal: Number(item.subtotal.toFixed(2)),
    };
    db.invoice_items.push(newItem);
    generatedItemsList.push(newItem);
  }

  // If status is paid, create a Payment entry
  if (payment_status === 'paid') {
    const newPayment: Payment = {
      id: 'pay_' + crypto.randomBytes(4).toString('hex'),
      invoice_id: nextInvoiceId,
      invoice_no: nextInvoiceNo,
      amount: finalTotal,
      payment_method: payment_method || 'cash',
      payment_date: new Date().toISOString(),
    };
    db.payments.push(newPayment);
  }

  db.invoices.push(newInvoice);
  writeRawDB(db);

  // Return generated invoice with its sub-items
  res.status(201).json({
    ...newInvoice,
    items: generatedItemsList,
  });
});

// Update / Record Payment for Invoice
app.put('/api/invoices/:id/pay', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { payment_method } = req.body;

  const db = readDB();
  const invIndex = db.invoices.findIndex(inv => inv.id === id);
  if (invIndex === -1) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }

  const invoice = db.invoices[invIndex];
  if (invoice.payment_status === 'paid') {
    res.status(400).json({ error: 'Invoice has already been paid' });
    return;
  }

  // Update Status
  invoice.payment_status = 'paid';
  invoice.payment_method = payment_method || 'cash';

  // Create Payment ledger record
  const newPayment: Payment = {
    id: 'pay_' + crypto.randomBytes(4).toString('hex'),
    invoice_id: invoice.id,
    invoice_no: invoice.invoice_no,
    amount: invoice.total,
    payment_method: invoice.payment_method,
    payment_date: new Date().toISOString(),
  };
  
  db.payments.push(newPayment);
  writeRawDB(db);

  res.json({
    ...invoice,
    items: db.invoice_items.filter(item => item.invoice_id === invoice.id),
  });
});

// Get business settings
app.get('/api/settings', authMiddleware, (req, res) => {
  const db = readDB();
  res.json({
    ...db.settings,
    supabaseStatus: {
      connected: !!supabaseClient,
      initialized: supabaseSyncStatus.initialized,
      tableExists: supabaseSyncStatus.tableExists,
      errorMsg: supabaseSyncStatus.errorMsg,
      url: SUPABASE_URL || null
    }
  });
});

// Update business settings
app.put('/api/settings', authMiddleware, (req, res) => {
  const { companyName, companyAddress, companyPhone, companyEmail, companyTaxNo, taxRate, currency } = req.body;
  
  const db = readDB();
  db.settings = {
    companyName: companyName || db.settings.companyName,
    companyAddress: companyAddress || db.settings.companyAddress,
    companyPhone: companyPhone || db.settings.companyPhone,
    companyEmail: companyEmail || db.settings.companyEmail,
    companyTaxNo: companyTaxNo || db.settings.companyTaxNo,
    taxRate: taxRate !== undefined ? Number(taxRate) : db.settings.taxRate,
    currency: currency || db.settings.currency,
  };

  writeRawDB(db);
  res.json({
    ...db.settings,
    supabaseStatus: {
      connected: !!supabaseClient,
      initialized: supabaseSyncStatus.initialized,
      tableExists: supabaseSyncStatus.tableExists,
      errorMsg: supabaseSyncStatus.errorMsg,
      url: SUPABASE_URL || null
    }
  });
});

// Reports / KPI Aggregate Analytics
app.get('/api/reports', authMiddleware, (req, res) => {
  const db = readDB();
  
  // High level KPIs
  const totalInvoicesCount = db.invoices.length;
  const totalRevenue = db.invoices
    .filter(inv => inv.payment_status === 'paid')
    .reduce((sum, inv) => sum + inv.total, 0);

  const pendingReceivables = db.invoices
    .filter(inv => inv.payment_status === 'unpaid')
    .reduce((sum, inv) => sum + inv.total, 0);

  const lowStockAlertsCount = db.products.filter(p => p.stock <= 5).length;

  // Revenue chart dataset (last 7 calendar days)
  const today = new Date('2026-06-03');
  const revenueHistory: Array<{ date: string; sales: number; invoices: number }> = [];

  for (let i = 6; i >= 0; i--) {
    const historicalDay = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = historicalDay.toISOString().split('T')[0];
    
    // Invoices on that specific date
    const targetInvoices = db.invoices.filter(inv => {
      const invDate = inv.created_at.split('T')[0];
      return invDate === dateStr && inv.payment_status === 'paid';
    });

    const dayRevenue = targetInvoices.reduce((sum, inv) => sum + inv.total, 0);
    
    // short readable label like "Jun 1"
    const displayLabel = historicalDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    revenueHistory.push({
      date: displayLabel,
      sales: Number(dayRevenue.toFixed(2)),
      invoices: targetInvoices.length,
    });
  }

  // Category sales aggregation
  const itemSummary: Record<string, number> = {}; // category -> sales revenue value
  db.invoice_items.forEach(item => {
    // find product to find category
    const prod = db.products.find(p => p.id === item.product_id);
    const categoryName = prod ? prod.category : 'General';
    itemSummary[categoryName] = (itemSummary[categoryName] || 0) + item.subtotal;
  });

  const categoryBreakdown = Object.keys(itemSummary).map(catName => ({
    name: catName,
    value: Number(itemSummary[catName].toFixed(2)),
  }));

  // Top Selling Products Breakdown
  const topProductsMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
  db.invoice_items.forEach(item => {
    if (!topProductsMap[item.product_id]) {
      topProductsMap[item.product_id] = { name: item.product_name, quantity: 0, revenue: 0 };
    }
    topProductsMap[item.product_id].quantity += item.quantity;
    topProductsMap[item.product_id].revenue += item.subtotal;
  });

  const topSellingProducts = Object.values(topProductsMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  res.json({
    kpis: {
      totalInvoicesCount,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      pendingReceivables: Number(pendingReceivables.toFixed(2)),
      lowStockAlertsCount,
    },
    revenueHistory,
    categoryBreakdown,
    topSellingProducts,
  });
});


// Serve API Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', date: new Date().toISOString() });
});

// Configure development or production client routing
async function initServer() {
  // Pull latest data from Supabase if active, otherwise seed local data to Supabase
  if (supabaseClient) {
    try {
      const cloudData = await loadFromSupabase();
      if (cloudData) {
        const localDB = readDB();
        const mergedDB = { ...localDB, ...cloudData };
        fs.writeFileSync(DB_FILE, JSON.stringify(mergedDB, null, 2), 'utf8');
        console.log('[Supabase Init] Loaded and synced cloud database onto local file store.');
      } else {
        console.log('[Supabase Init] Cloud store empty. Performing initial seed operation...');
        const localDB = readDB();
        await syncToSupabase(localDB);
      }
    } catch (err: any) {
      console.error('[Supabase Init] Sync on startup failed:', err.message || err);
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Serve index.html as spa catch-all routing
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Smart Billing Server running at http://0.0.0.0:${PORT}/`);
  });
}

initServer().catch((error) => {
  console.error('Server failed to start:', error);
});
