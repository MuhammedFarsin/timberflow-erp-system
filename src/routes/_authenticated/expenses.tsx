import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessId, useTable, useInvalidate, errMessage } from "@/lib/data";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, inr, num } from "@/lib/timber";
import { PageHeader, LoadingSkeleton, EmptyState, ErrorState, StatusPill, statusTone } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({
    meta: [
      { title: "Expenses — Timber ERP" },
      { name: "description", content: "Track transport, loading, salary, fuel and other timber business expenses." },
      { property: "og:title", content: "Expenses — Timber ERP" },
      { property: "og:description", content: "Category-wise expense tracking with monthly and pending totals." },
    ],
  }),
  component: ExpensesPage,
});

type Expense = {
  id: string;
  category: string;
  expense_date: string;
  description: string | null;
  amount: number;
  payment_method: string | null;
  status: string;
  notes: string | null;
  attachment_url: string | null;
};

function KpiCard({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="card-surface p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-2 text-xl font-semibold ${tone ?? ""}`}>{value}</p>
    </div>
  );
}

function ExpensesPage() {
  const { data: businessId } = useBusinessId();
  const invalidate = useInvalidate();
  const { data, isLoading, error, refetch } = useTable<Expense>("expenses", (q) =>
    q.order("expense_date", { ascending: false }),
  );
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    category: "Transport",
    expense_date: new Date().toISOString().slice(0, 10),
    description: "",
    amount: "",
    payment_method: "Cash",
    status: "paid",
    notes: "",
    attachment_url: "",
  });

  const rows = data ?? [];
  const totals = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);
    return {
      today: rows.filter((r) => r.expense_date === today).reduce((s, r) => s + num(r.amount), 0),
      month: rows.filter((r) => r.expense_date.startsWith(month)).reduce((s, r) => s + num(r.amount), 0),
      pending: rows.filter((r) => r.status === "pending").reduce((s, r) => s + num(r.amount), 0),
      total: rows.reduce((s, r) => s + num(r.amount), 0),
    };
  }, [rows]);

  const save = async () => {
    if (num(form.amount) <= 0) {
      toast.error("Amount must be greater than zero");
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error: err } = await supabase.from("expenses").insert({
        business_id: businessId!,
        category: form.category,
        expense_date: form.expense_date,
        description: form.description || null,
        amount: num(form.amount),
        payment_method: form.payment_method,
        status: form.status,
        notes: form.notes || null,
        attachment_url: form.attachment_url || null,
        created_by: userData.user?.id ?? null,
        updated_by: userData.user?.id ?? null,
      } as never);
      if (err) throw err;
      invalidate("expenses");
      setOpen(false);
      setForm({ ...form, description: "", amount: "", notes: "", attachment_url: "" });
      toast.success("Expense recorded");
    } catch (e) {
      toast.error(errMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const { error: err } = await supabase.from("expenses").delete().eq("id", id);
    if (err) { toast.error(errMessage(err)); return; }
    invalidate("expenses");
    toast.success("Expense deleted");
  };

  return (
    <>
      <PageHeader
        title="Expenses"
        description="Every rupee that leaves the yard, categorised."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-1.5 size-4" /> Add expense
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>New expense</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Amount (₹)</Label>
                  <Input type="number" step="any" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Payment method</Label>
                  <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Attachment URL</Label>
                  <Input value={form.attachment_url} onChange={(e) => setForm({ ...form, attachment_url: e.target.value })} placeholder="Optional" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Description</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save expense"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Today" value={inr(totals.today)} />
        <KpiCard label="This month" value={inr(totals.month)} />
        <KpiCard label="Pending" value={inr(totals.pending)} tone="text-warning" />
        <KpiCard label="Total" value={inr(totals.total)} />
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <ErrorState message={errMessage(error)} onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title="No expenses yet" description="Record your first expense to start tracking costs." />
      ) : (
        <div className="card-surface overflow-hidden">
          <table className="hidden w-full text-sm md:table">
            <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Description</th>
                <th className="px-5 py-3 font-medium">Method</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Amount</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-5 py-3">{r.expense_date}</td>
                  <td className="px-5 py-3">{r.category}</td>
                  <td className="px-5 py-3 text-muted-foreground">{r.description ?? "—"}</td>
                  <td className="px-5 py-3">{r.payment_method ?? "—"}</td>
                  <td className="px-5 py-3"><StatusPill label={r.status} tone={statusTone(r.status)} /></td>
                  <td className="px-5 py-3 text-right font-medium">{inr(r.amount)}</td>
                  <td className="px-5 py-3 text-right">
                    <DeleteButton onConfirm={() => remove(r.id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="divide-y divide-border md:hidden">
            {rows.map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{r.category}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.expense_date} · {r.description ?? "No description"}
                  </p>
                  <div className="mt-2"><StatusPill label={r.status} tone={statusTone(r.status)} /></div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{inr(r.amount)}</p>
                  <DeleteButton onConfirm={() => remove(r.id)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export function DeleteButton({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-danger">
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this record?</AlertDialogTitle>
          <AlertDialogDescription>This action can't be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
