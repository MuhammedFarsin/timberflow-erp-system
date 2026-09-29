import { useState } from "react";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  PackagePlus,
  Boxes,
  ShoppingCart,
  Receipt,
  FileText,
  HardHat,
  Settings,
  Menu,
  LogOut,
  TreePine,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness, useSession } from "@/lib/data";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/purchases", label: "Purchases", icon: PackagePlus },
  { to: "/stock", label: "Stock", icon: Boxes },
  { to: "/sales", label: "Sales", icon: ShoppingCart },
  { to: "/expenses", label: "Expenses", icon: Receipt },
  { to: "/invoices", label: "Invoices", icon: FileText },
  { to: "/wages", label: "Worker Wages", icon: HardHat },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-0.5 px-3">
      {NAV.map((item) => {
        const active = pathname.startsWith(item.to);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <Icon className="size-4" strokeWidth={1.75} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2.5 px-5 py-5">
      <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <TreePine className="size-4" strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-tight">{name}</p>
        <p className="text-[11px] text-muted-foreground">Timber ERP</p>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { data: business } = useBusiness();
  const { email } = useSession();
  const router = useRouter();
  const name = business?.name ?? "Timber Co.";

  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen bg-surface">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-sidebar lg:flex">
        <Brand name={name} />
        <div className="flex-1 overflow-y-auto pb-4">
          <NavList />
        </div>
        <div className="border-t border-border px-4 py-3">
          <p className="truncate text-xs text-muted-foreground">{email}</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 h-8 w-full justify-start px-2 text-muted-foreground"
            onClick={signOut}
          >
            <LogOut className="mr-2 size-4" /> Sign out
          </Button>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Brand name={name} />
            <NavList onNavigate={() => setOpen(false)} />
            <div className="mt-4 border-t border-border px-4 py-3">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-full justify-start px-2 text-muted-foreground"
                onClick={signOut}
              >
                <LogOut className="mr-2 size-4" /> Sign out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        <span className="text-sm font-semibold">{name}</span>
      </header>

      <main className="lg:pl-60">
        <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
