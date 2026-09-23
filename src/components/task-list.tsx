import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import type { Task } from "@prisma/client";
import { EmptyState, TaskCard } from "./ui";
export type SearchParams = Promise<
  Record<string, string | string[] | undefined>
>;
export const param = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : "";
export function TaskList({
  tasks,
  query,
  industry,
  sort,
  basePath,
}: {
  tasks: (Task & { _count: { proposals: number } })[];
  query: string;
  industry: string;
  sort: string;
  basePath: string;
}) {
  const industries = [
    ...new Set(tasks.map((task) => task.industry).filter(Boolean)),
  ].sort();
  const normalized = query.trim().toLocaleLowerCase("ru");
  const results = tasks
    .filter(
      (task) =>
        (!industry || task.industry === industry) &&
        (!normalized ||
          [
            task.title,
            task.need,
            task.rawDescription,
            JSON.stringify(task.skills),
          ]
            .join(" ")
            .toLocaleLowerCase("ru")
            .includes(normalized)),
    )
    .sort((a, b) =>
      sort === "score"
        ? b.score - a.score
        : b.updatedAt.getTime() - a.updatedAt.getTime(),
    );
  return (
    <>
      <form
        action={basePath}
        className="panel mb-6 flex flex-wrap items-end gap-3 p-4"
      >
        <label className="field min-w-40 flex-1">
          <span className="flex items-center gap-2">
            <Search size={13} />
            Поиск задач
          </span>
          <input
            className="input"
            name="q"
            defaultValue={query}
            placeholder="Название, проблема или навык"
          />
        </label>
        <label className="field w-full sm:w-44">
          Отрасль
          <select className="input" name="industry" defaultValue={industry}>
            <option value="">Все отрасли</option>
            {industries.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="field w-full sm:w-44">
          Сортировка
          <select className="input" name="sort" defaultValue={sort}>
            <option value="newest">Сначала новые</option>
            <option value="score">По готовности</option>
          </select>
        </label>
        <button className="btn btn-primary">
          <SlidersHorizontal size={14} />
          Применить
        </button>
        {(query || industry) && (
          <Link className="btn btn-secondary" href={basePath}>
            Сбросить
          </Link>
        )}
      </form>
      <p className="mb-4 text-xs text-slate-400">
        Найдено задач: {results.length}
      </p>
      {results.length ? (
        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {results.map((task) => (
            <TaskCard task={task} key={task.id} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Пока ничего не нашлось"
          description="Попробуйте другой запрос или сбросьте фильтры."
          href={basePath}
          action="Показать все задачи"
        />
      )}
    </>
  );
}
