"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center font-sans text-foreground">
      <ThemeToggle className="absolute right-4 top-4" />
      <h1 className="font-display text-3xl font-semibold text-foreground">
        Something went wrong
      </h1>
      <p className="max-w-sm text-foreground/70">
        Roster hit an unexpected error. Try again, or head back and pick up where you left off.
        {error.digest && (
          <span className="mt-1 block text-xs text-foreground/40">Error ID: {error.digest}</span>
        )}
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="rounded-full bg-primary px-6 py-3 text-base font-medium text-cream transition-opacity hover:opacity-90"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="rounded-full border border-wine/30 px-6 py-3 text-base font-medium text-foreground/80 transition-colors hover:border-primary hover:text-primary"
        >
          Back to calendar
        </Link>
      </div>
    </div>
  );
}
