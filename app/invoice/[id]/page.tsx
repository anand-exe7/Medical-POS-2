import Link from "next/link";
import { MapPin, Phone } from "lucide-react";
import { getBill, getSettings } from "@/lib/db/queries";
import { amount, dateLong, money, monthShort, timeLabel } from "@/lib/format";
import { InvoiceActions } from "./InvoiceActions";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bill = await getBill(id);
  const shop = await getSettings();

  if (!bill) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-4 text-center">
        <p className="text-xl font-bold text-[#0a6127]">Bill Not Found</p>
        <p className="max-w-sm text-[13px] text-gray-500">
          Bill ID &quot;{id}&quot; was not found in the database.
        </p>
        <Link
          href="/"
          className="rounded-lg border border-[#d8dde3] bg-white px-6 py-2.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
        >
          Return home
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-[#f7f8fa] px-4 py-8 print:bg-white print:p-0">
      <style>{`@media print { @page { margin: 10mm; } body { background: #fff !important; } }`}</style>

      <div className="mb-5 flex w-full max-w-3xl justify-end no-print">
        <InvoiceActions />
      </div>

      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white print:rounded-none print:border-0">
        {/* Header */}
        <div className="flex flex-col items-center border-b border-[#eceff2] px-8 py-7 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="mb-2.5 h-16 w-16 object-contain" />
          <h1 className="text-[22px] font-extrabold tracking-tight text-[#0a6127]">
            {shop?.shop_name || "PMBJK MAKKAL MARUNDHAGAM"}
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-gray-600">
            <MapPin className="h-3.5 w-3.5 text-[#0a6127]" /> {shop?.address}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-gray-600">
            <Phone className="h-3.5 w-3.5 text-[#0a6127]" /> {shop?.phone}
          </p>
          <p className="mt-1.5 text-[11.5px] text-gray-500">
            GSTIN: {shop?.gstin} · DL No: {shop?.dl_no}
          </p>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-1 gap-6 border-b border-[#eceff2] px-8 py-5 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">
              Billed To
            </p>
            <p className="text-[15px] font-bold text-gray-900">
              {bill.customer_name || "Walk-in Customer"}
            </p>
            {bill.customer_phone && (
              <p className="text-[13px] text-gray-600">+91 {bill.customer_phone}</p>
            )}
            {bill.customer_address && (
              <p className="text-[12.5px] text-gray-500">{bill.customer_address}</p>
            )}
            {bill.doctor_name && (
              <p className="mt-1 text-[12.5px] text-gray-600">Doctor: {bill.doctor_name}</p>
            )}
            {bill.customer_id && (
              <p className="mt-1 text-[12px] text-gray-500">Customer ID: {bill.customer_id}</p>
            )}
          </div>
          <div className="sm:text-right">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">
              Bill Details
            </p>
            <p className="text-[15px] font-bold text-gray-900">Bill No: {bill.id}</p>
            <p className="text-[13px] text-gray-600">{dateLong(bill.bill_date)}</p>
            <p className="text-[12.5px] text-gray-500">{timeLabel(bill.created_at)}</p>
            <p className="mt-1 text-[12.5px] text-gray-600">Payment: {bill.payment_method}</p>
          </div>
        </div>

        {/* Items */}
        <div className="px-8 py-5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b-2 border-[#e6ebe8] text-left">
                  <th className="py-2.5 text-[11px] font-bold uppercase tracking-wide text-gray-600">
                    Product
                  </th>
                  <th className="py-2.5 text-center text-[11px] font-bold uppercase tracking-wide text-gray-600">
                    Box
                  </th>
                  <th className="py-2.5 text-center text-[11px] font-bold uppercase tracking-wide text-gray-600">
                    Batch / EXP
                  </th>
                  <th className="py-2.5 text-center text-[11px] font-bold uppercase tracking-wide text-gray-600">
                    Qty
                  </th>
                  <th className="py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-gray-600">
                    Per unit price
                  </th>
                  <th className="py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-gray-600">
                    Selling price (₹)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f3f5]">
                {bill.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 pr-3">
                      <p className="text-[13px] font-semibold text-gray-900">{item.generic_name}</p>
                      <p className="text-[11px] text-gray-500">
                        {item.brand_name} · {item.manufacturer} · HSN {item.hsn_code}
                      </p>
                    </td>
                    <td className="py-3 text-center text-[12.5px] text-gray-700">
                      {item.box || "-"}
                    </td>
                    <td className="py-3 text-center text-[11.5px] text-gray-600">
                      {item.batch_no}
                      <br />
                      {monthShort(item.exp_date)}
                    </td>
                    <td className="py-3 text-center text-[13px] font-semibold text-gray-900">
                      {item.qty}
                    </td>
                    <td className="py-3 text-right text-[13px] text-gray-800">
                      {amount(item.per_unit_price)}
                    </td>
                    <td className="py-3 text-right text-[13px] font-bold text-gray-900">
                      {amount(item.line_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="flex justify-end border-t border-[#eceff2] px-8 py-5">
          <div className="w-full max-w-[300px] space-y-2 text-[13px]">
            <Row label={`Sub Total (${bill.items.length} Items)`} value={money(bill.sub_total)} />
            <Row label="Discount" value={money(bill.discount)} green />
            <Row label="Taxable Amount" value={money(bill.taxable_amount)} />
            <Row label={`GST (${bill.gst_percent}%)`} value={money(bill.gst_amount)} />
            <div className="flex items-center justify-between border-t border-[#e6ebe8] pt-3">
              <span className="text-[15px] font-bold text-gray-900">TOTAL</span>
              <span className="text-[22px] font-extrabold text-[#0a6127]">
                {money(bill.grand_total)}
              </span>
            </div>
            <Row label="Received" value={money(bill.received_amount)} />
            <Row label="Change" value={money(bill.change_amount)} green />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#eceff2] bg-[#fafbfc] px-8 py-5 text-center">
          <p className="text-[12px] font-bold uppercase tracking-wide text-[#0a6127]">
            Thank you for shopping!
          </p>
          <p className="mt-1 text-[11px] text-gray-500">
            GST is included in the MRP and selling price. The GST % indicates the applicable tax rate
            only.
          </p>
          <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.15em] text-gray-400">
            Powered by Cenexa Systems
          </p>
        </div>
      </div>
    </div>
  );
}

const Row = ({ label, value, green }: { label: string; value: string; green?: boolean }) => (
  <div className="flex items-center justify-between">
    <span className="text-gray-600">{label}</span>
    <span className={`font-semibold ${green ? "text-[#0a6127]" : "text-gray-900"}`}>{value}</span>
  </div>
);
