import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessId, useTable, useInvalidate, errMessage } from "@/lib/data";
import { inr, num, PAYMENT_METHODS } from "@/lib/timber";
import { PageHeader, LoadingSkeleton, EmptyState, ErrorState, StatusPill, statusTone } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/wages")({
  head: () => ({
    meta: [
      { title: "Worker Wages — Timber ERP" },
      { name: "description", content: "Daily, half-day and custom wages with overtime, advances and payment history." },
      { property: "og:title", content: "Worker Wages — Timber ERP" },
      { property: "og:description", content: "Calculate and settle worker wages with full payment history." },
    ],
  }),
  component: WagesPage,
});

type Worker = { id: string; name: string; phone: string | null; role: string | null; daily_wage: number; active: boolean };
type Wage = {
  id: string; worker_id: string; wage_date: string; wage_type: string;
  base_wage: number; overtime: number; bonus: number; advance: number; deduction: number;
  final_wage: number; amount_paid: number; payment_status: string;
};

function WagesPage() {
  const { data: businessId } = useBusinessId();
  const invalidate = useInvalidate();
  const workersQ = useTable<Worker>("workers", (q) => q.order("name"));
  const wagesQ = useTable<Wage>("worker_wages", (q) => q.order("wage_date", { ascending: false }));
  const workers = workersQ.data ?? [];
  const wages = wagesQ.data ?? [];
  const workerName = (id: string) => workers.find((w) => w.id === id)?.name ?? "—";

  const totals = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7);
    const inMonth = wages.filter((w) => w.wage_date.startsWith(month));
    return {
      period: inMonth.reduce((s, w) => s + num(w.final_wage), 0),
      pending: wages.reduce((s, w) => s + Math.max(num(w.final_wage) - num(w.amount_paid), 0), 0),
    };
  }, [wages]);

  return (
    <>
      <PageHeader
        title="Worker Wages"
        description="Base wage + overtime + bonus − advance − deduction = final wage."
        action={
          <div className="flex gap-2">
            <NewWorker businessId={businessId} onDone={() => invalidate("workers")} />
            <NewWage businessId={businessId} workers={workers} onDone={() => invalidate("worker_wages")} />
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="card-surface p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Current period wages</p>
          <p className="mt-2 text-xl font-semibold">{inr(totals.period)}</p>
        </div>
        <div className="card-surface p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Outstanding to workers</p>
          <p className="mt-2 text-xl font-semibold text-warning">{inr(totals.pending)}</p>
        </div>
      </div>

      <Tabs defaultValue="wages">
        <TabsList className="mb-6">
          <TabsTrigger value="wages">Wage entries</TabsTrigger>
          <TabsTrigger value="workers">Workers</TabsTrigger>
        </TabsList>

        <TabsContent value="wages">
          {wagesQ.isLoading ? (
            <LoadingSkeleton />
          ) : wagesQ.error ? (
            <ErrorState message={errMessage(wagesQ.error)} onRetry={() => wagesQ.refetch()} />
          ) : wages.length === 0 ? (
            <EmptyState title="No wage entries" description="Add a worker, then record their first wage entry." />
          ) : (
            <div className="card-surface overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Worker</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 text-right font-medium">Base</th>
                    <th className="px-5 py-3 text-right font-medium">OT / Bonus</th>
                    <th className="px-5 py-3 text-right font-medium">Adv / Ded</th>
                    <th className="px-5 py-3 text-right font-medium">Final</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 text-right font-medium">Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {wages.map((w) => (
                    <tr key={w.id} className="border-t border-border">
                      <td className="px-5 py-3">{w.wage_date}</td>
                      <td className="px-5 py-3 font-medium">{workerName(w.worker_id)}</td>
                      <td className="px-5 py-3 capitalize">{w.wage_type.replace("_", " ")}</td>
                      <td className="px-5 py-3 text-right">{inr(w.base_wage)}</td>
                      <td className="px-5 py-3 text-right">{inr(num(w.overtime) + num(w.bonus))}</td>
                      <td className="px-5 py-3 text-right">{inr(num(w.advance) + num(w.deduction))}</td>
                      <td className="px-5 py-3 text-right font-semibold">{inr(w.final_wage)}</td>
                      <td className="px-5 py-3"><StatusPill label={w.payment_status} tone={statusTone(w.payment_status)} /></td>
                      <td className="px-5 py-3 text-right">
                        <PayWage wage={w} businessId={businessId} onDone={() => invalidate("worker_wages", "wage_payments")} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="workers">
          {workersQ.isLoading ? (
            <LoadingSkeleton rows={3} />
          ) : workers.length === 0 ? (
            <EmptyState title="No workers yet" description="Add your yard workers to start recording wages." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {workers.map((w) => (
                <div key={w.id} className="card-surface p-5">
                  <p className="font-medium">{w.name}</p>
                  <p className="text-sm text-muted-foreground">{w.role ?? "Worker"} · {w.phone ?? "No phone"}</p>
                  <p className="mt-3 text-sm">Daily wage: <span className="font-medium">{inr(w.daily_wage)}</span></p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

function NewWorker({ businessId, onDone }: { businessId?: string | undefined; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", phone: "", role: "", daily_wage: "" });
  const save = async () => {
    if (!f.name.trim()) { toast.error("Worker name is required"); return; }
    const { error } = await supabase.from("workers").insert({
      business_id: businessId!, name: f.name, phone: f.phone || null,
      role: f.role || null, daily_wage: num(f.daily_wage),
    } as never);
    if (error) { toast.error(errMessage(error)); return; }
    onDone(); setOpen(false); setF({ name: "", phone: "", role: "", daily_wage: "" });
    toast.success("Worker added");
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline"><Plus className="mr-1.5 size-4" /> Worker</Button></DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add worker</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-1.5"><Label>Name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Phone</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Role</Label><Input value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Daily wage (₹)</Label><Input type="number" step="any" value={f.daily_wage} onChange={(e) => setF({ ...f, daily_wage: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={save}>Save worker</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewWage({ businessId, workers, onDone }: { businessId?: string | undefined; workers: Worker[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    worker_id: "", wage_date: new Date().toISOString().slice(0, 10), wage_type: "daily",
    base_wage: "", overtime: "", bonus: "", advance: "", deduction: "",
  });
  const worker = workers.find((w) => w.id === f.worker_id);
  const base =
    f.wage_type === "custom"
      ? num(f.base_wage)
      : num(worker?.daily_wage) * (f.wage_type === "half_day" ? 0.5 : 1);
  const final = base + num(f.overtime) + num(f.bonus) - num(f.advance) - num(f.deduction);

  const save = async () => {
    if (!f.worker_id) { toast.error("Select a worker"); return; }
    if (base < 0) { toast.error("Base wage cannot be negative"); return; }
    const { error } = await supabase.from("worker_wages").insert({
      business_id: businessId!, worker_id: f.worker_id, wage_date: f.wage_date, wage_type: f.wage_type,
      base_wage: base, overtime: num(f.overtime), bonus: num(f.bonus), advance: num(f.advance),
      deduction: num(f.deduction), final_wage: final, amount_paid: 0, payment_status: "pending",
    } as never);
    if (error) { toast.error(errMessage(error)); return; }
    onDone(); setOpen(false);
    toast.success("Wage entry recorded");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="mr-1.5 size-4" /> Wage entry</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>New wage entry</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Worker</Label>
            <Select value={f.worker_id} onValueChange={(v) => setF({ ...f, worker_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select worker" /></SelectTrigger>
              <SelectContent>
                {workers.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={f.wage_date} onChange={(e) => setF({ ...f, wage_date: e.target.value })} /></div>
          <div className="space-y-1.5">
            <Label>Wage type</Label>
            <Select value={f.wage_type} onValueChange={(v) => setF({ ...f, wage_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="half_day">Half day</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {f.wage_type === "custom" ? (
            <div className="space-y-1.5"><Label>Base wage (₹)</Label><Input type="number" step="any" value={f.base_wage} onChange={(e) => setF({ ...f, base_wage: e.target.value })} /></div>
          ) : (
            <div className="space-y-1.5"><Label>Base wage</Label><Input value={inr(base)} readOnly className="bg-muted" /></div>
          )}
          <div className="space-y-1.5"><Label>Overtime (₹)</Label><Input type="number" step="any" value={f.overtime} onChange={(e) => setF({ ...f, overtime: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Bonus (₹)</Label><Input type="number" step="any" value={f.bonus} onChange={(e) => setF({ ...f, bonus: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Advance (₹)</Label><Input type="number" step="any" value={f.advance} onChange={(e) => setF({ ...f, advance: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Deduction (₹)</Label><Input type="number" step="any" value={f.deduction} onChange={(e) => setF({ ...f, deduction: e.target.value })} /></div>
        </div>
        <div className="rounded-xl bg-surface p-4 text-sm">
          Final wage: <span className="text-base font-semibold">{inr(final)}</span>
        </div>
        <DialogFooter><Button onClick={save}>Save entry</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PayWage({ wage, businessId, onDone }: { wage: Wage; businessId?: string | undefined; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const balance = Math.max(num(wage.final_wage) - num(wage.amount_paid), 0);
  const [amount, setAmount] = useState(String(balance));
  const [method, setMethod] = useState("Cash");

  const pay = async () => {
    const amt = num(amount);
    if (amt <= 0 || amt > balance) { toast.error("Enter a valid amount up to the balance"); return; }
    const paid = num(wage.amount_paid) + amt;
    const { error } = await supabase.from("wage_payments").insert({
      business_id: businessId!, wage_id: wage.id, amount: amt, method,
    } as never);
    if (error) { toast.error(errMessage(error)); return; }
    const { error: e2 } = await supabase
      .from("worker_wages")
      .update({
        amount_paid: paid,
        payment_status: paid >= num(wage.final_wage) ? "paid" : "partial",
      } as never)
      .eq("id", wage.id);
    if (e2) { toast.error(errMessage(e2)); return; }
    onDone(); setOpen(false);
    toast.success("Payment recorded");
  };

  if (balance <= 0) return <span className="text-xs text-success">Settled</span>;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline">Pay</Button></DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Record payment</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Balance {inr(balance)}</p>
        <div className="space-y-1.5"><Label>Amount</Label><Input type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        <div className="space-y-1.5">
          <Label>Method</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <DialogFooter><Button onClick={pay}>Save payment</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
