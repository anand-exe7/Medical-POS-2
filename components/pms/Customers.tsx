"use client";

import React, { useMemo, useState } from "react";
import { Search, Download, Plus, Pencil, Trash2, Receipt, Phone, MapPin } from "lucide-react";
import type { Bill, Customer } from "@/lib/types";
import { amount, dateSlash, money } from "@/lib/format";
import { deleteCustomer, saveCustomer } from "@/lib/store";
import { CUSTOMERS_SHEET } from "./exports";
import { downloadExcel } from "@/lib/xlsx";
import { Button, Card, Field, Modal, PageTitle, Pill, TextInput } from "./ui";

export const Customers = ({
  customers,
  bills,
  onChanged,
  role,
}: {
  customers: Customer[];
  bills: Bill[];
  onChanged: (message?: string) => void;
  role: "admin" | "staff";
}) => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [adding, setAdding] = useState(false);

  const enriched = useMemo(() => {
    return customers.map((customer) => {
      const own = bills.filter(
        (b) => b.customer_id === customer.id || (customer.phone && b.customer_phone === customer.phone),
      );
      return {
        customer,
        bills: own,
        spend: own.reduce((sum, b) => sum + b.grand_total, 0),
        last: own[0]?.bill_date || "",
      };
    });
  }, [customers, bills]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return enriched;
    return enriched.filter(
      ({ customer }) =>
        customer.name.toLowerCase().includes(q) ||
        customer.phone.includes(q) ||
        customer.id.toLowerCase().includes(q),
    );
  }, [enriched, search]);

  const selectedHistory = useMemo(() => {
    if (!selected) return [];
    return bills.filter(
      (b) => b.customer_id === selected.id || (selected.phone && b.customer_phone === selected.phone),
    );
  }, [selected, bills]);

  const handleExport = () => {
    downloadExcel(
      [
        CUSTOMERS_SHEET(
          enriched.map(({ customer, bills: own, spend, last }) => ({
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            address: customer.address,
            doctor: customer.doctor_name,
            bills: own.length,
            spend: Number(spend.toFixed(2)),
            last,
          })),
        ),
      ],
      `customers-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };

  return (
    <div>
      <PageTitle
        title="Customers"
        subtitle="Name, phone and purchase history"
        right={
          <>
            <Button variant="ghost" onClick={handleExport}>
              <Download className="h-4 w-4" /> Export
            </Button>
            {role === "admin" && (
              <Button variant="blue" onClick={() => setAdding(true)}>
                <Plus className="h-4 w-4" /> Add Customer
              </Button>
            )}
          </>
        }
      />

      <div className="mb-4 relative max-w-[420px]">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer ID, name or phone"
          className="h-11 w-full rounded-lg border border-[#e2e6ea] bg-white pl-10 pr-3 text-[13.5px] outline-none transition placeholder:text-gray-400 focus:border-[#0f7a31]"
        />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-[#f4f6f8] text-gray-700">
                <th className="th">S.No</th>
                <th className="th">Customer ID</th>
                <th className="th">Name</th>
                <th className="th">Phone</th>
                <th className="th">Address</th>
                <th className="th">Doctor</th>
                <th className="th text-center">Bills</th>
                <th className="th text-right">Total Purchase</th>
                <th className="th">Last Purchase</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f3f5]">
              {filtered.map(({ customer, bills: own, spend, last }, index) => (
                <tr key={customer.id} className="transition hover:bg-[#fafbfc]">
                  <td className="td text-gray-500">{index + 1}</td>
                  <td className="td font-semibold text-[#1f6feb]">{customer.id}</td>
                  <td className="td font-medium text-gray-900">
                    {customer.name || "—"}
                    {customer.quick_bill && (
                      <span className="ml-2">
                        <Pill tone="green">QUICK BILL</Pill>
                      </span>
                    )}
                  </td>
                  <td className="td">{customer.phone || "—"}</td>
                  <td className="td max-w-[220px] truncate">{customer.address || "—"}</td>
                  <td className="td">{customer.doctor_name || "—"}</td>
                  <td className="td text-center">{own.length}</td>
                  <td className="td text-right font-semibold">{amount(spend)}</td>
                  <td className="td">{last ? dateSlash(last) : "—"}</td>
                  <td className="td">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelected(customer)}
                        aria-label="Purchase history"
                        className="cursor-pointer rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-[#0a6127]"
                      >
                        <Receipt className="h-4 w-4" />
                      </button>
                      {role === "admin" && (
                        <>
                          <button
                            onClick={() => setEditing(customer)}
                            aria-label="Edit"
                            className="cursor-pointer rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-[#0a6127]"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete customer ${customer.name || customer.id}?`)) {
                                deleteCustomer(customer.id);
                                onChanged("Customer deleted.");
                              }
                            }}
                            aria-label="Delete"
                            className="cursor-pointer rounded-md p-1.5 text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-[13.5px] text-gray-400">
                    No customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Purchase history */}
      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.name || "Customer"}
        subtitle={`${selected?.id || ""} · Purchase history`}
        width="max-w-4xl"
      >
        {selected && (
          <>
            <div className="mb-4 flex flex-wrap gap-x-6 gap-y-2 rounded-xl bg-[#fafbfc] px-4 py-3 text-[13px] text-gray-700">
              <span className="flex items-center gap-1.5">
                <Phone className="h-4 w-4 text-gray-400" /> {selected.phone || "—"}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-gray-400" /> {selected.address || "—"}
              </span>
              <span className="ml-auto font-semibold text-[#0a6127]">
                {selectedHistory.length} bills ·{" "}
                {money(selectedHistory.reduce((sum, b) => sum + b.grand_total, 0))}
              </span>
            </div>

            <div className="max-h-[430px] overflow-y-auto">
              {selectedHistory.map((bill) => (
                <div key={bill.id} className="mb-3 rounded-xl border border-[#e5e7eb]">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f1f3f5] px-4 py-2.5">
                    <span className="text-[13px] font-bold text-gray-900">{bill.id}</span>
                    <span className="text-[12.5px] text-gray-500">{dateSlash(bill.bill_date)}</span>
                    <span className="text-[13px] font-bold text-[#0a6127]">
                      {money(bill.grand_total)}
                    </span>
                  </div>
                  <table className="w-full">
                    <tbody className="divide-y divide-[#f4f6f8]">
                      {bill.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2 text-[12.5px] text-gray-800">
                            {item.generic_name}
                            <span className="ml-1.5 text-[11px] text-gray-500">
                              {item.brand_name} · Box {item.box || "-"}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right text-[12.5px] text-gray-600">
                            {item.qty} × {amount(item.per_unit_price)}
                          </td>
                          <td className="px-4 py-2 text-right text-[12.5px] font-semibold text-gray-900">
                            {amount(item.line_amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
              {!selectedHistory.length && (
                <p className="py-14 text-center text-[13.5px] text-gray-400">
                  No purchases recorded for this customer yet.
                </p>
              )}
            </div>
          </>
        )}
      </Modal>

      {/* Add / edit */}
      <CustomerFormModal
        key={editing?.id || (adding ? "new" : "closed")}
        open={adding || Boolean(editing)}
        customer={editing}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
        onSaved={(message) => {
          setAdding(false);
          setEditing(null);
          onChanged(message);
        }}
      />
    </div>
  );
};

const CustomerFormModal = ({
  open,
  customer,
  onClose,
  onSaved,
}: {
  open: boolean;
  customer: Customer | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) => {
  // Keyed at the call site, so the draft is seeded once on mount.
  const [draft, setDraft] = useState({
    name: customer?.name || "",
    phone: customer?.phone || "",
    address: customer?.address || "",
    doctor_name: customer?.doctor_name || "",
    quick_bill: customer?.quick_bill || false,
  });

  if (!open) return null;

  return (
    <Modal
      open
      onClose={onClose}
      title={customer ? "Edit Customer" : "Add Customer"}
      subtitle={customer ? customer.id : "A customer ID (PMBJ000001) is generated automatically"}
      width="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!draft.name.trim() && !draft.phone.trim()) return;
              saveCustomer({ id: customer?.id, ...draft });
              onSaved(customer ? "Customer updated." : "Customer added.");
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Customer Name">
          <TextInput
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Enter customer name"
          />
        </Field>
        <Field label="Phone Number">
          <TextInput
            value={draft.phone}
            inputMode="numeric"
            onChange={(e) =>
              setDraft({ ...draft, phone: e.target.value.replace(/[^\d]/g, "").slice(0, 10) })
            }
            placeholder="Enter mobile number"
          />
        </Field>
        <Field label="Address" className="sm:col-span-2">
          <TextInput
            value={draft.address}
            onChange={(e) => setDraft({ ...draft, address: e.target.value })}
            placeholder="Enter address"
          />
        </Field>
        <Field label="Doctor Name">
          <TextInput
            value={draft.doctor_name}
            onChange={(e) => setDraft({ ...draft, doctor_name: e.target.value })}
            placeholder="Enter doctor name"
          />
        </Field>
        <label className="flex cursor-pointer items-end gap-2.5 pb-2.5 text-[13.5px] font-medium text-gray-800">
          <input
            type="checkbox"
            checked={draft.quick_bill}
            onChange={(e) => setDraft({ ...draft, quick_bill: e.target.checked })}
            className="h-4 w-4 cursor-pointer accent-[#0a6127]"
          />
          Register for Quick Bill
        </label>
      </div>
    </Modal>
  );
};
