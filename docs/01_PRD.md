# Document 01 — Product Requirements Document (PRD)

---

## 1. App Name & Tagline
* **App Name:** SmartBill
* **Tagline:** A premium client-first POS, billing ledger, and inventory manager tailored for fast web and native mobile tablets.

---

## 2. Problem Statement
Small-to-medium retail outlets, pop-up shops, and local distributors operate in high-pace settings on the floor. Standard administrative ERP systems are over-engineered, heavy, and lack mobile responsiveness. Traditional Point-of-Sale (POS) systems are anchored to single terminals, making sales floor checks, client directories, and restock alerts sluggish to coordinates. Staff and owners need a unified, lightweight, highly visual POS ledger that runs natively on the web or packaged seamlessly inside a mobile webview (Capacitor/Android APK).

---

## 3. Core Value Proposition
SmartBill streamlines store management into a compact, single-screen framework. It delivers role-based checkouts, immediate PDF invoice exports, adaptive restock controllers, and graphical revenue analysis that works with zero lag. It bridges administrative desktops with mobile staff tablets through a single unified engine.

---

## 4. Target User Personas
* **Administrator (Store Owner / Manager):** Needs high-level visual telemetry on daily revenues, tax overheads, product sales trends, and administrative overrides such as altering pricing, checking inventory logs, or resetting staff credentials on the fly.
* **Staff Member (Cashier / Sales Floor Representative):** Needs a rapid touch-optimized checkout interface to build client carts, look up item prices, inspect stock volumes, register new buyers, and print paperless PDF receipts under intense checkout-line speed pressures.

---

## 5. Feature Matrix

### Must Have (V1.0 — Current)
* **Double Role Access:** Separate Admin and Staff access modes with local storage token persistence.
* **Unified POS Engine:** Side-by-side search catalog layout with live cart calculations (subtotals, multi-rate tax structures, discount deductions).
* **Payment Processing Methods:** Immediate selector mapping for Card, Cash, and instant UPI transfers.
* **Native Invoicing Service:** Instant formatting of physical receipts exported to ready-to-print vector PDFs via `jspdf`.
* **Inventory Control & Adjustments:** Direct list edits, search and filter features, stock warning labels, and modal add/edit systems.
* **Customer Index Directory:** Simple customer profiles mapping purchase history metrics, emails, and address points.
* **Sales Telemetry & Analytical Reports:** Visual graphs showing monthly income, payment methods distribution, and category volumes using Recharts.
* **Comprehensive Passwords Controller (NEW):**
  * Self-service password change panel (current password verified, new password length validation).
  * Administrative credentials override (allows Administrators to instantly reset passwords of separate Staff profiles, bypassing current passwords).
* **Capacitor Mobile Configurations:** Fully integrated Capacitor Android wrapper configuration with automatic environment base path resolution (`getApiUrl`).

### Nice to Have (Future Iterations)
* **Hardware Barcode Integration:** Direct camera-accessed scanner wrapper.
* **Thermal Paper Printing Trigger:** Integration of standardized Bluetooth ESC/POS layout receipts.
* **Offline Local Mode:** Local IndexedDB caching with deferred synchronized cloud writes.

### Explicitly Out of Scope
* **Global Multi-Store Logistics:** Standardizing cross-border franchise distribution models.
* **Staff Payroll Processing:** Hourly logging, scheduling sheets, and taxation deductions of staff.
* **Wholesale Sourcing Pipeline:** Managing suppliers, PO sheets, and long-term supply-chain lead dynamics.

---

## 6. User Stories
* **As a Cashier on the floor,** I want to instantly search an item, select a pre-registered customer, apply a quick promo discount, and complete the order so that the line keeps moving efficiently.
* **As a Store Manager,** I want to edit product pricing and look up current inventory alerts so that we can immediately replenish out-of-stock items.
* **As an Admin,** I want to examine interactive revenue line charts and payment split graphs so that I can optimize store purchasing.
* **As any User (Admin/Staff),** I want to update my login credentials directly in the app so that my account remains protected.
* **As an Admin,** I want to override a Staff member's password directly from my panel if they forget their password, without needing them to provide their current one.

---

## 7. Success Metrics
* **Average POS Checkout Cycle:** Complete cart creation, billing, customer matching, and PDF generation under **25 seconds**.
* **Zero-Inventory Lag:** Item stock records instantly decrement upon checkout confirmation.
* **Seamless Android Capability:** Compilation and execution under native Android layout with zero viewport scaling issues.
