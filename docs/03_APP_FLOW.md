# Document 03 — App Flow and Navigation Blueprint

---

## 1. App Pages & Tabs Directory

SmartBill utilizes a dense, layout-stable design. Aside from `LoginView`, all pages are rendered dynamically inside the primary viewport under state-controlled tab toggling to make flow transits immediate and lightweight.

| View Tab Key | Screen Name | Access Level | Description |
| :--- | :--- | :--- | :--- |
| **`login`** (Default out) | **Login Interface** | Public | Secure verification grid, Forgot Password simulator trigger. |
| **`dashboard`** | **Store Analytics** | Staff & Admin | Metric highlight cards (sales, tax, products), dynamic monthly revenue area chart. |
| **`billing`** | **Point-of-Sale Billing** | Staff & Admin | Left-side product gallery (filtering & quick search), right-side active bill cart, customer select, discount apply, checkout confirmation. |
| **`products`** | **Inventory Ledger** | Staff & Admin | Complete catalog inventory item edits, stock quantity adjustment modal, category filter. |
| **`customers`** | **Buyer Directory** | Staff & Admin | Registration form, loyalty metric calculators, customer profiles. |
| **`invoices`** | **Bills & Receipts** | Staff & Admin | Historic invoice grid, individual receipt modal summaries, UPI QR generator on tap, vector PDF printer stream trigger. |
| **`reports`** | **Business Auditor** | Staff & Admin | Detailed chart ledger; monthly, category and payment splits distributions. |
| **`settings`** | **Company Control** | **Admin Only** | Overwrite tax rates, store currencies, phone/address records, emails, corporate details. |

---

## 2. Global Navigation Architecture

The interface uses a **responsive dual-layout system**:

### A. Desktop View (screen-width ≥ md)
* **Left-Side Navigation Rail:** Stays locked and active. Staggered vertical buttons mapping individual Tab views. Displays current staff profile block.
* **Footer Controls within Sidebar:** Immediate access to **Change Password** (initiates modal overlays) and **Exit System** (initiates clean session tokens wiping).
* **Header Bar:** Quick stats summary, profile indicator, and top-right high-visibility **Change Password** button.

### B. Mobile View (screen-width < md)
* **Collapsible Sliding Drawer:** Left side menu triggered via a hamburger icon in the top header. Fades in and slides out cleanly using spring animations from `@motion`.
* **Header Navigation Header:** Locks to the top of the viewport. Provides the drawer trigger, active title banner, user initials badge, and action shortcuts.

---

## 3. Core User Journeys

### Journey A: Processing a Customer Sale (Billing Tab)
1. **User lands** on POS billing view. Left-side inventory lists load.
2. **Select items:** Search items or click on product cards. Item pops into the right-side active cart block with default quantity of `1`.
3. **Refine quantities:** Increment or decrement item quantities directly inside the cart. Immediate calculations of subtotal, tax rate application, and custom overall discount deductions.
4. **Attach customer (Optional):** Search and select an existing customer from the dropdown, or click `+ Add Customer` to register a new one immediately.
5. **Finalize checkout:** Choose payment type (Cash, Card, UPI) and click `Complete Sale`.
6. **Outcome:** A success modal pops up offering an immediate PDF export. Item stock registers decrement in the database instantly.

### Journey B: Credentials Management (Self & Override Modal)
1. **Initiate change:** Click `Change Password` in either the sidebar footer or the top header.
2. **If Staff account:** The Change Password modal opens on the "Change My Password" view.
   * Provide the current password, type the new password twice, and tap `Apply`.
3. **If Admin account:** The Change Password modal presents a dual tab system:
   * **Tab 1: Change My Password:** Edit administrative credentials.
   * **Tab 2: Reset Staff Passwords:** Direct dropdown listing all other registered accounts. Pick any staff profile, enter a new password, and click `Override Staff Password` to instantly commit changes to the backend. Bypasses staff's current forgotten credentials.

---

## 4. Redirect & Authentication Logic

```
   [ Application Boot ]
            │
            ▼
    [ Check Token ]
     ├── Has Token? ────► [ Verify via API /auth/me ] ── Success ──► [ Render Dashboard ]
     │                                                     │
     │                                                    Fail
     └── No Token? ────────────────────────────────────────┼─────► [ Force Login Screen ]
                                                           │
                                                           ▲
   [ Logout / Exit Action ] ◄──────────────────────────────┘
```
* **Unauthenticated Access:** Restricts views; any direct interface attempt routes back onto the `login` view.
* **Unauthorized Tab Entries:** If non-admin staff attempts to load `/api/settings` or views the Settings view tab, the server intercepts and refuses the action with a `403 Forbidden` JSON, and the React UI hides the Settings tab.
