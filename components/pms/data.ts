"use client";

import useSWR, { mutate } from "swr";
import type { MedicineWithBatches, Batch, Customer, Supplier, Bill, ShopSettings, Medicine, BatchRow } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export const useMedicines = () => useSWR<MedicineWithBatches[]>("/api/medicines", fetcher);
export const useBatchRows = () => useSWR<BatchRow[]>("/api/batches", fetcher);
export const useCustomers = () => useSWR<Customer[]>("/api/customers", fetcher);
export const useSuppliers = () => useSWR<Supplier[]>("/api/suppliers", fetcher);
export const useBills = () => useSWR<Bill[]>("/api/bills", fetcher);
export const useSettings = () => useSWR<ShopSettings>("/api/settings", fetcher);

export const mutateAll = () => {
  mutate("/api/medicines");
  mutate("/api/batches");
  mutate("/api/customers");
  mutate("/api/suppliers");
  mutate("/api/bills");
  mutate("/api/settings");
};
