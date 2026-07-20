import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getNextPersonColor } from "@/lib/personPalette";
import { Onboarding } from "./Onboarding";

export default async function OnboardingPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { onboardedAt: true },
  });
  if (!user) redirect("/login");
  // First-time only: once onboarded, this route always bounces to the app.
  if (user.onboardedAt) redirect("/dashboard");

  return <Onboarding suggestedColor={getNextPersonColor([])} />;
}
