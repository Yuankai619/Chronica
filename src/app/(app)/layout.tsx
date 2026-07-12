import Link from "next/link";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="app-shell">
      <header className="app-nav">
        <Link href="/" className="app-nav-brand">
          Chronica
        </Link>
        <nav className="app-nav-links">
          <Link href="/">Timer</Link>
          <Link href="/categories">Categories</Link>
        </nav>
        <form action="/auth/signout" method="post">
          <button className="link-button" type="submit">
            Sign out
          </button>
        </form>
      </header>
      <div className="app-content">{children}</div>
    </div>
  );
}
