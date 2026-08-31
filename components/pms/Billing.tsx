"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ShoppingCart,
  Search,
  X,
  Plus,
  Minus,
  Trash2,
  Pencil,
  Percent,
  Printer,
  PauseCircle,
  MoreHorizontal,
  CreditCard,
  PackageOpen,
  Info,
} from "lucide-react";
import type { Batch, CartLine, HeldBill, MedicineWithBatches, PaymentMethod } from "@/lib/types";
import { calcBillTotals, calcDiscountPercent, round2 } from "@/lib/calc";
import { amount, money, monthShort, unitNoun, todayIso } from "@/lib/format";
import { listHeldBills, saveHeldBills } from "@/lib/store";
import { submitBill } from "@/lib/actions";
import { Button, Card, Pill, ScheduleBadge, ScreenHeading, Select } from "./ui";
import { CustomerModal } from "./CustomerModal";

/** Quick-add quantities requested by the client (slide 3) */
const QUICK_ADD = [1, 10, 15, 20, 30, 45];

let lineSeq = 0;
/** Unique key for a cart row — kept out of the component so render stays pure. */
const nextLineKey = (batchId: string): string => `${batchId}-${(lineSeq += 1)}`;
const newHeldBill = (lines: CartLine[]): HeldBill => ({
  id: `H${Date.now()}`,
  at: new Date().toISOString(),
  lines,
});

/** What one sellable unit is called for a given purchase unit type */
const saleNoun = (unitType: string): string =>
  unitType === "Bottle" ? "Bottle" : unitType === "Piece" ? "Piece" : "Tablet";

