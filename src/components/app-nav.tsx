"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Timer,
  ListPlus,
  CalendarRange,
  ClipboardList,
  CheckSquare,
  BarChart3,
  Tags,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Timer", icon: Timer },
  { href: "/entries", label: "Entries", icon: ListPlus },
  { href: "/week", label: "Week", icon: CalendarRange },
  { href: "/planning", label: "Planning", icon: ClipboardList },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/summary", label: "Summary", icon: BarChart3 },
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** Desktop: fixed left sidebar. Mobile: brand bar + scrollable icon rail. */
export function AppNav() {
  const pathname = usePathname();

  const links = NAV_LINKS.map((link) => {
    const Icon = link.icon;
    const active = isActive(pathname, link.href);
    return (
      <Link
        key={link.href}
        href={link.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
          active
            ? "bg-panel text-foreground shadow-[inset_2px_0_0_0_var(--color-accent)]"
            : "text-muted hover:bg-panel/60 hover:text-foreground",
        )}
      >
        <Icon className="size-4" strokeWidth={1.75} aria-hidden />
        <span>{link.label}</span>
      </Link>
    );
  });

  const signOut = (
    <form action="/auth/signout" method="post">
      <button
        type="submit"
        className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted transition-colors hover:bg-panel/60 hover:text-foreground"
      >
        <LogOut className="size-4" strokeWidth={1.75} aria-hidden />
        <span>Sign out</span>
      </button>
    </form>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-56 flex-col border-r border-hairline bg-background/95 px-3 py-5 lg:flex">
        <Link
          href="/"
          className="mb-6 px-3 font-mono text-sm font-semibold tracking-[0.2em] text-foreground uppercase"
        >
          Chronica
        </Link>
        <nav className="flex flex-1 flex-col gap-0.5">{links}</nav>
        {signOut}
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-20 border-b border-hairline bg-background/95 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 pt-3">
          <Link
            href="/"
            className="font-mono text-sm font-semibold tracking-[0.2em] uppercase"
          >
            Chronica
          </Link>
          {signOut}
        </div>
        <nav className="flex gap-0.5 overflow-x-auto px-2 py-2">{links}</nav>
      </header>
    </>
  );
}
