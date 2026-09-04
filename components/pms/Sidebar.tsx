"use client";

import React from "react";
import {
  LayoutGrid,
  ShoppingCart,
  Truck,
  PackageSearch,
  Users,
  BarChart3,
  BellRing,
  Settings as SettingsIcon,
  X,
} from "lucide-react";

export type ScreenKey =
  | "dashboard"
  | "billing"
  | "purchase"
  | "inventory"
  | "customers"
  | "reports"
  | "expiry"
  | "settings";

/** The eight screens the client asked for (slide 2) */
export const NAV_ITEMS: { key: ScreenKey; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
  { key: "dashboard", label: "Dashboard", icon: <LayoutGrid className="h-[19px] w-[19px]" />, adminOnly: true },
  { key: "billing", label: "Billing (POS)", icon: <ShoppingCart className="h-[19px] w-[19px]" /> },
  { key: "purchase", label: "Purchase", icon: <Truck className="h-[19px] w-[19px]" />, adminOnly: true },
  { key: "inventory", label: "Inventory", icon: <PackageSearch className="h-[19px] w-[19px]" /> },
  { key: "customers", label: "Customers", icon: <Users className="h-[19px] w-[19px]" /> },
  { key: "reports", label: "Reports", icon: <BarChart3 className="h-[19px] w-[19px]" /> },
  { key: "expiry", label: "Expiry Alert", icon: <BellRing className="h-[19px] w-[19px]" /> },
  { key: "settings", label: "Settings", icon: <SettingsIcon className="h-[19px] w-[19px]" />, adminOnly: true },
];

export const Sidebar = ({
  active,
  onSelect,
  role,
  open,
  onClose,
  expiryCount,
}: {
  active: ScreenKey;
  onSelect: (key: ScreenKey) => void;
  role: "admin" | "staff";
  open: boolean;
  onClose: () => void;
  expiryCount: number;
}) => {
  const items = NAV_ITEMS.filter((item) => role === "admin" || !item.adminOnly);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[248px] shrink-0 flex-col bg-[#02222d] transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo card */}
        <div className="relative p-3">
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="absolute right-4 top-4 z-10 cursor-pointer rounded-md p-1 text-gray-500 hover:bg-gray-100 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpeg" alt="Makkal Marundhagam" className="h-11 w-11 shrink-0 object-contain" />
            <div className="min-w-0 leading-none">
              <p className="text-[15px] font-extrabold leading-[1.1] tracking-tight text-[#0a6127]">
                MAKKAL
                <br />
                MARUNDHAGAM
              </p>
              <p className="mt-1 text-[7.5px] font-bold uppercase tracking-[0.12em] text-gray-500">
                Pharmacy Management System
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4 pt-1">
          {items.map((item) => {
            const isActive = active === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onSelect(item.key)}
                className={`mb-0.5 flex w-full cursor-pointer items-center gap-3 rounded-lg px-3.5 py-3 text-left text-[14px] font-medium transition ${
                  isActive
                    ? "bg-[#0f7a31] text-white shadow-sm"
                    : "text-white/80 hover:bg-white/[0.07] hover:text-white"
                }`}
              >
                <span className={isActive ? "text-white" : "text-white/70"}>{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.key === "expiry" && expiryCount > 0 && (
                  <span className="rounded-full bg-[#dc2626] px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {expiryCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="flex items-center gap-2.5 border-t border-white/10 px-5 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpeg" alt="" className="h-7 w-7 object-contain opacity-90" />
          <div className="leading-tight">
            <p className="text-[11.5px] font-semibold text-white/90">Makkal Marundhagam</p>
            <p className="text-[10.5px] text-white/45">v1.0.0</p>
          </div>
        </div>
      </aside>
    </>
  );
};
