import { db } from "./client";
import * as schema from "./schema";
import { eq, desc, asc, inArray } from "drizzle-orm";
import { MedicineWithBatches, Batch, Customer, Supplier, Bill, ShopSettings, Medicine, BatchRow } from "../types";
import { mapMedicine, mapBatch, mapCustomer, mapSupplier, mapBill, mapSettings } from "./map";

export async function listMedicines(): Promise<MedicineWithBatches[]> {
  const allMeds = await db.select().from(schema.medicines).orderBy(schema.medicines.genericName);
  const allBatches = await db.select().from(schema.batches).orderBy(asc(schema.batches.expDate));
  
  const batchesByMedId = allBatches.reduce((acc, row) => {
    const batch = mapBatch(row);
    if (!acc[batch.medicine_id]) acc[batch.medicine_id] = [];
    acc[batch.medicine_id].push(batch);
    return acc;
  }, {} as Record<string, Batch[]>);

  return allMeds.map((medRow) => {
    const med = mapMedicine(medRow);
    const mBatches = batchesByMedId[med.id] || [];
    let activeBatch: Batch | null = null;
    let totalStock = 0;
    let earliestExpiry: string | null = null;

    for (const b of mBatches) {
      if (b.stock_qty > 0) {
        totalStock += b.stock_qty;
        if (!activeBatch) activeBatch = b;
      }
      if (!earliestExpiry && b.exp_date) {
        earliestExpiry = b.exp_date;
      }
    }

    return {
      ...med,
      batches: mBatches,
      total_stock: totalStock,
      active_batch: activeBatch,
      earliest_expiry: earliestExpiry,
    };
  });
}

export async function listBatchRows(): Promise<BatchRow[]> {
  const rows = await db
    .select({ batch: schema.batches, med: schema.medicines })
    .from(schema.batches)
    .innerJoin(schema.medicines, eq(schema.batches.medicineId, schema.medicines.id))
    .orderBy(desc(schema.batches.createdAt));

  return rows.map(({ batch, med }) => {
    const m = mapMedicine(med);
    const b = mapBatch(batch);
    return { batch: b, medicine: m, supplier_name: "—" }; // supplier name can be added with another join if needed
  });
}

export async function listSuppliers(): Promise<Supplier[]> {
  const rows = await db.select().from(schema.suppliers).orderBy(schema.suppliers.name);
  return rows.map(mapSupplier);
}

export async function listCustomers(): Promise<Customer[]> {
  const rows = await db.select().from(schema.customers).orderBy(desc(schema.customers.createdAt));
  return rows.map(mapCustomer);
}

export async function findCustomerByPhone(phone: string): Promise<Customer | null> {
  const rows = await db.select().from(schema.customers).where(eq(schema.customers.phone, phone)).limit(1);
  return rows.length ? mapCustomer(rows[0]) : null;
}

export async function listBills(): Promise<Bill[]> {
  const allBills = await db.select().from(schema.bills).orderBy(desc(schema.bills.createdAt));
  const allItems = await db.select().from(schema.billItems).orderBy(schema.billItems.id);
  
  const itemsByBillId = allItems.reduce((acc, row) => {
    if (!acc[row.billId]) acc[row.billId] = [];
    acc[row.billId].push(row);
    return acc;
  }, {} as Record<string, any[]>);

  return allBills.map((row) => mapBill(row, itemsByBillId[row.id] || []));
}

export async function getBill(id: string): Promise<Bill | null> {
  const rows = await db.select().from(schema.bills).where(eq(schema.bills.id, id)).limit(1);
  if (!rows.length) return null;
  const items = await db.select().from(schema.billItems).where(eq(schema.billItems.billId, id));
  return mapBill(rows[0], items);
}

export async function getSettings(): Promise<ShopSettings | null> {
  const rows = await db.select().from(schema.settings).where(eq(schema.settings.id, 1)).limit(1);
  if (!rows.length) return null;
  return mapSettings(rows[0]);
}

export async function customerHistory(customerId: string): Promise<Bill[]> {
  const billRows = await db.select().from(schema.bills).where(eq(schema.bills.customerId, customerId)).orderBy(desc(schema.bills.createdAt));
  const billIds = billRows.map((b) => b.id);
  if (!billIds.length) return [];
  
  const items = await db.select().from(schema.billItems).where(inArray(schema.billItems.billId, billIds));
  const itemsByBillId = items.reduce((acc, row) => {
    if (!acc[row.billId]) acc[row.billId] = [];
    acc[row.billId].push(row);
    return acc;
  }, {} as Record<string, any[]>);

  return billRows.map((b) => mapBill(b, itemsByBillId[b.id] || []));
}
