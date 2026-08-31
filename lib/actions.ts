"use server";

import { db } from "./db/client";
import * as schema from "./db/schema";
import { eq, sql } from "drizzle-orm";
import { generateBillId, formatCustomerId } from "./ids";
import { calcBillTotals } from "./calc";

export async function saveMedicine(payload: any) {
  if (payload.id && !payload.id.startsWith("id-")) {
    await db.update(schema.medicines).set({
      genericName: payload.generic_name,
      brandName: payload.brand_name,
      manufacturer: payload.manufacturer,
      salt: payload.salt,
      schedule: payload.schedule,
      hsnCode: payload.hsn_code,
      gstPercent: payload.gst_percent.toString(),
      purchaseUnitType: payload.purchase_unit_type,
    }).where(eq(schema.medicines.id, payload.id));
    return payload.id;
  } else {
    const res = await db.insert(schema.medicines).values({
      genericName: payload.generic_name,
      brandName: payload.brand_name,
      manufacturer: payload.manufacturer,
      salt: payload.salt,
      schedule: payload.schedule,
      hsnCode: payload.hsn_code,
      gstPercent: payload.gst_percent.toString(),
      purchaseUnitType: payload.purchase_unit_type,
      lowStockThreshold: payload.low_stock_threshold,
    }).returning({ id: schema.medicines.id });
    return res[0].id;
  }
}

export async function deleteMedicine(id: string) {
  await db.delete(schema.medicines).where(eq(schema.medicines.id, id));
}

export async function saveSupplier(payload: any) {
  if (payload.id && !payload.id.startsWith("id-")) {
    await db.update(schema.suppliers).set({
      name: payload.name,
      phone: payload.phone,
      gstin: payload.gstin,
    }).where(eq(schema.suppliers.id, payload.id));
  } else {
    await db.insert(schema.suppliers).values({
      name: payload.name,
      phone: payload.phone,
      gstin: payload.gstin,
    });
  }
}

export async function deleteSupplier(id: string) {
  await db.delete(schema.suppliers).where(eq(schema.suppliers.id, id));
}

export async function saveBatch(payload: any) {
  if (payload.id && !payload.id.startsWith("id-")) {
    await db.update(schema.batches).set({
      invoiceNo: payload.invoice_no,
      purchaseDate: payload.purchase_date,
      batchNo: payload.batch_no,
      mfgDate: payload.mfg_date,
      expDate: payload.exp_date,
      box: payload.box,
      purchaseUnitType: payload.purchase_unit_type,
      packSize: payload.pack_size,
      qtyPacks: payload.qty_packs,
      stockAdded: payload.stock_added,
      stockQty: payload.stock_qty,
      purchaseRate: payload.purchase_rate.toString(),
      mrp: payload.mrp.toString(),
      sellingPrice: payload.selling_price.toString(),
      gstPercent: payload.gst_percent.toString(),
      supplierId: payload.supplier_id || null,
      medicineId: payload.medicine_id,
    }).where(eq(schema.batches.id, payload.id));
    return payload.id;
  } else {
    const res = await db.insert(schema.batches).values({
      invoiceNo: payload.invoice_no,
      purchaseDate: payload.purchase_date,
      batchNo: payload.batch_no,
      mfgDate: payload.mfg_date,
      expDate: payload.exp_date,
      box: payload.box,
      purchaseUnitType: payload.purchase_unit_type,
      packSize: payload.pack_size,
      qtyPacks: payload.qty_packs,
      stockAdded: payload.stock_added,
      stockQty: payload.stock_qty,
      purchaseRate: payload.purchase_rate.toString(),
      mrp: payload.mrp.toString(),
      sellingPrice: payload.selling_price.toString(),
      gstPercent: payload.gst_percent.toString(),
      supplierId: payload.supplier_id || null,
      medicineId: payload.medicine_id,
    }).returning({ id: schema.batches.id });
    return res[0].id;
  }
}

export async function deleteBatch(id: string) {
  await db.delete(schema.batches).where(eq(schema.batches.id, id));
}

export async function adjustBatchStock(id: string, qty: number) {
  await db.update(schema.batches).set({
    stockQty: qty,
  }).where(eq(schema.batches.id, id));
}

export async function saveCustomer(payload: any) {
  if (payload.id && !payload.id.startsWith("new-")) {
    await db.update(schema.customers).set({
      name: payload.name,
      phone: payload.phone,
      address: payload.address,
      doctorName: payload.doctor_name,
      quickBill: payload.quick_bill,
    }).where(eq(schema.customers.id, payload.id));
  } else {
    // Generate new customer id
    const res = await db.execute(sql`SELECT nextval('customer_seq')`);
    const nextVal = (res as any).rows ? (res as any).rows[0].nextval : (res as any)[0].nextval;
    const cid = formatCustomerId(parseInt(nextVal, 10));

    await db.insert(schema.customers).values({
      id: cid,
      name: payload.name,
      phone: payload.phone,
      address: payload.address,
      doctorName: payload.doctor_name,
      quickBill: payload.quick_bill,
    });
  }
}

