import { useCallback, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Trash2, ArrowLeft, Rows3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness, useBusinessId, useTable, useInvalidate, errMessage } from "@/lib/data";
import {
  computeRow,
  inr,
  cftFmt,
  num,
  GRADES,
  PAYMENT_METHODS,
  type LogRow,
  type GradeConfig,
} from "@/lib/timber";
import {
  PageHeader,
  LoadingSkeleton,
  EmptyState,
  ErrorState,
  StatusPill,
  statusTone,
} from "@/components/states";
import {
  PurchasePaymentDialog,
  PurchasePaymentsHistory,
} from "@/components/purchase-payment-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/purchases")({
  head: () => ({
    meta: [
      { title: "Purchases — Timber ERP" },
      {
        name: "description",
        content:
          "Bulk-enter hundreds of timber logs with automatic CFT, grade and rate calculation.",
      },
      { property: "og:title", content: "Purchases — Timber ERP" },
      {
        property: "og:description",
        content: "Spreadsheet-fast log entry with live CFT totals and supplier payments.",
      },
    ],
  }),
  component: PurchasesPage,
});

type Supplier = {
  id: string;
  name: string;
  phone: string | null;
  gstin?: string | null;
  address?: string | null;
  state?: string | null;
};
type Purchase = {
  id: string;
  purchase_number: string;
  supplier_id: string | null;
  purchase_date: string;
  status: string;
  total_logs: number;
  total_cft: number;
  timber_value: number;
  final_amount: number;
  amount_paid: number;
  stock_applied: boolean;
  payment_method: string | null;
};

let rowSeq = 0;
const newRow = (allowance: number): LogRow => ({
  key: `r${rowSeq++}`,
  length: "",
  girth: "",
  allowance: String(allowance ?? 0),
  grade: "",
  rate: "",
  customRate: false,
});

function PurchasesPage() {
  const [mode, setMode] = useState<"list" | "new">("list");
  return mode === "new" ? (
    <PurchaseEditor onClose={() => setMode("list")} />
  ) : (
    <PurchaseList onNew={() => setMode("new")} />
  );
}

