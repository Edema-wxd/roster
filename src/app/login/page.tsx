"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

const PIN_FIELD_CLASS =
  "rounded-lg border border-wine/20 bg-surface/80 px-4 py-3 text-foreground outline-none focus:border-primary";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [needsPinSetup, setNeedsPinSetup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (needsPinSetup && pin !== confirmPin) {
      setError("PINs don't match.");
      setPin("");
      setConfirmPin("");
      return;
    }

    setSubmitting(true);

    let res: Response;
    try {
      res = await fetch(needsPinSetup ? "/api/auth/set-pin" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, pin }),
      });
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setSubmitting(false);
      return;
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Try again.");
      setPin("");
      setConfirmPin("");
      setSubmitting(false);
      return;
    }

    if (data.needsPinSetup) {
      setNeedsPinSetup(true);
      setPin("");
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
        {needsPinSetup
          ? "This account doesn't have a PIN yet. Set one to continue."
          : "Enter your email or username and PIN."}
      </p>
      <input
        type="text"
        autoFocus
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        placeholder="Email or username"
        disabled={needsPinSetup}
        className={`${PIN_FIELD_CLASS} disabled:opacity-60`}
      />
      <input
        type="password"
        inputMode="numeric"
        pattern="\d{4,6}"
        maxLength={6}
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
        placeholder={needsPinSetup ? "New PIN (4-6 digits)" : "PIN"}
        className={PIN_FIELD_CLASS}
      />
      {needsPinSetup && (
        <input
          type="password"
          inputMode="numeric"
          pattern="\d{4,6}"
          maxLength={6}
          value={confirmPin}
          onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
          placeholder="Confirm PIN"
          className={PIN_FIELD_CLASS}
        />
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={
          submitting ||
          identifier.trim().length === 0 ||
          pin.length < 4 ||
          (needsPinSetup && confirmPin.length < 4)
        }
        className="rounded-full bg-primary px-6 py-3 text-base font-medium text-cream transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Please wait…" : needsPinSetup ? "Set PIN and continue" : "Continue"}
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
