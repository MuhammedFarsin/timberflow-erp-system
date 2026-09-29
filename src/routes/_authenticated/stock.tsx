import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness, useBusinessId, useTable, useInvalidate, errMessage } from "@/lib/data";
import { inr, num, GRADES } from "@/lib/timber";
import { PageHeader, LoadingSkeleton, EmptyState, ErrorState, StatusPill } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/stock")({
  head: () => ({
    meta: [
      { title: "Stock — Timber ERP" },
      { name: "description", content: "Current timber and furniture stock, upcoming arrivals and full movement history." },
      { property: "og:title", content: "Stock — Timber ERP" },
      { property: "og:description", content: "CFT by grade with low-stock alerts and an auditable movement log." },
    ],
  }),
  component: StockPage,
});

type Stock = {
  id: string; item_type: string; grade: string | null; product_name: string | null;
  cft: number; quantity: number; avg_rate: number; low_threshold: number;
};
type Upcoming = { id: string; grade: string; cft: number; logs: number; expected_date: string | null; purchase_id: string | null };
type Movement = {
  id: string; movement_type: string; item_type: string; grade: string | null; product_name: string | null;
  cft_change: number; qty_change: number; reference: string | null; created_at: string; created_by: string | null;
};

function stockStatus(s: Stock, low: number) {
  const value = s.item_type === "timber" ? num(s.cft) : num(s.quantity);
  if (value <= 0) return { label: "Out of stock", tone: "danger" as const };
  if (value < (num(s.low_threshold) || low)) return { label: "Low", tone: "warning" as const };
  return { label: "Available", tone: "success" as const };
}

