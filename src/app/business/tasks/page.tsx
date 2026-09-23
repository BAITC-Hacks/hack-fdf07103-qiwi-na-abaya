import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { PageHeading, EmptyState } from "@/components/ui";
import { TaskList, param, type SearchParams } from "@/components/task-list";
export default async function MyTasks({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { business } = await requireRole("business");
  const params = await searchParams;
  const tasks = business
    ? await db.task.findMany({
        where: { businessId: business.id },
        include: {
          business: { select: { name: true } },
          _count: { select: { proposals: true } },
        },
      })
    : [];
  return (
    <>
      <PageHeading
        eyebrow="От черновика к результату"
        title="Мои задачи"
        description="Все ваши идеи, опубликованные задачи и их готовность к работе."
        action={
          <Link className="btn btn-primary" href="/business/tasks/new">
            <Plus size={16} />
            Создать задачу
          </Link>
        }
      />
      {tasks.length ? (
        <TaskList
          tasks={tasks}
          query={param(params.q)}
          level={param(params.level)}
          skill={param(params.skill)}
          industry={param(params.industry)}
          sort={param(params.sort) || "newest"}
          basePath="/business/tasks"
        />
      ) : (
        <EmptyState
          title="Здесь появятся ваши задачи"
          description="Для начала достаточно коротко описать проблему."
          href="/business/tasks/new"
          action="Создать первую задачу"
        />
      )}
    </>
  );
}
