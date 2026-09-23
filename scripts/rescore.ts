import "dotenv/config";
import { PrismaClient, type Prisma } from "@prisma/client";
import { calculateReadiness } from "../src/lib/scoring.ts";
import { extractEvidence } from "../src/lib/task-assistant.ts";
const db = new PrismaClient();
try {
  await db.$transaction(async (tx) => {
    const tasks = await tx.task.findMany();
    for (const task of tasks) {
      const { score, readinessLevel } = calculateReadiness(task);
      const meta = task.wizardState as Prisma.JsonObject;
      const wizardState = {
        ...meta,
        baselineScore: calculateReadiness(
          extractEvidence(
            typeof meta.analyzedDescription === "string"
              ? meta.analyzedDescription
              : task.rawDescription,
          ),
        ).total,
      };
      await tx.task.update({
        where: { id: task.id },
        data: {
          score,
          readinessLevel,
          wizardState,
          wizardRevision: { increment: 1 },
        },
      });
    }
    console.log(
      `Пересчитано задач: ${tasks.length}. Статусы публикаций сохранены.`,
    );
  });
} finally {
  await db.$disconnect();
}
