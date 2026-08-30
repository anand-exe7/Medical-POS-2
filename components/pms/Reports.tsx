"use client";

import React, { useMemo, useState } from "react";
import { Download, FileSpreadsheet, Search, Trash2, Eye, Printer } from "lucide-react";
import type { Bill } from "@/lib/types";
import { amount, dateSlash, money, monthShort, todayIso } from "@/lib/format";
import { deleteBill, listBatchRows } from "@/lib/store";
import { BILL_SUMMARY_SHEET, INVENTORY_SHEET, SALES_SHEET } from "./exports";
import { downloadCsv, downloadExcel } from "@/lib/xlsx";
import { Button, Card, Field, Modal, PageTitle, Select, StatTile, TextInput } from "./ui";
import { round2 } from "@/lib/calc";

type Period = "TODAY" | "WEEK" | "MONTH" | "YEAR" | "ALL" | "CUSTOM";

const startOf = (period: Period, from: string, to: string): [string, string] => {
  const now = new Date();
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  switch (period) {
    case "TODAY":
      return [iso(now), iso(now)];
    case "WEEK": {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      return [iso(start), iso(now)];
    }
    case "MONTH": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return [iso(start), iso(now)];
    }
    case "YEAR": {
      const start = new Date(now.getFullYear(), 0, 1);
      return [iso(start), iso(now)];
    }
    case "CUSTOM":
      return [from, to];
    default:
      return ["0000-01-01", "9999-12-31"];
  }
};

