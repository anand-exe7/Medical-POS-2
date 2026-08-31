import {
  pgTable,
  uuid,
  text,
  numeric,
  integer,
  boolean,
  date,
  timestamp,
  pgSequence,
  index,
} from "drizzle-orm/pg-core";


export const customerSeq = pgSequence("customer_seq", { startWith: 1 });

export const suppliers = pgTable("suppliers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  phone: text("phone").notNull().default(""),
  gstin: text("gstin").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const medicines = pgTable(
  "medicines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    genericName: text("generic_name").notNull(),
    brandName: text("brand_name").notNull().default(""),
    manufacturer: text("manufacturer").notNull().default(""),
    salt: text("salt").notNull().default(""),
    schedule: text("schedule").notNull(),
    hsnCode: text("hsn_code").notNull().default(""),
    gstPercent: numeric("gst_percent", { precision: 5, scale: 2 }).notNull().default("0"),
    purchaseUnitType: text("purchase_unit_type").notNull(),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(20),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("medicines_generic_idx").on(table.genericName)],
);

export const batches = pgTable(
  "batches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    medicineId: uuid("medicine_id")
      .notNull()
      .references(() => medicines.id, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
    invoiceNo: text("invoice_no").notNull().default(""),
    purchaseDate: date("purchase_date").notNull(),
    batchNo: text("batch_no").notNull(),
    mfgDate: text("mfg_date").notNull().default(""),
    expDate: text("exp_date").notNull().default(""),
    box: text("box").notNull().default(""),
    purchaseUnitType: text("purchase_unit_type").notNull(),
    packSize: integer("pack_size").notNull().default(1),
    qtyPacks: integer("qty_packs").notNull().default(0),
    stockAdded: integer("stock_added").notNull().default(0),
    stockQty: integer("stock_qty").notNull().default(0),
    purchaseRate: numeric("purchase_rate", { precision: 12, scale: 2 }).notNull().default("0"),
    mrp: numeric("mrp", { precision: 12, scale: 2 }).notNull().default("0"),
    sellingPrice: numeric("selling_price", { precision: 12, scale: 2 }).notNull().default("0"),
    gstPercent: numeric("gst_percent", { precision: 5, scale: 2 }).notNull().default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("batches_medicine_idx").on(table.medicineId),
    index("batches_exp_idx").on(table.expDate),
  ],
);

export const customers = pgTable("customers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().default(""),
  address: text("address").notNull().default(""),
  doctorName: text("doctor_name").notNull().default(""),
  quickBill: boolean("quick_bill").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bills = pgTable(
  "bills",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id").references(() => customers.id, { onDelete: "set null" }),
    customerName: text("customer_name").notNull().default(""),
    customerPhone: text("customer_phone").notNull().default(""),
    customerAddress: text("customer_address").notNull().default(""),
    doctorName: text("doctor_name").notNull().default(""),
    billDate: date("bill_date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    subTotal: numeric("sub_total", { precision: 12, scale: 2 }).notNull(),
    discount: numeric("discount", { precision: 12, scale: 2 }).notNull(),
    taxableAmount: numeric("taxable_amount", { precision: 12, scale: 2 }).notNull(),
    gstAmount: numeric("gst_amount", { precision: 12, scale: 2 }).notNull(),
    gstPercent: numeric("gst_percent", { precision: 5, scale: 2 }).notNull(),
    grandTotal: numeric("grand_total", { precision: 12, scale: 2 }).notNull(),
    receivedAmount: numeric("received_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    changeAmount: numeric("change_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    paymentMethod: text("payment_method").notNull(),
    status: text("status").notNull().default("COMPLETED"),
  },
  (table) => [
    index("bills_created_idx").on(table.createdAt),
    index("bills_customer_idx").on(table.customerId),
  ],
);

export const billItems = pgTable(
  "bill_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    billId: text("bill_id")
      .notNull()
      .references(() => bills.id, { onDelete: "cascade" }),
    medicineId: uuid("medicine_id"),
    batchId: uuid("batch_id"),
    genericName: text("generic_name").notNull(),
    brandName: text("brand_name").notNull().default(""),
    manufacturer: text("manufacturer").notNull().default(""),
    schedule: text("schedule").notNull(),
    hsnCode: text("hsn_code").notNull().default(""),
    batchNo: text("batch_no").notNull().default(""),
    mfgDate: text("mfg_date").notNull().default(""),
    expDate: text("exp_date").notNull().default(""),
    box: text("box").notNull().default(""),
    purchaseUnitType: text("purchase_unit_type").notNull(),
    packSize: integer("pack_size").notNull().default(1),
    qty: integer("qty").notNull(),
    mrpPerUnit: numeric("mrp_per_unit", { precision: 12, scale: 2 }).notNull(),
    perUnitPrice: numeric("per_unit_price", { precision: 12, scale: 2 }).notNull(),
    lineMrp: numeric("line_mrp", { precision: 12, scale: 2 }).notNull(),
    lineAmount: numeric("line_amount", { precision: 12, scale: 2 }).notNull(),
    lineDiscount: numeric("line_discount", { precision: 12, scale: 2 }).notNull(),
    gstPercent: numeric("gst_percent", { precision: 5, scale: 2 }).notNull(),
  },
  (table) => [index("bill_items_bill_idx").on(table.billId)],
);

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  shopName: text("shop_name").notNull(),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  gstin: text("gstin").notNull(),
  dlNo: text("dl_no").notNull(),
  defaultGst: numeric("default_gst", { precision: 5, scale: 2 }).notNull().default("12"),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(20),
  expiryAlertMonths: integer("expiry_alert_months").notNull().default(6),
});
