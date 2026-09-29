import { useMemo } from "react";
import { Printer } from "lucide-react";
import { useBusiness, useTable } from "@/lib/data";
import { amountInWords, inr, num } from "@/lib/timber";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Purchase-side document only — the Sales invoice is a separate component. */
export type PurchaseDoc = {
  id: string;
  purchase_number: string;
  purchase_date: string;
  total_logs: number;
  total_cft: number;
  timber_value: number;
  loading_charges: number;
  unloading_charges: number;
  transport_charges: number;
  other_charges: number;
  discount: number;
  final_amount: number;
  amount_paid: number;
  payment_method: string | null;
  notes: string | null;
};

export type PurchaseSupplier = {
  id: string;
  name: string;
  phone: string | null;
  gstin: string | null;
  address: string | null;
  state: string | null;
};

type PurchaseLog = {
  id: string;
  purchase_id: string;
  grade: string;
  cft: number;
  rate: number;
  amount: number;
};

const HSN_TIMBER = "4403";
const HSN_SERVICE = "9965";

export function PurchaseInvoiceDialog({
  purchase,
  supplier,
  onClose,
}: {
  purchase: PurchaseDoc | null;
  supplier: PurchaseSupplier | null;
  onClose: () => void;
}) {
  const { data: business } = useBusiness();
  const logsQ = useTable<PurchaseLog>(
    "purchase_logs",
    (q) => q.eq("purchase_id", purchase?.id ?? "00000000-0000-0000-0000-000000000000"),
    [purchase?.id ?? "none"],
  );
  const logs = purchase ? (logsQ.data ?? []) : [];

  const gstRate = num(business?.gst_rate, 18);
  const interstate = useMemo(() => {
    const a = (supplier?.state ?? "").trim().toLowerCase();
    const b = (business?.state ?? "").trim().toLowerCase();
    return !!a && !!b && a !== b;
  }, [supplier?.state, business?.state]);

  const doc = useMemo(() => {
    if (!purchase) return null;
    const byGrade = new Map<string, { cft: number; amount: number }>();
    logs.forEach((l) => {
      const g = byGrade.get(l.grade) ?? { cft: 0, amount: 0 };
      g.cft += num(l.cft);
      g.amount += num(l.amount);
      byGrade.set(l.grade, g);
    });

    const lines: { desc: string; hsn: string; qty: string; unit: string; rate: number; gross: number }[] = [];
    if (byGrade.size > 0) {
      [...byGrade.entries()].forEach(([grade, g]) => {
        lines.push({
          desc: `Timber logs — ${grade}`,
          hsn: HSN_TIMBER,
          qty: g.cft.toFixed(3),
          unit: "CFT",
          rate: g.cft > 0 ? g.amount / g.cft : 0,
          gross: g.amount,
        });
      });
    } else if (num(purchase.timber_value) > 0) {
      lines.push({
        desc: "Timber logs",
        hsn: HSN_TIMBER,
        qty: num(purchase.total_cft).toFixed(3),
        unit: "CFT",
        rate: num(purchase.total_cft) > 0 ? num(purchase.timber_value) / num(purchase.total_cft) : 0,
        gross: num(purchase.timber_value),
      });
    }

    const charges: [string, number][] = [
      ["Loading charges", num(purchase.loading_charges)],
      ["Unloading charges", num(purchase.unloading_charges)],
      ["Transport charges", num(purchase.transport_charges)],
      ["Other charges", num(purchase.other_charges)],
    ];
    charges.forEach(([desc, value]) => {
      if (value > 0) lines.push({ desc, hsn: HSN_SERVICE, qty: "1", unit: "Lot", rate: value, gross: value });
    });
    const discount = num(purchase.discount);
    if (discount > 0) {
      lines.push({ desc: "Discount", hsn: "—", qty: "1", unit: "Lot", rate: -discount, gross: -discount });
    }

    const grand = num(purchase.final_amount);
    const grossSum = lines.reduce((s, l) => s + l.gross, 0);
    // Stored purchase amount is the settled, tax-inclusive figure — back out the tax.
    const taxableTotal = grand / (1 + gstRate / 100);
    const factor = grossSum > 0 ? taxableTotal / grossSum : 0;
    const rows = lines.map((l) => {
      const taxable = l.gross * factor;
      const tax = (taxable * gstRate) / 100;
      return { ...l, taxable, tax, total: taxable + tax };
    });
    const taxTotal = grand - taxableTotal;
    const paid = num(purchase.amount_paid);
    const balance = Math.max(grand - paid, 0);
    const status = paid <= 0.005 ? "Unpaid" : paid >= grand - 0.005 ? "Paid" : "Partially Paid";
    return { rows, taxableTotal, taxTotal, grand, paid, balance, status };
  }, [purchase, logs, gstRate]);

  const half = gstRate / 2;
  const statusStyle: Record<string, string> = {
    Paid: "border-[#1a7f37] text-[#1a7f37]",
    "Partially Paid": "border-[#9a6700] text-[#9a6700]",
    Unpaid: "border-[#b42318] text-[#b42318]",
  };

  return (
    <Dialog open={!!purchase} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader className="no-print">
          <DialogTitle>Purchase invoice {purchase?.purchase_number}</DialogTitle>
        </DialogHeader>
        {purchase && doc ? (
          <>
            <div className="print-doc doc-font mx-auto w-full bg-white p-8 text-[12px] leading-snug text-black ring-1 ring-black/15">
              <div className="border border-black">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black p-4">
                  <div>
                    <h2 className="text-[18px] font-bold uppercase tracking-wide">
                      {business?.legal_name || business?.name || "Business name"}
                    </h2>
                    {business?.address ? <p>{business.address}</p> : null}
                    <p>{[business?.city, business?.state, business?.pincode].filter(Boolean).join(", ")}</p>
                    {business?.gstin ? <p>GSTIN: {business.gstin}</p> : null}
                    <p>
                      {[business?.phone ? `Ph: ${business.phone}` : "", business?.email ?? ""]
                        .filter(Boolean)
                        .join("  ·  ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="inline-block border border-black px-3 py-1 text-[13px] font-bold uppercase tracking-[0.15em]">
                      Purchase Invoice
                    </p>
                    <p className="mt-2">No.: <span className="font-bold">{purchase.purchase_number}</span></p>
                    <p>Date: {purchase.purchase_date}</p>
                    <p>Logs: {purchase.total_logs} · {num(purchase.total_cft).toFixed(3)} CFT</p>
                  </div>
                </div>

                {/* Supplier */}
                <div className="grid border-b border-black sm:grid-cols-2">
                  <div className="border-black p-4 sm:border-r">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest">Supplier</p>
                    <p className="font-bold">{supplier?.name ?? "—"}</p>
                    {supplier?.address ? <p>{supplier.address}</p> : null}
                    {supplier?.state ? <p>{supplier.state}</p> : null}
                    {supplier?.gstin ? <p>GSTIN: {supplier.gstin}</p> : null}
                    {supplier?.phone ? <p>Ph: {supplier.phone}</p> : null}
                  </div>
                  <div className="p-4">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest">Supply details</p>
                    <p>Place of supply: {supplier?.state || business?.state || "—"}</p>
                    <p>Tax type: {interstate ? "Inter-state (IGST)" : "Intra-state (CGST + SGST)"}</p>
                    <p>Payment mode: {purchase.payment_method || "—"}</p>
                  </div>
                </div>

                {/* Items */}
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-[#f2f2f2] text-center">
                      <th className="border border-black px-1.5 py-1.5">S.No</th>
                      <th className="border border-black px-1.5 py-1.5 text-left">Description</th>
                      <th className="border border-black px-1.5 py-1.5">HSN</th>
                      <th className="border border-black px-1.5 py-1.5">Qty</th>
                      <th className="border border-black px-1.5 py-1.5">Unit</th>
                      <th className="border border-black px-1.5 py-1.5">Rate</th>
                      <th className="border border-black px-1.5 py-1.5">Taxable</th>
                      {interstate ? (
                        <>
                          <th className="border border-black px-1.5 py-1.5">IGST %</th>
                          <th className="border border-black px-1.5 py-1.5">IGST Amt</th>
                        </>
                      ) : (
                        <>
                          <th className="border border-black px-1.5 py-1.5">CGST %</th>
                          <th className="border border-black px-1.5 py-1.5">CGST Amt</th>
                          <th className="border border-black px-1.5 py-1.5">SGST %</th>
                          <th className="border border-black px-1.5 py-1.5">SGST Amt</th>
                        </>
                      )}
                      <th className="border border-black px-1.5 py-1.5">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doc.rows.map((r, i) => (
                      <tr key={`${r.desc}-${i}`} className="text-right">
                        <td className="border border-black px-1.5 py-1 text-center">{i + 1}</td>
                        <td className="border border-black px-1.5 py-1 text-left">{r.desc}</td>
                        <td className="border border-black px-1.5 py-1 text-center">{r.hsn}</td>
                        <td className="border border-black px-1.5 py-1">{r.qty}</td>
                        <td className="border border-black px-1.5 py-1 text-center">{r.unit}</td>
                        <td className="border border-black px-1.5 py-1">{r.rate.toFixed(2)}</td>
                        <td className="border border-black px-1.5 py-1">{r.taxable.toFixed(2)}</td>
                        {interstate ? (
                          <>
                            <td className="border border-black px-1.5 py-1">{gstRate}%</td>
                            <td className="border border-black px-1.5 py-1">{r.tax.toFixed(2)}</td>
                          </>
                        ) : (
                          <>
                            <td className="border border-black px-1.5 py-1">{half}%</td>
                            <td className="border border-black px-1.5 py-1">{(r.tax / 2).toFixed(2)}</td>
                            <td className="border border-black px-1.5 py-1">{half}%</td>
                            <td className="border border-black px-1.5 py-1">{(r.tax / 2).toFixed(2)}</td>
                          </>
                        )}
                        <td className="border border-black px-1.5 py-1 font-semibold">{r.total.toFixed(2)}</td>
                      </tr>
                    ))}
                    {doc.rows.length === 0 ? (
                      <tr>
                        <td className="border border-black px-2 py-3 text-center" colSpan={interstate ? 10 : 12}>
                          No line items recorded for this purchase.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>

                {/* Totals */}
                <div className="grid border-t border-black sm:grid-cols-2">
                  <div className="border-black p-4 sm:border-r">
                    <p className="text-[10px] font-bold uppercase tracking-widest">Amount in words</p>
                    <p className="mt-1 font-semibold">{amountInWords(doc.grand)}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <span
                        className={`inline-flex items-center border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${statusStyle[doc.status]}`}
                      >
                        {doc.status}
                      </span>
                      <span>Paid: {inr(doc.paid)}</span>
                      <span className="font-bold">Balance due: {inr(doc.balance)}</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <DocRow label="Subtotal (taxable)" value={inr(doc.taxableTotal)} />
                    {interstate ? (
                      <DocRow label={`IGST @ ${gstRate}%`} value={inr(doc.taxTotal)} />
                    ) : (
                      <>
                        <DocRow label={`CGST @ ${half}%`} value={inr(doc.taxTotal / 2)} />
                        <DocRow label={`SGST @ ${half}%`} value={inr(doc.taxTotal / 2)} />
                      </>
                    )}
                    <DocRow label="Total tax" value={inr(doc.taxTotal)} />
                    <div className="mt-1 flex justify-between border-t border-black pt-1 text-[14px] font-bold">
                      <span>Grand total</span>
                      <span>{inr(doc.grand)}</span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="grid border-t border-black sm:grid-cols-2">
                  <div className="border-black p-4 text-[11px] sm:border-r">
                    {business?.bank_name ? (
                      <>
                        <p className="text-[10px] font-bold uppercase tracking-widest">Bank details</p>
                        <p>{business.bank_name}{business.bank_branch ? ` · ${business.bank_branch}` : ""}</p>
                        <p>A/C {business.bank_account} · IFSC {business.bank_ifsc}</p>
                        {business.upi_id ? <p>UPI: {business.upi_id}</p> : null}
                      </>
                    ) : null}
                    <p className="mt-3 text-[10px] font-bold uppercase tracking-widest">Terms</p>
                    <p className="whitespace-pre-line">
                      {business?.invoice_footer ||
                        "Goods received in good condition. Balance payable as per agreed credit terms."}
                    </p>
                  </div>
                  <div className="flex flex-col justify-between p-4 text-right">
                    <p className="text-[11px]">For {business?.legal_name || business?.name}</p>
                    <p className="mt-12 border-t border-black pt-1 text-[11px]">Authorised signatory</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="no-print flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Close</Button>
              <Button onClick={() => window.print()}>
                <Printer className="mr-1.5 size-4" /> Print / Save PDF
              </Button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function DocRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-0.5">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
