import type { PrismaClient } from "@prisma/client";
import { proposalSchema, type ProposalInput } from "./proposals.ts";
import { proposalDecisionSchema, ProposalDecisionError, type ProposalDecision } from "./proposal-decisions.ts";
// teamId comes from the server session, never from the submitted form.
export async function createTeamProposal(
  db: PrismaClient,
  teamId: string,
  input: ProposalInput,
) {
  const data = proposalSchema.parse(input);
  return db.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id: data.taskId },
      select: { status: true },
    });
    if (!task || task.status !== "PUBLISHED")
      throw new Error("Задача недоступна для новых предложений.");
    // No team-count or score limit; no task assignment or status update.
    return tx.proposal.create({ data: { ...data, teamId, status: "PENDING" } });
  });
}

// Only an explicit business action calls this function; AI never decides.
export async function decideProposal(db: PrismaClient, businessId: string, input: ProposalDecision) {
  const data = proposalDecisionSchema.parse(input);
  return db.$transaction(async (tx) => {
    const proposal = await tx.proposal.findFirst({
      where: { id: data.proposalId, task: { businessId } },
      include: { task: true },
    });
    if (!proposal) throw new ProposalDecisionError("Предложение не найдено или недоступно вашему бизнесу.");
    if (proposal.status !== data.expectedStatus || proposal.status === data.status)
      throw new ProposalDecisionError("Статус уже изменился. Обновите страницу перед новым решением.");
    if (!["PUBLISHED", "IN_PROGRESS"].includes(proposal.task.status))
      throw new ProposalDecisionError("Решения доступны только для опубликованных задач и задач в работе.");
    const updated = await tx.proposal.updateMany({
      where: { id: proposal.id, status: data.expectedStatus, task: { businessId } },
      data: { status: data.status, confirmedByBusiness: false, progressRevision: { increment: 1 } },
    });
    if (updated.count !== 1) throw new ProposalDecisionError("Статус уже изменился. Обновите страницу перед новым решением.");
    if (data.status === "ACCEPTED")
      await tx.task.update({ where: { id: proposal.taskId }, data: { status: "IN_PROGRESS" } });
    // Other proposals are untouched. Rejection never rolls back task progress.
    return { taskId: proposal.taskId };
  });
}
