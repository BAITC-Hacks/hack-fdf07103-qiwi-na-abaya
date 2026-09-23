import { z } from "zod";
import type { PrismaClient, Prisma } from "@prisma/client";
import { cardFields, type TaskCardInput } from "./task-assistant.ts";
import { calculateReadiness } from "./scoring.ts";

const shape = Object.fromEntries(cardFields.map(([key, label, max]) => [key, z.string().trim().max(max, `Поле «${label}»: максимум ${max} символов.`)])) as Record<keyof TaskCardInput, z.ZodString>;
export const taskEditSchema = z.object({ id: z.string().min(1).max(200), revision: z.number().int().nonnegative(), card: z.object({ ...shape, title: shape.title.min(1, "Добавьте название задачи.") }) });
export type TaskEditInput = z.infer<typeof taskEditSchema>;
export class TaskEditError extends Error {}

export async function saveTaskEdit(db: PrismaClient, businessId: string, input: unknown) {
  return persistTaskEdit(db, businessId, input, false);
}
export async function publishTaskEdit(db: PrismaClient, businessId: string, input: unknown, confirmed: unknown) {
  if (confirmed !== true) throw new TaskEditError("Подтвердите публикацию задачи.");
  return persistTaskEdit(db, businessId, input, true);
}
async function persistTaskEdit(db: PrismaClient, businessId: string, input: unknown, publishing: boolean) {
  // Whitelist card fields: ignore any client score, readiness, status or businessId.
  const data = taskEditSchema.parse(input);
  const readiness = calculateReadiness(data.card);
  return db.$transaction(async tx => {
    const task = await tx.task.findFirst({ where: { id: data.id, businessId } });
    if (!task) throw new TaskEditError("Задача не найдена или недоступна вашему бизнесу.");
    if (publishing && task.status !== "DRAFT") throw new TaskEditError("Опубликовать можно только черновик. Обновите страницу.");
    const meta: Prisma.JsonObject = task.wizardState && typeof task.wizardState === "object" && !Array.isArray(task.wizardState) ? task.wizardState as Prisma.JsonObject : {};
    const result = await tx.task.updateMany({
      where: { id: task.id, businessId, wizardRevision: data.revision, ...(publishing ? { status: "DRAFT" as const } : {}) },
      data: {
        ...data.card,
        ...(publishing ? { status: "PUBLISHED" as const, publishedAt: new Date(), confirmedAt: new Date() } : {}),
        skills: [...new Set(data.card.skills.split(",").map(value => value.trim()).filter(Boolean))],
        score: readiness.total,
        readinessLevel: readiness.level,
        wizardRevision: { increment: 1 },
        wizardState: { ...meta, manualFields: cardFields.map(([key]) => key) },
      },
    });
    if (result.count !== 1) throw new TaskEditError("Задача уже изменена в другой вкладке. Скопируйте свои правки и обновите страницу.");
    return { card: data.card, revision: data.revision + 1, score: readiness.total };
  });
}
