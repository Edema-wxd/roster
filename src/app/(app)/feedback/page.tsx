import { prisma } from "@/lib/prisma";
import { FeedbackBoard } from "@/components/FeedbackBoard";

// This page doesn't read cookies() (unlike its sibling pages, which call
// requireUserId() and so get dynamic rendering for free) — without an
// explicit marker, Next tries to statically prerender it at build time,
// which means hitting Neon during `next build` and failing if the compute
// happens to be suspended. Feedback is always-fresh, per-request data, so
// force it dynamic rather than relying on an incidental auth check to do so.
export const dynamic = "force-dynamic";

export default async function FeedbackPage() {
  const feedback = await prisma.feedback.findMany({
    orderBy: { createdAt: "desc" },
    include: { comments: { orderBy: { createdAt: "asc" } } },
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-semibold text-primary">Feedback</h1>
        <p className="text-sm text-foreground/60">
          Bugs, ideas, and anything else about the app — jot it down and track it here.
        </p>
      </header>

      <FeedbackBoard
        items={feedback.map((f) => ({
          id: f.id,
          message: f.message,
          rating: f.rating,
          status: f.status,
          createdAt: f.createdAt.toISOString(),
          comments: f.comments.map((c) => ({
            id: c.id,
            body: c.body,
            createdAt: c.createdAt.toISOString(),
          })),
        }))}
      />
    </div>
  );
}
