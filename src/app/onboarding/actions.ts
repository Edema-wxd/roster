"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

/** Marks first-run onboarding as finished for the signed-in account, so the
 * /onboarding flow never shows again (the flag is checked in the page guards). */
export async function completeOnboarding() {
  const userId = await requireUserId();
  await prisma.user.update({
    where: { id: userId },
    data: { onboardedAt: new Date() },
  });
}
