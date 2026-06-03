# Document 02 — Technical Requirements Document (TRD)

---

## 1. System Technology Stack

| Layer | Technology Selected | Version / Details | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | **React** | 19.0.1 (TypeScript TSX) | Composable functional component rendering |
| **Build Tooling & Dev** | **Vite + Esbuild** | Vite 6.x / Esbuild 0.25 | Fast bundling, hot loading simulation, transpilation |
| **Styling Framework** | **Tailwind CSS** | v4.x (via native compiler plugin) | Purely utility-first layout styling and responsiveness |
| **Animation Module** | **Motion** | 12.x (`motion/react`) | Fluid modal openings, hover physics, and page transits |
| **Charts Engine** | **Recharts** | 3.8.x (built on top of D3) | Professional visual SVG graphs in dark and light modes |
| **Mobile Runtime** | **Capacitor JS** | 8.4.x (`@capacitor/core` & `@capacitor/android`)| Seamless native Webview wrapper providing APK builds |
| **Backend Framework** | **Express.js** | 4.21.2 (Node.js runtime context) | Unified RESTful JSON API routes and SPA hosting |
| **Dev Execution** | **tsx** | 4.21.0 | Fast typescript execution in active developer terminals |
| **Database Solution** | **Thread-safe local JSON**| Custom Node system read/write loop (`/data/db.json`)| Synchronous persistent file storage with zero overhead |

---

## 2. Directory Architecture & Naming Conventions

The codebase strictly preserves a clean modular structure, separating visual templates, helper logic, datastore, and server control files:

```
├── .config files               # Vite configuration, TsConfig rules, Git exclusions
├── package.json                # Bundled commands, scripts, dependencies manager
├── server.ts                   # Express server entry point (API endpoints + SPA server)
├── capacitor.config.ts         # Native capacitor app configurations
├── android/                    # Compiled native Android wrapper code folder
├── data/                       # Database filesystem
│   └── db.json                 # Synchronous file-based datastore
└── src/                        # Core UI source code
    ├── main.tsx                # Client-side app bootstrap script
    ├── index.css               # Global Tailwind CSS imports and variable themes
    ├── types.ts                # Unified type-safe model interfaces
    ├── lib/                    # Core developer helper functions
    │   └── api.ts              # getApiUrl dynamic host routing resolver
    └── components/             # Reusable UI component modules
        ├── Sidebar.tsx         # Responsive application navigation rail
        ├── LoginView.tsx       # Authentication, forgot pass and login module
        ├── DashboardView.tsx   # Fast analytics overview, metric cards, charts
        ├── BillingView.tsx     # Full Interactive Point-of-Sale Checkout
        ├── ProductsView.tsx    # Inventory ledger and restock control panel
        ├── CustomersView.tsx   # Customer registration and directories lists
        ├── InvoicesView.tsx    # Dynamic billing table list, PDF generator
        ├── ReportsView.tsx     # Detailed sales charts and ledger distributions
        ├── SettingsView.tsx    # Company metadata overrides and currency settings
        └── ChangePasswordModal.tsx # NEW security credentials upgrade portal (admin/staff)
```

---

## 3. Environment Config Parameters (`.env.example`)

To ensure environment separation and credentials security, the system utilizes clean environment variable declarations:

```env
# Server Runtime
PORT=3000
NODE_ENV=development

# Google Gemini Core Credentials
GEMINI_API_KEY=your_gemini_api_key_here

# Client Network Mapping (Required specifically for mobile build client-to-server connection)
# Under relative web browsers, this defaults out cleanly. Under Android, it bridges to the live URL.
VITE_API_URL=https://ais-dev-dqt3vll3nc77uy5zb6mtrg-855841844563.asia-east1.run.app
```

---

## 4. Key Libraries and SDK Integrations

1. **`recharts`:** Utilized inside `DashboardView` and `ReportsView` to map sales. Renders responsive `<Timeline>`, `<AreaChart>`, and `<BarChart>` wrappers.
2. **`jspdf`:** Utilized to instantly map, format, and serialize client receipts into lightweight, printable vector PDFs. Bypasses client-side platform discrepancies.
3. **`motion/react`:** Standardized framework to render micro-interactions. It provides spring physics, backdrop fade transitions, and layout morphing for sidebars and modals.
4. **`lucide-react`:** Core vector symbol set. Clean, high-impact SVG nodes that natively scale without performance penalties.

---

## 5. Security & Authentication Model

* **JWT Strategy:** Fully signature-validated Token exchanges. Login generates a secure token that expires or gets removed upon logout.
* **Header Authorization:** React clients append the raw bearer credentials with every fetch payload (`headers: { Authorization: 'Bearer <token>' }`).
* **Role-Based RBAC Enforcement:** Middlewares on the server block non-admin accounts from loading full user lists, editing corporate configurations, or overriding general accounts.
* **Hashed Passwords Secure Loop:** Passwords are never stored in raw plaintext inside `db.json`. They are instantly normalized using standard SHA-256 secure hash cycles.
