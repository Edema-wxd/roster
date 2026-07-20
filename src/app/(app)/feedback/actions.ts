"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { FeedbackStatus } from "@/generated/prisma/enums";

export async function addFeedback(input: { message: string; rating?: number }) {
  const message = input.message.trim();
  if (!message) {
    throw new Error("Feedback message is required.");
  }
  await prisma.feedback.create({
    data: {
      message,
      rating: input.rating ?? null,
    },
  });
  revalidatePath("/feedback");
}

export async function updateFeedbackStatus(id: string, status: FeedbackStatus) {
  await prisma.feedback.update({ where: { id }, data: { status } });
  revalidatePath("/feedback");
}

export async function deleteFeedback(id: string) {
  await prisma.feedback.delete({ where: { id } });
  revalidatePath("/feedback");
}

export async function addFeedbackComment(feedbackId: string, body: string) {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error("Comment can't be empty.");
  }
  await prisma.feedbackComment.create({
    data: { feedbackId, body: trimmed },
  });
  revalidatePath("/feedback");
}

export async function deleteFeedbackComment(commentId: string) {
  await prisma.feedbackComment.delete({ where: { id: commentId } });
  revalidatePath("/feedback");
}
