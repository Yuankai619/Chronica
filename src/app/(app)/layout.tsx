import { AppNav } from "@/components/app-nav";
import { TimezoneSync } from "@/components/timezone-sync";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen">
      <TimezoneSync />
      <AppNav />
      <div className="lg:pl-56">{children}</div>
    </div>
  );
}
