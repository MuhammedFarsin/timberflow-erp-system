export type GradeConfig = {
  cft_divisor: number;
  cft_rounding: number;
  grade1_min: number;
  grade2_min: number;
  grade1_rate: number;
  grade2_rate: number;
  grade3_rate: number;
};

export const GRADES = ["Grade 1", "Grade 2", "Grade 3"] as const;
export type Grade = (typeof GRADES)[number];

export function num(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

export function roundTo(value: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(value * f) / f;
}

/** CFT = (Effective Girth² × Length) / divisor  (divisor configurable, default 2304) */
export function computeCft(effectiveGirth: number, lengthFt: number, cfg: GradeConfig): number {
  if (effectiveGirth <= 0 || lengthFt <= 0) return 0;
  const divisor = cfg.cft_divisor > 0 ? cfg.cft_divisor : 2304;
  return roundTo((effectiveGirth * effectiveGirth * lengthFt) / divisor, cfg.cft_rounding ?? 3);
}

export function gradeFor(effectiveGirth: number, cfg: GradeConfig): Grade {
  if (effectiveGirth >= cfg.grade1_min) return "Grade 1";
  if (effectiveGirth >= cfg.grade2_min) return "Grade 2";
  return "Grade 3";
}

export function rateFor(grade: string, cfg: GradeConfig): number {
  if (grade === "Grade 1") return cfg.grade1_rate;
  if (grade === "Grade 2") return cfg.grade2_rate;
  return cfg.grade3_rate;
}

export type LogRow = {
  key: string;
  length: string;
  girth: string;
  allowance: string;
  grade: string;
  rate: string;
  customRate: boolean;
};

export type ComputedLog = {
  effectiveGirth: number;
  cft: number;
  grade: string;
  rate: number;
  amount: number;
};

export function computeRow(row: LogRow, cfg: GradeConfig): ComputedLog {
  const length = num(row.length);
  const girth = num(row.girth);
  const allowance = num(row.allowance);
  const effectiveGirth = roundTo(Math.max(girth - allowance, 0), 3);
  const cft = computeCft(effectiveGirth, length, cfg);
  const grade = row.customRate && row.grade ? row.grade : gradeFor(effectiveGirth, cfg);
  const rate = row.customRate ? num(row.rate) : rateFor(grade, cfg);
  return { effectiveGirth, cft, grade, rate, amount: roundTo(cft * rate, 2) };
}

export function inr(value: number | null | undefined): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num(value));
}

export function cftFmt(value: number | null | undefined): string {
  return `${num(value).toLocaleString("en-IN", { maximumFractionDigits: 3 })} CFT`;
}

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen",
  "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n] ?? "";
  const t = TENS[Math.floor(n / 10)] ?? "";
  const o = ONES[n % 10] ?? "";
  return o ? `${t} ${o}` : t;
}

/** Indian numbering system, for the rounded invoice total. */
export function amountInWords(amount: number): string {
  const n = Math.round(Math.abs(num(amount)));
  if (n === 0) return "Zero Rupees Only";
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const hundred = Math.floor((n % 1000) / 100);
  const rest = n % 100;
  if (crore) parts.push(`${twoDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundred) parts.push(`${ONES[hundred]} Hundred`);
  if (rest) parts.push(twoDigits(rest));
  return `${parts.join(" ").replace(/\s+/g, " ").trim()} Rupees Only`;
}

export function financialYear(date = new Date()): string {
  const y = date.getFullYear();
  return date.getMonth() + 1 >= 4
    ? `${y}-${String((y + 1) % 100).padStart(2, "0")}`
    : `${y - 1}-${String(y % 100).padStart(2, "0")}`;
}

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function isValidGstin(value: string): boolean {
  return GSTIN_REGEX.test(value.trim().toUpperCase());
}

export const EXPENSE_CATEGORIES = [
  "Transport", "Loading", "Unloading", "Salary", "Electricity", "Rent",
  "Fuel", "Maintenance", "Machinery", "Office", "Other",
];

export const PAYMENT_METHODS = ["Cash", "Bank", "UPI", "Other"];
