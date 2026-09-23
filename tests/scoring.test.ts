import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateReadiness,
  getReadinessLevel,
  type ScoringFields,
} from "../src/lib/scoring.ts";
const empty: ScoringFields = {
  context: "",
  need: "",
  dataMaterials: "",
  expectedResult: "",
  successCriteria: "",
  constraints: "",
  users: "",
  businessContact: "",
};
const full: ScoringFields = {
  context: "В трёх магазинах отзывы остаются в личных чатах.",
  need: "Собрать жалобы покупателей в единую таблицу для анализа.",
  dataMaterials: "CSV с отзывами за полгода передадим на встрече.",
  expectedResult: "Дашборд с фильтрами по магазинам и категориям жалоб.",
  successCriteria: "Менеджер находит пять заданных жалоб за две минуты.",
  constraints: "Срок две недели, бюджет на платные сервисы отсутствует.",
  users:
    "Администраторы магазинов обрабатывают жалобы, руководитель смотрит отчёт.",
  businessContact: "Алия: demo@example.com, созвон каждую среду в 15:00.",
};
for (const [score, level] of [
  [0, "DRAFT"],
  [39, "DRAFT"],
  [40, "WORKABLE"],
  [69, "WORKABLE"],
  [70, "READY"],
  [89, "READY"],
  [90, "PRIORITY"],
  [100, "PRIORITY"],
] as const)
  test(`boundary ${score} → ${level}`, () =>
    assert.equal(getReadinessLevel(score), level));
test("reject invalid totals", () => {
  for (const n of [-1, 101, NaN, Infinity])
    assert.throws(() => getReadinessLevel(n), RangeError);
});
test("empty and unknown values score zero", () => {
  for (const value of [
    "",
    " \n ",
    "не знаю",
    "Не определено",
    "Пока неизвестно!",
    "нет данных",
    "TODO",
    "...",
    "???",
  ]) {
    const result = calculateReadiness(
      Object.fromEntries(
        Object.keys(empty).map((key) => [key, value]),
      ) as ScoringFields,
    );
    assert.equal(result.total, 0, value);
    assert.equal(result.categories.length, 7);
    assert.equal(result.suggestions.length, 7);
  }
});
test("exact weights, unique categories and 100 maximum", () => {
  const result = calculateReadiness(full);
  assert.deepEqual(
    result.categories.map((c) => c.maxScore),
    [20, 20, 15, 15, 10, 10, 10],
  );
  assert.equal(new Set(result.categories.map((c) => c.key)).size, 7);
  assert.equal(result.total, 100);
  assert.equal(result.level, "PRIORITY");
  assert.deepEqual(result.suggestions, []);
  for (const c of result.categories) {
    const fields = { ...empty };
    for (const key of c.fields) fields[key] = full[key];
    assert.equal(calculateReadiness(fields).total, c.maxScore);
    assert.deepEqual(c.missing, []);
  }
});
test("short entries earn partial credit and actionable suggestions", () => {
  assert.equal(
    calculateReadiness({ ...empty, dataMaterials: "CSV" }).total,
    10,
  );
  assert.equal(
    calculateReadiness({ ...empty, expectedResult: "Дашборд" }).total,
    7,
  );
  const result = calculateReadiness({ ...empty, context: full.context });
  assert.equal(result.total, 10);
  assert.deepEqual(result.categories[0].missingFields, ["need"]);
  assert.ok(result.suggestions.every((s) => s.startsWith("Добавьте")));
});
test("adding details increases score; clearing fields decreases it", () => {
  const partial = calculateReadiness({ ...full, dataMaterials: "CSV" });
  assert.equal(partial.total, 90);
  assert.equal(calculateReadiness({ ...full, dataMaterials: "" }).total, 80);
  assert.equal(calculateReadiness(full).total, 100);
});
test("whitespace, repetition and irrelevant fields cannot inflate scores", () => {
  assert.equal(
    calculateReadiness({ ...empty, users: "менеджер ".repeat(100) }).total,
    5,
  );
  assert.equal(
    calculateReadiness({ ...empty, users: "а".repeat(100) }).total,
    5,
  );
  const before = JSON.stringify(full);
  const first = calculateReadiness(full);
  assert.deepEqual(calculateReadiness(full), first);
  assert.equal(JSON.stringify(full), before);
  assert.equal(
    calculateReadiness({
      ...empty,
      ...{ rawDescription: full.context, title: full.need, score: 100 },
    }).total,
    0,
  );
  assert.equal(
    calculateReadiness({ ...full, users: "  " + full.users + "  " }).total,
    100,
  );
});
