import { db } from "@/lib/db";
import { PageHeading } from "@/components/ui";
import { TaskList, param, type SearchParams } from "@/components/task-list";
export default async function Catalog({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [params, tasks] = await Promise.all([
    searchParams,
    db.task.findMany({
      where: { status: "PUBLISHED" },
      include: { _count: { select: { proposals: true } } },
    }),
  ]);
  return (
    <>
      <PageHeading
        eyebrow="Реальные задачи · реальный опыт"
        title="Найдите свой следующий проект"
        description="Выберите задачу, где ваши навыки принесут пользу. Низкий рейтинг готовности не ограничивает отклики."
      />
      <TaskList
        tasks={tasks}
        query={param(params.q)}
        industry={param(params.industry)}
        sort={param(params.sort) || "newest"}
        basePath="/catalog"
      />
    </>
  );
}
