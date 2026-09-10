"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, Info, Save, Plus, CalendarDays } from "lucide-react";
import type { DrugSchedule, MedicineWithBatches, PurchaseUnitType, Supplier } from "@/lib/types";
import {
  calcDiscount,
  calcPerUnitPrice,
  calcPurchaseCost,
  calcStockAdded,
  calcTotal,
} from "@/lib/calc";
import { amount, monthShort, todayIso, unitNoun } from "@/lib/format";
import { getSettings } from "@/lib/store";
import { saveBatch, saveMedicine, saveSupplier } from "@/lib/actions";
import { Button, Card, Field, ScreenHeading, Select, TextInput } from "./ui";

/** Dropdown options requested by the client (slide 9 / 10) */
const PURCHASE_UNITS: PurchaseUnitType[] = ["Strip", "Piece", "Bottle"];
const SCHEDULES: DrugSchedule[] = ["H", "H1", "X", "NRX", "OTC", "General"];

const blankForm = () => ({
  supplierId: "",
  supplierName: "",
  invoiceNo: "",
  date: todayIso(),
  medicineId: "",
  medicineName: "",
  purchaseUnitType: "Strip" as PurchaseUnitType,
  schedule: "OTC" as DrugSchedule,
  genericName: "",
  brandName: "",
  manufacturer: "",
  salt: "",
  hsnCode: "",
  batchNo: "",
  mfgDate: "",
  expDate: "",
  box: "",
  packSize: "",
  quantity: "",
  purchaseRate: "",
  mrp: "",
  sellingPrice: "",
  gst: String(getSettings().default_gst ?? 12),
});

