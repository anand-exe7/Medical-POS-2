# MAKKAL MARUNDHAGAM — Pharmacy Management System

A pharmacy management system (POS, purchase, inventory, reports) built to the client's
UI specification. It handles billing with box mapping, purchase entry with automatic
price calculations, batch-level inventory, expiry alerts and Excel exports.

## Screens

The sidebar carries the eight screens the client asked for:

| Screen | What it does |
|---|---|
| **Dashboard** | Today's revenue and bills, stock on hand, low-stock / expiring / expired counts, recent bills, items needing attention, top-selling medicines |
| **Billing (POS)** | Medicine search → medicine card → current bill → bill summary → customer details → print |
| **Purchase** | Add stock with supplier, invoice, batch details and the automatic purchase calculations |
| **Inventory** | Batch-level stock grid with filters, pagination, quick summary, plus a **Medicine Master** tab |
| **Customers** | Customer list with IDs, phone, address, doctor and full purchase history |
| **Reports** | Sale report with period filters, plus the two Excel exports |
| **Expiry Alert** | Expired, expiring-soon and low-stock batches |
| **Settings** | Shop details, defaults, suppliers, box mapping overview, backup / restore |

Staff accounts see Dashboard, Billing, Inventory, Customers and Expiry Alert.
Admin accounts additionally get Purchase, Reports and Settings.

## Billing

The medicine card shows everything the client listed: medicine name with company name,
batch number with **EXP DT**, HSN, the **drug category** (H / H1 / X / NRX / OTC), the box
mapping, available stock, **purchase unit**, **per unit price**, **selling price** and
**MRP (₹) per unit**. There is no product image. Quick-add quantities are
**1, 10, 15, 20, 30, 45**.

The current bill grid uses the client's columns — **Product · Box · Quantity · Per unit
price · Selling price (₹)** — and the bill number is generated automatically (`B000125`,
`B000126`, …).

The bill summary keeps its original rows; the **discount is calculated automatically**
from the difference between MRP and selling price. "Apply Discount" can add a further
manual discount on top.

Pressing **Pay & Print (F12)** opens the Customer Details dialog (Quick Bill registration,
existing-customer lookup, name, phone, address, doctor) before the bill is printed.
Customer IDs use the client's format: `PMBJ000001`.

## Purchase calculations

Input fields: **Purchase Unit, Quantity, Purchase Rate, MRP, Selling Price, GST %**.
Everything else is derived:

| Value | Formula | Example |
|---|---|---|
| Stock Added | Purchase Unit × Quantity | 10 × 2 = **20** |
| Total (₹) | MRP × Quantity | 60 × 2 = **120** |
| Per unit price | Selling Price ÷ Purchase Unit | 40 ÷ 10 = **4** |
| Selling price (₹) | Per unit price × Purchase Unit | 4 × 10 = **40** |
| Discount | MRP − Selling Price | 60 − 40 = **20** |

**GST is included in the MRP and the selling price.** The GST % is shown only to indicate
the applicable tax rate — nothing is ever added on top. The bill summary therefore splits
the payable amount into Taxable Amount + GST rather than adding GST to it.

## Excel exports

Both exports are real `.xlsx` workbooks (no external library — see `lib/xlsx.ts`), with
the exact columns the client specified. CSV versions are available alongside them.

**Inventory** — Sno · Generic name · Brand name · Category · Box · HSN Code · Batch no ·
MFG DT · EXP DT · Purchase Rate (₹) · MRP (₹) · Selling price (₹) · Quantity

**Sale report** — Sno · Sale date · Customer name · Customer mobile no · Bill no ·
Generic name · Brand name · Category · HSN Code · Batch no · MFG DT · EXP DT · Quantity
(a Bill Summary sheet is included in the same workbook)

## Keyboard shortcuts

| Key | Action |
|---|---|
| `F2` | Focus the global medicine search |
| `F5` | Add to bill (Billing) / Save (Purchase) |
| `F6` | Hold bill |
| `F11` | Print |
| `F12` | Pay & Print |

## Tech stack

- Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4
- `lucide-react` for icons
- Browser `localStorage` for persistence — no external database

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

- POS terminal: `/pos/admin/secure/control-panel/pmbjk-makkal-marundhagam`
- Printable bill: `/invoice/[bill-no]`
- Public store page: `/`

### Passcodes

Create `.env.local`:

```env
NEXT_PUBLIC_ADMIN_PASSCODE=your-admin-passcode
NEXT_PUBLIC_STAFF_PASSCODE=your-staff-passcode
```

Defaults are `admin123` and `staff123`. The app runs entirely in the browser, so these
ship in the client bundle — treat them as UI gates, not real secrets.

## Data storage

Everything lives in `localStorage` under `makkal_marundhagam_pms_v2`, seeded with a
starter catalogue on first run. Data is per-device; **Settings → Download backup /
Restore backup** moves it between machines. For multi-device sync, swap `lib/store.ts`
for a remote implementation with the same API surface.

## Project layout

```
app/
  pos/admin/secure/control-panel/pmbjk-makkal-marundhagam/page.tsx   app shell
  invoice/[id]/                                                     printable bill
components/pms/       Sidebar, TopBar, and one component per screen
lib/
  types.ts            data model
  calc.ts             the client's calculation rules
  store.ts            localStorage store + seed data
  format.ts           currency / date / expiry helpers
  xlsx.ts             dependency-free .xlsx writer
```

## License

© 2026 PMBJK MAKKAL MARUNDHAGAM. All Rights Reserved.

Powered by [Cenexa Systems](https://www.cenexasystems.com/).
