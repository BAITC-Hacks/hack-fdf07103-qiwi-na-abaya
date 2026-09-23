import { db } from "@/lib/db";
import { PageHeading } from "@/components/ui";
import { TaskList, param, type SearchParams } from "@/components/task-list";
export const metadata = { title: "Каталог бизнес-задач · Qadam" };
export default async function Catalog({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [params, tasks] = await Promise.all([
    searchParams,
    db.task.findMany({
      where: { status: "PUBLISHED" },
      include: {
        business: { select: { name: true } },
        _count: { select: { proposals: true } },
      },
    }),
  ]);
  return (
    <>
      <PageHeading
        eyebrow="Реальные задачи · реальный опыт"
        title="Найдите свой следующий проект"
        description="Выберите задачу, где ваши навыки принесут пользу. Любой уровень готовности — возможность предложить решение."
      />
      <TaskList
        tasks={tasks}
        query={param(params.q)}
        industry={param(params.industry)}
        level={param(params.level)}
        skill={param(params.skill)}
        sort={param(params.sort) || "newest"}
        basePath="/tasks"
      />
    </>
  );
}
