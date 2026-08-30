"use client";

import React, { startTransition, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { expiryState } from "@/lib/format";
import {
  batchRowsSnapshot,
  billsSnapshot,
  customersSnapshot,
  emptyBatchRows,
  emptyBills,
  emptyCustomers,
  emptyMedicines,
  emptySuppliers,
  medicinesSnapshot,
  subscribe,
  suppliersSnapshot,
} from "@/lib/store";
import { Sidebar, type ScreenKey } from "@/components/pms/Sidebar";
import { TopBar } from "@/components/pms/TopBar";
import { Login } from "@/components/pms/Login";
import { Dashboard } from "@/components/pms/Dashboard";
import { Billing } from "@/components/pms/Billing";
import { Purchase } from "@/components/pms/Purchase";
import { Inventory } from "@/components/pms/Inventory";
import { Customers } from "@/components/pms/Customers";
import { Reports } from "@/components/pms/Reports";
import { ExpiryAlert } from "@/components/pms/ExpiryAlert";
import { SettingsPanel } from "@/components/pms/SettingsPanel";
import { Toast } from "@/components/pms/ui";

const SESSION_KEY = "makkal_marundhagam_session";

export default function PharmacyManagementSystem() {
  const [role, setRole] = useState<"admin" | "staff" | null>(null);
  const [checking, setChecking] = useState(true);
  const [screen, setScreen] = useState<ScreenKey>("billing");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [billingSearch, setBillingSearch] = useState("");
  const [toast, setToast] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  /* --------------------------------- data --------------------------------
     The store publishes on every write, so every screen re-reads automatically
     — no manual refresh plumbing. Each snapshot keeps its reference until the
     store actually changes. */
  const medicines = useSyncExternalStore(subscribe, medicinesSnapshot, emptyMedicines);
  const batchRows = useSyncExternalStore(subscribe, batchRowsSnapshot, emptyBatchRows);
  const bills = useSyncExternalStore(subscribe, billsSnapshot, emptyBills);
  const customers = useSyncExternalStore(subscribe, customersSnapshot, emptyCustomers);
  const suppliers = useSyncExternalStore(subscribe, suppliersSnapshot, emptySuppliers);

  /** Screens call this after a change purely to surface a toast. */
  const notify = (message?: string) => {
    if (message) setToast(message);
  };

  /* ------------------------------- session -------------------------------
     sessionStorage only exists in the browser, so the saved role is picked up
     once the client has mounted. */
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.sessionStorage.getItem(SESSION_KEY);
    } catch {
      /* storage unavailable — fall through to the login screen */
    }
    startTransition(() => {
      if (saved === "admin" || saved === "staff") setRole(saved);
      setChecking(false);
    });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  /* ------------------------------ F2 shortcut ---------------------------- */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "F2") {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* --------------------------- expiry badge count ------------------------ */
  const expiryCount = useMemo(() => {
    let count = 0;
    for (const medicine of medicines) {
      for (const batch of medicine.batches) {
        const state = expiryState(batch.exp_date);
        if (state === "EXPIRED" || state === "SOON") count += 1;
      }
    }
    return count;
  }, [medicines]);

  const login = (nextRole: "admin" | "staff") => {
    setRole(nextRole);
    setScreen("billing");
    try {
      window.sessionStorage.setItem(SESSION_KEY, nextRole);
    } catch {
      /* ignore */
    }
  };

  const logout = () => {
    setRole(null);
    try {
      window.sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  };

  const goToBillingWith = (query: string) => {
    setScreen("billing");
    setBillingSearch(query);
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#02222d]">
        <p className="animate-pulse text-[12px] font-bold uppercase tracking-[0.2em] text-white/60">
          Loading…
        </p>
      </div>
    );
  }

  if (!role) return <Login onSuccess={login} />;

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f8fa]">
      <Sidebar
        active={screen}
        onSelect={(key) => {
          setScreen(key);
          setSidebarOpen(false);
        }}
        role={role}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        expiryCount={expiryCount}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar
          search={search}
          onSearch={setSearch}
          onSearchSubmit={() => {
            if (!search.trim()) return;
            goToBillingWith(search.trim());
            setSearch("");
          }}
          onMenu={() => setSidebarOpen(true)}
          role={role}
          onLogout={logout}
          onRefresh={() => notify("Data refreshed.")}
          searchRef={searchRef}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-5">
          {screen === "dashboard" && (
            <Dashboard
              medicines={medicines}
              bills={bills}
              customerCount={customers.length}
              onNavigate={setScreen}
            />
          )}

          {screen === "billing" && (
            <Billing
              medicines={medicines}
              query={billingSearch}
              onQueryChange={setBillingSearch}
              onDone={() => notify("Bill saved.")}
            />
          )}

          {screen === "purchase" && role === "admin" && (
            <Purchase
              medicines={medicines}
              suppliers={suppliers}
              onSaved={notify}
            />
          )}

          {screen === "inventory" && (
            <Inventory
              medicines={medicines}
              rows={batchRows}
              onChanged={notify}
              onAddStock={() => setScreen("purchase")}
              role={role}
            />
          )}

          {screen === "customers" && (
            <Customers customers={customers} bills={bills} onChanged={notify} role={role} />
          )}

          {screen === "reports" && role === "admin" && (
            <Reports bills={bills} onChanged={notify} />
          )}

          {screen === "expiry" && <ExpiryAlert rows={batchRows} />}

          {screen === "settings" && role === "admin" && (
            <SettingsPanel suppliers={suppliers} medicines={medicines} onChanged={notify} />
          )}
        </main>
      </div>

      {toast && <Toast message={toast} />}
    </div>
  );
}
