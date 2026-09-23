import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
export const progressSchema = z.object({ proposalId: z.string().min(1).max(200), revision: z.number().int().nonnegative(), progressPercent: z.number().int().min(0).max(100), progressComment: z.string().trim().min(3, "Кратко опишите результат — минимум 3 символа.").max(2000) });
export const progressDecisionSchema = progressSchema.pick({ proposalId: true, revision: true });
export class ProgressError extends Error {}
export async function submitProgress(db: PrismaClient, teamId: string, input: unknown) {
  const data = progressSchema.parse(input);
  const result = await db.proposal.updateMany({
    where: { id: data.proposalId, teamId, status: "ACCEPTED", progressRevision: data.revision, task: { status: "IN_PROGRESS" } },
    data: { progressPercent: data.progressPercent, progressComment: data.progressComment, submittedAt: new Date(), confirmedByBusiness: false, progressRevision: { increment: 1 } },
  });
  if (!result.count) throw new ProgressError("Обновление недоступно или данные изменились. Обновите страницу: прогресс отправляет только выбранная команда по задаче в работе.");
}
export async function confirmProgress(db: PrismaClient, businessId: string, input: unknown) {
  const data = progressDecisionSchema.parse(input);
  return db.$transaction(async tx => {
    const proposal = await tx.proposal.findFirst({ where: { id: data.proposalId, task: { businessId, status: "IN_PROGRESS" }, status: "ACCEPTED", progressRevision: data.revision, confirmedByBusiness: false, submittedAt: { not: null } } });
    if (!proposal) throw new ProgressError("Обновление уже изменилось, подтверждено или недоступно вашему бизнесу. Обновите страницу.");
    const result = await tx.proposal.updateMany({ where: { id: proposal.id, progressRevision: data.revision, confirmedByBusiness: false }, data: { confirmedByBusiness: true, confirmedPercent: proposal.progressPercent, awardedPoints: Math.max(proposal.awardedPoints, proposal.progressPercent), progressRevision: { increment: 1 } } });
    if (!result.count) throw new ProgressError("Прогресс изменился. Обновите страницу.");
  });
}
export async function completeTask(db: PrismaClient, businessId: string, input: unknown) {
  const data = progressDecisionSchema.parse(input);
  return db.$transaction(async tx => {
    const proposal = await tx.proposal.findFirst({ where: { id: data.proposalId, progressRevision: data.revision, status: "ACCEPTED", confirmedByBusiness: true, progressPercent: 100, submittedAt: { not: null }, task: { businessId, status: "IN_PROGRESS" } } });
    if (!proposal) throw new ProgressError("Для завершения требуется актуальный прогресс 100%, вручную подтверждённый бизнесом.");
    await tx.task.update({ where: { id: proposal.taskId }, data: { status: "COMPLETED" } });
  });
}
