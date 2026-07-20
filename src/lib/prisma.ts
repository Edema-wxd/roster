import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "@/generated/prisma/client";

// Neon's compute auto-suspends when idle, and a long-lived pooled connection
// (the dev-server singleton below, or a warm serverless instance) doesn't
// always recover on its own after a suspend/resume — every query then fails
// with "Can't reach database server" until the process is restarted. Retrying
// a couple of times with backoff lets the first query after a cold start
// (or a dropped connection) wake Neon back up instead of hard-failing.
const RETRY_DELAYS_MS = [400, 1200];

function isTransientConnectionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) return true;
  const message = error instanceof Error ? error.message : String(error);
  return /can't reach database server|connection terminated|econnrefused|etimedout/i.test(message);
}

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const client = new PrismaClient({ adapter });

  return client.$extends({
    name: "retry-transient-connection-errors",
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          for (let attempt = 0; ; attempt++) {
            try {
              return await query(args);
            } catch (error) {
              if (attempt >= RETRY_DELAYS_MS.length || !isTransientConnectionError(error)) {
                throw error;
              }
              await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
            }
          }
        },
      },
    },
  });
}

type PrismaClientWithRetry = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClientWithRetry };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
