import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Printer, Share2 } from "lucide-react";
import { useBusiness, useTable, errMessage } from "@/lib/data";
import { amountInWords, inr, num } from "@/lib/timber";
import {
  PageHeader,
  LoadingSkeleton,
  EmptyState,
  ErrorState,
  StatusPill,
  statusTone,
} from "@/components/states";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/invoices")({
  head: () => ({
    meta: [
      { title: "Invoices — Timber ERP" },
      {
        name: "description",
        content: "Financial-year aware Indian GST invoices with CGST/SGST or IGST and round off.",
      },
      { property: "og:title", content: "Invoices — Timber ERP" },
      {
        property: "og:description",
        content: "Preview, print, download and share professional GST invoices.",
      },
    ],
  }),
  component: InvoicesPage,
});

const HSN_TIMBER = "4403";
const HSN_FURNITURE = "9403";

type Invoice = {
  id: string;
  sale_id: string | null;
  customer_id: string | null;
  invoice_number: string;
  financial_year: string;
  sequence_number: number;
  invoice_date: string;
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  round_off: number;
  total: number;
  status: string;
};
type Customer = {
  id: string;
  name: string;
  gstin: string | null;
  address: string | null;
  state: string | null;
  state_code: string | null;
  phone: string | null;
};
type SaleItem = {
  id: string;
  sale_id: string;
  item_type: string;
  grade: string | null;
  product_name: string | null;
  size_label: string | null;
  cft: number;
  quantity: number;
  rate: number;
  amount: number;
};
type Sale = { id: string; amount_paid: number; payment_status: string; sale_type: string };

