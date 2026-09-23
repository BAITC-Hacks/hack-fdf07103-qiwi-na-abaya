import assert from "node:assert/strict";
import test from "node:test";
import { filterAndSortTasks, uniqueOptions } from "../src/lib/catalog.ts";
import { proposalSchema } from "../src/lib/proposals.ts";
const base = {
  title: "Анализ отзывов",
  rawDescription: "Покупатели жалуются на очереди",
  need: "Сократить ожидание",
  context: "Три магазина",
  industry: "Ритейл",
  skills: ["React", "SQL"],
  business: { name: "Qadam Market" },
  createdAt: new Date("2026-01-01"),
  publishedAt: new Date("2026-02-01"),
};
const tasks = [
  { ...base, id: "low", score: 0 },
  {
    ...base,
    id: "ready",
    score: 70,
    industry: "Аналитика",
    skills: ["Python"],
  },
  { ...base, id: "priority", score: 100, publishedAt: new Date("2026-01-02") },
  { ...base, id: "working", score: 40, publishedAt: new Date("2026-03-01") },
];
test("readiness sort includes zero-score tasks and does not mutate input", () => {
  assert.deepEqual(
    filterAndSortTasks(tasks, { sort: "score" }).map((t) => t.score),
    [100, 70, 40, 0],
  );
  assert.deepEqual(
    tasks.map((t) => t.id),
    ["low", "ready", "priority", "working"],
  );
});
test("newest is publication date with creation fallback, not last edit", () => {
  const edited = { ...tasks[0], updatedAt: new Date("2099-01-01") };
  assert.equal(
    filterAndSortTasks([edited, ...tasks.slice(1)], { sort: "newest" })[0].id,
    "working",
  );
  assert.equal(
    filterAndSortTasks(
      [
        ...tasks,
        {
          ...base,
          id: "fallback",
          score: 10,
          publishedAt: null,
          createdAt: new Date("2026-04-01"),
        },
      ],
      {},
    )[0].id,
    "fallback",
  );
});
test("industry, readiness, skill and search combine; Russian search ignores case", () => {
  assert.deepEqual(
    filterAndSortTasks(tasks, {
      industry: "ритейл",
      level: "DRAFT",
      skill: " sql ",
      query: "ПОКУПАТЕЛИ",
    }).map((t) => t.id),
    ["low"],
  );
  assert.equal(
    filterAndSortTasks(tasks, { query: "АНАЛИЗ ОТЗЫВОВ" }).length,
    4,
  );
  assert.equal(filterAndSortTasks(tasks, { skill: "Java" }).length, 0);
  assert.equal(
    filterAndSortTasks(tasks, { query: "несуществующий запрос" }).length,
    0,
  );
  assert.equal(
    filterAndSortTasks(tasks, { industry: "Аналитика", skill: "React" }).length,
    0,
  );
});
test("readiness filtering uses all exact boundaries, independent of stored label", () => {
  const all = [0, 39, 40, 69, 70, 89, 90, 100].map((score) => ({
    ...base,
    id: String(score),
    score,
  }));
  for (const [level, expected] of [
    ["DRAFT", [0, 39]],
    ["WORKABLE", [40, 69]],
    ["READY", [70, 89]],
    ["PRIORITY", [90, 100]],
  ] as const)
    assert.deepEqual(
      filterAndSortTasks(all, { level, sort: "score" }).map((t) => t.score),
      [...expected].reverse(),
    );
});
test("filter choices trim and deduplicate tags regardless of case", () => {
  assert.deepEqual(uniqueOptions(["React", " react ", "SQL", "", " SQL "]), [
    "React",
    "SQL",
  ]);
});
const proposal = {
  taskId: "low",
  solutionIdea: "Соберём жалобы в одном месте",
  plan: "Изучим процесс, подготовим прототип и проверим с бизнесом",
  estimatedTime: "2 недели",
  prototypeUrl: "",
};
test("proposal validates required fields and safe optional prototype URLs without score requirements", () => {
  assert.ok(proposalSchema.safeParse(proposal).success);
  assert.ok(
    proposalSchema.safeParse({
      ...proposal,
      prototypeUrl: "https://example.com/demo",
    }).success,
  );
  for (const value of [
    "javascript:alert(1)",
    "file:///C:/secret",
    "https://user:password@example.com",
  ])
    assert.equal(
      proposalSchema.safeParse({ ...proposal, prototypeUrl: value }).success,
      false,
    );
  assert.equal(
    proposalSchema.safeParse({ ...proposal, solutionIdea: "   " }).success,
    false,
  );
  assert.equal(
    proposalSchema.safeParse({ ...proposal, plan: "x" }).success,
    false,
  );
  assert.equal(
    proposalSchema.safeParse({ ...proposal, estimatedTime: "" }).success,
    false,
  );
});
