import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeTask,
  buildAnalysis,
  composeCard,
  emptyCard,
  extractEvidence,
  type TaskAssistant,
} from "../src/lib/task-assistant.ts";

const weak = "Мы теряем клиентов интернет-магазина и хотим понять почему.";
test("weak description gets relevant questions and no invented materials, users or outcomes", () => {
  const result = buildAnalysis(weak);
  assert.ok(result.questions.length >= 3);
  assert.ok(
    result.questions.some(
      (q) => q.key === "dataMaterials" && q.question.includes("заказов"),
    ),
  );
  assert.ok(
    !result.questions.some((q) => q.key === "context" || q.key === "need"),
  );
  assert.equal(result.card.dataMaterials, "");
  assert.equal(result.card.users, "");
  assert.equal(result.card.expectedResult, "");
  assert.equal(result.card.businessContact, "");
  assert.equal(result.card.skills, "");
  assert.equal(result.card.need, weak);
});
test("explicit details are not asked again, including technologies, deadlines and contact", () => {
  const raw =
    weak +
    "\nПользователи: маркетолог и руководитель продаж.\nДанные: CSV заказов за 6 месяцев.\nОграничения: две недели, бюджет 0.\nКонтакт: Алия, demo@example.com.\nРезультат: отчёт с причинами оттока.\nКритерии: три проверяемые гипотезы.\nТехнологии: Python, SQL.";
  const result = buildAnalysis(raw);
  for (const field of [
    "users",
    "dataMaterials",
    "constraints",
    "businessContact",
    "expectedResult",
    "successCriteria",
  ])
    assert.ok(!result.questions.some((q) => q.key === field), field);
  assert.ok(result.questions.length >= 3);
  assert.equal(result.card.dataMaterials, "CSV заказов за 6 месяцев.");
  assert.equal(result.card.skills, "Python, SQL.");
});
test("unlabeled factual statements are recognized without fabricating summaries", () => {
  const raw =
    "У нас интернет-магазин. Есть CSV с заказами за 6 месяцев. Результатом будут пользоваться менеджеры. Нужен отчёт с причинами оттока. Срок — две недели. Для связи demo@example.com.";
  const result = buildAnalysis(raw);
  assert.equal(result.card.dataMaterials, "Есть CSV с заказами за 6 месяцев.");
  assert.ok(
    !result.questions.some((q) =>
      [
        "users",
        "dataMaterials",
        "expectedResult",
        "constraints",
        "businessContact",
      ].includes(q.key),
    ),
  );
});
test("composition uses literal answers and preserves manual edits, including intentionally empty fields", () => {
  const analysis = buildAnalysis(weak);
  const questions = analysis.questions.map((q) => ({
    ...q,
    answer:
      q.key === "dataMaterials"
        ? "CSV заказов за полгода"
        : q.key === "users"
          ? "Маркетолог"
          : "не знаю",
  }));
  const composed = composeCard(
    weak,
    questions,
    { ...emptyCard, title: "Понять причины оттока", users: "" },
    ["title", "users"],
  );
  assert.equal(composed.title, "Понять причины оттока");
  assert.equal(composed.users, "");
  assert.equal(composed.dataMaterials, "CSV заказов за полгода");
  assert.equal(composed.expectedResult, "");
  assert.equal(composed.constraints, "");
});
test("changed description replaces generated evidence but retains manual context", () => {
  const before = extractEvidence("У нас интернет-магазин. Есть CSV заказов.");
  const after = composeCard(
    "У нас интернет-магазин. Есть таблица возвратов.",
    [],
    before,
    ["context"],
  );
  assert.equal(after.context, before.context);
  assert.equal(after.dataMaterials, "Есть таблица возвратов.");
});
test("provider failure automatically falls back to deterministic analysis", async () => {
  const provider: TaskAssistant = {
    async analyze() {
      throw new Error("API unavailable");
    },
  };
  const result = await analyzeTask(weak, {}, provider);
  assert.equal(result.mode, "fallback");
  assert.ok(result.questions.length >= 3);
});

test("malformed provider output also falls back to at least three questions", async () => {
  const provider: TaskAssistant = {
    async analyze() {
      return {
        card: { ...emptyCard },
        questions: [],
        missing: [],
        mode: "fallback",
      };
    },
  };
  const result = await analyzeTask(weak, {}, provider);
  assert.ok(result.questions.length >= 3);
  assert.equal(result.card.need, weak);
});
