import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness, useBusinessId, useTable, useInvalidate, errMessage } from "@/lib/data";
import { inr, num, GRADES, PAYMENT_METHODS } from "@/lib/timber";
import { PageHeader, LoadingSkeleton, EmptyState, ErrorState, StatusPill, statusTone } from "@/components/states";
import { SalePaymentDialog, SalePaymentsHistory } from "@/components/sale-payment-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/sales")({
  head: () => ({
    meta: [
      { title: "Sales — Timber ERP" },
      { name: "description", content: "Timber and furniture sales with automatic GST, stock checks and instant invoices." },
      { property: "og:title", content: "Sales — Timber ERP" },
      { property: "og:description", content: "Sell by CFT or by unit — stock is verified and reduced atomically." },
    ],
  }),
  component: SalesPage,
});

type Sale = {
  id: string; sale_number: string; customer_id: string | null; sale_type: string; sale_date: string;
  subtotal: number; cgst: number; sgst: number; igst: number; round_off: number; total: number;
  amount_paid: number; payment_status: string; payment_method: string | null;
};
type Customer = { id: string; name: string; state: string | null; gstin: string | null };
type StockRow = { id: string; item_type: string; grade: string | null; product_name: string | null; cft: number; quantity: number; avg_rate: number };

type Item = {
  key: string;
  item_type: string;
  grade: string;
  product_name: string;
  size_label: string;
  cft: string;
  quantity: string;
  rate: string;
};

let seq = 0;
const blankItem = (type: string): Item => ({
  key: `i${seq++}`, item_type: type, grade: "Grade 1", product_name: "", size_label: "",
  cft: "", quantity: "", rate: "",
});