export const Billing = ({
  medicines,
  query,
  onQueryChange,
  onDone,
}: {
  medicines: MedicineWithBatches[];
  /** Owned by the shell so the top-bar search can drive it directly */
  query: string;
  onQueryChange: (value: string) => void;
  onDone: () => void;
}) => {
  /* ----------------------------- search state ---------------------------- */
  const setQuery = onQueryChange;
  const [showResults, setShowResults] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  /* --------------------------- selection state --------------------------- */
  const [selected, setSelected] = useState<MedicineWithBatches | null>(null);
  const [batchId, setBatchId] = useState<string>("");
  const [qty, setQty] = useState<number>(1);
  const [priceOverride, setPriceOverride] = useState<number | null>(null);
  const [editingPrice, setEditingPrice] = useState(false);

  /* ------------------------------ bill state ----------------------------- */
  const [lines, setLines] = useState<CartLine[]>([]);
  const [received, setReceived] = useState<string>("");
  const [payment, setPayment] = useState<PaymentMethod>("Cash");
  const [extraDiscount, setExtraDiscount] = useState<number>(0);
  const [showDiscountBox, setShowDiscountBox] = useState(false);
  const [discountDraft, setDiscountDraft] = useState("");
  const [billDate, setBillDate] = useState(todayIso());
  const [showMore, setShowMore] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [notice, setNotice] = useState("");

  /* Both come from the store, which re-renders this screen on every write. */

  const held = listHeldBills();

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 2600);
    return () => clearTimeout(timer);
  }, [notice]);

  /* ------------------------------- results ------------------------------- */
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return medicines
      .filter(
        (m) =>
          m.generic_name.toLowerCase().includes(q) ||
          m.brand_name.toLowerCase().includes(q) ||
          m.salt.toLowerCase().includes(q) ||
          m.manufacturer.toLowerCase().includes(q) ||
          m.hsn_code.includes(q) ||
          m.batches.some((b) => b.batch_no.toLowerCase().includes(q)),
      )
      .slice(0, 8);
  }, [query, medicines]);

  const batch: Batch | null = useMemo(() => {
    if (!selected) return null;
    return selected.batches.find((b) => b.id === batchId) || selected.active_batch;
  }, [selected, batchId]);

  /* ------------------------- derived pricing values ---------------------- */
  const perUnitBase = batch ? round2(batch.selling_price / (batch.pack_size || 1)) : 0;
  const perUnit = priceOverride !== null ? priceOverride : perUnitBase;
  const mrpPerUnit = batch ? round2(batch.mrp / (batch.pack_size || 1)) : 0;
  const sellingPack = batch ? round2(perUnit * (batch.pack_size || 1)) : 0;
  const lineAmount = round2(perUnit * qty);
  const unitWord = batch ? unitNoun(batch.purchase_unit_type, batch.pack_size) : "Units";
  const stockAfter = batch ? Math.max(0, batch.stock_qty - qty) : 0;
  const unitDiscount = round2(mrpPerUnit - perUnit);
  const unitDiscountPct = calcDiscountPercent(mrpPerUnit, perUnit);

  const chooseMedicine = (medicine: MedicineWithBatches) => {
    setSelected(medicine);
    setBatchId(medicine.active_batch?.id || "");
    setQty(1);
    setPriceOverride(null);
    setEditingPrice(false);
    setQuery(`${medicine.generic_name}`);
    setShowResults(false);
  };

  const clearSelection = () => {
    setSelected(null);
    setBatchId("");
    setQuery("");
    setQty(1);
    setPriceOverride(null);
    searchRef.current?.focus();
  };

  /* ------------------------------- cart ops ------------------------------ */
  const addToBill = () => {
    if (!selected || !batch) return;
    if (qty <= 0) return setNotice("Enter a quantity greater than zero.");
    if (qty > batch.stock_qty) return setNotice(`Only ${batch.stock_qty} ${unitWord} left in this batch.`);

    const existingIndex = lines.findIndex((l) => l.batch_id === batch.id && l.per_unit_price === perUnit);

    if (existingIndex >= 0) {
      const next = [...lines];
      const merged = next[existingIndex];
      if (merged.qty + qty > batch.stock_qty) return setNotice("Not enough stock for that quantity.");
      next[existingIndex] = { ...merged, qty: merged.qty + qty };
      setLines(next);
    } else {
      setLines([
        ...lines,
        {
          key: nextLineKey(batch.id),
          medicine_id: selected.id,
          batch_id: batch.id,
          generic_name: selected.generic_name,
          brand_name: selected.brand_name,
          manufacturer: selected.manufacturer,
          salt: selected.salt,
          schedule: selected.schedule,
          hsn_code: selected.hsn_code,
          batch_no: batch.batch_no,
          mfg_date: batch.mfg_date,
          exp_date: batch.exp_date,
          box: batch.box,
          purchase_unit_type: batch.purchase_unit_type,
          pack_size: batch.pack_size,
          qty,
          mrp_per_unit: mrpPerUnit,
          per_unit_price: perUnit,
          selling_price_pack: sellingPack,
          mrp_pack: batch.mrp,
          gst_percent: batch.gst_percent,
          stock_available: batch.stock_qty,
        },
      ]);
    }
    clearSelection();
  };

  const removeLine = (key: string) => setLines(lines.filter((l) => l.key !== key));

  const changeLineQty = (key: string, next: number) =>
    setLines(
      lines.map((l) =>
        l.key === key ? { ...l, qty: Math.max(1, Math.min(next, l.stock_available)) } : l,
      ),
    );

  const clearBill = () => {
    setLines([]);
    setReceived("");
    setExtraDiscount(0);
    clearSelection();
  };

  /* ------------------------------- totals -------------------------------- */
  const totals = useMemo(() => calcBillTotals(lines), [lines]);
  const payable = round2(Math.max(0, totals.grandTotal - extraDiscount));
  const receivedNum = Number(received) || 0;
  const change = round2(Math.max(0, receivedNum - payable));

  /* -------------------------------- hold --------------------------------- */
  const holdBill = () => {
    if (!lines.length) return setNotice("Nothing to hold — the bill is empty.");
    saveHeldBills([...held, newHeldBill(lines)]);
    clearBill();
    setNotice("Bill held. Restore it from More Options.");
  };

  const restoreHeld = (id: string) => {
    const found = held.find((h) => h.id === id);
    if (!found) return;
    setLines(found.lines);
    saveHeldBills(held.filter((h) => h.id !== id));
    setShowMore(false);
  };

  /* ------------------------------- checkout ------------------------------ */
  const startCheckout = () => {
    if (!lines.length) return setNotice("Add at least one medicine to the bill.");
    setCustomerOpen(true);
  };

  const finishBill = async (customer: {
    id: string | null;
    name: string;
    phone: string;
    address: string;
    doctor: string;
    quickBill: boolean;
  }) => {
    const billId = await submitBill({
      lines,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_address: customer.address,
      doctor_name: customer.doctor,
      received_amount: receivedNum,
      payment_method: payment,
    });
    setCustomerOpen(false);
    clearBill();
    onDone();
    window.open(`/invoice/${billId}?print=1`, "_blank");
  };

  /* ----------------------------- keyboard ops ---------------------------- */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "F5") {
        event.preventDefault();
        addToBill();
      } else if (event.key === "F6") {
        event.preventDefault();
        holdBill();
      } else if (event.key === "F12") {
        event.preventDefault();
        startCheckout();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ------------------------------- render -------------------------------- */
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      {/* ============================ LEFT: search + medicine ============== */}
      <section className="xl:col-span-5">
        <ScreenHeading icon={<ShoppingCart className="h-[18px] w-[18px] text-[#0a6127]" />}>
          Billing ({batch ? saleNoun(batch.purchase_unit_type) : "Tablet"} Sale)
        </ScreenHeading>

        {/* Search row */}
        <div className="relative mb-3 flex gap-2.5">
          <div className="relative flex-1">
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowResults(true);
                setHighlight(0);
              }}
              onFocus={() => setShowResults(true)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHighlight((h) => Math.min(h + 1, results.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlight((h) => Math.max(0, h - 1));
                } else if (e.key === "Enter" && results[highlight]) {
                  e.preventDefault();
                  chooseMedicine(results[highlight]);
                } else if (e.key === "Escape") {
                  setShowResults(false);
                }
              }}
              placeholder="Type medicine name, brand, salt or batch no"
              className="h-[46px] w-full rounded-lg border border-[#d8dde3] bg-white pl-4 pr-10 text-[15px] outline-none transition placeholder:text-gray-400 focus:border-[#0f7a31] focus:ring-2 focus:ring-[#0f7a31]/12"
            />
            {query && (
              <button
                onClick={clearSelection}
                aria-label="Clear"
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-gray-700"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowResults(true)}
            className="flex h-[46px] cursor-pointer items-center gap-2 rounded-lg bg-[#0a6127] px-5 text-[14px] font-semibold text-white transition hover:bg-[#0d7530]"
          >
            <Search className="h-4 w-4" /> Search
          </button>

          {showResults && results.length > 0 && (
            <div className="absolute left-0 right-0 top-[52px] z-30 max-h-[340px] overflow-y-auto rounded-xl border border-[#e5e7eb] bg-white py-1.5 shadow-xl">
              {results.map((m, i) => {
                const b = m.active_batch;
                return (
                  <button
                    key={m.id}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => chooseMedicine(m)}
                    className={`flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-left transition ${
                      i === highlight ? "bg-[#f2f8f4]" : "hover:bg-gray-50"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-semibold text-gray-900">
                        {m.generic_name}
                        <span className="ml-2 text-[12px] font-medium text-gray-500">
                          {m.brand_name} · {m.manufacturer}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-[11.5px] text-gray-500">
                        Batch {b?.batch_no || "—"} · EXP {monthShort(b?.exp_date || "")} · Box{" "}
                        {b?.box || "—"}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-[13px] font-bold text-[#0a6127]">
                        {m.total_stock} {b ? unitNoun(b.purchase_unit_type, b.pack_size) : ""}
                      </span>
                      <ScheduleBadge schedule={m.schedule} />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ---------------------- selected medicine card ------------------- */}
        {selected && batch ? (
          <Card className="p-4">
            {/* Header — name, company, batch, EXP DT, category (no image) */}
            <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg bg-[#fafbfc] p-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-bold leading-tight">
                  <span className="text-[#0a6127]">{selected.generic_name.toUpperCase()}</span>{" "}
                  <span className="text-gray-800">{batch.purchase_unit_type === "Bottle" ? "BOTTLE" : batch.purchase_unit_type === "Piece" ? "PIECE" : "TABLET"}</span>
                </p>
                <p className="mt-1.5 text-[12.5px] text-gray-600">Salt: {selected.salt}</p>
                <p className="text-[12.5px] text-gray-600">
                  Company: {selected.manufacturer} · Brand: {selected.brand_name}
                </p>
                <p className="text-[12.5px] text-gray-600">
                  Batch: <span className="font-semibold text-gray-800">{batch.batch_no}</span> · EXP
                  DT: <span className="font-semibold text-gray-800">{monthShort(batch.exp_date)}</span>{" "}
                  · MFG DT: {monthShort(batch.mfg_date)}
                </p>
                <p className="text-[12.5px] text-gray-600">HSN: {selected.hsn_code}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-[#e3e7ea] bg-white px-2 py-1 text-[11.5px] font-semibold">
                    Category: <ScheduleBadge schedule={selected.schedule} />
                  </span>
                  <Pill tone="blue">Box {batch.box || "—"}</Pill>
                  <Pill tone="gray">GST {batch.gst_percent}%</Pill>
                </div>
              </div>

              <div className="shrink-0 text-center">
                <p className="text-[11.5px] text-gray-500">Available Stock</p>
                <p className="text-[30px] font-extrabold leading-tight text-[#0a6127]">
                  {batch.stock_qty}
                </p>
                <p className="text-[13px] font-semibold text-gray-700">{unitWord}</p>
              </div>
            </div>

            {/* Batch picker when the medicine has more than one live batch */}
            {selected.batches.filter((b) => b.stock_qty > 0).length > 1 && (
              <div className="mt-3">
                <label className="field-label">Batch</label>
                <Select value={batch.id} onChange={(e) => setBatchId(e.target.value)}>
                  {selected.batches
                    .filter((b) => b.stock_qty > 0)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.batch_no} · EXP {monthShort(b.exp_date)} · Box {b.box} · {b.stock_qty} left
                      </option>
                    ))}
                </Select>
              </div>
            )}

            {/* Quantity / Per unit price / Amount */}
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
              {/* Quantity */}
              <div className="rounded-lg border border-[#e8ebee] p-3 sm:col-span-2">
                <p className="mb-2 text-[12.5px] font-medium text-gray-700">Quantity</p>
                <div className="flex items-center overflow-hidden rounded-lg border border-[#dfe3e7]">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="flex h-10 w-10 cursor-pointer items-center justify-center text-gray-600 transition hover:bg-gray-50"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="number"
                    value={qty}
                    onChange={(e) => setQty(Math.max(0, Number(e.target.value) || 0))}
                    className="h-10 w-full border-x border-[#dfe3e7] text-center text-[18px] font-bold text-gray-900 outline-none"
                  />
                  <button
                    onClick={() => setQty((q) => q + 1)}
                    className="flex h-10 w-10 cursor-pointer items-center justify-center bg-[#0f7a31] text-white transition hover:bg-[#0d7530]"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <p className="mb-1.5 mt-2.5 text-[11.5px] text-gray-500">Quick Add</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_ADD.map((n) => (
                    <button
                      key={n}
                      onClick={() => setQty(n)}
                      className={`min-w-[34px] cursor-pointer rounded-md border px-2 py-1 text-[12px] font-semibold transition ${
                        qty === n
                          ? "border-[#0f7a31] bg-[#e8f5ec] text-[#0a6127]"
                          : "border-[#dfe3e7] text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Per unit price */}
              <div className="rounded-lg border border-[#e8ebee] p-3">
                <p className="mb-2 text-[12.5px] font-medium text-gray-700">Per unit price (₹)</p>
                {editingPrice ? (
                  <input
                    type="number"
                    step="0.01"
                    autoFocus
                    value={perUnit}
                    onChange={(e) => setPriceOverride(Number(e.target.value) || 0)}
                    onBlur={() => setEditingPrice(false)}
                    onKeyDown={(e) => e.key === "Enter" && setEditingPrice(false)}
                    className="w-full rounded-md border border-[#0f7a31] px-2 py-1 text-[26px] font-extrabold text-[#0a6127] outline-none"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-[28px] font-extrabold leading-none text-[#0a6127]">
                      {amount(perUnit)}
                    </span>
                    <button
                      onClick={() => setEditingPrice(true)}
                      aria-label="Edit price"
                      className="cursor-pointer text-gray-400 transition hover:text-[#0a6127]"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <p className="mt-2 text-[11.5px] text-gray-500">
                  Selling price ₹{amount(sellingPack)} / {batch.purchase_unit_type}
                </p>
                {priceOverride !== null && (
                  <button
                    onClick={() => setPriceOverride(null)}
                    className="mt-1 cursor-pointer text-[11px] font-semibold text-[#1f6feb] hover:underline"
                  >
                    Reset to ₹{amount(perUnitBase)}
                  </button>
                )}
              </div>

              {/* Amount */}
              <div className="rounded-lg border border-[#e8ebee] p-3">
                <p className="mb-2 text-[12.5px] font-medium text-gray-700">Amount (₹)</p>
                <p className="text-[28px] font-extrabold leading-none text-[#0a6127]">
                  {amount(lineAmount)}
                </p>
                <p className="mt-2 text-[11.5px] text-gray-500">
                  {qty} × ₹{amount(perUnit)}
                </p>
              </div>
            </div>

            {/* Summary strip + add to bill */}
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg bg-[#f2f8f4] px-4 py-3">
              <div>
                <p className="text-[11px] text-gray-500">Purchase Unit</p>
                <p className="text-[13px] font-bold text-gray-900">
                  {batch.purchase_unit_type} of {batch.pack_size}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500">Selling price (₹)</p>
                <p className="text-[13px] font-bold text-gray-900">
                  {amount(sellingPack)} / {batch.purchase_unit_type}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500">You are selling</p>
                <p className="text-[13px] font-bold text-gray-900">
                  {qty} {unitWord}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500">Stock After Sale</p>
                <p className="text-[13px] font-bold text-gray-900">
                  {stockAfter} {unitWord}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500">MRP (₹) per unit</p>
                <p className="text-[13px] font-bold text-gray-900">{amount(mrpPerUnit)}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500">Discount</p>
                <p className="text-[13px] font-bold text-[#0a6127]">
                  {amount(round2(unitDiscount * qty))} ({unitDiscountPct.toFixed(0)}%)
                </p>
              </div>
              <button
                onClick={addToBill}
                className="ml-auto flex cursor-pointer items-center gap-2 rounded-lg bg-[#0a6127] px-5 py-3 text-[13.5px] font-bold text-white transition hover:bg-[#0d7530]"
              >
                <Plus className="h-4 w-4" /> ADD TO BILL (F5)
              </button>
            </div>
          </Card>
        ) : (
          <Card className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
            <PackageOpen className="h-9 w-9 text-gray-300" />
            <p className="text-sm font-semibold text-gray-700">Search a medicine to start billing</p>
            <p className="max-w-xs text-[12.5px] text-gray-500">
              Search by medicine name, brand, salt or batch number. Press F2 from anywhere to jump to
              the search bar.
            </p>
          </Card>
        )}
      </section>

      {/* ============================ MIDDLE: current bill ================= */}
      <section className="xl:col-span-4">
        <Card className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-[#eef1f3] px-4 py-3.5">
            <h3 className="text-[14px] font-bold uppercase tracking-wide text-gray-900">
              Current Bill
            </h3>
            <p className="text-[12px] font-semibold text-gray-600">
              Bill No: <span className="text-gray-900">Auto-Generated</span>
            </p>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full min-w-[360px]">
              <thead>
                <tr className="bg-[#fafbfc] text-gray-600">
                  <th className="px-1.5 py-2.5 text-left text-[11px] font-semibold">#</th>
                  <th className="px-1.5 py-2.5 text-left text-[11px] font-semibold">Product</th>
                  <th className="px-1.5 py-2.5 text-center text-[11px] font-semibold">Box</th>
                  <th className="px-1.5 py-2.5 text-center text-[11px] font-semibold">Quantity</th>
                  <th className="px-1.5 py-2.5 text-right text-[11px] font-semibold leading-tight">
                    Per unit
                    <br />
                    price
                  </th>
                  <th className="px-1.5 py-2.5 text-right text-[11px] font-semibold leading-tight">
                    Selling
                    <br />
                    price (₹)
                  </th>
                  <th className="px-1.5 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f3f5]">
                {lines.map((line, index) => (
                  <tr key={line.key} className="align-middle">
                    <td className="px-1.5 py-3 text-[12px] text-gray-500">{index + 1}</td>
                    <td className="px-1.5 py-3">
                      <p className="text-[12.5px] font-semibold leading-tight text-gray-900">
                        {line.generic_name}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {line.brand_name} · {unitNoun(line.purchase_unit_type, line.pack_size)}
                      </p>
                    </td>
                    <td className="px-1.5 py-3 text-center">
                      <span className="inline-flex min-w-[26px] justify-center rounded-md bg-[#eaf1fe] px-2 py-0.5 text-[11.5px] font-bold text-[#1f6feb]">
                        {line.box || "-"}
                      </span>
                    </td>
                    <td className="px-1.5 py-3">
                      <input
                        type="number"
                        value={line.qty}
                        onChange={(e) => changeLineQty(line.key, Number(e.target.value) || 1)}
                        className="mx-auto block h-7 w-[42px] rounded-md border border-[#e3e7ea] text-center text-[12.5px] font-bold outline-none transition focus:border-[#0f7a31]"
                      />
                    </td>
                    <td className="px-1.5 py-3 text-right text-[12.5px] font-semibold text-gray-800">
                      {amount(line.per_unit_price)}
                    </td>
                    <td className="px-1.5 py-3 text-right text-[12.5px] font-bold text-gray-900">
                      {amount(round2(line.per_unit_price * line.qty))}
                    </td>
                    <td className="px-1.5 py-3 text-right">
                      <button
                        onClick={() => removeLine(line.key)}
                        aria-label="Remove"
                        className="cursor-pointer text-red-500 transition hover:text-red-700"
                      >
                        <Trash2 className="h-[15px] w-[15px]" />
                      </button>
                    </td>
                  </tr>
                ))}
                {!lines.length && (
                  <tr>
                    <td colSpan={7} className="px-4 py-14 text-center text-[13px] text-gray-400">
                      No items yet — search a medicine and press ADD TO BILL (F5)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-[#eef1f3] p-3">
            <button
              onClick={clearBill}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#e3e7ea] py-2.5 text-[13px] font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              <Trash2 className="h-4 w-4 text-red-500" /> Clear Bill
            </button>
            <div className="relative">
              <button
                onClick={() => {
                  setDiscountDraft(extraDiscount ? String(extraDiscount) : "");
                  setShowDiscountBox((v) => !v);
                }}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#e3e7ea] py-2.5 text-[13px] font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                <Percent className="h-4 w-4 text-gray-500" /> Apply Discount
              </button>
              {showDiscountBox && (
                <div className="absolute bottom-[52px] right-0 z-30 w-[260px] rounded-xl border border-[#e5e7eb] bg-white p-3.5 shadow-xl">
                  <p className="mb-1.5 flex items-start gap-1.5 text-[11.5px] leading-snug text-gray-500">
                    <Info className="mt-[1px] h-3.5 w-3.5 shrink-0 text-[#1f6feb]" />
                    MRP-to-selling discount of {money(totals.discount)} is already applied
                    automatically. Add an extra discount below if needed.
                  </p>
                  <input
                    type="number"
                    autoFocus
                    value={discountDraft}
                    onChange={(e) => setDiscountDraft(e.target.value)}
                    placeholder="Extra discount ₹"
                    className="field"
                  />
                  <div className="mt-2.5 flex gap-2">
                    <Button
                      variant="ghost"
                      className="flex-1 py-2 text-[12.5px]"
                      onClick={() => {
                        setExtraDiscount(0);
                        setShowDiscountBox(false);
                      }}
                    >
                      Remove
                    </Button>
                    <Button
                      className="flex-1 py-2 text-[12.5px]"
                      onClick={() => {
                        setExtraDiscount(Math.max(0, Number(discountDraft) || 0));
                        setShowDiscountBox(false);
                      }}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </section>

      {/* ============================ RIGHT: bill summary ================== */}
      <section className="xl:col-span-3">
        <Card className="p-4">
          <h3 className="mb-3.5 text-[14px] font-bold uppercase tracking-wide text-[#0a6127]">
            Bill Summary
          </h3>

          <div className="space-y-2.5 text-[13px]">
            <Row label={`Sub Total (${totals.itemCount} Items)`} value={money(totals.subTotal)} />
            <Row
              label="Discount"
              value={money(round2(totals.discount + extraDiscount))}
              tone={totals.discount + extraDiscount > 0 ? "green" : undefined}
            />
            <Row label="Taxable Amount" value={money(totals.taxableAmount)} />
            <Row label={`GST (${totals.gstPercent || 0}%)`} value={money(totals.gstAmount)} />
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-[#eef1f3] pt-4">
            <span className="text-[16px] font-bold text-gray-900">TOTAL</span>
            <span className="text-[24px] font-extrabold text-[#0a6127]">{money(payable)}</span>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[12.5px] text-gray-700">Received Amount (₹)</span>
              <input
                type="number"
                value={received}
                onChange={(e) => setReceived(e.target.value)}
                placeholder="0.00"
                className="h-9 w-[96px] rounded-lg border border-[#d8dde3] px-2.5 text-right text-[13px] font-semibold outline-none focus:border-[#0f7a31]"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[12.5px] text-gray-700">Payment Method</span>
              <Select
                value={payment}
                onChange={(e) => setPayment(e.target.value as PaymentMethod)}
                className="h-9 w-[96px] py-0 text-[13px]"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12.5px] text-gray-700">Change (₹)</span>
              <span className="text-[18px] font-extrabold text-[#0a6127]">{money(change)}</span>
            </div>
          </div>

          <button
            onClick={startCheckout}
            className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#0a6127] py-3.5 text-[13.5px] font-bold uppercase tracking-wide text-white transition hover:bg-[#0d7530]"
          >
            <CreditCard className="h-[18px] w-[18px]" /> Pay &amp; Print (F12)
          </button>

          <div className="relative mt-3 grid grid-cols-3 gap-2">
            <button
              onClick={holdBill}
              className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-[#e3e7ea] px-1 py-2.5 text-[11.5px] font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              <PauseCircle className="h-4 w-4 text-[#0a6127]" />
              <span className="leading-tight">
                Hold Bill
                <br />
                (F6)
              </span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-[#e3e7ea] px-1 py-2.5 text-[11.5px] font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              <Printer className="h-4 w-4 text-gray-600" />
              <span className="leading-tight">
                Print Bill
                <br />
                (F11)
              </span>
            </button>
            <button
              onClick={() => setShowMore((v) => !v)}
              className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-[#e3e7ea] px-1 py-2.5 text-[11.5px] font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              <MoreHorizontal className="h-4 w-4 text-gray-600" />
              <span className="leading-tight">
                More
                <br />
                Options
              </span>
            </button>

            {showMore && (
              <div className="absolute bottom-[70px] right-0 z-30 w-[268px] rounded-xl border border-[#e5e7eb] bg-white p-3.5 shadow-xl">
                <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-gray-500">
                  Bill date
                </p>
                <input
                  type="date"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="field mb-3"
                />
                <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-gray-500">
                  Held bills ({held.length})
                </p>
                {held.length ? (
                  <div className="max-h-[150px] space-y-1.5 overflow-y-auto">
                    {held.map((h) => (
                      <button
                        key={h.id}
                        onClick={() => restoreHeld(h.id)}
                        className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-[#e8ebee] px-3 py-2 text-left text-[12px] transition hover:bg-gray-50"
                      >
                        <span className="font-semibold text-gray-800">
                          {h.lines.length} item{h.lines.length === 1 ? "" : "s"}
                        </span>
                        <span className="text-gray-500">
                          {new Date(h.at).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-[12px] text-gray-400">No held bills.</p>
                )}
                <button
                  onClick={() => setShowMore(false)}
                  className="mt-3 w-full cursor-pointer rounded-lg border border-[#e3e7ea] py-2 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            )}
          </div>

          <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-snug text-gray-500">
            <Info className="mt-[1px] h-3.5 w-3.5 shrink-0 text-gray-400" />
            GST is included in the MRP and selling price. The GST % only indicates the applicable tax
            rate — nothing is added on top.
          </p>
        </Card>
      </section>

      <CustomerModal
        key={customerOpen ? "open" : "closed"}
        open={customerOpen}
        onClose={() => setCustomerOpen(false)}
        onConfirm={finishBill}
      />

      {notice && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-[#0a6127] px-5 py-3 text-sm font-semibold text-white shadow-xl">
          {notice}
        </div>
      )}
    </div>
  );
};

const Row = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "green";
}) => (
  <div className="flex items-center justify-between">
    <span className="text-gray-600">{label}</span>
    <span className={`font-semibold ${tone === "green" ? "text-[#0a6127]" : "text-gray-900"}`}>
      {value}
    </span>
  </div>
);
