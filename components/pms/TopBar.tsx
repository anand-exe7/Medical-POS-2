"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Search, CalendarDays, User, ChevronDown, Menu, LogOut, RotateCw } from "lucide-react";
import { dateLong, timeLabel } from "@/lib/format";

/* A ticking clock is an external source of truth, so it is subscribed to
   rather than pushed into state from an effect. The snapshot is bucketed to
   30s so it stays stable between ticks. */
const TICK_MS = 30_000;
const subscribeClock = (onChange: () => void) => {
  const timer = setInterval(onChange, TICK_MS);
  return () => clearInterval(timer);
};
const clockSnapshot = () => Math.floor(Date.now() / TICK_MS);
const clockServerSnapshot = () => null;

export const TopBar = ({
  search,
  onSearch,
  onSearchSubmit,
  onMenu,
  role,
  onLogout,
  onRefresh,
  searchRef,
}: {
  search: string;
  onSearch: (value: string) => void;
  onSearchSubmit: () => void;
  onMenu: () => void;
  role: "admin" | "staff";
  onLogout: () => void;
  onRefresh: () => void;
  searchRef?: React.RefObject<HTMLInputElement | null>;
}) => {
  const tick = useSyncExternalStore(subscribeClock, clockSnapshot, clockServerSnapshot);
  const now = tick === null ? null : new Date(tick * TICK_MS);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickAway = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-[#e9ecef] bg-white px-4 sm:px-5">
      <button
        onClick={onMenu}
        aria-label="Open menu"
        className="cursor-pointer rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Global medicine search */}
      <div className="mx-auto w-full max-w-[560px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-gray-400" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSearchSubmit();
            }}
            placeholder="Search medicine by name / salt / barcode"
            className="h-11 w-full rounded-xl border border-[#e2e6ea] bg-white pl-11 pr-14 text-[14px] text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-[#0f7a31] focus:ring-2 focus:ring-[#0f7a31]/12"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-[#cfe6d6] bg-[#eef7f1] px-2 py-0.5 text-[11px] font-semibold text-[#0a6127]">
            F2
          </span>
        </div>
      </div>

      {/* Date / time */}
      <div className="hidden items-center gap-2.5 rounded-xl border border-[#e9ecef] px-3.5 py-2 md:flex">
        <CalendarDays className="h-[18px] w-[18px] text-gray-500" />
        <div className="leading-tight">
          <p className="whitespace-nowrap text-[12.5px] font-semibold text-gray-800">
            {now ? dateLong(now.toISOString()) : "—"}
          </p>
          <p className="text-[11.5px] text-gray-500">{now ? timeLabel(now.toISOString()) : ""}</p>
        </div>
      </div>

      {/* User */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 transition hover:bg-gray-50"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
            <User className="h-[18px] w-[18px] text-gray-600" />
          </span>
          <span className="hidden leading-tight sm:block">
            <span className="block text-[13px] font-semibold text-gray-800">Pharmacist</span>
            <span className="block text-[11.5px] capitalize text-gray-500">{role}</span>
          </span>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full z-30 mt-2 w-52 overflow-hidden rounded-xl border border-[#e9ecef] bg-white py-1 shadow-lg">
            <button
              onClick={() => {
                setMenuOpen(false);
                onRefresh();
              }}
              className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-left text-[13px] text-gray-700 transition hover:bg-gray-50"
            >
              <RotateCw className="h-4 w-4 text-gray-500" /> Refresh data
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                onLogout();
              }}
              className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-left text-[13px] text-red-600 transition hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
