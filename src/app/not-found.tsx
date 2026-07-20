import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center font-sans text-foreground">
      <ThemeToggle className="absolute right-4 top-4" />
      <span className="font-display text-7xl font-semibold tracking-tight text-primary">
        404
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-semibold text-foreground">Page not found</h1>
        <p className="max-w-sm text-foreground/70">
          The page you&apos;re looking for doesn&apos;t exist, or may have moved.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-full bg-primary px-6 py-3 text-base font-medium text-cream transition-opacity hover:opacity-90"
      >
        Back to Roster
      </Link>
    </div>
  );
}
