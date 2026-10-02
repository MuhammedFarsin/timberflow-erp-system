import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness, useInvalidate, errMessage } from "@/lib/data";
import { isValidGstin } from "@/lib/timber";
import { PageHeader, LoadingSkeleton, ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Timber ERP" },
      {
        name: "description",
        content: "Business profile, GST, invoice and timber calculation settings.",
      },
      { property: "og:title", content: "Settings — Timber ERP" },
      {
        property: "og:description",
        content: "Configure grades, rates, CFT formula and invoice numbering.",
      },
    ],
  }),
  component: SettingsPage,
});

type Form = Record<string, string | number>;

function Field({
  label,
  name,
  form,
  set,
  type = "text",
  hint,
}: {
  label: string;
  name: string;
  form: Form;
  set: (n: string, v: string) => void;
  type?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        type={type}
        step={type === "number" ? "any" : undefined}
        value={String(form[name] ?? "")}
        onChange={(e) => set(name, e.target.value)}
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function SettingsPage() {
  const { data: business, isLoading, error, refetch } = useBusiness();
  const invalidate = useInvalidate();
  const [form, setForm] = useState<Form>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (business) setForm({ ...(business as unknown as Form) });
  }, [business]);

  const set = (n: string, v: string) => setForm((f) => ({ ...f, [n]: v }));

  const save = async () => {
    if (form["gstin"] && !isValidGstin(String(form["gstin"]))) {
      toast.error("GSTIN format is invalid (e.g. 29ABCDE1234F1Z5)");
      return;
    }
    setSaving(true);
    try {
      const numeric = [
        "gst_rate",
        "cft_divisor",
        "cft_rounding",
        "grade1_min",
        "grade2_min",
        "grade1_rate",
        "grade2_rate",
        "grade3_rate",
        "default_allowance",
        "low_stock_cft",
      ];
      const payload: Record<string, unknown> = {};
      Object.entries(form).forEach(([k, v]) => {
        if (["id", "created_at", "updated_at"].includes(k)) return;
        payload[k] = numeric.includes(k) ? Number(v) : v === "" ? null : v;
      });
      const { error: err } = await supabase
        .from("businesses")
        .update(payload as never)
        .eq("id", business!.id);
      if (err) throw err;
      invalidate("business");
      toast.success("Settings saved");
    } catch (e) {
      toast.error(errMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <LoadingSkeleton rows={6} />;
  if (error) return <ErrorState message={errMessage(error)} onRetry={() => refetch()} />;

  return (
    <>
      <PageHeader
        title="Settings"
        description="Business profile, tax, invoicing and timber calculation configuration."
        action={
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        }
      />
      <Tabs defaultValue="business">
        <TabsList className="mb-6 flex w-full flex-wrap justify-start">
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="invoice">Invoice</TabsTrigger>
          <TabsTrigger value="timber">Timber &amp; Grades</TabsTrigger>
          <TabsTrigger value="data">Backup</TabsTrigger>
        </TabsList>

        <TabsContent value="business">
          <div className="card-surface grid gap-5 p-6 sm:grid-cols-2">
            <Field label="Business name" name="name" form={form} set={set} />
            <Field label="Legal name" name="legal_name" form={form} set={set} />
            <Field label="GSTIN" name="gstin" form={form} set={set} hint="e.g. 29ABCDE1234F1Z5" />
            <Field label="PAN" name="pan" form={form} set={set} />
            <Field label="Phone" name="phone" form={form} set={set} />
            <Field label="Email" name="email" form={form} set={set} />
            <Field label="City" name="city" form={form} set={set} />
            <Field label="State" name="state" form={form} set={set} />
            <Field label="State code" name="state_code" form={form} set={set} />
            <Field label="Pincode" name="pincode" form={form} set={set} />
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={String(form["address"] ?? "")}
                onChange={(e) => set("address", e.target.value)}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="invoice">
          <div className="card-surface grid gap-5 p-6 sm:grid-cols-2">
            <Field
              label="Invoice prefix"
              name="invoice_prefix"
              form={form}
              set={set}
              hint="Numbers become PREFIX/FY/0001"
            />
            <Field
              label="Default GST rate (%)"
              name="gst_rate"
              form={form}
              set={set}
              type="number"
            />
            <Field label="Bank name" name="bank_name" form={form} set={set} />
            <Field label="Account number" name="bank_account" form={form} set={set} />
            <Field label="IFSC" name="bank_ifsc" form={form} set={set} />
            <Field label="Branch" name="bank_branch" form={form} set={set} />
            <Field label="UPI ID" name="upi_id" form={form} set={set} />
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="invoice_footer">Invoice footer / terms</Label>
              <Textarea
                id="invoice_footer"
                value={String(form["invoice_footer"] ?? "")}
                onChange={(e) => set("invoice_footer", e.target.value)}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="timber">
          <div className="card-surface grid gap-5 p-6 sm:grid-cols-2">
            <Field
              label="CFT divisor"
              name="cft_divisor"
              form={form}
              set={set}
              type="number"
              hint="CFT = (Effective Girth² × Length) / divisor"
            />
            <Field
              label="CFT decimal places"
              name="cft_rounding"
              form={form}
              set={set}
              type="number"
            />
            <Field
              label="Default allowance (in)"
              name="default_allowance"
              form={form}
              set={set}
              type="number"
            />
            <Field
              label="Low stock threshold (CFT)"
              name="low_stock_cft"
              form={form}
              set={set}
              type="number"
            />
            <Field
              label="Grade 1 minimum girth (in)"
              name="grade1_min"
              form={form}
              set={set}
              type="number"
            />
            <Field
              label="Grade 2 minimum girth (in)"
              name="grade2_min"
              form={form}
              set={set}
              type="number"
            />
            <Field
              label="Grade 1 rate (₹/CFT)"
              name="grade1_rate"
              form={form}
              set={set}
              type="number"
            />
            <Field
              label="Grade 2 rate (₹/CFT)"
              name="grade2_rate"
              form={form}
              set={set}
              type="number"
            />
            <Field
              label="Grade 3 rate (₹/CFT)"
              name="grade3_rate"
              form={form}
              set={set}
              type="number"
            />
          </div>
        </TabsContent>

        <TabsContent value="data">
          <div className="card-surface space-y-4 p-6">
            <div>
              <h3 className="text-sm font-medium">Export data</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Download a printable PDF report of purchases, sales, stock, expenses, invoices and
                wages — organised section by section with totals.
              </p>
            </div>
            <Button variant="outline" onClick={() => exportBackup(business!)}>
              Download PDF backup
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}

const SECTIONS: { table: string; title: string; columns: [string, string][]; total?: string }[] = [
  {
    table: "purchases",
    title: "Purchases",
    columns: [
      ["purchase_number", "Purchase #"],
      ["purchase_date", "Date"],
      ["status", "Status"],
      ["total_cft", "Total CFT"],
      ["final_amount", "Final amount"],
      ["amount_paid", "Paid"],
      ["balance", "Balance"],
    ],
    total: "final_amount",
  },
  {
    table: "sales",
    title: "Sales",
    columns: [
      ["sale_number", "Sale #"],
      ["sale_date", "Date"],
      ["sale_type", "Type"],
      ["subtotal", "Subtotal"],
      ["gst_amount", "GST"],
      ["total_amount", "Total"],
      ["payment_status", "Payment"],
    ],
    total: "total_amount",
  },
  {
    table: "stock",
    title: "Current stock",
    columns: [
      ["item_type", "Type"],
      ["grade", "Grade"],
      ["description", "Description"],
      ["cft", "CFT"],
      ["quantity", "Qty"],
      ["rate", "Rate"],
    ],
  },
  {
    table: "invoices",
    title: "Invoices",
    columns: [
      ["invoice_number", "Invoice #"],
      ["invoice_date", "Date"],
      ["financial_year", "FY"],
      ["taxable_value", "Taxable"],
      ["total_tax", "Tax"],
      ["grand_total", "Grand total"],
    ],
    total: "grand_total",
  },
  {
    table: "expenses",
    title: "Expenses",
    columns: [
      ["expense_date", "Date"],
      ["category", "Category"],
      ["description", "Description"],
      ["payment_method", "Method"],
      ["amount", "Amount"],
    ],
    total: "amount",
  },
  {
    table: "worker_wages",
    title: "Worker wages",
    columns: [
      ["wage_date", "Date"],
      ["wage_type", "Type"],
      ["base_wage", "Base"],
      ["overtime_amount", "Overtime"],
      ["advance_amount", "Advance"],
      ["deduction_amount", "Deduction"],
      ["final_wage", "Final"],
      ["payment_status", "Status"],
    ],
    total: "final_wage",
  },
  {
    table: "suppliers",
    title: "Suppliers",
    columns: [
      ["name", "Name"],
      ["phone", "Phone"],
      ["gstin", "GSTIN"],
      ["city", "City"],
    ],
  },
  {
    table: "customers",
    title: "Customers",
    columns: [
      ["name", "Name"],
      ["phone", "Phone"],
      ["gstin", "GSTIN"],
      ["city", "City"],
    ],
  },
];

function cellText(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") return v.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  if (typeof v === "string" && /^\d+(\.\d+)?$/.test(v))
    return Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  return String(v).replace(/_/g, " ");
}

async function exportBackup(business: { id: string; name: string; gstin: string | null }) {
  try {
    const [{ jsPDF }, autoTableMod] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const autoTable = autoTableMod.default;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const generated = new Date().toLocaleString("en-IN");

    doc.setFontSize(18);
    doc.text(business.name || "Business backup", 40, 50);
    doc.setFontSize(10);
    doc.setTextColor(110);
    doc.text(
      `Data backup${business.gstin ? ` · GSTIN ${business.gstin}` : ""} · Generated ${generated}`,
      40,
      68,
    );
    doc.setTextColor(0);

    let y = 96;
    for (const section of SECTIONS) {
      const { data } = await supabase
        .from(section.table as never)
        .select("*")
        .eq("business_id", business.id);
      const rows = (data ?? []) as Record<string, unknown>[];

      if (y > 700) {
        doc.addPage();
        y = 50;
      }
      doc.setFontSize(13);
      doc.text(`${section.title} (${rows.length})`, 40, y);
      y += 10;

      if (!rows.length) {
        doc.setFontSize(10);
        doc.setTextColor(120);
        doc.text("No records", 40, y + 14);
        doc.setTextColor(0);
        y += 40;
        continue;
      }

      const body = rows.map((r) => section.columns.map(([k]) => cellText(r[k])));
      if (section.total) {
        const sum = rows.reduce((a, r) => a + Number(r[section.total!] ?? 0), 0);
        const foot = section.columns.map(([k], i) =>
          i === 0 ? "Total" : k === section.total ? cellText(sum) : "",
        );
        body.push(foot);
      }

      autoTable(doc, {
        startY: y + 6,
        head: [section.columns.map(([, label]) => label)],
        body,
        styles: { fontSize: 8, cellPadding: 4, textColor: 40 },
        headStyles: { fillColor: [244, 244, 245], textColor: 30, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [252, 252, 253] },
        margin: { left: 40, right: 40 },
        theme: "grid",
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 28;
    }

    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(140);
      doc.text(`Page ${i} of ${pages}`, 40, 820);
    }

    doc.save(`timber-backup-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success("PDF backup downloaded");
  } catch (e) {
    toast.error(errMessage(e));
  }
}
