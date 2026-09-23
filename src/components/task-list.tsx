import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import type { Task } from "@prisma/client";
import { filterAndSortTasks, taskSkills, uniqueOptions } from "@/lib/catalog";
import { readinessLabels } from "@/lib/scoring";
import { SubmitButton } from "./interactive";
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
  level = "",
  skill = "",
  basePath,
}: {
  tasks: (Task & {
    business: { name: string };
    _count: { proposals: number };
  })[];
  query: string;
  industry: string;
  sort: string;
  level?: string;
  skill?: string;
  basePath: string;
}) {
  const industries = uniqueOptions(tasks.map((task) => task.industry));
  const skills = uniqueOptions(
    tasks.flatMap((task) => taskSkills(task.skills)),
  );
  const results = filterAndSortTasks(tasks, {
    query,
    industry,
    level,
    skill,
    sort,
  });
  const filtered = Boolean(query || industry || level || skill);
  return (
    <>
      <form
        key={[query, industry, level, skill, sort].join("|")}
        action={basePath}
        method="get"
        aria-label="Фильтры задач"
        className="panel catalog-filters mb-6 items-end gap-4 p-5"
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
            maxLength={200}
            placeholder="Название, описание или навык"
          />
        </label>
        <label className="field w-full sm:w-44">
          Отрасль
          <select className="input" name="industry" defaultValue={industry}>
            <option value="">Все отрасли</option>
            {industry && !industries.includes(industry) && (
              <option value={industry}>{industry}</option>
            )}
            {industries.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="field w-full sm:w-44">
          Уровень готовности
          <select className="input" name="level" defaultValue={level}>
            <option value="">Все уровни</option>
            {Object.entries(readinessLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="field w-full sm:w-44">
          Навыки / технологии
          <select className="input" name="skill" defaultValue={skill}>
            <option value="">Все навыки</option>
            {skills.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
            {skill && !skills.includes(skill) && (
              <option value={skill}>{skill}</option>
            )}
          </select>
        </label>
        <label className="field w-full sm:w-44">
          Сортировка
          <select className="input" name="sort" defaultValue={sort}>
            <option value="newest">Сначала новые</option>
            <option value="score">По готовности</option>
          </select>
        </label>
        <SubmitButton>
          <SlidersHorizontal size={14} />
          Применить
        </SubmitButton>
        {filtered && (
          <Link className="btn btn-secondary" href={basePath}>
            Сбросить
          </Link>
        )}
      </form>
      <p className="mb-4 text-xs text-slate-400">
        Найдено задач: {results.length}
      </p>
      {results.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {results.map((task) => (
            <TaskCard task={task} key={task.id} editable={basePath === "/business/tasks"} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={
            tasks.length
              ? "Нет задач с такими параметрами"
              : "Здесь скоро появятся задачи"
          }
          description={
            tasks.length
              ? "Попробуйте другой запрос или сбросьте фильтры — подходящий проект может быть рядом."
              : "Бизнес готовит первые публикации. Возвращайтесь за новыми проектами."
          }
          href={filtered ? basePath : undefined}
          action="Сбросить фильтры"
        />
      )}
    </>
  );
}
