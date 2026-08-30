"use client";

import React, { useMemo, useState } from "react";
import { Save, Download, Upload, RotateCcw, Plus, Trash2, Pencil, Boxes } from "lucide-react";
import type { MedicineWithBatches, ShopSettings, Supplier } from "@/lib/types";
import {
  deleteSupplier,
  exportBackup,
  getSettings,
  importBackup,
  resetStore,
  saveSettings,
  saveSupplier,
} from "@/lib/store";
import { downloadBlob } from "@/lib/xlsx";
import { Button, Card, Field, Modal, PageTitle, TextInput } from "./ui";

export const SettingsPanel = ({
  suppliers,
  medicines,
  onChanged,
}: {
  suppliers: Supplier[];
  medicines: MedicineWithBatches[];
  onChanged: (message?: string) => void;
}) => {
  const [settings, setSettings] = useState<ShopSettings>(getSettings());
  const [supplierDraft, setSupplierDraft] = useState<Supplier | null>(null);
  const [addingSupplier, setAddingSupplier] = useState(false);

  const set = (patch: Partial<ShopSettings>) => setSettings({ ...settings, ...patch });

  /* Box mapping overview — where every product sits */
  const boxMap = useMemo(() => {
    const map = new Map<string, { medicine: string; brand: string; batch: string; qty: number }[]>();
    for (const medicine of medicines) {
      for (const batch of medicine.batches) {
        const key = batch.box || "Unassigned";
        const list = map.get(key) || [];
        list.push({
          medicine: medicine.generic_name,
          brand: medicine.brand_name,
          batch: batch.batch_no,
          qty: batch.stock_qty,
        });
        map.set(key, list);
      }
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [medicines]);

  const handleBackup = () => {
    downloadBlob(
      new Blob([exportBackup()], { type: "application/json" }),
      `makkal-marundhagam-backup-${new Date().toISOString().slice(0, 10)}.json`,
    );
  };

  const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importBackup(String(reader.result));
      onChanged(ok ? "Backup restored." : "That file is not a valid backup.");
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  return (
    <div>
      <PageTitle title="Settings" subtitle="Shop details, defaults, suppliers and backup" />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Shop details */}
        <Card className="p-5">
          <h3 className="mb-4 text-[15px] font-bold text-gray-900">Shop Details</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Shop name" className="sm:col-span-2">
              <TextInput value={settings.shop_name} onChange={(e) => set({ shop_name: e.target.value })} />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <TextInput value={settings.address} onChange={(e) => set({ address: e.target.value })} />
            </Field>
            <Field label="Phone">
              <TextInput value={settings.phone} onChange={(e) => set({ phone: e.target.value })} />
            </Field>
            <Field label="GSTIN">
              <TextInput value={settings.gstin} onChange={(e) => set({ gstin: e.target.value })} />
            </Field>
            <Field label="Drug Licence No" className="sm:col-span-2">
              <TextInput value={settings.dl_no} onChange={(e) => set({ dl_no: e.target.value })} />
            </Field>
          </div>

          <h3 className="mb-4 mt-6 text-[15px] font-bold text-gray-900">Defaults</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Default GST %" hint="GST is included in MRP and selling price">
              <TextInput
                type="number"
                value={settings.default_gst}
                onChange={(e) => set({ default_gst: Number(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Low stock threshold">
              <TextInput
                type="number"
                value={settings.low_stock_threshold}
                onChange={(e) => set({ low_stock_threshold: Number(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Expiry alert (months)">
              <TextInput
                type="number"
                value={settings.expiry_alert_months}
                onChange={(e) => set({ expiry_alert_months: Number(e.target.value) || 0 })}
              />
            </Field>
          </div>

          <div className="mt-5 flex justify-end">
            <Button
              onClick={() => {
                saveSettings(settings);
                onChanged("Settings saved.");
              }}
            >
              <Save className="h-4 w-4" /> Save settings
            </Button>
          </div>
        </Card>

        {/* Suppliers */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-gray-900">Suppliers</h3>
            <Button variant="ghost" className="py-2 text-[13px]" onClick={() => setAddingSupplier(true)}>
              <Plus className="h-4 w-4" /> Add supplier
            </Button>
          </div>
          <div className="divide-y divide-[#f1f3f5]">
            {suppliers.map((supplier) => (
              <div key={supplier.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-gray-900">{supplier.name}</p>
                  <p className="truncate text-[11.5px] text-gray-500">
                    {supplier.phone || "no phone"} · {supplier.gstin || "no GSTIN"}
                  </p>
                </div>
                <button
                  onClick={() => setSupplierDraft(supplier)}
                  aria-label="Edit supplier"
                  className="cursor-pointer rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-[#0a6127]"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete supplier ${supplier.name}?`)) {
                      deleteSupplier(supplier.id);
                      onChanged("Supplier deleted.");
                    }
                  }}
                  aria-label="Delete supplier"
                  className="cursor-pointer rounded-md p-1.5 text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {!suppliers.length && (
              <p className="py-10 text-center text-[13px] text-gray-400">No suppliers yet.</p>
            )}
          </div>

          <h3 className="mb-3 mt-6 text-[15px] font-bold text-gray-900">Backup &amp; Restore</h3>
          <div className="flex flex-wrap gap-2.5">
            <Button variant="ghost" onClick={handleBackup}>
              <Download className="h-4 w-4" /> Download backup
            </Button>
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#d8dde3] bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">
              <Upload className="h-4 w-4" /> Restore backup
              <input type="file" accept="application/json" onChange={handleRestore} className="hidden" />
            </label>
            <Button
              variant="danger"
              onClick={() => {
                if (
                  confirm(
                    "Reset all data back to the demo dataset? Every bill, medicine and customer will be replaced.",
                  )
                ) {
                  resetStore();
                  onChanged("Data reset to the starter dataset.");
                }
              }}
            >
              <RotateCcw className="h-4 w-4" /> Reset data
            </Button>
          </div>
        </Card>
      </div>

      {/* Box mapping */}
      <Card className="mt-4 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Boxes className="h-[18px] w-[18px] text-gray-500" />
          <h3 className="text-[15px] font-bold text-gray-900">Box Mapping</h3>
          <span className="text-[12.5px] text-gray-500">— where each product is located</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {boxMap.map(([box, items]) => (
            <div key={box} className="rounded-xl border border-[#e5e7eb] p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded-md bg-[#eaf1fe] px-2.5 py-1 text-[13px] font-bold text-[#1f6feb]">
                  {box}
                </span>
                <span className="text-[11.5px] text-gray-500">{items.length} batch(es)</span>
              </div>
              {items.map((item, index) => (
                <p key={index} className="truncate text-[12.5px] text-gray-700">
                  {item.medicine}{" "}
                  <span className="text-gray-400">
                    · {item.brand} · {item.qty}
                  </span>
                </p>
              ))}
            </div>
          ))}
          {!boxMap.length && (
            <p className="py-8 text-center text-[13px] text-gray-400">No box mapping recorded yet.</p>
          )}
        </div>
      </Card>

      <SupplierModal
        key={supplierDraft?.id || (addingSupplier ? "new" : "closed")}
        open={addingSupplier || Boolean(supplierDraft)}
        supplier={supplierDraft}
        onClose={() => {
          setAddingSupplier(false);
          setSupplierDraft(null);
        }}
        onSaved={() => {
          setAddingSupplier(false);
          setSupplierDraft(null);
          onChanged("Supplier saved.");
        }}
      />
    </div>
  );
};

const SupplierModal = ({
  open,
  supplier,
  onClose,
  onSaved,
}: {
  open: boolean;
  supplier: Supplier | null;
  onClose: () => void;
  onSaved: () => void;
}) => {
  // Keyed at the call site, so the draft is seeded once on mount.
  const [draft, setDraft] = useState({
    name: supplier?.name || "",
    phone: supplier?.phone || "",
    gstin: supplier?.gstin || "",
  });

  if (!open) return null;

  return (
    <Modal
      open
      onClose={onClose}
      title={supplier ? "Edit Supplier" : "Add Supplier"}
      width="max-w-lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!draft.name.trim()) return;
              saveSupplier({ id: supplier?.id, ...draft });
              onSaved();
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Supplier name">
          <TextInput
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Medicare Distributors"
          />
        </Field>
        <Field label="Phone">
          <TextInput
            value={draft.phone}
            onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
            placeholder="98420 11223"
          />
        </Field>
        <Field label="GSTIN">
          <TextInput
            value={draft.gstin}
            onChange={(e) => setDraft({ ...draft, gstin: e.target.value.toUpperCase() })}
            placeholder="33AACCM1234K1Z2"
          />
        </Field>
      </div>
    </Modal>
  );
};
