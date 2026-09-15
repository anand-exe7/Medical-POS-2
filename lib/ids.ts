export const formatCustomerId = (num: number) => `PMBJ${num.toString().padStart(6, "0")}`;

/** New bill numbers are just a plain running number ("1", "2", "3", …) so the
   receipt reads as the shop wanted it — no INV- prefix, no random suffix. */
export const formatBillId = (num: number) => String(num);
