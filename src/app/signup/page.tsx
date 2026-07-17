"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function SignupPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/auth/signup", {
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

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-6 font-sans">
      <ThemeToggle className="absolute right-4 top-4" />
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-card/60 p-8 shadow-sm"
      >
        <h1 className="font-display text-2xl font-semibold text-primary">Sign Up</h1>
        <p className="text-sm text-foreground/70">
          Set the email or access code you&apos;ll use to log in. Since this app is for a
          single admin, this can only be done once.
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
          {submitting ? "Creating…" : "Create Account"}
        </button>
        <p className="text-center text-sm text-foreground/60">
          Already set up?{" "}
          <Link href="/login" className="text-primary underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