export async function deleteCustomer(id: string) {
  await db.delete(schema.customers).where(eq(schema.customers.id, id));
}

export async function saveSettings(payload: any) {
  await db.update(schema.settings).set({
    shopName: payload.shop_name,
    address: payload.address,
    phone: payload.phone,
    gstin: payload.gstin,
    dlNo: payload.dl_no,
    defaultGst: payload.default_gst.toString(),
    lowStockThreshold: payload.low_stock_threshold,
    expiryAlertMonths: payload.expiry_alert_months,
  }).where(eq(schema.settings.id, 1));
}

export async function submitBill(payload: {
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  doctor_name: string;
  received_amount: number;
  payment_method: string;
  lines: any[];
}) {
  return db.transaction(async (tx) => {
    let customerId = payload.customer_id;

    if (!customerId && (payload.customer_name || payload.customer_phone)) {
      // Upsert customer
      const existing = await tx.select().from(schema.customers).where(eq(schema.customers.phone, payload.customer_phone)).limit(1);
      if (existing.length > 0) {
        customerId = existing[0].id;
        await tx.update(schema.customers).set({
          name: payload.customer_name,
          address: payload.customer_address,
          doctorName: payload.doctor_name,
        }).where(eq(schema.customers.id, customerId));
      } else {
        const res = await tx.execute(sql`SELECT nextval('customer_seq')`);
        const nextVal = (res as any).rows ? (res as any).rows[0].nextval : (res as any)[0].nextval;
        customerId = formatCustomerId(parseInt(nextVal, 10));
        await tx.insert(schema.customers).values({
          id: customerId,
          name: payload.customer_name || "Walk-in",
          phone: payload.customer_phone,
          address: payload.customer_address,
          doctorName: payload.doctor_name,
          quickBill: true,
        });
      }
    }

    const totals = calcBillTotals(payload.lines);
    const billId = generateBillId();
    const today = new Date().toISOString().slice(0, 10);

    const newBill = {
      id: billId,
      customerId,
      customerName: payload.customer_name,
      customerPhone: payload.customer_phone,
      customerAddress: payload.customer_address,
      doctorName: payload.doctor_name,
      billDate: today,
      subTotal: totals.subTotal.toString(),
      discount: totals.discount.toString(),
      taxableAmount: totals.taxableAmount.toString(),
      gstAmount: totals.gstAmount.toString(),
      gstPercent: totals.gstPercent.toString(),
      grandTotal: totals.grandTotal.toString(),
      receivedAmount: payload.received_amount.toString(),
      changeAmount: (payload.received_amount - totals.grandTotal).toString(),
      paymentMethod: payload.payment_method,
      status: "COMPLETED",
    };

    await tx.insert(schema.bills).values(newBill);

    for (const line of payload.lines) {
      await tx.insert(schema.billItems).values({
        billId,
        medicineId: line.medicine_id,
        batchId: line.batch_id,
        genericName: line.generic_name,
        brandName: line.brand_name,
        manufacturer: line.manufacturer,
        schedule: line.schedule,
        hsnCode: line.hsn_code,
        batchNo: line.batch_no,
        mfgDate: line.mfg_date,
        expDate: line.exp_date,
        box: line.box,
        purchaseUnitType: line.purchase_unit_type,
        packSize: line.pack_size,
        qty: line.qty,
        mrpPerUnit: line.mrp_per_unit.toString(),
        perUnitPrice: line.per_unit_price.toString(),
        lineMrp: line.line_mrp.toString(),
        lineAmount: line.line_amount.toString(),
        lineDiscount: line.line_discount.toString(),
        gstPercent: line.gst_percent.toString(),
      });

      // Deduct stock
      await tx.execute(
        sql`UPDATE batches SET stock_qty = GREATEST(0, stock_qty - ${line.qty}) WHERE id = ${line.batch_id}`
      );
    }

    return billId;
  });
}

export async function deleteBill(billId: string) {
  return db.transaction(async (tx) => {
    const items = await tx.select().from(schema.billItems).where(eq(schema.billItems.billId, billId));
    
    // Restore stock
    for (const item of items) {
      if (item.batchId) {
        await tx.execute(
          sql`UPDATE batches SET stock_qty = stock_qty + ${item.qty} WHERE id = ${item.batchId}`
        );
      }
    }

    await tx.delete(schema.bills).where(eq(schema.bills.id, billId));
  });
}
