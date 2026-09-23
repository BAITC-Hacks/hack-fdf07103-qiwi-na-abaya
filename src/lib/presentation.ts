import type { Prisma } from "@prisma/client";
export function tags(value: Prisma.JsonValue): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
export function matchReasons(
  skills: string[],
  industry: string,
  teamTags: string[],
): string[] {
  const profile = new Set(
    teamTags.map((item) => item.trim().toLocaleLowerCase("ru")),
  );
  return [...new Set([...skills, industry])].filter((item) =>
    profile.has(item.trim().toLocaleLowerCase("ru")),
  );
}
export const dateLabel = (date: Date) =>
  new Intl.DateTimeFormat("ru", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Almaty",
  }).format(date);
export const statusLabels = {
  DRAFT: "Не опубликована",
  PUBLISHED: "Опубликована",
  IN_PROGRESS: "В работе",
  COMPLETED: "Завершена",
};
export const proposalLabels = {
  PENDING: "На рассмотрении",
  ACCEPTED: "Принято",
  REJECTED: "Отклонено",
};
