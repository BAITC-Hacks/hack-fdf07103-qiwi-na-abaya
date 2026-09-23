// Deterministic fallback and shared card types. Live AI service: ./ai/server.ts.
// The fallback extracts literal user evidence; it never invents business facts.
export const cardFields = [
  ["title", "Название", 150],
  ["industry", "Отрасль", 100],
  ["context", "Контекст", 8000],
  ["need", "Потребность / проблема", 8000],
  ["users", "Пользователи", 8000],
  ["dataMaterials", "Данные и материалы", 8000],
  ["expectedResult", "Ожидаемый результат", 8000],
  ["successCriteria", "Критерии успеха", 8000],
  ["constraints", "Ограничения", 8000],
  ["businessContact", "Контакт / формат взаимодействия", 8000],
  ["skills", "Требуемые навыки / технологии", 1000],
] as const;
export type CardField = (typeof cardFields)[number][0];
export type TaskCardInput = Record<CardField, string>;
export const emptyCard: TaskCardInput = {
  title: "",
  industry: "",
  context: "",
  need: "",
  users: "",
  dataMaterials: "",
  expectedResult: "",
  successCriteria: "",
  constraints: "",
  businessContact: "",
  skills: "",
};
export type Question = {
  key: string;
  field: CardField;
  label: string;
  question: string;
  answer: string;
  active: boolean;
};
export type Analysis = {
  card: TaskCardInput;
  questions: Question[];
  missing: CardField[];
  mode: "fallback";
};
export interface TaskAssistant {
  analyze(
    rawDescription: string,
    known?: Partial<TaskCardInput>,
  ): Promise<Analysis>;
}
const unknown =
  /^(не знаю|не знаем|пока не знаем|пока не знаю|не определено|пока не определено|уточним|нет информации|—|-)[.!]?$/i;
export const isKnown = (text: string) =>
  Boolean(text.trim()) && !unknown.test(text.trim());
