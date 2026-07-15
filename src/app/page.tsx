import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center font-sans text-foreground">
      <h1 className="text-4xl font-semibold tracking-tight text-primary">
        Roster
      </h1>
      <p className="max-w-md text-lg text-foreground/80">
        Cycle tracking and scheduling, in one place.
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
