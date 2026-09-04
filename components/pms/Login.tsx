"use client";

import React, { useState } from "react";
import { Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";

export const Login = ({
  onSuccess,
}: {
  onSuccess: (role: "admin" | "staff") => void;
}) => {
  const [passcode, setPasscode] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const admin = process.env.NEXT_PUBLIC_ADMIN_PASSCODE || "admin123";
    const staff = process.env.NEXT_PUBLIC_STAFF_PASSCODE || "staff123";
    const entered = passcode.replace(/\s/g, "");

    if (entered === admin) return onSuccess("admin");
    if (entered === staff) return onSuccess("staff");
    setError("Incorrect passcode. Please try again.");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#02222d] px-4">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex flex-col items-center gap-3 rounded-2xl bg-white px-6 py-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpeg" alt="Makkal Marundhagam" className="h-16 w-16 object-contain" />
          <div className="text-center">
            <p className="text-[19px] font-extrabold leading-tight tracking-tight text-[#0a6127]">
              MAKKAL MARUNDHAGAM
            </p>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">
              Pharmacy Management System
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="rounded-2xl bg-white p-6">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e8f5ec]">
              <ShieldCheck className="h-[18px] w-[18px] text-[#0a6127]" />
            </span>
            <div>
              <p className="text-[15px] font-bold text-gray-900">Secure Login</p>
              <p className="text-[12px] text-gray-500">Enter your passcode to continue</p>
            </div>
          </div>

          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              type={show ? "text" : "password"}
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                setError("");
              }}
              placeholder="Passcode"
              className="h-12 w-full rounded-lg border border-[#d8dde3] bg-white pl-10 pr-11 text-[15px] outline-none transition placeholder:text-gray-400 focus:border-[#0f7a31] focus:ring-2 focus:ring-[#0f7a31]/15"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? "Hide passcode" : "Show passcode"}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 transition hover:text-gray-700"
            >
              {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
            </button>
          </div>

          {error && <p className="mt-2.5 text-[12.5px] font-medium text-red-600">{error}</p>}

          <button
            type="submit"
            className="mt-4 w-full cursor-pointer rounded-lg bg-[#0a6127] py-3 text-[14px] font-bold text-white transition hover:bg-[#0d7530]"
          >
            Login
          </button>

          <p className="mt-4 text-center text-[11.5px] leading-relaxed text-gray-400">
            Admin has full access. Staff can bill, view inventory, customers and expiry alerts.
          </p>
        </form>

        <p className="mt-5 text-center text-[11px] font-medium uppercase tracking-[0.15em] text-white/40">
          Powered by Cenexa Systems
        </p>
      </div>
    </div>
  );
};
