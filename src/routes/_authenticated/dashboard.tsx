import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useBusiness, useTable, errMessage } from "@/lib/data";
import { inr, num } from "@/lib/timber";
import { PageHeader, LoadingSkeleton, EmptyState, ErrorState, StatusPill, statusTone } from "@/components/states";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Timber ERP" },
      { name: "description", content: "Live sales, stock value, supplier dues and wage totals for your timber business." },
      { property: "og:title", content: "Dashboard — Timber ERP" },
      { property: "og:description", content: "Real-time KPIs, sales trends and stock by grade." },
    ],
  }),
  component: DashboardPage,
});

type Sale = { id: string; sale_number: string; sale_date: string; total: number; payment_status: string; customer_id: string | null };
type Purchase = { id: string; purchase_number: string; purchase_date: string; final_amount: number; amount_paid: number; status: string; total_cft: number };
type Stock = { id: string; item_type: string; grade: string | null; cft: number; quantity: number; avg_rate: number };
type Upcoming = { id: string; cft: number };
type Wage = { id: string; wage_date: string; final_wage: number };

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="card-surface p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${tone ?? ""}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function DashboardPage() {
  const { data: business } = useBusiness();
  const salesQ = useTable<Sale>("sales", (q) => q.order("sale_date", { ascending: false }));
  const purchasesQ = useTable<Purchase>("purchases", (q) => q.order("purchase_date", { ascending: false }));
  const stockQ = useTable<Stock>("stock");
  const upQ = useTable<Upcoming>("upcoming_stock");
  const wagesQ = useTable<Wage>("worker_wages");

  const [granularity, setGranularity] = useState<"daily" | "monthly">("daily");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const sales = salesQ.data ?? [];
  const purchases = purchasesQ.data ?? [];
  const stock = stockQ.data ?? [];

  const kpis = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);
    return {
      today: sales.filter((s) => s.sale_date === today).reduce((a, s) => a + num(s.total), 0),
      month: sales.filter((s) => s.sale_date.startsWith(month)).reduce((a, s) => a + num(s.total), 0),
      stockValue: stock.reduce(
        (a, s) => a + (s.item_type === "timber" ? num(s.cft) : num(s.quantity)) * num(s.avg_rate),
        0,
      ),
      outstanding: purchases
        .filter((p) => p.status !== "cancelled")
        .reduce((a, p) => a + Math.max(num(p.final_amount) - num(p.amount_paid), 0), 0),
      upcomingCft: (upQ.data ?? []).reduce((a, u) => a + num(u.cft), 0),
      wages: (wagesQ.data ?? [])
        .filter((w) => w.wage_date.startsWith(month))
        .reduce((a, w) => a + num(w.final_wage), 0),
    };
  }, [sales, stock, purchases, upQ.data, wagesQ.data]);

  const chartData = useMemo(() => {
    const filtered = sales.filter((s) => s.sale_date >= from && s.sale_date <= to);
    const buckets = new Map<string, number>();
    filtered.forEach((s) => {
      const key = granularity === "daily" ? s.sale_date : s.sale_date.slice(0, 7);
      buckets.set(key, (buckets.get(key) ?? 0) + num(s.total));
    });
    return [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([label, value]) => ({ label, value }));
  }, [sales, from, to, granularity]);

  const loading = salesQ.isLoading || purchasesQ.isLoading || stockQ.isLoading;
  const anyError = salesQ.error ?? purchasesQ.error ?? stockQ.error;

  if (anyError) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <ErrorState message={errMessage(anyError)} onRetry={() => { salesQ.refetch(); purchasesQ.refetch(); stockQ.refetch(); }} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Good day${business?.name ? `, ${business.name}` : ""}`}
        description="Everything happening in your yard right now."
      />

      {loading ? (
        <LoadingSkeleton rows={4} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Kpi label="Today's sales" value={inr(kpis.today)} />
            <Kpi label="This month's sales" value={inr(kpis.month)} />
            <Kpi label="Current stock value" value={inr(kpis.stockValue)} />
            <Kpi
              label="Outstanding to suppliers"
              value={inr(kpis.outstanding)}
              tone={kpis.outstanding > 0 ? "text-warning" : "text-success"}
            />
            <Kpi label="Upcoming timber" value={`${kpis.upcomingCft.toFixed(2)} CFT`} />
            <Kpi label="Current period wages" value={inr(kpis.wages)} />
          </div>

          <div className="mt-6 card-surface p-5">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-base font-medium">Sales trend</h2>
                <p className="text-xs text-muted-foreground">Filtered by date range, live from your sales.</p>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">From</Label>
                  <Input className="h-9 w-36" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">To</Label>
                  <Input className="h-9 w-36" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
                <Tabs value={granularity} onValueChange={(v) => setGranularity(v as "daily" | "monthly")}>
                  <TabsList>
                    <TabsTrigger value="daily">Daily</TabsTrigger>
                    <TabsTrigger value="monthly">Monthly</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
            {chartData.length === 0 ? (
              <EmptyState title="No sales in this range" description="Adjust the dates or record a sale." />
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ left: 4, right: 4, top: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" />
                    <YAxis tickLine={false} axisLine={false} fontSize={11} width={70}
                      stroke="var(--color-muted-foreground)"
                      tickFormatter={(v: number) => `₹${Math.round(v / 1000)}k`} />
                    <Tooltip
                      formatter={(v: number) => inr(v)}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid var(--color-border)",
                        background: "var(--color-card)",
                        fontSize: 12,
                      }}
                    />
                    <Area type="monotone" dataKey="value" stroke="var(--color-chart-1)" strokeWidth={2} fill="url(#salesFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="card-surface p-5">
              <h2 className="text-base font-medium">Current stock by grade</h2>
              <div className="mt-4 space-y-2">
                {stock.filter((s) => s.item_type === "timber").length === 0 ? (
                  <p className="text-sm text-muted-foreground">No timber stock yet.</p>
                ) : (
                  stock
                    .filter((s) => s.item_type === "timber")
                    .map((s) => {
                      const low = num(business?.low_stock_cft, 50);
                      const label = num(s.cft) <= 0 ? "Out of stock" : num(s.cft) < low ? "Low" : "Available";
                      return (
                        <div key={s.id} className="flex items-center justify-between rounded-lg bg-surface px-4 py-3 text-sm">
                          <span className="font-medium">{s.grade}</span>
                          <span className="tabular-nums">{num(s.cft).toFixed(2)} CFT</span>
                          <StatusPill label={label} tone={statusTone(label.toLowerCase().replace(/ /g, "_"))} />
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            <div className="card-surface p-5">
              <h2 className="text-base font-medium">Purchase overview</h2>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Total purchases</p>
                  <p className="text-lg font-semibold">{purchases.length}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total CFT bought</p>
                  <p className="text-lg font-semibold">
                    {purchases.reduce((a, p) => a + num(p.total_cft), 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Purchase value</p>
                  <p className="text-lg font-semibold">{inr(purchases.reduce((a, p) => a + num(p.final_amount), 0))}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Paid to suppliers</p>
                  <p className="text-lg font-semibold">{inr(purchases.reduce((a, p) => a + num(p.amount_paid), 0))}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <RecentTable
              title="Recent purchases"
              empty="No purchases yet"
              rows={purchases.slice(0, 5).map((p) => ({
                id: p.id, primary: p.purchase_number, secondary: p.purchase_date,
                amount: inr(p.final_amount), status: p.status,
              }))}
            />
            <RecentTable
              title="Recent sales"
              empty="No sales yet"
              rows={sales.slice(0, 5).map((s) => ({
                id: s.id, primary: s.sale_number, secondary: s.sale_date,
                amount: inr(s.total), status: s.payment_status,
              }))}
            />
          </div>
        </>
      )}
    </>
  );
}

function RecentTable({
  title, rows, empty,
}: {
  title: string;
  empty: string;
  rows: { id: string; primary: string; secondary: string; amount: string; status: string }[];
}) {
  return (
    <div className="card-surface p-5">
      <h2 className="text-base font-medium">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="mt-4 divide-y divide-border">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{r.primary}</p>
                <p className="text-xs text-muted-foreground">{r.secondary}</p>
              </div>
              <StatusPill label={r.status} tone={statusTone(r.status)} />
              <span className="font-medium tabular-nums">{r.amount}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
