# Document 04 — UI/UX Design Brief & Styles Guide

---

## 1. Aesthetic Direction & Mood

SmartBill adopts a **Modern Corporate & Clean Financial Slate** theme. It focuses on extreme data density, strong information typography contrast, generous white space, and subtle, micro-animations that elevate the app from standard templates.

### Primary Design Pillars
* **High-Visual Contrast:** Uses crisp slate grays and blue accents over warm off-white canvases. Text uses dark charcoal (#0F172A) to ensure readability under intense light.
* **Layout Stability:** Heavy use of fixed grids and panels. View shifts do not reflow core structures, avoiding visual fatigue.
* **Micro-Transitions:** All modal reveals, select changes, and buttons feature standard easing and micro-press physics.

---

## 2. Integrated Color System

We intentionally avoid generic purple-to-blue gradients. Every color is functional:

```
┌─────────────────────────────────────────────────────────────┐
│                       CORE COLOR SPECS                      │
├──────────────┬──────────────────────┬───────────────────────┤
│ Style Name   │ HEX Token /tailwind  │ System Function       │
├──────────────┼──────────────────────┼───────────────────────┤
│ Slate Primary│ #0F172A (slate-900)  │ Sidebar, dark headers │
│ Accent Blue  │ #2563EB (blue-600)   │ Click states, links   │
│ UI Canvas    │ #F8FAFC (slate-50)   │ Dynamic background    │
│ Panel White  │ #FFFFFF              │ Primary cards layers  │
│ Safe green   │ #059669 (emerald-600)│ Positive alerts, Paid │
│ High alert   │ #DC2626 (red-600)    │ Warning, low stock    │
│ Pending Gold │ #D97706 (amber-600)  │ Unpaid bills, staff   │
└──────────────┴──────────────────────┴───────────────────────┘
```

---

## 3. Typography Hierarchy

Fonts are loaded dynamically via URL structures.

```css
/* src/index.css typography imports */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
```

* **Primary Body & Layout Font (`font-sans`):** **Inter**. Clean sans-serif with geometric roundings.
  * H1 Large Heading: `text-2xl font-bold tracking-tight text-slate-900`
  * Action Labels / Table Names: `text-xs font-semibold uppercase tracking-wider text-slate-400`
  * Body text: `text-xs text-slate-600`
* **Technical Metrics & Numbers Font (`font-mono`):** **JetBrains Mono**. Clean mono-spacing which secures perfectly aligned tables.
  * Financial metrics prices: `font-mono font-semibold text-slate-705`
  * Invoice indexes (e.g. `INV-1004`): `font-mono font-bold uppercase`
  * Telemetry coordinates: `font-mono text-slate-500`

---

## 4. Visual Components Definitions

* **Card Outlines & Radis:** Elements feature high precision `rounded-[16px]` or `rounded-[12px]` corners (rather than generic rounded-md). Border outlines are ultra-thin `#E2E8F0` (slate-200) to keep cards neatly segmented.
* **Interactive Buttons:** Primary action buttons feature responsive focus rings and a gentle scaling click transition utilizing motion:
  ```css
  .animate-press:active {
    transform: scale(0.98);
  }
  ```
* **Status Badges:** Small pill shapes with fully colored text on top of transparent light-colored backplates:
  * `Paid Status:` transparent emerald-50 backplate, emerald-700 solid text
  * `Unpaid Status:` transparent red-50 backplate, red-700 solid text

---

## 5. Mobile Responsiveness Strategy

To accommodate fast finger tapping on tablets and mobile screens, three main responsive rules are applied:
1. **Touch Targets Density:** Action elements (cancelers, close cues, options dropdowns) are guaranteed to remain above a minimum of **44x44px** on mobile viewports.
2. **Horizontal Grid Reflows:** Columns in POS Billing grids collapse gracefully from desktop-wide grids (`grid-cols-12`) down to single responsive lanes (`col-span-12`) on small phones.
3. **No Window Canvas Widths:** All viewport computations, resize events, and area-chart wrappers inside `recharts` utilize standard fluid containers to adapt to orientation changes instantly.
