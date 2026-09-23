"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { saveTaskEdit, taskEditSchema, TaskEditError, type TaskEditInput } from "@/lib/task-edit";
export async function updateTask(input: TaskEditInput) {
  try {
    const session = await getSession();
    if (session.role !== "business" || !session.business) return { ok: false as const, error: "Редактировать задачу может только её бизнес-владелец." };
    const parsed = taskEditSchema.safeParse(input);
    if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
    const saved = await saveTaskEdit(db, session.business.id, parsed.data);
    for (const path of ["/tasks", `/tasks/${parsed.data.id}`, `/business/tasks/${parsed.data.id}/edit`, "/business/tasks", "/business", "/team/recommendations", "/team/proposals", "/business/proposals"])
      revalidatePath(path);
    return { ok: true as const, ...saved };
  } catch (error) {
    return { ok: false as const, error: error instanceof TaskEditError ? error.message : "Не удалось сохранить задачу. Ваши правки остались в форме — попробуйте ещё раз." };
  }
}