function SalesPage() {
  const invalidate = useInvalidate();
  const salesQ = useTable<Sale>("sales", (q) => q.order("created_at", { ascending: false }));
  const customersQ = useTable<Customer>("customers", (q) => q.order("name"));
  const sales = salesQ.data ?? [];
  const customerName = (id: string | null) => (customersQ.data ?? []).find((c) => c.id === id)?.name ?? "Walk-in";

  return (
    <>
      <PageHeader
        title="Sales"
        description="Timber by CFT, furniture by unit — GST and invoices handled automatically."
        action={
          <div className="flex gap-2">
            <NewCustomer onDone={() => invalidate("customers")} />
            <NewSale onDone={() => invalidate("sales", "stock", "stock_movements", "invoices")} />
          </div>
        }
      />
      {salesQ.isLoading ? (
        <LoadingSkeleton />
      ) : salesQ.error ? (
        <ErrorState message={errMessage(salesQ.error)} onRetry={() => salesQ.refetch()} />
      ) : sales.length === 0 ? (
        <EmptyState title="No sales yet" description="Record your first sale — stock and invoices update instantly." />
      ) : (
        <div className="card-surface overflow-hidden">
          <table className="hidden w-full text-sm md:table">
            <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Sale</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 text-right font-medium">Taxable</th>
                <th className="px-4 py-3 text-right font-medium">GST</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 text-right font-medium">Paid</th>
                <th className="px-4 py-3 text-right font-medium">Balance</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => {
                const balance = Math.max(num(s.total) - num(s.amount_paid), 0);
                return (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{s.sale_number}</td>
                  <td className="px-4 py-3">{s.sale_date}</td>
                  <td className="px-4 py-3">{customerName(s.customer_id)}</td>
                  <td className="px-4 py-3 capitalize">{s.sale_type}</td>
                  <td className="px-4 py-3 text-right">{inr(s.subtotal)}</td>
                  <td className="px-4 py-3 text-right">{inr(num(s.cgst) + num(s.sgst) + num(s.igst))}</td>
                  <td className="px-4 py-3 text-right font-semibold">{inr(s.total)}</td>
                  <td className="px-4 py-3 text-right text-success">{inr(s.amount_paid)}</td>
                  <td className={`px-4 py-3 text-right ${balance > 0 ? "text-warning" : ""}`}>{inr(balance)}</td>
                  <td className="px-4 py-3"><StatusPill label={s.payment_status} tone={statusTone(s.payment_status)} /></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      {balance > 0.005 ? (
                        <SalePaymentDialog
                          saleId={s.id}
                          reference={s.sale_number}
                          party={customerName(s.customer_id)}
                          total={s.total}
                          paid={s.amount_paid}
                          method={s.payment_method}
                          onSaved={() => invalidate("sales", "sale_payments", "invoices")}
                        />
                      ) : null}
                      <SalePaymentsHistory
                        saleId={s.id}
                        reference={s.sale_number}
                        party={customerName(s.customer_id)}
                        total={s.total}
                        paid={s.amount_paid}
                      />
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          <div className="divide-y divide-border md:hidden">
            {sales.map((s) => {
              const balance = Math.max(num(s.total) - num(s.amount_paid), 0);
              return (
              <div key={s.id} className="space-y-2 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{s.sale_number}</span>
                  <StatusPill label={s.payment_status} tone={statusTone(s.payment_status)} />
                </div>
                <p className="text-xs text-muted-foreground">{s.sale_date} · {customerName(s.customer_id)}</p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div><p className="text-xs text-muted-foreground">Total</p><p className="font-semibold">{inr(s.total)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Paid</p><p>{inr(s.amount_paid)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Balance</p><p className={balance > 0 ? "text-warning" : ""}>{inr(balance)}</p></div>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {balance > 0.005 ? (
                    <SalePaymentDialog
                      saleId={s.id}
                      reference={s.sale_number}
                      party={customerName(s.customer_id)}
                      total={s.total}
                      paid={s.amount_paid}
                      method={s.payment_method}
                      onSaved={() => invalidate("sales", "sale_payments", "invoices")}
                    />
                  ) : null}
                  <SalePaymentsHistory
                    saleId={s.id}
                    reference={s.sale_number}
                    party={customerName(s.customer_id)}
                    total={s.total}
                    paid={s.amount_paid}
                  />
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

function NewCustomer({ onDone }: { onDone: () => void }) {
  const { data: businessId } = useBusinessId();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", phone: "", gstin: "", state: "", state_code: "", address: "" });
  const save = async () => {
    if (!f.name.trim()) { toast.error("Customer name is required"); return; }
    const { error } = await supabase.from("customers").insert({
      business_id: businessId!, name: f.name, phone: f.phone || null, gstin: f.gstin || null,
      state: f.state || null, state_code: f.state_code || null, address: f.address || null,
    } as never);
    if (error) { toast.error(errMessage(error)); return; }
    onDone(); setOpen(false); setF({ name: "", phone: "", gstin: "", state: "", state_code: "", address: "" });
    toast.success("Customer added");
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline"><Plus className="mr-1.5 size-4" /> Customer</Button></DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add customer</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-1.5"><Label>Name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Phone</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>GSTIN</Label><Input value={f.gstin} onChange={(e) => setF({ ...f, gstin: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>State</Label><Input value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>State code</Label><Input value={f.state_code} onChange={(e) => setF({ ...f, state_code: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label>Address</Label><Textarea value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={save}>Save customer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewSale({ onDone }: { onDone: () => void }) {
  const { data: business } = useBusiness();
  const { data: businessId } = useBusinessId();
  const customersQ = useTable<Customer>("customers", (q) => q.order("name"));
  const stockQ = useTable<StockRow>("stock");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saleType, setSaleType] = useState("timber");
  const [items, setItems] = useState<Item[]>([blankItem("timber")]);
  const [f, setF] = useState({
    customer_id: "", sale_date: new Date().toISOString().slice(0, 10),
    is_interstate: false, gst_rate: "", amount_paid: "", payment_method: "Cash", notes: "",
  });

  const gstRate = f.gst_rate === "" ? num(business?.gst_rate, 18) : num(f.gst_rate);
  const lines = items.map((it) => ({
    ...it,
    amount:
      it.item_type === "timber"
        ? num(it.cft) * num(it.rate)
        : num(it.quantity) * num(it.rate),
  }));
  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  const tax = Math.round(subtotal * gstRate) / 100;
  const gross = subtotal + tax;
  const rounded = Math.round(gross);

  const stockFor = (grade: string) =>
    (stockQ.data ?? []).find((s) => s.item_type === "timber" && s.grade === grade);

  const setItem = (key: string, patch: Partial<Item>) =>
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  const changeType = (t: string) => {
    setSaleType(t);
    setItems([blankItem(t)]);
  };

  const submit = async () => {
    if (lines.length === 0 || subtotal <= 0) { toast.error("Add at least one item with an amount"); return; }
    for (const l of lines) {
      if (l.item_type === "timber" && num(l.cft) <= 0) { toast.error("Every timber line needs CFT"); return; }
      if (l.item_type === "furniture" && (num(l.quantity) <= 0 || !l.product_name.trim())) {
        toast.error("Every furniture line needs a product and quantity"); return;
      }
      if (num(l.rate) < 0) { toast.error("Rates cannot be negative"); return; }
    }
    setSaving(true);
    try {
      const payload = {
        business_id: businessId!,
        customer_id: f.customer_id || null,
        sale_type: saleType,
        sale_date: f.sale_date,
        gst_rate: gstRate,
        is_interstate: f.is_interstate,
        amount_paid: num(f.amount_paid),
        payment_method: f.payment_method,
        notes: f.notes || null,
        items: lines.map((l) => ({
          item_type: l.item_type,
          grade: l.item_type === "timber" ? l.grade : null,
          product_name: l.item_type === "furniture" ? l.product_name : null,
          size_label: l.size_label || null,
          cft: l.item_type === "timber" ? num(l.cft) : 0,
          quantity: l.item_type === "furniture" ? num(l.quantity) : 0,
          rate: num(l.rate),
          amount: l.amount,
        })),
      };
      // Stock check + reduction + sale + invoice all happen inside one DB transaction.
      const { data, error } = await supabase.rpc("create_sale", { _payload: payload as never });
      if (error) throw error;
      const res = data as unknown as { invoice_number: string; total: number };
      onDone();
      setOpen(false);
      setItems([blankItem(saleType)]);
      toast.success(`Sale confirmed — invoice ${res.invoice_number} for ${inr(res.total)}`);
    } catch (e) {
      toast.error(errMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="mr-1.5 size-4" /> New sale</Button></DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle>New sale</DialogTitle></DialogHeader>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Sale type</Label>
            <Select value={saleType} onValueChange={changeType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="timber">Timber</SelectItem>
                <SelectItem value="furniture">Furniture</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Customer</Label>
            <Select value={f.customer_id} onValueChange={(v) => setF({ ...f, customer_id: v })}>
              <SelectTrigger><SelectValue placeholder="Walk-in" /></SelectTrigger>
              <SelectContent>
                {(customersQ.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={f.sale_date} onChange={(e) => setF({ ...f, sale_date: e.target.value })} />
          </div>
        </div>

        <div className="space-y-3">
          {items.map((it) => {
            const available = it.item_type === "timber" ? num(stockFor(it.grade)?.cft) : null;
            return (
              <div key={it.key} className="rounded-xl border border-border p-4">
                <div className="grid gap-3 sm:grid-cols-5">
                  {it.item_type === "timber" ? (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Grade</Label>
                        <Select value={it.grade} onValueChange={(v) => setItem(it.key, { grade: v })}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>{GRADES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Size / note</Label>
                        <Input className="h-9" value={it.size_label} onChange={(e) => setItem(it.key, { size_label: e.target.value })} placeholder='e.g. 10 × 22"' />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">CFT</Label>
                        <Input className="h-9" inputMode="decimal" value={it.cft} onChange={(e) => setItem(it.key, { cft: e.target.value })} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Product</Label>
                        <Input className="h-9" value={it.product_name} onChange={(e) => setItem(it.key, { product_name: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Custom size</Label>
                        <Input className="h-9" value={it.size_label} onChange={(e) => setItem(it.key, { size_label: e.target.value })} placeholder="6.25 × 6 ft" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Quantity</Label>
                        <Input className="h-9" inputMode="decimal" value={it.quantity} onChange={(e) => setItem(it.key, { quantity: e.target.value })} />
                      </div>
                    </>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Rate (₹)</Label>
                    <Input className="h-9" inputMode="decimal" value={it.rate} onChange={(e) => setItem(it.key, { rate: e.target.value })} />
                  </div>
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Amount</p>
                      <p className="font-medium">
                        {inr(it.item_type === "timber" ? num(it.cft) * num(it.rate) : num(it.quantity) * num(it.rate))}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-danger"
                      onClick={() => setItems(items.filter((x) => x.key !== it.key))}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
                {available !== null ? (
                  <p className={`mt-2 text-xs ${num(it.cft) > available ? "text-danger" : "text-muted-foreground"}`}>
                    Available: {available.toFixed(2)} CFT
                  </p>
                ) : null}
              </div>
            );
          })}
          <Button variant="outline" size="sm" onClick={() => setItems([...items, blankItem(saleType)])}>
            <Plus className="mr-1.5 size-4" /> Add item
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-surface px-4 py-3">
              <Label htmlFor="interstate" className="text-sm font-normal">Inter-state sale (IGST)</Label>
              <Switch id="interstate" checked={f.is_interstate} onCheckedChange={(v) => setF({ ...f, is_interstate: v })} />
            </div>
            <div className="space-y-1.5">
              <Label>GST rate (%)</Label>
              <Input inputMode="decimal" value={f.gst_rate} placeholder={String(num(business?.gst_rate, 18))}
                onChange={(e) => setF({ ...f, gst_rate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Amount paid (₹)</Label>
              <Input inputMode="decimal" value={f.amount_paid} onChange={(e) => setF({ ...f, amount_paid: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Payment method</Label>
              <Select value={f.payment_method} onValueChange={(v) => setF({ ...f, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-xl bg-surface p-4 text-sm">
            <div className="flex justify-between py-1"><span className="text-muted-foreground">Taxable value</span><span>{inr(subtotal)}</span></div>
            {f.is_interstate ? (
              <div className="flex justify-between py-1"><span className="text-muted-foreground">IGST @ {gstRate}%</span><span>{inr(tax)}</span></div>
            ) : (
              <>
                <div className="flex justify-between py-1"><span className="text-muted-foreground">CGST @ {gstRate / 2}%</span><span>{inr(tax / 2)}</span></div>
                <div className="flex justify-between py-1"><span className="text-muted-foreground">SGST @ {gstRate / 2}%</span><span>{inr(tax / 2)}</span></div>
              </>
            )}
            <div className="flex justify-between py-1"><span className="text-muted-foreground">Round off</span><span>{inr(rounded - gross)}</span></div>
            <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-semibold">
              <span>Total</span><span>{inr(rounded)}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Stock is verified and reduced inside the database as part of this sale — overselling is blocked.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Confirming…" : "Confirm sale"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

