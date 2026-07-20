import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/auth";
import { FeedbackBoard, FeedbackSubmitForm } from "@/components/FeedbackBoard";

// Calls isSuperAdmin(), which reads cookies() — that alone makes this page
// dynamic, same effect as the sibling pages' requireUserId() call.
export const dynamic = "force-dynamic";

export default async function FeedbackPage() {
  const canReadFeedback = await isSuperAdmin();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-semibold text-primary">Feedback</h1>
        <p className="text-sm text-foreground/60">
          Bugs, ideas, and anything else about the app — jot it down and track it here.
        </p>
      </header>

      {canReadFeedback ? <AdminFeedbackBoard /> : <FeedbackSubmitForm />}
    </div>
  );
}

async function AdminFeedbackBoard() {
  const feedback = await prisma.feedback.findMany({
    orderBy: { createdAt: "desc" },
    include: { comments: { orderBy: { createdAt: "asc" } } },
  });

  return (
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
  );
}
