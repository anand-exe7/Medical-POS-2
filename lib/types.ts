/* ==========================================================================
   MAKKAL MARUNDHAGAM — Pharmacy Management System
   Data model
   ========================================================================== */

/** Regulatory drug schedule (client spec: H, H1, X, NRX, OTC, General) */
export type DrugSchedule = "H" | "H1" | "X" | "NRX" | "OTC" | "General";

/** How the medicine is purchased from the supplier */
export type PurchaseUnitType = "Strip" | "Piece" | "Bottle";

export type PaymentMethod = "Cash" | "UPI" | "Card";

/** Medicine master record */
export type Medicine = {
  id: string;
  /** Paracetamol 500mg */
  generic_name: string;
  /** Paracip */
  brand_name: string;
  /** Zydus Healthcare */
  manufacturer: string;
  /** Salt composition shown on the billing card */
  salt: string;
  schedule: DrugSchedule;
  hsn_code: string;
  gst_percent: number;
  purchase_unit_type: PurchaseUnitType;
  low_stock_threshold: number;
  created_at: string;
};

/** Supplier master */
export type Supplier = {
  id: string;
  name: string;
  phone: string;
  gstin: string;
  created_at: string;
};

/**
 * A purchased batch of a medicine.
 *
 * Money fields are PER PACK (per strip / piece / bottle).
 * `pack_size` is the numeric "Purchase Unit" — how many sellable units are in
 * one pack (e.g. 10 tablets per strip).
 *
 * `brand_name` and `manufacturer` live here because the same generic medicine
 * (e.g. Azithromycin 500mg) can be stocked from multiple brands/makers.
 */
export type Batch = {
  id: string;
  medicine_id: string;
  supplier_id: string | null;
  /** Brand name specific to this purchase batch (e.g. "Azicip") */
  brand_name: string;
  /** Manufacturer specific to this purchase batch (e.g. "Cipla Ltd") */
  manufacturer: string;
  invoice_no: string;
  /** yyyy-mm-dd */
  purchase_date: string;
  batch_no: string;
  /** yyyy-mm */
  mfg_date: string;
  /** yyyy-mm */
  exp_date: string;
  /** Box mapping — physical rack location, e.g. "A1" */
  box: string;
  purchase_unit_type: PurchaseUnitType;
  /** Numeric "Purchase Unit" — units per pack */
  pack_size: number;
  /** Number of packs purchased */
  qty_packs: number;
  /** pack_size x qty_packs */
  stock_added: number;
  /** Remaining sellable units */
  stock_qty: number;
  /** Purchase rate per pack */
  purchase_rate: number;
  /** MRP per pack (GST inclusive) */
  mrp: number;
  /** Selling price per pack (GST inclusive) */
  selling_price: number;
  gst_percent: number;
  created_at: string;
};

/** Medicine joined with its live batches */
export type MedicineWithBatches = Medicine & {
  batches: Batch[];
  total_stock: number;
  /** First-expiring batch that still has stock */
  active_batch: Batch | null;
  earliest_expiry: string | null;
};

export type Customer = {
  /** Client format: PMBJ000001 */
  id: string;
  name: string;
  phone: string;
  address: string;
  doctor_name: string;
  /** Registered for Quick Bill */
  quick_bill: boolean;
  created_at: string;
};

/** A line on a bill. Quantities and prices here are PER SELLABLE UNIT. */
export type BillItem = {
  id: string;
  bill_id: string;
  medicine_id: string;
  batch_id: string;
  generic_name: string;
  brand_name: string;
  manufacturer: string;
  schedule: DrugSchedule;
  hsn_code: string;
  batch_no: string;
  mfg_date: string;
  exp_date: string;
  /** Box mapping shown on the bill grid */
  box: string;
  purchase_unit_type: PurchaseUnitType;
  pack_size: number;
  /** Sold quantity in units */
  qty: number;
  mrp_per_unit: number;
  per_unit_price: number;
  /** mrp_per_unit x qty */
  line_mrp: number;
  /** per_unit_price x qty */
  line_amount: number;
  /** line_mrp - line_amount */
  line_discount: number;
  gst_percent: number;
};

export type Bill = {
  /** Auto-generated, format B000125 */
  id: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  doctor_name: string;
  /** yyyy-mm-dd */
  bill_date: string;
  created_at: string;
  /** Sum of MRP x qty */
  sub_total: number;
  /** Sum of (MRP - selling) x qty */
  discount: number;
  /** Payable minus the GST already contained in it */
  taxable_amount: number;
  /** GST contained inside the selling price */
  gst_amount: number;
  /** Weighted average GST rate across the lines */
  gst_percent: number;
  /** Payable = sum of selling x qty */
  grand_total: number;
  received_amount: number;
  change_amount: number;
  payment_method: PaymentMethod;
  status: "COMPLETED" | "HELD";
  items: BillItem[];
};

/** A row in the billing cart before the bill is saved */
export type CartLine = {
  key: string;
  medicine_id: string;
  batch_id: string;
  generic_name: string;
  brand_name: string;
  manufacturer: string;
  salt: string;
  schedule: DrugSchedule;
  hsn_code: string;
  batch_no: string;
  mfg_date: string;
  exp_date: string;
  box: string;
  purchase_unit_type: PurchaseUnitType;
  pack_size: number;
  qty: number;
  mrp_per_unit: number;
  per_unit_price: number;
  selling_price_pack: number;
  mrp_pack: number;
  gst_percent: number;
  stock_available: number;
};

/** A bill parked with "Hold Bill (F6)" */
export type HeldBill = {
  id: string;
  at: string;
  lines: CartLine[];
};

export type ShopSettings = {
  shop_name: string;
  address: string;
  phone: string;
  gstin: string;
  dl_no: string;
  default_gst: number;
  low_stock_threshold: number;
  expiry_alert_months: number;
};

export type Store = {
  medicines: Medicine[];
  suppliers: Supplier[];
  batches: Batch[];
  customers: Customer[];
  bills: Bill[];
  held: HeldBill[];
  settings: ShopSettings;
  counters: {
    bill: number;
    customer: number;
  };
};

export type BatchRow = { batch: Batch; medicine: Medicine; supplier_name: string };