export const Purchase = ({
  medicines,
  suppliers,
  onSaved,
}: {
  medicines: MedicineWithBatches[];
  suppliers: Supplier[];
  onSaved: (message: string) => void;
}) => {
  const [form, setForm] = useState(blankForm);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState("");
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof ReturnType<typeof blankForm>>(
    key: K,
    value: ReturnType<typeof blankForm>[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    const away = (event: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, []);

  /* --------------------------- medicine lookup --------------------------- */
  const results = useMemo(() => {
    const q = form.medicineName.trim().toLowerCase();
    if (!q) return [];
    return medicines
      .filter(
        (m) =>
          m.generic_name.toLowerCase().includes(q) ||
          m.brand_name.toLowerCase().includes(q) ||
          m.manufacturer.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [form.medicineName, medicines]);

  const pickMedicine = (medicine: MedicineWithBatches) => {
    const last = medicine.batches[medicine.batches.length - 1];
    setForm((prev) => ({
      ...prev,
      medicineId: medicine.id,
      medicineName: medicine.generic_name,
      genericName: medicine.generic_name,
      // Brand / manufacturer are NOT copied from the medicine — they belong to
      // the batch being purchased and must be entered fresh each time.
      brandName: prev.brandName,
      manufacturer: prev.manufacturer,
      salt: medicine.salt,
      hsnCode: medicine.hsn_code,
      schedule: medicine.schedule,
      purchaseUnitType: medicine.purchase_unit_type,
      gst: String(medicine.gst_percent),
      box: last?.box || prev.box,
      packSize: last ? String(last.pack_size) : prev.packSize,
    }));
    setShowResults(false);
  };

  /* --------------------------- auto calculations ------------------------- */
  const packSize = Number(form.packSize) || 0;
  const quantity = Number(form.quantity) || 0;
  const mrp = Number(form.mrp) || 0;
  const sellingPrice = Number(form.sellingPrice) || 0;
  const purchaseRate = Number(form.purchaseRate) || 0;

  const stockAdded = calcStockAdded(packSize, quantity);
  const total = calcTotal(mrp, quantity);
  const perUnitPrice = calcPerUnitPrice(sellingPrice, packSize);
  const discount = mrp > 0 && sellingPrice > 0 ? calcDiscount(mrp, sellingPrice) : 0;
  const purchaseCost = calcPurchaseCost(purchaseRate, quantity);
  const unitWord = unitNoun(form.purchaseUnitType, packSize);

  /* -------------------------------- save --------------------------------- */
  const handleSave = async () => {
    if (!form.genericName.trim()) return setError("Enter the medicine (generic) name.");
    if (!form.brandName.trim()) return setError("Enter the brand name.");
    if (!form.batchNo.trim()) return setError("Enter the batch number.");
    if (!form.expDate) return setError("Expiry date (EXP DT) is mandatory.");
    if (packSize <= 0) return setError("Purchase Unit must be greater than zero.");
    if (quantity <= 0) return setError("Quantity must be greater than zero.");
    if (mrp <= 0) return setError("Enter the MRP.");
    if (sellingPrice <= 0) return setError("Enter the selling price.");
    if (sellingPrice > mrp) return setError("Selling price cannot be higher than the MRP.");

    setError("");

    // Resolve supplier: if text was typed and doesn't match any existing supplier,
    // create a new one on the fly.
    let resolvedSupplierId = form.supplierId || null;
    if (!resolvedSupplierId && form.supplierName.trim()) {
      const newId = await saveSupplier({ name: form.supplierName.trim(), phone: "", gstin: "" });
      resolvedSupplierId = newId || null;
    }

    const medicineId = await saveMedicine({
      id: form.medicineId || undefined,
      generic_name: form.genericName.trim(),
      // brand_name / manufacturer only passed for new medicine inserts (legacy field).
      brand_name: form.brandName.trim(),
      manufacturer: form.manufacturer.trim(),
      salt: form.salt.trim() || form.genericName.trim(),
      schedule: form.schedule,
      hsn_code: form.hsnCode.trim(),
      gst_percent: Number(form.gst) || 0,
      purchase_unit_type: form.purchaseUnitType,
      low_stock_threshold: getSettings().low_stock_threshold,
    });

    await saveBatch({
      medicine_id: medicineId,
      supplier_id: resolvedSupplierId,
      brand_name: form.brandName.trim(),
      manufacturer: form.manufacturer.trim(),
      invoice_no: form.invoiceNo.trim(),
      purchase_date: form.date,
      batch_no: form.batchNo.trim(),
      mfg_date: form.mfgDate,
      exp_date: form.expDate,
      box: form.box.trim().toUpperCase(),
      purchase_unit_type: form.purchaseUnitType,
      pack_size: packSize,
      qty_packs: quantity,
      stock_added: stockAdded,
      stock_qty: stockAdded,
      purchase_rate: purchaseRate,
      mrp,
      selling_price: sellingPrice,
      gst_percent: Number(form.gst) || 0,
    });

    onSaved(`Stock added — ${stockAdded} ${unitWord} of ${form.genericName.trim()}.`);
    setForm({ ...blankForm(), supplierId: form.supplierId, supplierName: form.supplierName, invoiceNo: form.invoiceNo, date: form.date });
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "F5") {
        event.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div>
      <ScreenHeading>Purchase (Add Stock)</ScreenHeading>

      <Card className="p-5">
        {/* Supplier / Invoice / Date */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Supplier">
            {/* Combobox: pick from existing list OR type a new name */}
            <div className="relative">
              <input
                list="supplier-list"
                value={form.supplierName || suppliers.find((s) => s.id === form.supplierId)?.name || ""}
                onChange={(e) => {
                  const typed = e.target.value;
                  const match = suppliers.find((s) => s.name.toLowerCase() === typed.toLowerCase());
                  setForm((prev) => ({
                    ...prev,
                    supplierName: typed,
                    supplierId: match ? match.id : "",
                  }));
                }}
                placeholder="Select or type new supplier"
                className="h-11 w-full rounded-lg border border-[#dfe3e7] px-3 text-[13px] outline-none transition placeholder:text-gray-300 focus:border-[#0f7a31] focus:ring-2 focus:ring-[#0f7a31]/12"
              />
              <datalist id="supplier-list">
                {suppliers.map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </div>
            {form.supplierName && !form.supplierId && (
              <p className="mt-1 text-[11px] text-[#1f6feb]">New supplier — will be created on save.</p>
            )}
          </Field>
          <Field label="Invoice No">
            <TextInput
              value={form.invoiceNo}
              onChange={(e) => set("invoiceNo", e.target.value)}
              placeholder="INV-2456"
            />
          </Field>
          <Field label="Date">
            <div className="relative">
              <TextInput
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                className="pr-10"
              />
              <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
          </Field>
        </div>

        {/* Medicine / Purchase Unit / Drug Schedule */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-6" ref={searchWrapRef}>
            <label className="field-label">Medicine</label>
            <div className="relative">
              <TextInput
                value={form.medicineName}
                onChange={(e) => {
                  set("medicineName", e.target.value);
                  set("genericName", e.target.value);
                  set("medicineId", "");
                  setShowResults(true);
                }}
                onFocus={() => setShowResults(true)}
                placeholder="Paracetamol 500 mg Tablet"
                className="pr-10"
              />
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

              {showResults && results.length > 0 && (
                <div className="absolute left-0 right-0 top-[46px] z-30 max-h-[280px] overflow-y-auto rounded-xl border border-[#e5e7eb] bg-white py-1.5 shadow-xl">
                  {results.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => pickMedicine(m)}
                      className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-gray-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[13.5px] font-semibold text-gray-900">
                          {m.generic_name}
                        </span>
                        <span className="block truncate text-[11.5px] text-gray-500">
                          {(() => {
                            // Show brands from all batches of this medicine
                            const batchBrands = [...new Set(
                              m.batches.map((b) => b.brand_name).filter(Boolean)
                            )].join(" / ");
                            return batchBrands || m.brand_name || "";
                          })()} · HSN {m.hsn_code}
                        </span>
                      </span>
                      <span className="shrink-0 text-[12px] font-semibold text-[#0a6127]">
                        {m.total_stock} in stock
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {!form.medicineId && form.medicineName.trim() && (
              <p className="mt-1 flex items-center gap-1.5 text-[11.5px] text-[#1f6feb]">
                <Plus className="h-3.5 w-3.5" /> New medicine — it will be added to the medicine
                master on save.
              </p>
            )}
          </div>

          <Field label="Purchase Unit" className="md:col-span-3">
            <Select
              value={form.purchaseUnitType}
              onChange={(e) => set("purchaseUnitType", e.target.value as PurchaseUnitType)}
            >
              {PURCHASE_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Drug Schedule" className="md:col-span-3">
            <Select
              value={form.schedule}
              onChange={(e) => set("schedule", e.target.value as DrugSchedule)}
            >
              {SCHEDULES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {/* Medicine batch details */}
        <p className="mb-2 mt-6 text-[13px] font-semibold text-gray-800">Medicine Batch Details</p>
        <div className="overflow-x-auto rounded-lg border border-[#e5e7eb]">
          <table className="w-full min-w-[820px]">
            <thead>
              <tr className="bg-[#f4f6f8] text-gray-700">
                <th className="th">Brand name</th>
                <th className="th">Company</th>
                <th className="th">HSN Code</th>
                <th className="th">Batch no</th>
                <th className="th">MFG DT</th>
                <th className="th">EXP DT</th>
                <th className="th">Box</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <CellInput value={form.brandName} onChange={(v) => set("brandName", v)} placeholder="Paracip" />
                <CellInput
                  value={form.manufacturer}
                  onChange={(v) => set("manufacturer", v)}
                  placeholder="Zydus Healthcare"
                />
                <CellInput value={form.hsnCode} onChange={(v) => set("hsnCode", v)} placeholder="30049099" />
                <CellInput value={form.batchNo} onChange={(v) => set("batchNo", v)} placeholder="P500A2306" />
                <CellInput
                  value={form.mfgDate}
                  onChange={(v) => set("mfgDate", v)}
                  type="month"
                  placeholder="May-25"
                />
                <CellInput
                  value={form.expDate}
                  onChange={(v) => set("expDate", v)}
                  type="month"
                  placeholder="May-28"
                />
                <CellInput
                  value={form.box}
                  onChange={(v) => set("box", v.toUpperCase())}
                  placeholder="A1"
                />
              </tr>
            </tbody>
          </table>
        </div>

        {/* Purchase calculation */}
        <p className="mb-2 mt-6 text-[13px] font-semibold text-gray-800">Purchase Calculation</p>
        <div className="overflow-x-auto rounded-lg border border-[#e5e7eb]">
          <table className="w-full min-w-[1120px]">
            <thead>
              <tr className="bg-[#eaeef1]">
                <th className={GROUP_TH} colSpan={3}>
                  Stock
                </th>
                <th className={`${GROUP_TH} border-l border-[#d3d9df]`} colSpan={2}>
                  You pay — supplier
                </th>
                <th className={`${GROUP_TH} border-l border-[#d3d9df]`} colSpan={6}>
                  Customer pays — retail
                </th>
              </tr>
              <tr className="bg-[#f4f6f8] text-gray-700">
                <th className="th">Purchase Unit</th>
                <th className="th">Quantity</th>
                <th className="th bg-[#eef4ef]">Stock Added</th>
                <th className="th border-l border-[#d3d9df]">Purchase Rate (₹)</th>
                <th className="th bg-[#eef4ef]">Purchase Total (₹)</th>
                <th className="th border-l border-[#d3d9df]">MRP (₹)</th>
                <th className="th bg-[#eef4ef]">MRP Total (₹)</th>
                <th className="th">Selling Price (₹)</th>
                <th className="th bg-[#eef4ef]">Per unit price</th>
                <th className="th">GST %</th>
                <th className="th bg-[#eef4ef]">Discount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <CellInput
                  value={form.packSize}
                  onChange={(v) => set("packSize", v)}
                  type="number"
                  placeholder="10"
                />
                <CellInput
                  value={form.quantity}
                  onChange={(v) => set("quantity", v)}
                  type="number"
                  placeholder="2"
                />
                <CellReadonly value={stockAdded ? String(stockAdded) : "—"} />
                <CellInput
                  value={form.purchaseRate}
                  onChange={(v) => set("purchaseRate", v)}
                  type="number"
                  placeholder="20"
                  divider
                />
                <CellReadonly value={purchaseCost ? amount(purchaseCost) : "—"} />
                <CellInput
                  value={form.mrp}
                  onChange={(v) => set("mrp", v)}
                  type="number"
                  placeholder="60"
                  divider
                />
                <CellReadonly value={total ? amount(total) : "—"} />
                <CellInput
                  value={form.sellingPrice}
                  onChange={(v) => set("sellingPrice", v)}
                  type="number"
                  placeholder="40"
                />
                <CellReadonly value={perUnitPrice ? amount(perUnitPrice) : "—"} />
                <CellInput value={form.gst} onChange={(v) => set("gst", v)} type="number" placeholder="12" />
                <CellReadonly value={discount ? amount(discount) : "—"} tone="green" />
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-2 text-[11.5px] text-gray-500">
          The shaded columns fill in on their own — Stock Added, Purchase Total, MRP Total, Per unit
          price and Discount. Every other column is typed in.
        </p>

        {/* Totals strip */}
        <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#e5e7eb] bg-[#e5e7eb] sm:grid-cols-4">
          <SummaryCell label={`Total ${form.purchaseUnitType}s`} value={quantity ? String(quantity) : "—"} />
          <SummaryCell
            label="Purchase Total (you pay)"
            value={purchaseCost ? `₹ ${amount(purchaseCost)}` : "—"}
          />
          <SummaryCell label="MRP Total (retail value)" value={total ? `₹ ${amount(total)}` : "—"} />
          <SummaryCell
            label={`Total ${unitWord} Added`}
            value={stockAdded ? String(stockAdded) : "—"}
            highlight
          />
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] font-medium text-red-700">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          <Button variant="ghost" onClick={() => setForm(blankForm())}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4" /> Save (F5)
          </Button>
        </div>

        {/* Info bar */}
        <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-[#dbe7f8] bg-[#f5f9ff] px-4 py-3">
          <Info className="mt-[1px] h-[18px] w-[18px] shrink-0 text-[#1f6feb]" />
          <p className="text-[13px] text-[#1c4f9c]">
            {stockAdded > 0 ? (
              <>
                Stock will be added as <b>{stockAdded} {unitWord}</b> in inventory ({quantity}{" "}
                {form.purchaseUnitType}
                {quantity === 1 ? "" : "s"} × {packSize} = {stockAdded} {unitWord})
                {form.expDate ? ` · Expires ${monthShort(form.expDate)}` : ""}
                {form.box ? ` · Box ${form.box}` : ""}
              </>
            ) : (
              <>Enter the Purchase Unit and Quantity to see how much stock will be added.</>
            )}
          </p>
        </div>

        <p className="mt-3 text-[11.5px] text-gray-500">
          Note: GST is included in the MRP and Selling Price. The GST % only indicates the applicable
          tax rate — no additional GST is added on top.
        </p>
      </Card>
    </div>
  );
};

/* ------------------------------ table cells ------------------------------ */

const GROUP_TH =
  "px-2.5 py-2 text-center text-[10.5px] font-bold uppercase tracking-[0.09em] text-gray-500";

const CellInput = ({
  value,
  onChange,
  placeholder,
  type = "text",
  divider,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  divider?: boolean;
}) => (
  <td className={`border-t border-[#eef1f3] px-2 py-2 ${divider ? "border-l border-l-[#d3d9df]" : ""}`}>
    <input
      value={value}
      type={type}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-10 w-full rounded-md border border-[#dfe3e7] px-2.5 text-[13px] outline-none transition placeholder:text-gray-300 focus:border-[#0f7a31] focus:ring-2 focus:ring-[#0f7a31]/12"
    />
  </td>
);

const CellReadonly = ({ value, tone }: { value: string; tone?: "green" }) => (
  <td className="border-t border-[#eef1f3] bg-[#f7faf8] px-2 py-2">
    <div
      className={`flex h-10 items-center justify-center rounded-md border border-dashed border-[#cfd9d2] px-2 text-[13.5px] font-bold ${
        tone === "green" ? "text-[#0a6127]" : "text-gray-900"
      }`}
    >
      {value}
    </div>
  </td>
);

const SummaryCell = ({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) => (
  <div className="bg-white px-4 py-3.5">
    <p className="text-[12px] text-gray-500">{label}</p>
    <p className={`text-[19px] font-bold ${highlight ? "text-[#0a6127]" : "text-gray-900"}`}>
      {value}
    </p>
  </div>
);
