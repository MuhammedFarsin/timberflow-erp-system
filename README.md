# TimberFlow Management

Build a production-quality Timber Business Management ERP — a real working React + TypeScript responsive web app (not a mockup), using Supabase/PostgreSQL for data and auth. Apple-inspired design: white background, light gray surfaces, dark charcoal typography, subtle borders/shadows, spacious layout, system font stack (-apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif). Color only for meaning: green=paid/available, orange=pending, red=overdue/low stock. Works cleanly on desktop, tablet, and mobile (sidebar becomes drawer, tables become cards).

Pages: Dashboard, Purchases, Stock, Sales, Expenses, Invoices, Worker Wages, Settings.

Dashboard: KPI cards for Today's Sales, This Month's Sales, Current Stock Value, Outstanding Supplier Amount, Upcoming Timber CFT, Current Period Wages — all pulled live from the database, never hard-coded. Include sales chart (daily/monthly, date-range filter), purchase overview, current stock by grade, recent purchases/sales tables.

Purchases (core module): Must support entering 60–200+ timber logs per purchase efficiently — bulk "Add Multiple Logs," spreadsheet-style row entry, Enter-to-next-field. Each log row: Length (ft, decimal), Girth (in, must accept decimals), Allowance (in), Effective Girth (= Girth − Allowance), CFT, Grade, Rate, Amount — all computed automatically. CFT formula: (Effective Girth² × Length) / 2304, configurable in Settings. Grade auto-assigned from Effective Girth (Grade 1 ≥24", Grade 2 18–24", Grade 3 <18", thresholds configurable). Grade rate auto-applied per grade, overridable per log with a "Custom Rate" flag. Show live summary: total logs, total CFT, per-grade CFT/logs/amount, total timber value. Supplier payment section: timber value + other charges (loading/unloading/transport) − discount = final amount; track amount paid / balance; payment method (Cash/Bank/UPI/Other). Purchase status: Draft / Upcoming / Received / Partially Paid / Paid / Cancelled — only "Received" pushes stock into Current Stock.

Performance requirement: All row math (CFT, grade, amount) computed client-side as the user types. Do NOT write to Supabase per keystroke or per row — batch-save the entire purchase (header + all logs) in one write when "Save Purchase" is clicked.

Stock: Tabs for Current Stock, Upcoming Stock, Stock History. Current stock shows CFT by grade + furniture stock + value, with Available/Low/Out-of-Stock status. Upcoming stock auto-converts to Current Stock when a purchase is marked Received. Every movement (purchase, sale, adjustment, return, manual) logged in Stock History with date, reference, and user.

Sales: Two types — Timber Sales (CFT/size/quantity/rate based) and Furniture Sales (product/custom size/quantity/rate based, supporting arbitrary dimensions like "6.25 × 6 ft"). GST calculated automatically. On confirming a sale: verify stock → reduce stock → create sale → create GST invoice → record payment → update dashboard. Block the transaction with "Insufficient stock" if not enough is available — never allow silent overselling.

Concurrency-safety requirement: Stock check + stock reduction must happen inside a single Postgres RPC function using row locking (SELECT ... FOR UPDATE) or a conditional update (UPDATE stock SET cft = cft - X WHERE cft >= X), checked by affected row count — never a client-side check-then-write. Wrap sale creation + stock reduction + invoice creation in one database transaction so none of these can happen without the others.

Expenses: Categories (Transport, Loading, Unloading, Salary, Electricity, Rent, Fuel, Maintenance, Machinery, Office, Other), with date/description/amount/payment method/notes/attachment, plus Today/Month/Pending/Total summary cards.

Invoices: Professional Indian GST invoice, business info auto-pulled from Settings. Support CGST+SGST (intra-state) or IGST (inter-state), configurable rate. Include a Round Off line (round final total to nearest ₹1, show adjustment separately) and Amount in Words reflecting the rounded total. Invoice numbers must be financial-year aware: format {PREFIX}/{FY}/{SEQUENCE} e.g. INV/2026-27/0001, with FY and sequence stored as separate fields — don't rely on one global auto-increment. Support Preview/Print/Download PDF/Share.

Worker Wages: Daily/Half-day/Custom wage types, plus Overtime, Advance, Deduction, Bonus. Formula: Base Wage + Overtime + Bonus − Advance − Deduction = Final Wage. Track payment status (Pending/Partial/Paid) with full payment history.

Settings: Business Profile, GST details, Invoice config (prefix, FY handling, footer, bank details), Timber Calculation config (formula, units, allowance method, rounding), Grade thresholds, Grade Rates, Units, Users/roles, Backup/export.

Database: Supabase Postgres with proper relational tables — businesses, business_users (business_id, user_id, role — this backs RLS), suppliers, purchases, purchase_logs, stock, stock_movements, upcoming_stock, customers, sales, sale_items, expenses, invoices (include financial_year, sequence_number, round_off fields), workers, worker_wages. Add created_by/updated_by fields on purchases, sales, expenses, and stock_movements for accountability.

RLS requirement: Do not scope security with a bare business_id match. Create the business_users join table and write RLS policies checking membership through it: business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid()). This must be correct from day one, since a second user (employee/accountant) will eventually be added. Never expose service-role keys client-side.

Validation: Required suppliers, positive length/girth/quantity, non-negative rates/CFT, sale can't exceed stock, valid GSTIN format, unique invoice/purchase numbers, and a database-level CHECK (cft >= 0) constraint on stock as a final safety net.

Every page needs: loading skeleton, empty state, error state, success toast, confirmation dialogs on destructive actions.

Build order: (1) shell/auth/settings → (2) suppliers/purchases/CFT engine → (3) stock (current/upcoming/movements) → (4) customers/sales → (5) invoices/payments → (6) expenses/worker wages → (7) dashboard + final responsive polish. Don't advance a phase until the previous one actually works end-to-end with real Supabase data, not fake frontend state.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/15fb519c-f754-4b5e-aad2-c54c40e696cd).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
