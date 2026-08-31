import { Batch, Bill, BillItem, Customer, Medicine, ShopSettings, Supplier } from "../types";

export const toNum = (val: string | number | null | undefined): number => {
  if (val == null) return 0;
  if (typeof val === "number") return val;
  return Number(val) || 0;
};

export const mapMedicine = (row: any): Medicine => ({
  id: row.id,
  generic_name: row.genericName,
  brand_name: row.brandName,
  manufacturer: row.manufacturer,
  salt: row.salt,
  schedule: row.schedule as any,
  hsn_code: row.hsnCode,
  gst_percent: toNum(row.gstPercent),
  purchase_unit_type: row.purchaseUnitType as any,
  low_stock_threshold: row.lowStockThreshold,
  created_at: row.createdAt.toISOString(),
});

export const mapBatch = (row: any): Batch => ({
  id: row.id,
  medicine_id: row.medicineId,
  supplier_id: row.supplierId,
  invoice_no: row.invoiceNo,
  purchase_date: row.purchaseDate,
  batch_no: row.batchNo,
  mfg_date: row.mfgDate,
  exp_date: row.expDate,
  box: row.box,
  purchase_unit_type: row.purchaseUnitType as any,
  pack_size: row.packSize,
  qty_packs: row.qtyPacks,
  stock_added: row.stockAdded,
  stock_qty: row.stockQty,
  purchase_rate: toNum(row.purchaseRate),
  mrp: toNum(row.mrp),
  selling_price: toNum(row.sellingPrice),
  gst_percent: toNum(row.gstPercent),
  created_at: row.createdAt.toISOString(),
});

export const mapCustomer = (row: any): Customer => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  address: row.address,
  doctor_name: row.doctorName,
  quick_bill: row.quickBill,
  created_at: row.createdAt.toISOString(),
});

export const mapSupplier = (row: any): Supplier => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  gstin: row.gstin,
  created_at: row.createdAt.toISOString(),
});

export const mapBillItem = (row: any): BillItem => ({
  id: row.id,
  bill_id: row.billId,
  medicine_id: row.medicineId || "",
  batch_id: row.batchId || "",
  generic_name: row.genericName,
  brand_name: row.brandName,
  manufacturer: row.manufacturer,
  schedule: row.schedule as any,
  hsn_code: row.hsnCode,
  batch_no: row.batchNo,
  mfg_date: row.mfgDate,
  exp_date: row.expDate,
  box: row.box,
  purchase_unit_type: row.purchaseUnitType as any,
  pack_size: row.packSize,
  qty: row.qty,
  mrp_per_unit: toNum(row.mrpPerUnit),
  per_unit_price: toNum(row.perUnitPrice),
  line_mrp: toNum(row.lineMrp),
  line_amount: toNum(row.lineAmount),
  line_discount: toNum(row.lineDiscount),
  gst_percent: toNum(row.gstPercent),
});

export const mapBill = (row: any, items: any[] = []): Bill => ({
  id: row.id,
  customer_id: row.customerId,
  customer_name: row.customerName,
  customer_phone: row.customerPhone,
  customer_address: row.customerAddress,
  doctor_name: row.doctorName,
  bill_date: row.billDate,
  created_at: row.createdAt.toISOString(),
  sub_total: toNum(row.subTotal),
  discount: toNum(row.discount),
  taxable_amount: toNum(row.taxableAmount),
  gst_amount: toNum(row.gstAmount),
  gst_percent: toNum(row.gstPercent),
  grand_total: toNum(row.grandTotal),
  received_amount: toNum(row.receivedAmount),
  change_amount: toNum(row.changeAmount),
  payment_method: row.paymentMethod as any,
  status: row.status as any,
  items: items.map(mapBillItem),
});

export const mapSettings = (row: any): ShopSettings => ({
  shop_name: row.shopName,
  address: row.address,
  phone: row.phone,
  gstin: row.gstin,
  dl_no: row.dlNo,
  default_gst: toNum(row.defaultGst),
  low_stock_threshold: row.lowStockThreshold,
  expiry_alert_months: row.expiryAlertMonths,
});
