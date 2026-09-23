import "dotenv/config";
import assert from "node:assert/strict";
import { createAIService } from "../src/lib/ai/service.ts";
import { createOpenAIProvider } from "../src/lib/ai/openai.ts";
const offline = process.argv.includes("--offline");
const key = offline ? undefined : process.env.AI_API_KEY?.trim();
const provider = key
  ? createOpenAIProvider(key, process.env.AI_MODEL || "gpt-4o-mini")
  : undefined;
const ai = createAIService(provider);
const raw = "Мы теряем клиентов интернет-магазина и хотим понять почему.";
const analysis = await ai.analyzeDraft(raw, {});
assert.ok(analysis.data.questions.length >= 3);
const answers = [
  {
    key: "users",
    question: "Кто использует результат?",
    answer: "Маркетолог магазина анализирует причины ухода покупателей.",
  },
  {
    key: "dataMaterials",
    question: "Какие материалы доступны?",
    answer: "Есть обезличенная CSV-выгрузка заказов за шесть месяцев.",
  },
  {
    key: "expectedResult",
    question: "Какой результат нужен?",
    answer: "Отчёт о причинах оттока клиентов и три гипотезы улучшений.",
  },
  {
    key: "successCriteria",
    question: "Как проверить успех?",
    answer:
      "В отчёте три проверяемые гипотезы, каждая подтверждена данными заказов.",
  },
  {
    key: "constraints",
    question: "Какие ограничения?",
    answer: "Срок две недели, без платных сервисов и персональных данных.",
  },
  {
    key: "businessContact",
    question: "Как взаимодействовать?",
    answer: "Координатор проекта проводит рабочий созвон каждую среду.",
  },
];
const structure = await ai.structureTask(raw, answers);
assert.ok(structure.data.title);
assert.ok(structure.data.dataMaterials);
assert.equal(structure.data.skills, "");
if (offline) {
  assert.equal(analysis.mode, "fallback");
  assert.equal(structure.mode, "fallback");
}
// Synthetic fixture only; no key, headers, provider body or user content in logs.
console.log(
  JSON.stringify(
    {
      configured: Boolean(key),
      analysis: {
        mode: analysis.mode,
        reason: analysis.reason,
        questions: analysis.data.questions.length,
        missing: analysis.data.missingFields,
      },
      structure: {
        mode: structure.mode,
        reason: structure.reason,
        filled: Object.entries(structure.data)
          .filter(([, v]) => v)
          .map(([k]) => k),
      },
    },
    null,
    2,
  ),
);
if (key && (analysis.mode !== "openai" || structure.mode !== "openai"))
  process.exitCode = 2;