const aliases: Partial<Record<CardField, string>> = {
  title: "название",
  industry: "отрасль",
  context: "контекст|ситуация",
  need: "проблема|потребность",
  users: "пользователи|аудитория",
  dataMaterials: "данные(?: и материалы)?|материалы",
  expectedResult: "ожидаемый результат|результат",
  successCriteria: "критерии успеха|критерии|успех",
  constraints: "ограничения|сроки|бюджет",
  businessContact: "контакт(?:ы)?|взаимодействие|связь",
  skills: "навыки(?: и технологии)?|технологии",
};
const evidenceRules: Partial<Record<CardField, RegExp>> = {
  context:
    /интернет[- ]магазин|у нас|наша компания|наша сеть|в (?:тр[её]х|двух|\d+) магазинах|мы (?:прода[её]м|занимаемся|производим)/i,
  need: /теряем|проблем|сниж[ае]|падают|ошиб|сложно|неудобно|не хватает|очеред|опазды|списыв|списани|долго|переста[её]т|уходят|не возвращаются/i,
  users:
    /пользовател|пользоваться|использовать (?:будут|будет)|решение для|для (?:менеджер|аналитик|продавц|администратор|закупщик|сотрудник)|аудитори/i,
  dataMaterials:
    /(?:есть|имеется|доступн|предоставим|передадим|собираем|храним).*(?:csv|выгрузк|данны|таблиц|crm|аналитик|заказ|отч[её]т)|(?:нет|не имеем) (?:доступа к )?данных/i,
  expectedResult:
    /(?:нужен|нужна|нужно|хотим|ожидаем|получить).*(?:отч[её]т|дашборд|прототип|список|сайт|бот|рекомендаци|модель|приложение)/i,
  successCriteria:
    /критер|считаем успеш|успех.*(?:если|когда)|проверим|точность (?:не менее|выше)|результат принят/i,
  constraints:
    /бюджет|срок|за \d+ (?:дн|недел|месяц)|без платных|не использовать|нельзя|не более \d+/i,
  businessContact:
    /[\w.+-]+@[\w.-]+\.[a-z]{2,}|telegram|телеграм|созвон|контакт|обратная связь|свяжитесь/i,
};
export function extractEvidence(raw: string): TaskCardInput {
  const card = { ...emptyCard };
  const lines = raw
    .trim()
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const sentences = lines.flatMap((line) =>
    line.split(/(?<=[.!?;])\s+(?=[А-ЯA-Z])/u),
  );
  for (const [key] of cardFields) {
    const alias = aliases[key];
    const labeled = alias
      ? lines
          .map(
            (line) =>
              line.match(
                new RegExp(`^(?:${alias})\\s*[:—-]\\s*(.+)$`, "i"),
              )?.[1],
          )
          .filter((value): value is string => Boolean(value))
      : [];
    if (labeled.length) card[key] = labeled.join("\n");
    else if (evidenceRules[key])
      card[key] = sentences
        .filter((sentence) => evidenceRules[key]!.test(sentence))
        .join("\n");
    if (!isKnown(card[key])) card[key] = "";
  }
  if (!card.title) card.title = (sentences[0] ?? "").slice(0, 150);
  if (!card.industry)
    card.industry =
      raw.match(/интернет[- ]магазин|логистика|образование|ритейл/i)?.[0] ?? "";
  if (!card.skills)
    card.skills = [
      ...new Set(
        raw.match(
          /\b(?:Python|TypeScript|JavaScript|React|Next\.js|SQL|Figma|Node\.js|SQLite)\b/gi,
        ) ?? [],
      ),
    ].join(", ");
  return card;
}
const mainQuestions: [CardField, string][] = [
  [
    "context",
    "В какой ситуации возникла задача: что за бизнес, какой процесс и что происходит сейчас?",
  ],
  [
    "need",
    "Что именно не работает сейчас и почему это важно исправить для бизнеса?",
  ],
  [
    "users",
    "Кто будет пользоваться результатом работы команды и для какого решения?",
  ],
  [
    "dataMaterials",
    "Какие обезличенные данные или материалы уже есть? Опишите состав и формат, не присылая сами данные.",
  ],
  [
    "expectedResult",
    "Что конкретно команда должна передать в конце: какой результат или артефакт вы ожидаете?",
  ],
  [
    "successCriteria",
    "По каким проверяемым признакам вы поймёте, что задача решена успешно?",
  ],
  [
    "constraints",
    "Какие есть ограничения по сроку, бюджету, технологиям и доступу к данным?",
  ],
  [
    "businessContact",
    "Какая роль со стороны бизнеса отвечает на вопросы и какой рабочий формат взаимодействия удобен? Личные контакты не нужны.",
  ],
];
export const extraQuestions: Record<
  string,
  { field: CardField; label: string; question: string }
