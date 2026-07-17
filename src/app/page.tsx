import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center font-sans text-foreground">
      <ThemeToggle className="absolute right-4 top-4" />
      <h1 className="font-display text-5xl font-semibold tracking-tight text-primary">
        Roster
      </h1>
      <p className="max-w-md text-lg text-foreground/80">
        One calendar for the cycles, dates, and appointments of the people you keep close.
      </p>
      <div className="flex gap-3">
        <Link
          href="/login"
          className="rounded-full bg-primary px-6 py-3 text-base font-medium text-cream transition-opacity hover:opacity-90"
        >
          Log In
        </Link>
        <Link
          href="/signup"
          className="rounded-full border border-wine/30 px-6 py-3 text-base font-medium text-foreground/80 transition-colors hover:border-primary hover:text-primary"
        >
          Sign Up
        </Link>
      </div>
    </div>
  );
}
