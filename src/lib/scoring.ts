// Pure rubric: only explicit card fields, never raw text, AI confidence or prose style.
export type ReadinessLevel = "DRAFT" | "WORKABLE" | "READY" | "PRIORITY";
export type ScoringFields = Record<
  | "context"
  | "need"
  | "dataMaterials"
  | "expectedResult"
  | "successCriteria"
  | "constraints"
  | "users"
  | "businessContact",
  string
>;
export const readinessLabels: Record<ReadinessLevel, string> = {
  DRAFT: "Черновик",
  WORKABLE: "Рабочая",
  READY: "Готовая",
  PRIORITY: "Приоритетная",
};
export function getReadinessLevel(score: number): ReadinessLevel {
  if (!Number.isFinite(score) || score < 0 || score > 100)
    throw new RangeError("Рейтинг должен быть в диапазоне 0–100");
  if (score < 40) return "DRAFT";
  if (score < 70) return "WORKABLE";
  if (score < 90) return "READY";
  return "PRIORITY";
}
const definitions: {
  key: string;
  label: string;
  fields: (keyof ScoringFields)[];
  max: number;
  hint: string;
}[] = [
  {
    key: "contextNeed",
    label: "Контекст и потребность",
    fields: ["context", "need"],
    max: 20,
    hint: "Добавьте описание ситуации и конкретной проблемы, чтобы повысить готовность.",
  },
  {
    key: "dataMaterials",
    label: "Данные и материалы",
    fields: ["dataMaterials"],
    max: 20,
    hint: "Добавьте состав данных и способ доступа к материалам, чтобы повысить готовность.",
  },
  {
    key: "expectedResult",
    label: "Ожидаемый результат",
    fields: ["expectedResult"],
    max: 15,
    hint: "Добавьте конкретный результат работы команды, чтобы повысить готовность.",
  },
  {
    key: "successCriteria",
    label: "Критерии успеха",
    fields: ["successCriteria"],
    max: 15,
    hint: "Добавьте способ проверки результата, чтобы повысить готовность.",
  },
  {
    key: "constraints",
    label: "Ограничения",
    fields: ["constraints"],
    max: 10,
    hint: "Добавьте известные сроки, бюджет или технические ограничения, чтобы повысить готовность.",
  },
  {
    key: "users",
    label: "Пользователи",
    fields: ["users"],
    max: 10,
    hint: "Добавьте роли пользователей и их действия, чтобы повысить готовность.",
  },
  {
    key: "businessContact",
    label: "Связь с бизнесом",
    fields: ["businessContact"],
    max: 10,
    hint: "Добавьте контакт и формат взаимодействия, чтобы повысить готовность.",
  },
];
const fieldLabels: Record<keyof ScoringFields, string> = {
  context: "Контекст",
  need: "Потребность",
  dataMaterials: "Данные и материалы",
  expectedResult: "Ожидаемый результат",
  successCriteria: "Критерии успеха",
  constraints: "Ограничения",
  users: "Пользователи",
  businessContact: "Связь с бизнесом",
};
// Unknowns are not evidence. Explicit absence (e.g. «Бюджета нет, срок 2 недели»)
// is useful information and follows the same rule as other factual statements.
const unknown =
  /^(?:не знаю|не знаем|пока неизвестно|неизвестно|не определено|не указано|пока не указано|нет информации|нет данных|уточним|позже|todo|tbd|n\/a|нет|да|тест|test|пример|что-то)(?:[.!?…\s]*)$/iu;
function quality(value: string): 0 | 0.5 | 1 {
  const text = value.normalize("NFKC").trim();
  if (!text || unknown.test(text)) return 0;
  const words = text.toLocaleLowerCase("ru").match(/[\p{L}\p{N}]+/gu) ?? [];
  const unique = new Set(words.filter((word) => word.length >= 2));
  if (!unique.size) return 0;
  // A named item earns half credit. Four distinct words and 20 non-space
  // characters earn full credit. Repetition and whitespace do not help.
  return unique.size >= 4 && text.replace(/\s/g, "").length >= 20 ? 1 : 0.5;
}
export function calculateReadiness(fields: ScoringFields) {
  const categories = definitions.map((item) => {
    const assessments = item.fields.map((field) => ({
      field,
      quality: quality(fields[field]),
    }));
    const score = Math.floor(
      assessments.reduce(
        (sum, part) => sum + (part.quality * item.max) / item.fields.length,
        0,
      ),
    );
    const missingFields = assessments
      .filter((part) => part.quality < 1)
      .map((part) => part.field);
    const missing = assessments
      .filter((part) => part.quality < 1)
      .map(
        (part) =>
          `${fieldLabels[part.field]}: ${part.quality === 0 ? "не указано или пока неизвестно" : "указано кратко — добавьте конкретные детали"}`,
      );
    return {
      ...item,
      score,
      maxScore: item.max,
      missing,
      missingFields,
      points: score,
    };
  });
  const total = categories.reduce((sum, item) => sum + item.score, 0);
  const level = getReadinessLevel(total);
  return {
    total,
    level,
    categories,
    suggestions: categories
      .filter((item) => item.score < item.maxScore)
      .map((item) => item.hint),
    // Compatibility aliases for existing server persistence and task cards.
    score: total,
    readinessLevel: level,
    breakdown: categories,
  };
}
