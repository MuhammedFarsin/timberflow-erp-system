import { useState } from "react";
import { toast } from "sonner";
import { IndianRupee, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { errMessage, useBusinessId, useTable } from "@/lib/data";
import { inr, num } from "@/lib/timber";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusPill, statusTone } from "@/components/states";

export const SALE_PAY_METHODS = ["Cash", "UPI", "Bank Transfer", "Cheque", "Other"];

export type SalePayment = {
  id: string;
  sale_id: string;
  amount: number;
  payment_method: string | null;
  payment_date: string;
  notes: string | null;
};

/** Sales-only payment status derived from the live paid/total figures. */
export function salePaymentStatus(total: number, paid: number): "unpaid" | "partial" | "paid" {
  const t = num(total);
  const p = num(paid);
  if (p <= 0.005) return "unpaid";
  if (p >= t - 0.005) return "paid";
  return "partial";
}

/** Records a customer payment against one sale. Independent of the Purchases flow. */
export function SalePaymentDialog({
  saleId,
  reference,
  party,
  total,
  paid,
  method,
  onSaved,
}: {
  saleId: string;
  reference: string;
  party?: string;
  total: number;
  paid: number;
  method?: string | null;
  onSaved: () => void;
}) {
  const { data: businessId } = useBusinessId();
  const balance = Math.max(num(total) - num(paid), 0);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payMethod, setPayMethod] = useState(method && SALE_PAY_METHODS.includes(method) ? method : "Cash");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const entered = num(amount);
  const previewPaid = Math.min(num(paid) + Math.max(entered, 0), num(total));
  const previewBalance = Math.max(num(total) - previewPaid, 0);
  const previewStatus = salePaymentStatus(total, previewPaid);

  const submit = async () => {
    const add = entered;
    if (add <= 0) {
      toast.error("Enter a payment amount greater than zero");
      return;
    }
    if (add > balance + 0.005) {
      toast.error(`Overpayment blocked — the balance due on ${reference} is only ${inr(balance)}.`);
      return;
    }
    setSaving(true);
    try {
      const newPaid = Math.min(num(paid) + add, num(total));
      const status = salePaymentStatus(total, newPaid);
      const { data: userData } = await supabase.auth.getUser();

      const { error: payErr } = await supabase.from("sale_payments").insert({
        business_id: businessId!,
        sale_id: saleId,
        amount: add,
        payment_method: payMethod,
        payment_date: payDate,
        notes: notes || null,
        created_by: userData.user?.id ?? null,
      } as never);
      if (payErr) throw payErr;

      const { error } = await supabase
        .from("sales")
        .update({
          amount_paid: newPaid,
          payment_method: payMethod,
          payment_status: status === "unpaid" ? "pending" : status,
        } as never)
        .eq("id", saleId);
      if (error) throw error;

      await supabase
        .from("invoices")
        .update({ status: status === "unpaid" ? "unpaid" : status } as never)
        .eq("sale_id", saleId);

      const newBalance = Math.max(num(total) - newPaid, 0);
      toast.success(
        status === "paid"
          ? `${reference} fully settled on ${payDate} — ${inr(newPaid)} received`
          : `${inr(add)} recorded on ${payDate} · balance ${inr(newBalance)}`,
      );
      setAmount("");
      setNotes("");
      setOpen(false);
      onSaved();
    } catch (e) {
      toast.error(errMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={balance <= 0.005}>
          <IndianRupee className="mr-1.5 size-3.5" /> Update payment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update payment · {reference}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="rounded-xl bg-surface p-4 text-sm">
            {party ? <p className="mb-2 font-medium">{party}</p> : null}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="font-medium">{inr(total)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Already paid</p>
                <p className="font-medium">{inr(paid)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Balance</p>
                <p className="font-semibold text-warning">{inr(balance)}</p>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sale-pay-amount">New payment amount (₹)</Label>
            <Input
              id="sale-pay-amount"
              autoFocus
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={balance.toFixed(2)}
            />
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setAmount(balance.toFixed(2))}>
              Settle full balance
            </Button>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sale-pay-date">Payment date</Label>
            <Input id="sale-pay-date" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Payment method</Label>
            <Select value={payMethod} onValueChange={setPayMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SALE_PAY_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sale-pay-notes">Notes (optional)</Label>
            <Textarea id="sale-pay-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="space-y-1 rounded-xl border border-border p-4 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Total paid after this</span><span className="font-medium">{inr(previewPaid)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Balance</span><span className="font-medium">{inr(previewBalance)}</span></div>
            <div className="flex items-center justify-between pt-1"><span className="text-muted-foreground">Status</span><StatusPill label={previewStatus} tone={statusTone(previewStatus)} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save payment"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Read-only payment history for one sale. */
export function SalePaymentsHistory({
  saleId,
  reference,
  party,
  total,
  paid,
}: {
  saleId: string;
  reference: string;
  party?: string;
  total: number;
  paid: number;
}) {
  const [open, setOpen] = useState(false);
  const paymentsQ = useTable<SalePayment>(
    "sale_payments",
    (q) => q.eq("sale_id", saleId).order("payment_date", { ascending: true }),
    [saleId],
  );
  const payments = paymentsQ.data ?? [];
  const balance = Math.max(num(total) - num(paid), 0);
  const status = salePaymentStatus(total, paid);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <History className="mr-1.5 size-3.5" /> View payments
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Payments · {reference}</DialogTitle>
        </DialogHeader>
        {party ? <p className="text-sm text-muted-foreground">{party}</p> : null}
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 text-right font-medium">Amount</th>
                <th className="px-3 py-2 font-medium">Method</th>
                <th className="px-3 py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-3 py-2">{p.payment_date}</td>
                  <td className="px-3 py-2 text-right">{inr(p.amount)}</td>
                  <td className="px-3 py-2">{p.payment_method ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{p.notes ?? "—"}</td>
                </tr>
              ))}
              {payments.length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-3 text-muted-foreground">No payment records yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="space-y-1 rounded-xl bg-surface p-4 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Total amount</span><span>{inr(total)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Total paid</span><span>{inr(paid)}</span></div>
          <div className="flex justify-between font-medium"><span>Balance</span><span>{inr(balance)}</span></div>
          <div className="flex items-center justify-between pt-1"><span className="text-muted-foreground">Status</span><StatusPill label={status} tone={statusTone(status)} /></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
