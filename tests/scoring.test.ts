import assert from "node:assert/strict";
import test from "node:test";
import { calculateReadiness, getReadinessLevel, type ScoringFields } from "../src/lib/scoring.ts";

const empty: ScoringFields = { context: "", need: "", dataMaterials: "", expectedResult: "", successCriteria: "", constraints: "", users: "", businessContact: "" };

test("readiness boundaries match the rubric", () => {
  for (const [score, level] of [[0, "DRAFT"], [39, "DRAFT"], [40, "WORKING"], [69, "WORKING"], [70, "READY"], [89, "READY"], [90, "PRIORITY"], [100, "PRIORITY"]] as const) {
    assert.equal(getReadinessLevel(score), level);
  }
  for (const score of [-1, 101, NaN, Infinity]) assert.throws(() => getReadinessLevel(score), RangeError);
});

test("blank fields earn no points and retain actionable missing fields", () => {
  const result = calculateReadiness({ ...empty, context: " \n " });
  assert.equal(result.score, 0);
  assert.equal(result.breakdown.length, 7);
  assert.equal(result.breakdown.flatMap((item) => item.missingFields).length, 8);
});

test("each rubric category contributes exactly its specified weight", () => {
  const cases: [Partial<ScoringFields>, number][] = [
    [{ context: "Ситуация", need: "Проблема" }, 20], [{ dataMaterials: "CSV" }, 20],
    [{ expectedResult: "Дашборд" }, 15], [{ successCriteria: "Пять успешных проверок" }, 15],
    [{ constraints: "Две недели" }, 10], [{ users: "Менеджеры" }, 10], [{ businessContact: "Демо-контакт" }, 10],
  ];
  for (const [fields, score] of cases) assert.equal(calculateReadiness({ ...empty, ...fields }).score, score);
  assert.equal(calculateReadiness({ ...empty, context: "Ситуация" }).score, 10);
  const all = Object.assign({}, empty, ...cases.map(([fields]) => fields));
  const result = calculateReadiness(all);
  assert.equal(result.score, 100);
  assert.deepEqual(result.breakdown.flatMap((item) => item.missingFields), []);
});

