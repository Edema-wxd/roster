import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-wine/10 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="font-display text-xl font-semibold text-primary">Roster</span>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium">
            <Link href="/dashboard" className="hover:text-primary">
              Calendar
            </Link>
            <Link href="/people" className="hover:text-primary">
              Partners
            </Link>
            <Link href="/trends" className="hover:text-primary">
              Trends
            </Link>
            <Link href="/feedback" className="hover:text-primary">
              Feedback
            </Link>
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
