import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { cardFields, type TaskCardInput } from "@/lib/task-assistant";
import { tags } from "@/lib/presentation";
import { TaskEditor } from "@/components/task-editor";
export default async function EditTask({ params }: { params: Promise<{ id: string }> }) {
  const { business } = await requireRole("business");
  const { id } = await params;
  if (!business) notFound();
  const task = await db.task.findFirst({ where: { id, businessId: business.id } });
  if (!task) notFound();
  const card = Object.fromEntries(cardFields.map(([key]) => [key, key === "skills" ? tags(task.skills).join(", ") : task[key]])) as TaskCardInput;
  return <TaskEditor key={task.id} id={task.id} initialCard={card} initialRevision={task.wizardRevision} />;
}
