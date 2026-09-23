import { getReadinessLevel } from "./scoring.ts";
export type CatalogFilters = {
  query?: string;
  industry?: string;
  level?: string;
  skill?: string;
  sort?: string;
};
type ListableTask = {
  id: string;
  title: string;
  rawDescription: string;
  need: string;
  context: string;
  industry: string;
  skills: unknown;
  score: number;
  createdAt: Date;
  publishedAt: Date | null;
  business?: { name: string };
};
const normalize = (value: string) =>
  value.normalize("NFKC").trim().toLocaleLowerCase("ru");
export const taskSkills = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter(
        (s): s is string => typeof s === "string" && Boolean(s.trim()),
      )
    : [];
export const catalogDate = (
  task: Pick<ListableTask, "publishedAt" | "createdAt">,
) => task.publishedAt ?? task.createdAt;
export function filterAndSortTasks<T extends ListableTask>(
  tasks: T[],
  filters: CatalogFilters,
): T[] {
  const query = normalize(filters.query ?? "");
  return tasks
    .filter(
      (task) =>
        (!filters.industry ||
          normalize(task.industry) === normalize(filters.industry)) &&
        (!filters.level || getReadinessLevel(task.score) === filters.level) &&
        (!filters.skill ||
          taskSkills(task.skills).some(
            (s) => normalize(s) === normalize(filters.skill!),
          )) &&
        (!query ||
          normalize(
            [
              task.title,
              task.rawDescription,
              task.context,
              task.need,
              ...taskSkills(task.skills),
              task.business?.name ?? "",
            ].join(" "),
          ).includes(query)),
    )
    .sort(
      (a, b) =>
        (filters.sort === "score" ? b.score - a.score : 0) ||
        catalogDate(b).getTime() - catalogDate(a).getTime() ||
        a.id.localeCompare(b.id),
    );
}
export function uniqueOptions(values: string[]): string[] {
  const options = new Map<string, string>();
  for (const value of values)
    if (value.trim() && !options.has(normalize(value)))
      options.set(normalize(value), value.trim());
  return [...options.values()].sort((a, b) => a.localeCompare(b, "ru"));
}