> = {
  edgeCases: {
    field: "constraints",
    label: "Границы решения",
    question:
      "Какие исключительные случаи можно оставить за рамками первой версии?",
  },
  acceptanceOwner: {
    field: "businessContact",
    label: "Приёмка результата",
    question:
      "Какая роль со стороны бизнеса принимает итоговый результат и даёт обратную связь на промежуточную версию?",
  },
  priority: {
    field: "expectedResult",
    label: "Приоритет результата",
    question:
      "Если времени хватит только на одну часть результата, какую часть следует сделать первой?",
  },
  pilot: {
    field: "successCriteria",
    label: "Первая проверка",
    question:
      "На каком небольшом примере или пилотной группе можно сначала проверить решение?",
  },
  risks: {
    field: "constraints",
    label: "Риски",
    question:
      "Какие зависимости от других людей или систем могут помешать работе команды?",
  },
  alternatives: {
    field: "context",
    label: "Предыдущие попытки",
    question:
      "Какие способы решения уже пробовали и что стоит учесть из этого опыта?",
  },
};
export function buildAnalysis(
  raw: string,
  known: Partial<TaskCardInput> = {},
): Analysis {
  const card = { ...extractEvidence(raw) };
  for (const [key] of cardFields)
    if (isKnown(known[key] ?? "")) card[key] = known[key]!;
  const ecommerce = /интернет[- ]магазин|заказ|покупател/i.test(raw);
  const missing = mainQuestions
    .filter(([key]) => !isKnown(card[key]))
    .map(([key]) => key);
  const questions: Question[] = mainQuestions
    .filter(([key]) => missing.includes(key))
    .map(([field, question]) => ({
      key: field,
      field,
      label: cardFields.find(([key]) => key === field)![1],
      question:
        ecommerce && field === "dataMaterials"
          ? "Есть ли обезличенные выгрузки заказов, возвратов или статистика воронки интернет-магазина? Опишите состав и формат без персональных данных."
          : question,
      answer: "",
      active: true,
    }));
  const evidence = [raw, ...Object.values(known)].join(" ").toLowerCase();
  const alreadySpecified: Record<string, RegExp> = {
    edgeCases: /за рамками|исключени|не входит/,
    acceptanceOwner: /принимает|принимать|приёмк|приемк/,
    priority: /приоритет|в первую очередь|сначала.*сделать/,
    pilot: /пилот|тестов.*групп/,
    risks: /риск|зависимост/,
    alternatives: /пробовали|предыдущ/,
  };
  for (const [key, item] of Object.entries(extraQuestions)) {
    if (questions.length >= 3) break;
    if (!alreadySpecified[key].test(evidence))
      questions.push({ key, ...item, answer: "", active: true });
  }
  // Even an unusually comprehensive brief gets optional refinement, not repeated factual questions.
  const refinements = [
    [
      "refinementScope",
      "constraints",
      "Дополнительные границы",
      "Какой компромисс между объёмом и качеством допустим, если возникнет непредвиденная сложность?",
    ],
    [
      "refinementDemo",
      "expectedResult",
      "Демонстрация",
      "Какой сценарий стоит показать первым на итоговой демонстрации?",
    ],
    [
      "refinementFeedback",
      "businessContact",
      "Согласование изменений",
      "Как команде согласовать изменение плана, если в ходе работы появится новая информация?",
    ],
  ] as const;
  for (const [key, field, label, question] of refinements) {
    if (questions.length >= 3) break;
    questions.push({ key, field, label, question, answer: "", active: true });
  }
  return { card, questions, missing, mode: "fallback" };
}
export const questionTarget = (key: string): CardField | undefined => {
  if (mainQuestions.some(([field]) => field === key)) return key as CardField;
  return (
    extraQuestions[key]?.field ??
    (
      {
        refinementScope: "constraints",
        refinementDemo: "expectedResult",
        refinementFeedback: "businessContact",
      } as Record<string, CardField>
    )[key]
  );
};
export function composeCard(
  raw: string,
  questions: Question[],
  current: TaskCardInput,
  manualFields: CardField[],
): TaskCardInput {
  const result = extractEvidence(raw);
  const grouped: Partial<Record<CardField, string[]>> = {};
  for (const question of questions) {
    if (!isKnown(question.answer)) continue;
    const field = questionTarget(question.key);
    if (field) (grouped[field] ??= []).push(question.answer.trim());
  }
  for (const [key] of cardFields) {
    if (grouped[key]?.length)
      result[key] = [
        ...new Set([result[key], ...grouped[key]!].filter(Boolean)),
      ].join("\n\n");
    if (manualFields.includes(key)) result[key] = current[key];
  }
  return result;
}
export const fallbackAssistant: TaskAssistant = {
  async analyze(raw, known) {
    return buildAnalysis(raw, known);
  },
};
export async function analyzeTask(
  raw: string,
  known: Partial<TaskCardInput> = {},
  provider: TaskAssistant = fallbackAssistant,
): Promise<Analysis> {
  try {
    const result = await provider.analyze(raw, known);
    if (
      !result ||
      !Array.isArray(result.questions) ||
      result.questions.length < 3 ||
      new Set(result.questions.map((q) => q.key)).size !==
        result.questions.length ||
      result.questions.some(
        (q) =>
          !questionTarget(q.key) ||
          typeof q.question !== "string" ||
          !q.question.trim(),
      )
    ) {
      throw new Error("Invalid assistant response");
    }
    return result;
  } catch {
    return fallbackAssistant.analyze(raw, known);
  }
}
