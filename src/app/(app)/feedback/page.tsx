import { prisma } from "@/lib/prisma";
import { FeedbackBoard } from "@/components/FeedbackBoard";

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
