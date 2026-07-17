"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong. Try again.");
      setSubmitting(false);
      return;
    }

    router.push(searchParams.get("next") ?? "/dashboard");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-card/60 p-8 shadow-sm"
    >
      <h1 className="font-display text-2xl font-semibold text-primary">Log In</h1>
      <p className="text-sm text-foreground/70">
        Enter the email or access code you signed up with.
      </p>
      <input
        type="text"
        autoFocus
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        placeholder="Email or access code"
        className="rounded-lg border border-wine/20 bg-surface/80 px-4 py-3 text-foreground outline-none focus:border-primary"
      />
      {error && <p className="text-sm text-primary">{error}</p>}
      <button
        type="submit"
        disabled={submitting || identifier.trim().length === 0}
        className="rounded-full bg-primary px-6 py-3 text-base font-medium text-cream transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Logging in…" : "Continue"}
      </button>
      <p className="text-center text-sm text-foreground/60">
        No account yet?{" "}
        <Link href="/signup" className="text-primary underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-6 font-sans">
      <ThemeToggle className="absolute right-4 top-4" />
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
