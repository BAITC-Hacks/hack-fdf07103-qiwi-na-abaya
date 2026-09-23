"use server";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { proposalSchema, type ProposalResult } from "@/lib/proposals";
export async function submitProposal(
  _previous: ProposalResult,
  form: FormData,
): Promise<ProposalResult> {
  try {
    const session = await getSession();
    if (session.role !== "team" || !session.team)
      return {
        ok: false,
        message: "Чтобы отправить предложение, переключитесь на роль команды.",
      };
    const parsed = proposalSchema.safeParse(
      Object.fromEntries(
        ["taskId", "solutionIdea", "plan", "estimatedTime", "prototypeUrl"].map(
          (key) => [key, form.get(key) ?? ""],
        ),
      ),
    );
    if (!parsed.success)
      return { ok: false, message: parsed.error.issues[0].message };
    const data = parsed.data;
    await db.$transaction(async (tx) => {
      const task = await tx.task.findUnique({
        where: { id: data.taskId },
        select: { status: true },
      });
      if (!task || task.status !== "PUBLISHED")
        throw new Error("Задача недоступна для новых предложений.");
      // No score gate: even a published task with 0 points accepts proposals.
      await tx.proposal.create({
        data: { ...data, teamId: session.team!.id, status: "PENDING" },
      });
    });
    for (const path of [
      "/tasks",
      `/tasks/${data.taskId}`,
      "/team/proposals",
      "/business/proposals",
      "/business",
    ])
      revalidatePath(path);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      return {
        ok: false,
        message:
          "Ваша команда уже отправила предложение на эту задачу. Оно доступно в разделе «Мои отклики».",
      };
    return {
      ok: false,
      message:
        error instanceof Error &&
        error.message === "Задача недоступна для новых предложений."
          ? error.message
          : "Не удалось отправить предложение. Ваш текст остался в форме — попробуйте ещё раз.",
    };
  }
  redirect("/team/proposals?notice=proposal_sent");
}
