"use client";

import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
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
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`,
          }}
        />
      </head>
      <body className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center font-sans text-foreground antialiased">
        <h1 className="text-3xl font-semibold text-foreground">Something went wrong</h1>
        <p className="max-w-sm text-foreground/70">
          Roster couldn&apos;t load. Try again — if the problem keeps happening, come back a bit
          later.
          {error.digest && (
            <span className="mt-1 block text-xs text-foreground/40">Error ID: {error.digest}</span>
          )}
        </p>
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="rounded-full bg-primary px-6 py-3 text-base font-medium text-cream transition-opacity hover:opacity-90"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
