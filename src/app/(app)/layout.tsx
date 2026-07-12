import Link from "next/link";

const NAV_LINKS = [
  { href: "/", label: "Timer" },
  { href: "/entries", label: "Entries" },
  { href: "/week", label: "Week" },
  { href: "/planning", label: "Planning" },
  { href: "/tasks", label: "Tasks" },
  { href: "/summary", label: "Summary" },
  { href: "/categories", label: "Categories" },
  { href: "/settings", label: "Settings" },
];

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-16">
      <header className="mb-10 flex items-center gap-6 border-b border-hairline py-4">
        <Link
          href="/"
          className="font-mono text-sm font-semibold tracking-[0.2em] text-foreground uppercase"
        >
          Chronica
        </Link>
        <nav className="flex flex-1 gap-5">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <form action="/auth/signout" method="post">
          <button
            className="microlabel cursor-pointer transition-colors hover:text-foreground"
            type="submit"
          >
            Sign out
          </button>
        </form>
      </header>
      <div>{children}</div>
    </div>
  );
}
