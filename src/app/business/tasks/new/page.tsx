import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
import { newWizard } from "@/lib/wizard-types";
import { taskToWizard } from "@/lib/wizard-storage";
import { TaskWizard } from "@/components/task-wizard";
export default async function NewTask({
  searchParams,
}: {
  searchParams: Promise<{ task?: string }>;
}) {
  const { business } = await requireRole("business");
  if (!business) notFound();
  const { task: id } = await searchParams;
  const task = id
    ? await db.task.findFirst({
        where: { id, businessId: business.id },
        include: { clarifications: { orderBy: { position: "asc" } } },
      })
    : null;
  if (id && !task) notFound();
  if (task && task.status !== "DRAFT") redirect(`/tasks/${task.id}`);
  return (
    <TaskWizard
      key={id ?? "new"}
      initial={task ? taskToWizard(task) : newWizard()}
      businessId={business.id}
    />
  );
}
