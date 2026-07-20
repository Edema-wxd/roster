"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

const FIELD_CLASS =
  "rounded-lg border border-wine/20 bg-surface/80 px-4 py-3 text-foreground outline-none focus:border-primary";

export default function SignupPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (pin !== confirmPin) {
      setError("PINs don't match.");
      setPin("");
      setConfirmPin("");
      return;
    }

    setSubmitting(true);

    let res: Response;
    try {
      res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, pin }),
      });
    } catch {
      setError("Couldn't reach the server — check your connection and try again.");
      setSubmitting(false);
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong. Try again.");
      setPin("");
      setConfirmPin("");
      setSubmitting(false);
      return;
    }

    router.push("/onboarding");
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
          Pick any email or username, and a 4-6 digit PIN — each account keeps its own private
          calendar.
        </p>
        <input
          type="text"
          autoFocus
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="Email or username"
          className={FIELD_CLASS}
        />
        <input
          type="password"
          inputMode="numeric"
          pattern="\d{4,6}"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          placeholder="PIN (4-6 digits)"
          className={FIELD_CLASS}
        />
        <input
          type="password"
          inputMode="numeric"
          pattern="\d{4,6}"
          maxLength={6}
          value={confirmPin}
          onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
          placeholder="Confirm PIN"
          className={FIELD_CLASS}
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting || identifier.trim().length === 0 || pin.length < 4 || confirmPin.length < 4}
          className="rounded-full bg-primary px-6 py-3 text-base font-medium text-cream transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create Account"}
        </button>
        <p className="text-center text-sm text-foreground/60">
          Already have an account?{" "}
          <Link href="/login" className="text-primary underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
