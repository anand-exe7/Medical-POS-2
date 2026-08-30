/* ==========================================================================
   Display formatting helpers
   ========================================================================== */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const money = (n: number | string): string =>
  `₹ ${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const amount = (n: number | string): string =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const qtyLabel = (n: number | string): string =>
  Number(n || 0).toLocaleString("en-IN");

/** "2025-05" -> "May-25"  (the format the client used on slides 9, 11 and 17) */
export const monthShort = (value: string): string => {
  if (!value) return "-";
  const [y, m] = value.split("-");
  const idx = Number(m) - 1;
  if (!y || idx < 0 || idx > 11) return value;
  return `${MONTHS[idx]}-${y.slice(2)}`;
};

/** "2025-05" -> "05/2025"  (the format used in the inventory table, slide 16) */
export const monthSlash = (value: string): string => {
  if (!value) return "-";
  const [y, m] = value.split("-");
  if (!y || !m) return value;
  return `${m.padStart(2, "0")}/${y}`;
};

/** "2026-08-30" -> "30 Aug 2026" */
export const dateLong = (value: string): string => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

/** "2026-08-30" -> "30/08/2026" */
export const dateSlash = (value: string): string => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

export const timeLabel = (value: string): string => {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
};

export const todayIso = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const thisMonthIso = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export type ExpiryState = "EXPIRED" | "SOON" | "OK";

/** Expiry bucket for a "yyyy-mm" batch expiry, relative to today. */
export const expiryState = (expDate: string, alertMonths = 6): ExpiryState => {
  if (!expDate) return "OK";
  const [y, m] = expDate.split("-").map(Number);
  if (!y || !m) return "OK";
  // A batch is usable up to the last day of its expiry month
  const expEnd = new Date(y, m, 0, 23, 59, 59);
  const now = new Date();
  if (expEnd < now) return "EXPIRED";
  const limit = new Date(now.getFullYear(), now.getMonth() + alertMonths, now.getDate());
  return expEnd <= limit ? "SOON" : "OK";
};

export const monthsToExpiry = (expDate: string): number => {
  if (!expDate) return 0;
  const [y, m] = expDate.split("-").map(Number);
  if (!y || !m) return 0;
  const now = new Date();
  return (y - now.getFullYear()) * 12 + (m - (now.getMonth() + 1));
};

/** Schedule label shown in the inventory grid — "SCHEDULED - H" / "OTC" */
export const scheduleLabel = (schedule: string): string =>
  schedule === "OTC" ? "OTC" : `SCHEDULED - ${schedule}`;

export const scheduleIsOtc = (schedule: string): boolean => schedule === "OTC";

/** Sellable unit noun for a purchase unit type */
export const unitNoun = (unitType: string, packSize: number): string => {
  if (unitType === "Strip") return packSize > 1 ? "Tablets" : "Tablet";
  if (unitType === "Bottle") return "Bottles";
  return "Pieces";
};

export const packNoun = (unitType: string): string => {
  if (unitType === "Strip") return "Strips";
  if (unitType === "Bottle") return "Bottles";
  return "Pieces";
};