function StockPage() {
  const { data: business } = useBusiness();
  const { data: businessId } = useBusinessId();
  const invalidate = useInvalidate();
  const stockQ = useTable<Stock>("stock", (q) => q.order("item_type").order("grade"));
  const upQ = useTable<Upcoming>("upcoming_stock", (q) => q.order("expected_date", { ascending: true }));
  const movQ = useTable<Movement>("stock_movements", (q) => q.order("created_at", { ascending: false }).limit(200));

  const low = num(business?.low_stock_cft, 50);
  const stock = stockQ.data ?? [];
  const totals = useMemo(() => {
    const timber = stock.filter((s) => s.item_type === "timber");
    return {
      cft: timber.reduce((s, r) => s + num(r.cft), 0),
      value: stock.reduce(
        (s, r) => s + (r.item_type === "timber" ? num(r.cft) : num(r.quantity)) * num(r.avg_rate),
        0,
      ),
      furniture: stock.filter((s) => s.item_type === "furniture").reduce((s, r) => s + num(r.quantity), 0),
      upcoming: (upQ.data ?? []).reduce((s, r) => s + num(r.cft), 0),
    };
  }, [stock, upQ.data]);

  return (
    <>
      <PageHeader
        title="Stock"
        description="What's in the yard, what's on the way, and everything that moved."
        action={<AdjustStock businessId={businessId} onDone={() => invalidate("stock", "stock_movements")} />}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Current timber", `${totals.cft.toFixed(2)} CFT`],
          ["Stock value", inr(totals.value)],
          ["Furniture units", String(totals.furniture)],
          ["Upcoming CFT", `${totals.upcoming.toFixed(2)} CFT`],
        ].map(([label, value]) => (
          <div key={label} className="card-surface p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-2 text-xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="current">
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="current">Current stock</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming stock</TabsTrigger>
          <TabsTrigger value="history">Stock history</TabsTrigger>
        </TabsList>

        <TabsContent value="current">
          {stockQ.isLoading ? (
            <LoadingSkeleton />
          ) : stockQ.error ? (
            <ErrorState message={errMessage(stockQ.error)} onRetry={() => stockQ.refetch()} />
          ) : stock.length === 0 ? (
            <EmptyState title="No stock records" description="Mark a purchase as received to build up stock." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stock.map((s) => {
                const st = stockStatus(s, low);
                return (
                  <div key={s.id} className="card-surface p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{s.grade ?? s.product_name ?? "Item"}</p>
                        <p className="text-xs capitalize text-muted-foreground">{s.item_type}</p>
                      </div>
                      <StatusPill label={st.label} tone={st.tone} />
                    </div>
                    <p className="mt-4 text-2xl font-semibold tabular-nums">
                      {s.item_type === "timber" ? `${num(s.cft).toFixed(2)}` : num(s.quantity)}
                      <span className="ml-1 text-sm font-normal text-muted-foreground">
                        {s.item_type === "timber" ? "CFT" : "units"}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Avg rate {inr(s.avg_rate)} · Value{" "}
                      {inr((s.item_type === "timber" ? num(s.cft) : num(s.quantity)) * num(s.avg_rate))}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="upcoming">
          {upQ.isLoading ? (
            <LoadingSkeleton rows={3} />
          ) : (upQ.data ?? []).length === 0 ? (
            <EmptyState title="Nothing upcoming" description="Purchases marked Upcoming appear here until received." />
          ) : (
            <div className="card-surface overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Grade</th>
                    <th className="px-5 py-3 text-right font-medium">Logs</th>
                    <th className="px-5 py-3 text-right font-medium">CFT</th>
                    <th className="px-5 py-3 font-medium">Expected</th>
                  </tr>
                </thead>
                <tbody>
                  {(upQ.data ?? []).map((u) => (
                    <tr key={u.id} className="border-t border-border">
                      <td className="px-5 py-3 font-medium">{u.grade}</td>
                      <td className="px-5 py-3 text-right">{u.logs}</td>
                      <td className="px-5 py-3 text-right">{num(u.cft).toFixed(2)}</td>
                      <td className="px-5 py-3">{u.expected_date ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          {movQ.isLoading ? (
            <LoadingSkeleton />
          ) : (movQ.data ?? []).length === 0 ? (
            <EmptyState title="No movements yet" description="Purchases, sales and adjustments are logged here." />
          ) : (
            <div className="card-surface overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Item</th>
                    <th className="px-5 py-3 text-right font-medium">CFT</th>
                    <th className="px-5 py-3 text-right font-medium">Qty</th>
                    <th className="px-5 py-3 font-medium">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {(movQ.data ?? []).map((m) => (
                    <tr key={m.id} className="border-t border-border">
                      <td className="px-5 py-3">{new Date(m.created_at).toLocaleString("en-IN")}</td>
                      <td className="px-5 py-3 capitalize">{m.movement_type}</td>
                      <td className="px-5 py-3">{m.grade ?? m.product_name ?? "—"}</td>
                      <td className={`px-5 py-3 text-right tabular-nums ${num(m.cft_change) < 0 ? "text-danger" : "text-success"}`}>
                        {num(m.cft_change).toFixed(2)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">{num(m.qty_change)}</td>
                      <td className="px-5 py-3 text-muted-foreground">{m.reference ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

function AdjustStock({ businessId, onDone }: { businessId?: string | undefined; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    item_type: "timber", grade: "Grade 1", product_name: "", cft: "", quantity: "", rate: "", notes: "",
  });

  const save = async () => {
    const cft = num(f.cft);
    const qty = num(f.quantity);
    if (f.item_type === "timber" && cft === 0) { toast.error("Enter a CFT change"); return; }
    if (f.item_type === "furniture" && (!f.product_name.trim() || qty === 0)) {
      toast.error("Product name and quantity are required"); return;
    }
    const match = supabase.from("stock").select("*").eq("business_id", businessId!).eq("item_type", f.item_type);
    const { data: existing } = await (f.item_type === "timber"
      ? match.eq("grade", f.grade)
      : match.eq("product_name", f.product_name));
    const row = (existing ?? [])[0] as Stock | undefined;
    const nextCft = num(row?.cft) + cft;
    const nextQty = num(row?.quantity) + qty;
    if (nextCft < 0 || nextQty < 0) { toast.error("Adjustment would take stock below zero"); return; }

    if (row) {
      const { error } = await supabase
        .from("stock")
        .update({ cft: nextCft, quantity: nextQty, avg_rate: num(f.rate) || num(row.avg_rate) } as never)
        .eq("id", row.id);
      if (error) { toast.error(errMessage(error)); return; }
    } else {
      const { error } = await supabase.from("stock").insert({
        business_id: businessId!, item_type: f.item_type,
        grade: f.item_type === "timber" ? f.grade : null,
        product_name: f.item_type === "furniture" ? f.product_name : null,
        cft: nextCft, quantity: nextQty, avg_rate: num(f.rate),
      } as never);
      if (error) { toast.error(errMessage(error)); return; }
    }

    const { data: userData } = await supabase.auth.getUser();
    await supabase.from("stock_movements").insert({
      business_id: businessId!, movement_type: "adjustment", item_type: f.item_type,
      grade: f.item_type === "timber" ? f.grade : null,
      product_name: f.item_type === "furniture" ? f.product_name : null,
      cft_change: cft, qty_change: qty, reference: "Manual adjustment", notes: f.notes || null,
      created_by: userData.user?.id ?? null,
    } as never);

    onDone(); setOpen(false);
    toast.success("Stock adjusted");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline">Adjust stock</Button></DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Stock adjustment</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label>Item type</Label>
            <Select value={f.item_type} onValueChange={(v) => setF({ ...f, item_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="timber">Timber</SelectItem>
                <SelectItem value="furniture">Furniture</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {f.item_type === "timber" ? (
            <>
              <div className="space-y-1.5">
                <Label>Grade</Label>
                <Select value={f.grade} onValueChange={(v) => setF({ ...f, grade: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{GRADES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>CFT change (use − to reduce)</Label>
                <Input type="number" step="any" value={f.cft} onChange={(e) => setF({ ...f, cft: e.target.value })} />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5"><Label>Product</Label><Input value={f.product_name} onChange={(e) => setF({ ...f, product_name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Quantity change</Label><Input type="number" step="any" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} /></div>
            </>
          )}
          <div className="space-y-1.5"><Label>Rate (₹)</Label><Input type="number" step="any" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Notes</Label><Input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={save}>Save adjustment</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

