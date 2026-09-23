"use server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { submitProgress, confirmProgress, completeTask, progressSchema, progressDecisionSchema, ProgressError } from "@/lib/progress";
export async function changeProgress(operation: "submit" | "confirm" | "complete", input: unknown) {
  try {
    const session = await getSession();
    const parsed = (operation === "submit" ? progressSchema : progressDecisionSchema).safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
    if (operation === "submit" && session.role === "team" && session.team) await submitProgress(db, session.team.id, parsed.data);
    else if (operation === "confirm" && session.role === "business" && session.business) await confirmProgress(db, session.business.id, parsed.data);
    else if (operation === "complete" && session.role === "business" && session.business) await completeTask(db, session.business.id, parsed.data);
    else return { ok: false, message: "Это действие недоступно в вашей роли." };
    revalidatePath("/", "layout");
    return { ok: true, message: operation === "submit" ? "Прогресс отправлен. Ожидаем подтверждения бизнеса." : operation === "confirm" ? "Прогресс подтверждён, баллы команды обновлены." : "Задача завершена." };
  } catch (error) { return { ok: false, message: error instanceof ProgressError ? error.message : "Не удалось сохранить. Обновите страницу и повторите попытку." }; }
}
