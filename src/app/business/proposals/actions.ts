"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { decideProposal } from "@/lib/proposal-storage";
import { proposalDecisionSchema, ProposalDecisionError, type ProposalDecision } from "@/lib/proposal-decisions";

export async function reviewProposal(input: ProposalDecision) {
  const session = await getSession();
  if (session.role !== "business" || !session.business)
    return { message: "Принимать решения может только бизнес — владелец задачи." };
  const parsed = proposalDecisionSchema.safeParse(input);
  if (!parsed.success) return { message: "Проверьте решение и подтвердите его в диалоге." };
  let taskId: string;
  try {
    ({ taskId } = await decideProposal(db, session.business.id, parsed.data));
  } catch (error) {
    return { message: error instanceof ProposalDecisionError ? error.message : "Не удалось сохранить решение. Попробуйте ещё раз." };
  }
  for (const path of ["/tasks", `/tasks/${taskId}`, "/business", "/business/tasks", "/business/proposals", "/team/proposals", "/team/recommendations"])
    revalidatePath(path);
  const notice = parsed.data.status === "ACCEPTED" ? "proposal_accepted" : "proposal_rejected";
  return { taskId, notice };
}
