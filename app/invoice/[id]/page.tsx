import Link from "next/link";
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
      <style>{`
        @media print {
          @page { margin: 0; size: 72mm auto; }
          html, body {
            background: #fff !important;
            width: 72mm !important;
            margin: 0 !important;
            padding: 0 !important;
            font-family: monospace, sans-serif !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      <div className="mb-5 flex w-full max-w-sm justify-end no-print">
        <InvoiceActions />
      </div>

      <div className="w-[72mm] overflow-hidden bg-white px-3 py-4 print:w-[72mm] print:px-1.5 print:py-2 text-black font-mono mx-auto text-xs">
        {/* Header */}
        <div className="flex flex-col items-center border-b border-black pb-3 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpeg" alt="" className="mb-2 h-12 w-12 object-contain grayscale" />
          <h1 className="text-[13px] font-bold uppercase">
            {shop?.shop_name || "PMBJK MAKKAL MARUNDHAGAM"}
          </h1>
          <p className="mt-1 text-[10px] leading-tight max-w-[200px]">
            {shop?.address}
          </p>
          <p className="mt-1 text-[10px]">
            Ph: {shop?.phone}
          </p>
          {(shop?.gstin || shop?.dl_no) && (
            <p className="mt-1 text-[9px]">
              {shop?.gstin && `GSTIN: ${shop?.gstin} `}
              {shop?.dl_no && `DL No: ${shop?.dl_no}`}
            </p>
          )}
        </div>

        {/* Meta */}
        <div className="border-b border-black py-3 text-[10px] leading-tight">
          <div className="flex justify-between mb-1">
            <span className="font-bold">Bill No:</span>
            <span>{bill.id}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span className="font-bold">Date:</span>
            <span>{dateLong(bill.bill_date)} {timeLabel(bill.created_at)}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span className="font-bold">Billed To:</span>
            <span>{bill.customer_name || "Walk-in Customer"}</span>
          </div>
          {bill.customer_phone && (
            <div className="flex justify-between mb-1">
              <span className="font-bold">Mobile:</span>
              <span>+91 {bill.customer_phone}</span>
            </div>
          )}
          {bill.doctor_name && (
            <div className="flex justify-between mb-1">
              <span className="font-bold">Doctor:</span>
              <span>{bill.doctor_name}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="font-bold">Payment:</span>
            <span>{bill.payment_method}</span>
          </div>
        </div>

        {/* Items Header */}
        <div className="border-b border-black py-1.5 flex text-[10px] font-bold">
          <div className="w-[15%]">Qty</div>
          <div className="w-[50%]">Item</div>
          <div className="w-[15%] text-right">Price</div>
          <div className="w-[20%] text-right">Total</div>
        </div>

        {/* Items List */}
        <div className="border-b border-black py-2">
          {bill.items.map((item) => (
            <div key={item.id} className="mb-2 text-[10px] flex items-start">
              <div className="w-[15%] font-bold">{item.qty}</div>
              <div className="w-[50%] pr-1 leading-tight">
                <span className="font-bold">{item.generic_name}</span>
                <br />
                <span className="text-[9px]">
                  Batch: {item.batch_no} | EXP: {monthShort(item.exp_date)}
                </span>
              </div>
              <div className="w-[15%] text-right">{amount(item.per_unit_price)}</div>
              <div className="w-[20%] text-right font-bold">{amount(item.line_amount)}</div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="border-b border-black py-3 text-[10px] space-y-1">
          <Row label={`Sub Total (${bill.items.length} Items)`} value={money(bill.sub_total)} />
          {bill.discount > 0 && (
            <Row label="Discount" value={`-${money(bill.discount)}`} />
          )}
          <Row label="Taxable Amount" value={money(bill.taxable_amount)} />
          <Row label={`GST (${bill.gst_percent}%)`} value={money(bill.gst_amount)} />
          
          <div className="flex items-center justify-between pt-1 mt-1 border-t border-dashed border-black">
            <span className="text-[12px] font-bold">TOTAL</span>
            <span className="text-[14px] font-bold">
              {money(bill.grand_total)}
            </span>
          </div>
          
          <div className="pt-2">
            <Row label="Received" value={money(bill.received_amount)} />
            {bill.change_amount > 0 && (
              <Row label="Change" value={money(bill.change_amount)} />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 text-center text-[9px] leading-tight">
          <p className="font-bold uppercase text-[11px] mb-1">
            Thank you for shopping!
          </p>
          <p className="mb-2">
            GST is included in MRP. The GST % indicates applicable tax rate only.
          </p>
          <p className="font-bold uppercase">
            Powered by Cenexa Systems
          </p>
        </div>
      </div>
    </div>
  );
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between">
    <span>{label}</span>
    <span>{value}</span>
  </div>
);