function SupplierPreview({ supplier }: { supplier: Supplier | null }) {
  const [open, setOpen] = useState(false);

  if (!supplier) return <span>—</span>;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="text-left font-medium hover:underline underline-offset-4">
          {supplier.name}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Supplier details</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Supplier name</p>
            <p className="mt-1 font-medium">{supplier.name}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="mt-1">{supplier.phone || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">GSTIN</p>
              <p className="mt-1">{supplier.gstin || "—"}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">State</p>
            <p className="mt-1">{supplier.state || "—"}</p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Address</p>
            <p className="mt-1 whitespace-pre-wrap">{supplier.address || "—"}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReceiveButton({
  purchase,
  onConfirm,
  fullWidth,
}: {
  purchase: Purchase;
  onConfirm: (id: string) => void;
  fullWidth?: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" className={fullWidth ? "w-full" : undefined}>
          Mark received
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Move this purchase into current stock?</AlertDialogTitle>
          <AlertDialogDescription>
            {purchase.purchase_number} will add {num(purchase.total_cft).toFixed(2)} CFT to current
            stock.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => onConfirm(purchase.id)}>Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeleteButton({
  purchase,
  onConfirm,
}: {
  purchase: Purchase;
  onConfirm: (id: string) => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="text-muted-foreground hover:text-danger"
          aria-label={`Delete ${purchase.purchase_number}`}
        >
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {purchase.purchase_number}?</AlertDialogTitle>
          <AlertDialogDescription>
            All logs on this purchase will be removed. This can't be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => onConfirm(purchase.id)}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function PurchaseList({ onNew }: { onNew: () => void }) {
  const invalidate = useInvalidate();
  const { data, isLoading, error, refetch } = useTable<Purchase>("purchases", (q) =>
    q.order("created_at", { ascending: false }),
  );
  const suppliersQ = useTable<Supplier>("suppliers", (q) => q.order("name"));
  const rows = data ?? [];
  const supplierById = (id: string | null) =>
    (suppliersQ.data ?? []).find((s) => s.id === id) ?? null;
  const supplierName = (id: string | null) => supplierById(id)?.name ?? "—";

  const receive = async (id: string) => {
    const { error: err } = await supabase.rpc("receive_purchase", { _purchase_id: id });
    if (err) {
      toast.error(errMessage(err));
      return;
    }
    invalidate("purchases", "stock", "upcoming_stock", "stock_movements");
    toast.success("Purchase received — stock updated");
  };

  const remove = async (id: string) => {
    const { error: err } = await supabase.from("purchases").delete().eq("id", id);
    if (err) {
      toast.error(errMessage(err));
      return;
    }
    invalidate("purchases", "upcoming_stock");
    toast.success("Purchase deleted");
  };

  return (
    <>
      <PageHeader
        title="Purchases"
        description="Every timber lot bought, log by log."
        action={
          <div className="flex gap-2">
            <NewSupplier onDone={() => invalidate("suppliers")} />
            <Button onClick={onNew}>
              <Plus className="mr-1.5 size-4" /> New purchase
            </Button>
          </div>
        }
      />
      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <ErrorState message={errMessage(error)} onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No purchases yet"
          description="Create your first purchase and enter logs in bulk."
          action={
            <Button onClick={onNew}>
              <Plus className="mr-1.5 size-4" /> New purchase
            </Button>
          }
        />
      ) : (
        <div className="card-surface overflow-hidden">
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-max border-collapse text-sm">
              <thead className="bg-surface text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Number</th>
                  <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Date</th>
                  <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Supplier</th>
                  <th className="px-4 py-3 text-right font-medium whitespace-nowrap">CFT</th>
                  <th className="px-4 py-3 text-right font-medium whitespace-nowrap">Total</th>
                  <th className="px-4 py-3 text-right font-medium whitespace-nowrap">Paid</th>
                  <th className="px-4 py-3 text-right font-medium whitespace-nowrap">Balance</th>
                  <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Status</th>
                  <th className="sticky right-0 z-10 border-l border-border bg-surface px-4 py-3 text-right font-medium whitespace-nowrap">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const balance = Math.max(num(p.final_amount) - num(p.amount_paid), 0);
                  return (
                    <tr key={p.id} className="border-t border-border">
                      <td className="px-4 py-3 font-medium whitespace-nowrap">
                        {p.purchase_number}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{p.purchase_date}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <SupplierPreview supplier={supplierById(p.supplier_id)} />
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                        {num(p.total_cft).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold whitespace-nowrap tabular-nums">
                        {inr(p.final_amount)}
                      </td>
                      <td className="px-4 py-3 text-right text-success whitespace-nowrap tabular-nums">
                        {inr(p.amount_paid)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-medium whitespace-nowrap tabular-nums ${
                          balance > 0 ? "text-warning" : ""
                        }`}
                      >
                        {inr(balance)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusPill label={p.status} tone={statusTone(p.status)} />
                      </td>
                      <td className="sticky right-0 z-10 border-l border-border bg-card px-4 py-3 align-middle shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]">
                        <div className="flex flex-nowrap items-center justify-end gap-2 whitespace-nowrap">
                          {balance > 0.005 ? (
                            <PurchasePaymentDialog
                              purchaseId={p.id}
                              reference={p.purchase_number}
                              party={supplierName(p.supplier_id)}
                              total={p.final_amount}
                              paid={p.amount_paid}
                              method={p.payment_method}
                              onSaved={() => invalidate("purchases", "purchase_payments")}
                            />
                          ) : null}
                          <PurchasePaymentsHistory
                            purchaseId={p.id}
                            reference={p.purchase_number}
                            party={supplierName(p.supplier_id)}
                            total={p.final_amount}
                            paid={p.amount_paid}
                          />
                          {!p.stock_applied && p.status !== "cancelled" ? (
                            <ReceiveButton purchase={p} onConfirm={receive} />
                          ) : null}
                          <DeleteButton purchase={p} onConfirm={remove} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="divide-y divide-border md:hidden">
            {rows.map((p) => {
              const balance = Math.max(num(p.final_amount) - num(p.amount_paid), 0);
              return (
                <div key={p.id} className="space-y-2 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{p.purchase_number}</span>
                    <StatusPill label={p.status} tone={statusTone(p.status)} />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{p.purchase_date}</span>
                    <span>·</span>
                    <SupplierPreview supplier={supplierById(p.supplier_id)} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="font-semibold">{inr(p.final_amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Paid</p>
                      <p>{inr(p.amount_paid)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Balance</p>
                      <p className={balance > 0 ? "text-warning" : ""}>{inr(balance)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {balance > 0.005 ? (
                      <PurchasePaymentDialog
                        purchaseId={p.id}
                        reference={p.purchase_number}
                        party={supplierName(p.supplier_id)}
                        total={p.final_amount}
                        paid={p.amount_paid}
                        method={p.payment_method}
                        onSaved={() => invalidate("purchases", "purchase_payments")}
                      />
                    ) : null}
                    <PurchasePaymentsHistory
                      purchaseId={p.id}
                      reference={p.purchase_number}
                      party={supplierName(p.supplier_id)}
                      total={p.final_amount}
                      paid={p.amount_paid}
                    />
                    <div className="ml-auto">
                      <DeleteButton purchase={p} onConfirm={remove} />
                    </div>
                  </div>
                  {!p.stock_applied && p.status !== "cancelled" ? (
                    <ReceiveButton purchase={p} onConfirm={receive} fullWidth />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

function NewSupplier({ onDone }: { onDone: () => void }) {
  const { data: businessId } = useBusinessId();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", phone: "", gstin: "", address: "", state: "" });
  const save = async () => {
    if (!f.name.trim()) {
      toast.error("Supplier name is required");
      return;
    }
    const { error } = await supabase.from("suppliers").insert({
      business_id: businessId!,
      name: f.name,
      phone: f.phone || null,
      gstin: f.gstin || null,
      address: f.address || null,
      state: f.state || null,
    } as never);
    if (error) {
      toast.error(errMessage(error));
      return;
    }
    onDone();
    setOpen(false);
    setF({ name: "", phone: "", gstin: "", address: "", state: "" });
    toast.success("Supplier added");
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="mr-1.5 size-4" /> Supplier
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add supplier</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>GSTIN</Label>
            <Input value={f.gstin} onChange={(e) => setF({ ...f, gstin: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>State</Label>
            <Input value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Textarea value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save}>Save supplier</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const COLS = 5; // length, girth, allowance, grade(rate cell), rate

function PurchaseEditor({ onClose }: { onClose: () => void }) {
  const { data: business } = useBusiness();
  const { data: businessId } = useBusinessId();
  const suppliersQ = useTable<Supplier>("suppliers", (q) => q.order("name"));
  const invalidate = useInvalidate();
  const gridRef = useRef<HTMLDivElement>(null);

  const cfg: GradeConfig = useMemo(
    () => ({
      cft_divisor: num(business?.cft_divisor, 2304),
      cft_rounding: num(business?.cft_rounding, 3),
      grade1_min: num(business?.grade1_min, 24),
      grade2_min: num(business?.grade2_min, 18),
      grade1_rate: num(business?.grade1_rate, 1800),
      grade2_rate: num(business?.grade2_rate, 1400),
      grade3_rate: num(business?.grade3_rate, 1000),
    }),
    [business],
  );

  const [rows, setRows] = useState<LogRow[]>(() => Array.from({ length: 10 }, () => newRow(0)));
  const [header, setHeader] = useState({
    supplier_id: "",
    purchase_date: new Date().toISOString().slice(0, 10),
    status: "upcoming",
    loading_charges: "",
    unloading_charges: "",
    transport_charges: "",
    other_charges: "",
    discount: "",
    amount_paid: "",
    payment_method: "Cash",
    notes: "",
  });
  const [bulkCount, setBulkCount] = useState("50");
  const [saving, setSaving] = useState(false);

  const computed = useMemo(
    () => rows.map((r) => ({ row: r, calc: computeRow(r, cfg) })),
    [rows, cfg],
  );
  const filled = computed.filter(({ row }) => num(row.length) > 0 && num(row.girth) > 0);

  const summary = useMemo(() => {
    const byGrade: Record<string, { logs: number; cft: number; amount: number }> = {};
    let cft = 0;
    let value = 0;
    filled.forEach(({ calc }) => {
      cft += calc.cft;
      value += calc.amount;
      const g = (byGrade[calc.grade] ??= { logs: 0, cft: 0, amount: 0 });
      g.logs += 1;
      g.cft += calc.cft;
      g.amount += calc.amount;
    });
    return { logs: filled.length, cft, value, byGrade };
  }, [filled]);

  const charges =
    num(header.loading_charges) +
    num(header.unloading_charges) +
    num(header.transport_charges) +
    num(header.other_charges);
  const finalAmount = Math.max(summary.value + charges - num(header.discount), 0);
  const balance = finalAmount - num(header.amount_paid);

  const update = useCallback((key: string, patch: Partial<LogRow>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }, []);

  const addRows = (count: number) => {
    const a = num(business?.default_allowance, 0);
    setRows((prev) => [...prev, ...Array.from({ length: count }, () => newRow(a))]);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIdx: number, colIdx: number) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    let next = rowIdx * COLS + colIdx + 1;
    if (colIdx >= 2) next = (rowIdx + 1) * COLS; // jump to next row's length
    if (next >= rows.length * COLS) {
      addRows(1);
      setTimeout(() => focusCell(next), 20);
      return;
    }
    focusCell(next);
  };

  const focusCell = (index: number) => {
    const el = gridRef.current?.querySelector<HTMLInputElement>(`[data-cell="${index}"]`);
    el?.focus();
    el?.select();
  };

  const save = async () => {
    if (!header.supplier_id) {
      toast.error("Select a supplier");
      return;
    }
    if (filled.length === 0) {
      toast.error("Add at least one log with length and girth");
      return;
    }
    const invalid = filled.find(
      ({ row, calc }) =>
        num(row.length) <= 0 || num(row.girth) <= 0 || calc.effectiveGirth <= 0 || calc.rate < 0,
    );
    if (invalid) {
      toast.error("Every log needs a positive length, girth and effective girth");
      return;
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id ?? null;
      const { count } = await supabase
        .from("purchases")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId!);
      const purchaseNumber = `P-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${String((count ?? 0) + 1).padStart(4, "0")}`;

      const paid = num(header.amount_paid);
      const status =
        header.status === "received" && paid >= finalAmount && finalAmount > 0
          ? "paid"
          : header.status === "received" && paid > 0
            ? "partially_paid"
            : header.status;

      // Single batched write: header first, then all log rows in one insert.
      const { data: purchase, error: pErr } = await supabase
        .from("purchases")
        .insert({
          business_id: businessId!,
          purchase_number: purchaseNumber,
          supplier_id: header.supplier_id,
          purchase_date: header.purchase_date,
          status,
          total_logs: summary.logs,
          total_cft: summary.cft,
          timber_value: summary.value,
          loading_charges: num(header.loading_charges),
          unloading_charges: num(header.unloading_charges),
          transport_charges: num(header.transport_charges),
          other_charges: num(header.other_charges),
          discount: num(header.discount),
          final_amount: finalAmount,
          amount_paid: paid,
          payment_method: header.payment_method,
          notes: header.notes || null,
          created_by: uid,
          updated_by: uid,
        } as never)
        .select("id")
        .single();
      if (pErr) throw pErr;
      const purchaseId = (purchase as { id: string }).id;

      const logPayload = filled.map(({ row, calc }, i) => ({
        business_id: businessId!,
        purchase_id: purchaseId,
        log_no: i + 1,
        length_ft: num(row.length),
        girth_in: num(row.girth),
        allowance_in: num(row.allowance),
        effective_girth: calc.effectiveGirth,
        cft: calc.cft,
        grade: calc.grade,
        rate: calc.rate,
        custom_rate: row.customRate,
        amount: calc.amount,
      }));
      const { error: lErr } = await supabase.from("purchase_logs").insert(logPayload as never);
      if (lErr) throw lErr;

      if (header.status === "received") {
        const { error: rErr } = await supabase.rpc("receive_purchase", {
          _purchase_id: purchaseId,
        });
        if (rErr) throw rErr;
      } else if (header.status === "upcoming") {
        const upcoming = Object.entries(summary.byGrade).map(([grade, g]) => ({
          business_id: businessId!,
          purchase_id: purchaseId,
          grade,
          cft: g.cft,
          logs: g.logs,
          expected_date: header.purchase_date,
        }));
        if (upcoming.length) await supabase.from("upcoming_stock").insert(upcoming as never);
      }

      invalidate("purchases", "upcoming_stock", "stock", "stock_movements");
      toast.success(`${purchaseNumber} saved with ${summary.logs} logs`);
      onClose();
    } catch (e) {
      toast.error(errMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="New purchase"
        description="Type freely — CFT, grade and amount update instantly. Nothing is saved until you hit Save."
        action={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              <ArrowLeft className="mr-1.5 size-4" /> Back
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save purchase"}
            </Button>
          </div>
        }
      />

      <div className="mb-6 card-surface grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label>Supplier</Label>
          <Select
            value={header.supplier_id}
            onValueChange={(v) => setHeader({ ...header, supplier_id: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select supplier" />
            </SelectTrigger>
            <SelectContent>
              {(suppliersQ.data ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Purchase date</Label>
          <Input
            type="date"
            value={header.purchase_date}
            onChange={(e) => setHeader({ ...header, purchase_date: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={header.status} onValueChange={(v) => setHeader({ ...header, status: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="received">Received (adds to stock)</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Payment method</Label>
          <Select
            value={header.payment_method}
            onValueChange={(v) => setHeader({ ...header, payment_method: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Add multiple logs</Label>
          <div className="flex gap-2">
            <Input
              className="w-24"
              type="number"
              min="1"
              value={bulkCount}
              onChange={(e) => setBulkCount(e.target.value)}
            />
            <Button
              variant="outline"
              onClick={() => addRows(Math.max(1, Math.min(500, Math.floor(num(bulkCount)))))}
            >
              <Rows3 className="mr-1.5 size-4" /> Add rows
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={() =>
            setRows(rows.filter(({ length, girth }) => num(length) > 0 || num(girth) > 0))
          }
        >
          Clear empty rows
        </Button>
        <p className="ml-auto text-xs text-muted-foreground">
          Press Enter to jump to the next field.
        </p>
      </div>

      <div ref={gridRef} className="card-surface mb-6 overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="w-12 px-3 py-2.5 font-medium">#</th>
              <th className="px-3 py-2.5 font-medium">Length (ft)</th>
              <th className="px-3 py-2.5 font-medium">Girth (in)</th>
              <th className="px-3 py-2.5 font-medium">Allow. (in)</th>
              <th className="px-3 py-2.5 text-right font-medium">Eff. girth</th>
              <th className="px-3 py-2.5 text-right font-medium">CFT</th>
              <th className="px-3 py-2.5 font-medium">Grade</th>
              <th className="px-3 py-2.5 font-medium">Rate</th>
              <th className="px-3 py-2.5 text-right font-medium">Amount</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {computed.map(({ row, calc }, i) => (
              <tr key={row.key} className="border-t border-border">
                <td className="px-3 py-1.5 text-xs text-muted-foreground">{i + 1}</td>
                <td className="px-2 py-1.5">
                  <Input
                    className="h-9"
                    inputMode="decimal"
                    data-cell={i * COLS}
                    value={row.length}
                    onChange={(e) => update(row.key, { length: e.target.value })}
                    onKeyDown={(e) => onKeyDown(e, i, 0)}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    className="h-9"
                    inputMode="decimal"
                    data-cell={i * COLS + 1}
                    value={row.girth}
                    onChange={(e) => update(row.key, { girth: e.target.value })}
                    onKeyDown={(e) => onKeyDown(e, i, 1)}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    className="h-9"
                    inputMode="decimal"
                    data-cell={i * COLS + 2}
                    value={row.allowance}
                    onChange={(e) => update(row.key, { allowance: e.target.value })}
                    onKeyDown={(e) => onKeyDown(e, i, 2)}
                  />
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">
                  {calc.effectiveGirth.toFixed(2)}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">{calc.cft.toFixed(3)}</td>
                <td className="px-2 py-1.5">
                  {row.customRate ? (
                    <Select value={calc.grade} onValueChange={(v) => update(row.key, { grade: v })}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADES.map((g) => (
                          <SelectItem key={g} value={g}>
                            {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-muted-foreground">{calc.grade}</span>
                  )}
                </td>
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    <Input
                      className="h-9 w-24"
                      inputMode="decimal"
                      value={row.customRate ? row.rate : String(calc.rate)}
                      readOnly={!row.customRate}
                      onChange={(e) => update(row.key, { rate: e.target.value })}
                    />
                    <Checkbox
                      checked={row.customRate}
                      onCheckedChange={(v) =>
                        update(row.key, {
                          customRate: !!v,
                          rate: String(calc.rate),
                          grade: calc.grade,
                        })
                      }
                      aria-label="Custom rate"
                    />
                  </div>
                </td>
                <td className="px-3 py-1.5 text-right font-medium tabular-nums">
                  {calc.amount.toFixed(2)}
                </td>
                <td className="px-2 py-1.5 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-danger"
                    onClick={() => setRows(rows.filter((r) => r.key !== row.key))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card-surface p-5 lg:col-span-2">
          <h3 className="text-sm font-medium">Live summary</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Total logs</p>
              <p className="text-lg font-semibold">{summary.logs}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total CFT</p>
              <p className="text-lg font-semibold">{summary.cft.toFixed(3)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Timber value</p>
              <p className="text-lg font-semibold">{inr(summary.value)}</p>
            </div>
          </div>
          <div className="mt-5 space-y-2">
            {GRADES.map((g) => {
              const s = summary.byGrade[g];
              return (
                <div
                  key={g}
                  className="flex items-center justify-between rounded-lg bg-surface px-4 py-2.5 text-sm"
                >
                  <span className="font-medium">{g}</span>
                  <span className="text-muted-foreground">
                    {s?.logs ?? 0} logs · {cftFmt(s?.cft ?? 0)}
                  </span>
                  <span className="font-medium">{inr(s?.amount ?? 0)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card-surface space-y-3 p-5">
          <h3 className="text-sm font-medium">Supplier payment</h3>
          {(
            [
              ["loading_charges", "Loading"],
              ["unloading_charges", "Unloading"],
              ["transport_charges", "Transport"],
              ["other_charges", "Other charges"],
              ["discount", "Discount"],
              ["amount_paid", "Amount paid"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <Label className="text-sm font-normal text-muted-foreground">{label}</Label>
              <Input
                className="h-9 w-32"
                inputMode="decimal"
                value={header[key]}
                onChange={(e) => setHeader({ ...header, [key]: e.target.value })}
              />
            </div>
          ))}
          <div className="border-t border-border pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Timber value</span>
              <span>{inr(summary.value)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Other charges</span>
              <span>{inr(charges)}</span>
            </div>
            <div className="mt-2 flex justify-between text-base font-semibold">
              <span>Final amount</span>
              <span>{inr(finalAmount)}</span>
            </div>
            <div
              className={`mt-1 flex justify-between ${balance > 0 ? "text-warning" : "text-success"}`}
            >
              <span>Balance</span>
              <span>{inr(balance)}</span>
            </div>
          </div>
          <Textarea
            placeholder="Notes"
            value={header.notes}
            onChange={(e) => setHeader({ ...header, notes: e.target.value })}
          />
        </div>
      </div>
    </>
  );
}
