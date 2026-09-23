import type { PrismaClient } from "@prisma/client";
import { proposalSchema, type ProposalInput } from "./proposals.ts";
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
