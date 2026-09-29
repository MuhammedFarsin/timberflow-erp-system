import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Business = {
  id: string;
  name: string;
  legal_name: string | null;
  gstin: string | null;
  pan: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  state_code: string | null;
  pincode: string | null;
  invoice_prefix: string;
  invoice_footer: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_ifsc: string | null;
  bank_branch: string | null;
  upi_id: string | null;
  gst_rate: number;
  cft_divisor: number;
  cft_rounding: number;
  grade1_min: number;
  grade2_min: number;
  grade1_rate: number;
  grade2_rate: number;
  grade3_rate: number;
  default_allowance: number;
  low_stock_cft: number;
};

/** Resolves (and bootstraps on first login) the current user's business id. */
export function useBusinessId() {
  return useQuery({
    queryKey: ["business-id"],
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("ensure_business", {});
      if (error) throw error;
      return data as string;
    },
  });
}

export function useBusiness() {
  const { data: businessId } = useBusinessId();
  return useQuery({
    queryKey: ["business", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", businessId!)
        .single();
      if (error) throw error;
      return data as unknown as Business;
    },
  });
}

export function useTable<T = Record<string, unknown>>(
  table: string,
  build?: (q: any) => any,
  key: unknown[] = [],
) {
  const { data: businessId } = useBusinessId();
  return useQuery({
    queryKey: [table, businessId, ...key],
    enabled: !!businessId,
    queryFn: async () => {
      let q: any = supabase.from(table as any).select("*").eq("business_id", businessId!);
      if (build) q = build(q);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

export function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: string[]) => {
    keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  };
}

export function useSession() {
  const [state, setState] = useState<{ loading: boolean; email: string | null }>({
    loading: true,
    email: null,
  });
  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setState({ loading: false, email: data.user?.email ?? null });
    });
    return () => {
      active = false;
    };
  }, []);
  return state;
}

type SupaError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
};

/** Turns raw API/database errors into a clear, human message. */
export function errMessage(e: unknown): string {
  if (!e) return "Something went wrong";
  if (typeof e === "string") return e;
  const err = e as SupaError;
  const raw = err.message ?? "";
  const code = err.code ?? "";
  const text = `${code} ${raw} ${err.details ?? ""} ${err.hint ?? ""}`.toLowerCase();

  if (code === "42P17" || text.includes("infinite recursion")) {
    return "The database security rules are referring to themselves, so the server can't decide who may read this data (error 500). Your data is safe — the access rules just need fixing.";
  }
  if (code === "42501" || text.includes("permission denied")) {
    return "This account doesn't have permission to read or change this data.";
  }
  if (text.includes("row-level security") || text.includes("violates row-level")) {
    return "This record was blocked by the workspace access rules — it may belong to a different business.";
  }
  if (code === "PGRST301" || err.status === 401 || text.includes("jwt")) {
    return "Your session has expired. Please sign in again.";
  }
  if (text.includes("failed to fetch") || text.includes("networkerror")) {
    return "Can't reach the server. Check your internet connection and try again.";
  }
  if (err.status === 500 || text.includes("internal server error")) {
    return "The server couldn't complete this request (error 500). This is usually a database access-rule problem, not your data.";
  }
  return raw || "Something went wrong";
}

/** Short troubleshooting steps matched to the failure the user is seeing. */
export function errorSteps(e: unknown): string[] {
  const msg = errMessage(e).toLowerCase();
  if (msg.includes("referring to themselves")) {
    return [
      "Reload the page — a stale session can repeat the failed request.",
      "Sign out and sign back in to refresh your workspace membership.",
      "If it keeps failing, the workspace access rules need to check membership through a helper function instead of querying the membership table itself.",
      "Share the failing page name with support so the rule can be corrected.",
    ];
  }
  if (msg.includes("session has expired")) {
    return ["Sign out and sign in again.", "Then retry the action."];
  }
  if (msg.includes("permission") || msg.includes("access rules")) {
    return [
      "Confirm you're signed in with the right account.",
      "Ask the workspace owner to add you as a member of this business.",
      "Reload the page and try again.",
    ];
  }
  if (msg.includes("can't reach the server")) {
    return ["Check your internet connection.", "Wait a moment, then press Try again."];
  }
  return ["Press Try again.", "If it keeps happening, reload the page or sign in again."];
}

