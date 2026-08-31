export const formatCustomerId = (num: number) => `PMBJ${num.toString().padStart(6, "0")}`;

export const generateBillId = () => {
  return "INV-" + Math.random().toString(36).substring(2, 8).toUpperCase();
};
