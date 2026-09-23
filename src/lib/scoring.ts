import { ReadinessLevel } from "@prisma/client";

export type ScoringFields = {
  context: string;
  need: string;
  dataMaterials: string;
  expectedResult: string;
  successCriteria: string;
  constraints: string;
  users: string;
  businessContact: string;
};

export const readinessLabels: Record<ReadinessLevel, string> = {
  DRAFT: "Черновик",
  WORKING: "Рабочая",
  READY: "Готовая",
  PRIORITY: "Приоритетная",
};

export function getReadinessLevel(score: number): ReadinessLevel {
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new RangeError("Рейтинг должен быть в диапазоне 0–100");
  }
  if (score < 40) return ReadinessLevel.DRAFT;
  if (score < 70) return ReadinessLevel.WORKING;
  if (score < 90) return ReadinessLevel.READY;
  return ReadinessLevel.PRIORITY;
}

// Transparent MVP completeness rubric: points for explicitly filled fields only.
// No inference from rawDescription, hidden length bonuses or AI-assigned scores.
export function calculateReadiness(fields: ScoringFields) {
  const filled = (key: keyof ScoringFields) => fields[key].trim().length > 0;
  const definitions: {
    label: string;
    fields: (keyof ScoringFields)[];
    max: number;
    hint: string;
  }[] = [
    {
      label: "Контекст и потребность",
      fields: ["context", "need"],
      max: 20,
      hint: "Опишите ситуацию и проблему, которую нужно решить.",
    },
    {
      label: "Данные и материалы",
      fields: ["dataMaterials"],
      max: 20,
      hint: "Укажите доступные данные и способ доступа к ним.",
    },
    {
      label: "Ожидаемый результат",
      fields: ["expectedResult"],
      max: 15,
      hint: "Назовите конкретный результат работы команды.",
    },
    {
      label: "Критерии успеха",
      fields: ["successCriteria"],
      max: 15,
      hint: "Опишите, как бизнес проверит результат.",
    },
    {
      label: "Ограничения",
      fields: ["constraints"],
      max: 10,
      hint: "Укажите сроки, бюджет и технические ограничения.",
    },
    {
      label: "Пользователи",
      fields: ["users"],
      max: 10,
      hint: "Укажите, кто будет пользоваться решением.",
    },
    {
      label: "Связь с бизнесом",
      fields: ["businessContact"],
      max: 10,
      hint: "Укажите контакт и формат взаимодействия.",
    },
  ];
  const breakdown = definitions.map((item) => ({
    ...item,
    points: (item.fields.filter(filled).length * item.max) / item.fields.length,
    missingFields: item.fields.filter((key) => !filled(key)),
  }));
  const score = breakdown.reduce((sum, item) => sum + item.points, 0);
  return { score, readinessLevel: getReadinessLevel(score), breakdown };
}