function InvoicesPage() {
  const invoicesQ = useTable<Invoice>("invoices", (q) =>
    q.order("created_at", { ascending: false }),
  );
  const customersQ = useTable<Customer>("customers");
  const [active, setActive] = useState<Invoice | null>(null);
  const invoices = invoicesQ.data ?? [];
  const customer = (id: string | null) => (customersQ.data ?? []).find((c) => c.id === id) ?? null;

  return (
    <>
      <PageHeader title="Invoices" description="GST invoices, numbered per financial year." />
      {invoicesQ.isLoading ? (
        <LoadingSkeleton />
      ) : invoicesQ.error ? (
        <ErrorState message={errMessage(invoicesQ.error)} onRetry={() => invoicesQ.refetch()} />
      ) : invoices.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          description="Invoices are generated automatically when you confirm a sale."
        />
      ) : (
        <div className="card-surface overflow-hidden">
          <table className="hidden w-full text-sm md:table">
            <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Invoice</th>
                <th className="px-5 py-3 font-medium">FY</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 text-right font-medium">Total</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id} className="border-t border-border">
                  <td className="px-5 py-3 font-medium">{i.invoice_number}</td>
                  <td className="px-5 py-3">{i.financial_year}</td>
                  <td className="px-5 py-3">{i.invoice_date}</td>
                  <td className="px-5 py-3">{customer(i.customer_id)?.name ?? "Walk-in"}</td>
                  <td className="px-5 py-3 text-right font-semibold">{inr(i.total)}</td>
                  <td className="px-5 py-3">
                    <StatusPill label={i.status} tone={statusTone(i.status)} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => setActive(i)}>
                      Preview
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="divide-y divide-border md:hidden">
            {invoices.map((i) => (
              <button
                key={i.id}
                className="flex w-full items-center justify-between p-4 text-left"
                onClick={() => setActive(i)}
              >
                <div>
                  <p className="font-medium">{i.invoice_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {i.invoice_date} · {customer(i.customer_id)?.name ?? "Walk-in"}
                  </p>
                </div>
                <span className="font-semibold">{inr(i.total)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <InvoicePreview
        invoice={active}
        customer={active ? customer(active.customer_id) : null}
        onClose={() => setActive(null)}
      />
    </>
  );
}

function InvoicePreview({
  invoice,
  customer,
  onClose,
}: {
  invoice: Invoice | null;
  customer: Customer | null;
  onClose: () => void;
}) {
  const { data: business } = useBusiness();
  const noneId = "00000000-0000-0000-0000-000000000000";
  const itemsQ = useTable<SaleItem>(
    "sale_items",
    (q) => q.eq("sale_id", invoice?.sale_id ?? noneId),
    [invoice?.sale_id ?? "none"],
  );
  const saleQ = useTable<Sale>("sales", (q) => q.eq("id", invoice?.sale_id ?? noneId), [
    invoice?.sale_id ?? "none",
  ]);

  const items = invoice?.sale_id ? (itemsQ.data ?? []) : [];
  const sale = invoice?.sale_id ? (saleQ.data ?? [])[0] : undefined;

  const share = async () => {
    if (!invoice) return;
    const text = `Invoice ${invoice.invoice_number} — ${inr(invoice.total)} from ${business?.name ?? ""}`;
    try {
      if (navigator.share) await navigator.share({ title: invoice.invoice_number, text });
      else {
        await navigator.clipboard.writeText(text);
        toast.success("Invoice summary copied");
      }
    } catch {
      /* user dismissed */
    }
  };

  if (!invoice)
    return (
      <Dialog open={false} onOpenChange={() => onClose()}>
        <DialogContent />
      </Dialog>
    );

  // All GST figures below are the ones already stored on the sale/invoice — no recalculation.
  const taxable = num(invoice.subtotal);
  const cgst = num(invoice.cgst);
  const sgst = num(invoice.sgst);
  const igst = num(invoice.igst);
  const interstate = igst > 0.005;
  const taxTotal = interstate ? igst : cgst + sgst;
  const gstPct = taxable > 0 ? Math.round((taxTotal / taxable) * 1000) / 10 : 0;
  const paid = num(sale?.amount_paid);
  const balanceDue = Math.max(num(invoice.total) - paid, 0);
  const lineTax = (amount: number) => (taxable > 0 ? (num(amount) / taxable) * taxTotal : 0);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[95vh] max-w-5xl overflow-y-auto bg-slate-100 p-4 sm:p-6">
        <DialogHeader className="no-print mb-3">
          <DialogTitle className="text-lg font-semibold">
            Invoice {invoice.invoice_number}
          </DialogTitle>
        </DialogHeader>

        <style>{`
          @page {
            size: A4;
            margin: 8mm;
          }

          .gst-invoice {
            --gst-ink: #172033;
            --gst-muted: #596579;
            --gst-line: #c8d0db;
            --gst-soft: #f4f7fa;
            --gst-accent: #0f766e;
            --gst-accent-soft: #ecfdf5;
            color: var(--gst-ink);
            background: white;
            font-family: Arial, Helvetica, sans-serif;
            box-shadow: 0 18px 55px rgba(15, 23, 42, .12);
          }

          .gst-invoice * {
            box-sizing: border-box;
          }

          .gst-brand-bar {
            height: 7px;
            background: linear-gradient(90deg, #172033 0%, #0f766e 55%, #14b8a6 100%);
          }

          .gst-small-label {
            font-size: 8px;
            line-height: 1.25;
            letter-spacing: .12em;
            text-transform: uppercase;
            font-weight: 800;
            color: var(--gst-muted);
          }

          .gst-box-title {
            background: var(--gst-soft);
            border-bottom: 1px solid var(--gst-line);
            padding: 7px 10px;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: .12em;
            text-transform: uppercase;
          }

          .gst-meta-label {
            color: var(--gst-muted);
            font-size: 9px;
          }

          .gst-meta-value {
            font-size: 9.5px;
            font-weight: 700;
            text-align: right;
          }

          .gst-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }

          .gst-table th {
            background: #eef2f6;
            color: #273244;
            border-right: 1px solid var(--gst-line);
            border-bottom: 1px solid #aeb8c5;
            padding: 7px 5px;
            font-size: 8px;
            line-height: 1.2;
            text-transform: uppercase;
            letter-spacing: .04em;
            font-weight: 800;
          }

          .gst-table td {
            border-right: 1px solid var(--gst-line);
            border-bottom: 1px solid #d8dee6;
            padding: 7px 5px;
            font-size: 9px;
            vertical-align: top;
          }

          .gst-table th:last-child,
          .gst-table td:last-child {
            border-right: 0;
          }

          .gst-total-box {
            border: 1.5px solid var(--gst-ink);
            background: #fbfcfd;
          }

          .gst-grand-total {
            background: var(--gst-ink);
            color: white;
          }

          .gst-paid {
            color: #047857;
          }

          .gst-signature {
            min-height: 82px;
          }

          @media print {
            html, body {
              background: white !important;
            }

            body * {
              visibility: hidden !important;
            }

            .gst-invoice,
            .gst-invoice * {
              visibility: visible !important;
            }

            .gst-invoice {
              position: absolute;
              inset: 0;
              width: 100%;
              margin: 0;
              box-shadow: none !important;
              font-size: 9px;
            }

            .no-print {
              display: none !important;
            }

            [data-radix-dialog-overlay],
            [data-radix-dialog-content] {
              position: static !important;
              transform: none !important;
            }
          }
        `}</style>

        <div className="gst-invoice mx-auto w-full max-w-[900px] overflow-hidden rounded-[2px] border border-slate-300">
          <div className="gst-brand-bar" />

          {/* Invoice heading + seller identity */}
          <div className="grid grid-cols-[1fr_270px] border-b border-slate-300 max-[640px]:grid-cols-1">
            <div className="flex gap-4 p-5">
              {business?.logo_url ? (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded border border-slate-200 bg-white p-1">
                  <img
                    src={business.logo_url}
                    alt={`${business?.name ?? "Business"} logo`}
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : null}

              <div className="min-w-0">
                <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[.2em] text-teal-700">
                  GST Registered Business
                </p>
                <p className="text-[19px] font-extrabold leading-tight tracking-[-.02em]">
                  {business?.legal_name || business?.name}
                </p>
                {business?.address ? (
                  <p className="mt-1 max-w-[470px] text-[9.5px] leading-4 text-slate-600">
                    {business.address}
                  </p>
                ) : null}
                <p className="text-[9.5px] text-slate-600">
                  {[business?.city, business?.state, business?.pincode].filter(Boolean).join(", ")}
                </p>

                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[9px]">
                  {business?.gstin ? (
                    <span>
                      <b>GSTIN</b> {business.gstin}
                    </span>
                  ) : null}
                  {business?.pan ? (
                    <span>
                      <b>PAN</b> {business.pan}
                    </span>
                  ) : null}
                  {business?.phone ? (
                    <span>
                      <b>PHONE</b> {business.phone}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="border-l border-slate-300 max-[640px]:border-l-0 max-[640px]:border-t">
              <div className="bg-slate-900 px-5 py-3 text-center text-white">
                <p className="text-[10px] font-bold uppercase tracking-[.22em] text-teal-300">
                  Tax Invoice
                </p>
                <p className="mt-0.5 text-[18px] font-extrabold tracking-wide">
                  {invoice.invoice_number}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-4">
                <span className="gst-meta-label">Invoice Date</span>
                <span className="gst-meta-value">{invoice.invoice_date}</span>

                <span className="gst-meta-label">Financial Year</span>
                <span className="gst-meta-value">{invoice.financial_year}</span>

                <span className="gst-meta-label">Place of Supply</span>
                <span className="gst-meta-value">{customer?.state ?? business?.state ?? "—"}</span>

                <span className="gst-meta-label">Supply Type</span>
                <span className="gst-meta-value">{interstate ? "Inter-State" : "Intra-State"}</span>
              </div>
            </div>
          </div>

          {/* Bill / ship section */}
          <div className="grid grid-cols-2 border-b border-slate-300 max-[640px]:grid-cols-1">
            <div className="border-r border-slate-300 max-[640px]:border-r-0">
              <div className="gst-box-title">Bill To / Recipient</div>
              <div className="min-h-[94px] p-3">
                <p className="text-[12px] font-extrabold">{customer?.name ?? "Walk-in customer"}</p>
                {customer?.address ? (
                  <p className="mt-1 text-[9px] leading-4 text-slate-600">{customer.address}</p>
                ) : null}
                {customer?.state ? (
                  <p className="text-[9px] text-slate-600">
                    State: {customer.state}
                    {customer.state_code ? ` (${customer.state_code})` : ""}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[9px]">
                  {customer?.gstin ? (
                    <span>
                      <b>GSTIN</b> {customer.gstin}
                    </span>
                  ) : null}
                  {customer?.phone ? (
                    <span>
                      <b>PHONE</b> {customer.phone}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div>
              <div className="gst-box-title">Ship To / Delivery Address</div>
              <div className="min-h-[94px] p-3">
                <p className="text-[12px] font-extrabold">{customer?.name ?? "Walk-in customer"}</p>
                {customer?.address ? (
                  <p className="mt-1 text-[9px] leading-4 text-slate-600">{customer.address}</p>
                ) : null}
                {customer?.state ? (
                  <p className="text-[9px] text-slate-600">
                    State: {customer.state}
                    {customer.state_code ? ` (${customer.state_code})` : ""}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="overflow-x-auto">
            <table className="gst-table">
              <thead>
                <tr>
                  <th className="w-[32px] text-center">#</th>
                  <th className="text-left">Description of Goods / Services</th>
                  <th className="w-[62px] text-center">HSN/SAC</th>
                  <th className="w-[48px] text-right">Qty</th>
                  <th className="w-[45px] text-center">Unit</th>
                  <th className="w-[72px] text-right">Rate</th>
                  <th className="w-[58px] text-right">Disc.</th>
                  <th className="w-[78px] text-right">Taxable</th>
                  <th className="w-[50px] text-right">GST%</th>
                  <th className="w-[70px] text-right">GST</th>
                  <th className="w-[84px] text-right">Amount</th>
                </tr>
              </thead>

              <tbody>
                {items.map((it, idx) => {
                  const isTimber = num(it.cft) > 0 || it.item_type === "timber";
                  const qty = isTimber ? num(it.cft) : num(it.quantity);
                  const tax = lineTax(it.amount);

                  return (
                    <tr key={it.id}>
                      <td className="text-center font-semibold">{idx + 1}</td>
                      <td>
                        <p className="font-bold">{it.grade ?? it.product_name ?? "Item"}</p>
                        {it.size_label ? (
                          <p className="mt-0.5 text-[8px] text-slate-500">{it.size_label}</p>
                        ) : null}
                      </td>
                      <td className="text-center font-medium">
                        {isTimber ? HSN_TIMBER : HSN_FURNITURE}
                      </td>
                      <td className="text-right">{qty.toFixed(isTimber ? 3 : 2)}</td>
                      <td className="text-center">{isTimber ? "CFT" : "Nos"}</td>
                      <td className="text-right">{inr(it.rate)}</td>
                      <td className="text-right">{inr(0)}</td>
                      <td className="text-right font-medium">{inr(it.amount)}</td>
                      <td className="text-right">{gstPct}%</td>
                      <td className="text-right">{inr(tax)}</td>
                      <td className="text-right font-extrabold">{inr(num(it.amount) + tax)}</td>
                    </tr>
                  );
                })}

                {items.length === 0 ? (
                  <tr>
                    <td className="py-8 text-center text-slate-500" colSpan={11}>
                      No line items recorded for this invoice.
                    </td>
                  </tr>
                ) : null}

                {/* Empty rows keep the document visually like a printed GST book */}
                {items.length > 0 &&
                  Array.from({ length: Math.max(0, 4 - items.length) }).map((_, idx) => (
                    <tr key={`empty-${idx}`} aria-hidden="true">
                      <td>&nbsp;</td>
                      <td>&nbsp;</td>
                      <td>&nbsp;</td>
                      <td>&nbsp;</td>
                      <td>&nbsp;</td>
                      <td>&nbsp;</td>
                      <td>&nbsp;</td>
                      <td>&nbsp;</td>
                      <td>&nbsp;</td>
                      <td>&nbsp;</td>
                      <td>&nbsp;</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Bottom summary */}
          <div className="grid grid-cols-[1fr_310px] border-t border-slate-300 max-[640px]:grid-cols-1">
            <div className="border-r border-slate-300 max-[640px]:border-r-0">
              <div className="gst-box-title">Amount in Words</div>
              <div className="border-b border-slate-300 p-3">
                <p className="text-[10px] font-bold leading-4">
                  {amountInWords(num(invoice.total))}
                </p>
              </div>

              {business?.bank_name || business?.upi_id ? (
                <div className="border-b border-slate-300">
                  <div className="gst-box-title">Bank / Payment Details</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 p-3 text-[9px]">
                    {business?.bank_name ? (
                      <>
                        <span className="text-slate-500">Bank</span>
                        <span className="font-semibold">
                          {business.bank_name}
                          {business.bank_branch ? ` — ${business.bank_branch}` : ""}
                        </span>
                      </>
                    ) : null}
                    {business?.bank_account ? (
                      <>
                        <span className="text-slate-500">A/C No.</span>
                        <span className="font-semibold">{business.bank_account}</span>
                      </>
                    ) : null}
                    {business?.bank_ifsc ? (
                      <>
                        <span className="text-slate-500">IFSC</span>
                        <span className="font-semibold">{business.bank_ifsc}</span>
                      </>
                    ) : null}
                    {business?.upi_id ? (
                      <>
                        <span className="text-slate-500">UPI</span>
                        <span className="font-semibold">{business.upi_id}</span>
                      </>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {business?.invoice_footer ? (
                <div>
                  <div className="gst-box-title">Terms & Conditions</div>
                  <p className="whitespace-pre-line p-3 text-[8.5px] leading-4 text-slate-600">
                    {business.invoice_footer}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="gst-total-box m-3 overflow-hidden">
              <div className="gst-box-title">GST & Invoice Summary</div>

              <div className="p-3">
                <div className="flex justify-between py-1 text-[9.5px]">
                  <span className="text-slate-500">Taxable Amount</span>
                  <span className="font-semibold">{inr(taxable)}</span>
                </div>

                {interstate ? (
                  <div className="flex justify-between py-1 text-[9.5px]">
                    <span className="text-slate-500">IGST @ {gstPct}%</span>
                    <span className="font-semibold">{inr(igst)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between py-1 text-[9.5px]">
                      <span className="text-slate-500">CGST @ {(gstPct / 2).toFixed(2)}%</span>
                      <span className="font-semibold">{inr(cgst)}</span>
                    </div>
                    <div className="flex justify-between py-1 text-[9.5px]">
                      <span className="text-slate-500">SGST @ {(gstPct / 2).toFixed(2)}%</span>
                      <span className="font-semibold">{inr(sgst)}</span>
                    </div>
                  </>
                )}

                <div className="flex justify-between py-1 text-[9.5px]">
                  <span className="text-slate-500">Round Off</span>
                  <span className="font-semibold">{inr(invoice.round_off)}</span>
                </div>

                <div className="gst-grand-total mt-2 flex items-center justify-between px-3 py-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Grand Total
                  </span>
                  <span className="text-[17px] font-extrabold">{inr(invoice.total)}</span>
                </div>

                <div className="mt-2 flex justify-between border-b border-slate-200 py-1.5 text-[9.5px]">
                  <span className="text-slate-500">Amount Paid</span>
                  <span className="font-semibold gst-paid">{inr(paid)}</span>
                </div>

                <div className="flex justify-between py-2 text-[11px] font-extrabold">
                  <span>Balance Due</span>
                  <span>{inr(balanceDue)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Certification / signatures */}
          <div className="grid grid-cols-2 border-t border-slate-300 max-[640px]:grid-cols-1">
            <div className="gst-signature border-r border-slate-300 p-4 max-[640px]:border-r-0">
              <p className="text-[8.5px] leading-4 text-slate-500">
                Certified that the particulars given above are true and correct.
              </p>
              <div className="mt-11">
                <div className="w-40 border-t border-slate-400 pt-1 text-[8px] font-semibold uppercase tracking-wider">
                  Customer&apos;s Signature
                </div>
              </div>
            </div>

            <div className="gst-signature p-4 text-right">
              <p className="text-[9px] text-slate-500">For</p>
              <p className="text-[11px] font-extrabold">{business?.legal_name || business?.name}</p>
              <div className="mt-9 ml-auto w-44 border-t border-slate-400 pt-1 text-center text-[8px] font-semibold uppercase tracking-wider">
                Authorised Signatory
              </div>
            </div>
          </div>

          <div className="border-t border-slate-300 bg-slate-50 px-4 py-2 text-center text-[7.5px] font-semibold uppercase tracking-[.12em] text-slate-500">
            Computer generated tax invoice • This is a system generated document
          </div>
        </div>

        <div className="no-print flex flex-wrap justify-end gap-2 pt-1">
          <Button variant="outline" onClick={share}>
            <Share2 className="mr-1.5 size-4" /> Share
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="mr-1.5 size-4" /> Print / Save PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DocRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={`border-r border-foreground/30 px-2 py-1.5 font-semibold uppercase tracking-wide last:border-r-0 ${className}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
  colSpan,
}: {
  children?: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={`border-r border-foreground/30 px-2 py-1.5 align-top last:border-r-0 ${className}`}
    >
      {children}
    </td>
  );
}
