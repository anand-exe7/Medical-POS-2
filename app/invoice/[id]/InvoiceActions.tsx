"use client";

import { useState } from "react";
import { Printer, Copy, Check } from "lucide-react";

export function InvoiceActions() {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button 
        onClick={handleCopyLink}
        className="flex items-center gap-2 bg-white hover:bg-[#FAFAFA] text-[#02222d] hover:text-[#0a6127] font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-lg shadow-sm border border-[#0a6127]/30 transition-colors cursor-pointer"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 text-green-600" /> Copied!
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" /> Copy Link
          </>
        )}
      </button>
      <button 
        onClick={handlePrint}
        className="flex items-center gap-2 bg-gradient-to-r from-[#0a6127] via-[#0a6127] to-[#0a6127] hover:brightness-105 text-white font-bold text-xs uppercase tracking-wider px-5 py-2 rounded-lg shadow-md transition-all cursor-pointer"
      >
        <Printer className="w-4 h-4" /> Download PDF / Print
      </button>
    </div>
  );
}