export const Reports = ({
  bills,
  onChanged,
}: {
  bills: Bill[];
  onChanged: (message?: string) => void;
}) => {
  const [period, setPeriod] = useState<Period>("MONTH");
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(todayIso());
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<Bill | null>(null);

  const [start, end] = startOf(period, from, to);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bills.filter((bill) => {
      if (bill.bill_date < start || bill.bill_date > end) return false;
      if (!q) return true;
      return (
        bill.id.toLowerCase().includes(q) ||
        bill.customer_name.toLowerCase().includes(q) ||
        bill.customer_phone.includes(q) ||
        bill.items.some((i) => i.generic_name.toLowerCase().includes(q))
      );
    });
  }, [bills, start, end, search]);

  const totals = useMemo(() => {
    let revenue = 0;
    let discount = 0;
    let gst = 0;
    let units = 0;
    for (const bill of filtered) {
      revenue += bill.grand_total;
      discount += bill.discount;
      gst += bill.gst_amount;
      units += bill.items.reduce((sum, i) => sum + i.qty, 0);
    }
    return {
      revenue: round2(revenue),
      discount: round2(discount),
      gst: round2(gst),
      units,
      bills: filtered.length,
    };
  }, [filtered]);

  const stamp = new Date().toISOString().slice(0, 10);

  const exportSales = (format: "xlsx" | "csv") => {
    const sheet = SALES_SHEET(filtered);
    if (format === "csv") downloadCsv(sheet, `sale-report-${stamp}.csv`);
    else downloadExcel([sheet, BILL_SUMMARY_SHEET(filtered)], `sale-report-${stamp}.xlsx`);
  };

  const exportInventory = (format: "xlsx" | "csv") => {
    const sheet = INVENTORY_SHEET(listBatchRows());
    if (format === "csv") downloadCsv(sheet, `inventory-${stamp}.csv`);
    else downloadExcel([sheet], `inventory-${stamp}.xlsx`);
  };

  return (
    <div>
      <PageTitle title="Reports" subtitle="Sale report and inventory export" />

      {/* Export cards */}
      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f5ec] text-[#0a6127]">
              <FileSpreadsheet className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-[15px] font-bold text-gray-900">Inventory Excel Export</h3>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-gray-500">
                Sno · Generic name · Brand name · Category · Box · HSN Code · Batch no · MFG DT · EXP
                DT · Purchase Rate (₹) · MRP (₹) · Selling price (₹) · Quantity
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button onClick={() => exportInventory("xlsx")} className="py-2 text-[13px]">
                  <Download className="h-4 w-4" /> Download Excel
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => exportInventory("csv")}
                  className="py-2 text-[13px]"
                >
                  CSV
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf1fe] text-[#1f6feb]">
              <FileSpreadsheet className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-[15px] font-bold text-gray-900">Sale Report Excel Export</h3>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-gray-500">
                Sno · Sale date · Customer name · Customer mobile no · Bill no · Generic name · Brand
                name · Category · HSN Code · Batch no · MFG DT · EXP DT · Quantity
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="blue"
                  onClick={() => exportSales("xlsx")}
                  className="py-2 text-[13px]"
                >
                  <Download className="h-4 w-4" /> Download Excel
                </Button>
                <Button variant="ghost" onClick={() => exportSales("csv")} className="py-2 text-[13px]">
                  CSV
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="Period" className="w-[170px]">
          <Select value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
            <option value="TODAY">Today</option>
            <option value="WEEK">Last 7 days</option>
            <option value="MONTH">This month</option>
            <option value="YEAR">This year</option>
            <option value="ALL">All time</option>
            <option value="CUSTOM">Custom range</option>
          </Select>
        </Field>
        {period === "CUSTOM" && (
          <>
            <Field label="From" className="w-[160px]">
              <TextInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="To" className="w-[160px]">
              <TextInput type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
          </>
        )}
        <Field label="Search" className="min-w-[240px] flex-1">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <TextInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Bill no, customer, phone or medicine"
              className="pl-10"
            />
          </div>
        </Field>
      </div>

      {/* Totals */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatTile icon={<span className="text-[15px] font-bold">₹</span>} label="Revenue" value={money(totals.revenue)} tone="green" />
        <StatTile icon={<FileSpreadsheet className="h-[18px] w-[18px]" />} label="Bills" value={totals.bills} tone="blue" />
        <StatTile icon={<span className="text-[15px] font-bold">#</span>} label="Units Sold" value={totals.units} tone="gray" />
        <StatTile icon={<span className="text-[15px] font-bold">%</span>} label="Discount Given" value={money(totals.discount)} tone="amber" />
        <StatTile icon={<span className="text-[13px] font-bold">GST</span>} label="GST (included)" value={money(totals.gst)} tone="gray" />
      </div>

      {/* Bills table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-[#f4f6f8] text-gray-700">
                <th className="th">S.No</th>
                <th className="th">Bill No</th>
                <th className="th">Sale Date</th>
                <th className="th">Customer</th>
                <th className="th">Mobile</th>
                <th className="th text-center">Items</th>
                <th className="th text-right">Discount</th>
                <th className="th text-right">GST</th>
                <th className="th text-right">Total</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f3f5]">
              {filtered.map((bill, index) => (
                <tr key={bill.id} className="transition hover:bg-[#fafbfc]">
                  <td className="td text-gray-500">{index + 1}</td>
                  <td className="td font-semibold text-gray-900">{bill.id}</td>
                  <td className="td">{dateSlash(bill.bill_date)}</td>
                  <td className="td">{bill.customer_name || "Walk-in Customer"}</td>
                  <td className="td">{bill.customer_phone || "—"}</td>
                  <td className="td text-center">{bill.items.length}</td>
                  <td className="td text-right text-[#0a6127]">{amount(bill.discount)}</td>
                  <td className="td text-right">{amount(bill.gst_amount)}</td>
                  <td className="td text-right font-bold">{amount(bill.grand_total)}</td>
                  <td className="td">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setViewing(bill)}
                        aria-label="View bill"
                        className="cursor-pointer rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-[#0a6127]"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => window.open(`/invoice/${bill.id}`, "_blank")}
                        aria-label="Print bill"
                        className="cursor-pointer rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-[#0a6127]"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete bill ${bill.id}? Stock will be returned.`)) {
                            deleteBill(bill.id);
                            onChanged("Bill deleted and stock returned.");
                          }
                        }}
                        aria-label="Delete bill"
                        className="cursor-pointer rounded-md p-1.5 text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-[13.5px] text-gray-400">
                    No bills in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Bill detail */}
      <Modal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={`Bill ${viewing?.id || ""}`}
        subtitle={viewing ? `${dateSlash(viewing.bill_date)} · ${viewing.payment_method}` : ""}
        width="max-w-4xl"
        footer={
          viewing && (
            <Button onClick={() => window.open(`/invoice/${viewing.id}`, "_blank")}>
              <Printer className="h-4 w-4" /> Open invoice
            </Button>
          )
        }
      >
        {viewing && (
          <>
            <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 rounded-xl bg-[#fafbfc] px-4 py-3 text-[13px]">
              <span>
                <b>Customer:</b> {viewing.customer_name || "Walk-in Customer"}
              </span>
              <span>
                <b>Phone:</b> {viewing.customer_phone || "—"}
              </span>
              {viewing.doctor_name && (
                <span>
                  <b>Doctor:</b> {viewing.doctor_name}
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="bg-[#f4f6f8] text-gray-700">
                    <th className="th">Product</th>
                    <th className="th">Box</th>
                    <th className="th">Batch</th>
                    <th className="th">EXP DT</th>
                    <th className="th text-center">Quantity</th>
                    <th className="th text-right">Per unit price</th>
                    <th className="th text-right">Selling price (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f3f5]">
                  {viewing.items.map((item) => (
                    <tr key={item.id}>
                      <td className="td">
                        {item.generic_name}
                        <span className="ml-1.5 text-[11.5px] text-gray-500">{item.brand_name}</span>
                      </td>
                      <td className="td">{item.box || "-"}</td>
                      <td className="td">{item.batch_no}</td>
                      <td className="td">{monthShort(item.exp_date)}</td>
                      <td className="td text-center">{item.qty}</td>
                      <td className="td text-right">{amount(item.per_unit_price)}</td>
                      <td className="td text-right font-semibold">{amount(item.line_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 ml-auto w-full max-w-[320px] space-y-2 text-[13px]">
              <SummaryRow label="Sub Total" value={money(viewing.sub_total)} />
              <SummaryRow label="Discount" value={money(viewing.discount)} />
              <SummaryRow label="Taxable Amount" value={money(viewing.taxable_amount)} />
              <SummaryRow label={`GST (${viewing.gst_percent}%)`} value={money(viewing.gst_amount)} />
              <div className="flex items-center justify-between border-t border-[#eef1f3] pt-2.5">
                <span className="text-[15px] font-bold">TOTAL</span>
                <span className="text-[19px] font-extrabold text-[#0a6127]">
                  {money(viewing.grand_total)}
                </span>
              </div>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between">
    <span className="text-gray-600">{label}</span>
    <span className="font-semibold text-gray-900">{value}</span>
  </div>
);
