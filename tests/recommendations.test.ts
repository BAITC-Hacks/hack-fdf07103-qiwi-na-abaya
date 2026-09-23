import assert from "node:assert/strict";
import test from "node:test";
import { matchTask, recommendTasks, type MatchingProfile, type MatchingTask } from "../src/lib/recommendations.ts";
const profile: MatchingProfile = { interests: ["Аналитика"], skills: ["Data Analysis"], technologies: ["Python"] };
const task: MatchingTask = { industry: "Аналитика", skills: ["Python", "Анализ данных"], title: "Отчёт на Python", context: "", need: "" };

test("matching: full evidence yields 100 with actual requirement labels and reasons", () => {
  const match = matchTask(profile, task);
  assert.equal(match.matchScore, 100);
  assert.deepEqual(match.matchedSkills, ["Python", "Анализ данных"]);
  assert.equal(match.reasons.length, 3);
  assert.ok(match.reasons.every(reason => reason.length > 10));
});
test("matching: empty or malformed profile and unrelated task yield zero", () => {
  for (const empty of [{ skills: [], technologies: [], interests: [] }, { skills: null, technologies: [null, 12, " "], interests: {} }]) {
    assert.equal(matchTask(empty, task).matchScore, 0);
    assert.deepEqual(matchTask(empty, task).matchedSkills, []);
  }
  assert.equal(matchTask(profile, { ...task, skills: ["Rust"], industry: "Образование", title: "Расписание" }).matchScore, 0);
});
test("matching: weights are 60 coverage, 30 interests, 10 textual skills", () => {
  const base = { ...task, industry: "", title: "" };
  assert.equal(matchTask(profile, base).matchScore, 60);
  assert.equal(matchTask(profile, { ...base, skills: ["Python", "Rust"] }).matchScore, 30);
  assert.equal(matchTask(profile, { ...base, skills: ["Python", "Rust", "Go"] }).matchScore, 20);
  assert.equal(matchTask(profile, { ...base, skills: [], industry: "Аналитика" }).matchScore, 30);
  assert.equal(matchTask(profile, { ...base, skills: [], need: "Используем Python." }).matchScore, 10);
});
test("matching: title, context and need are each searched, interests never become skills", () => {
  for (const field of ["title", "context", "need"] as const) {
    assert.equal(matchTask(profile, { ...task, industry: "", skills: [], title: "", [field]: "Аналитика на Python" }).matchScore, 40);
  }
  assert.equal(matchTask({ skills: [], technologies: [], interests: ["Python"] }, { ...task, industry: "", title: "" }).matchScore, 0);
});
test("matching: normalization, aliases and duplicate tags never inflate coverage", () => {
  const input = { skills: [" python ", "PYTHON", "DATA   ANALYSIS"], technologies: ["Python"], interests: ["analytics", "аналитика"] };
  const target = { ...task, skills: ["Python", " PYTHON ", "Анализ данных", "data analysis"] };
  assert.equal(matchTask(input, target).matchScore, 100);
  assert.equal(matchTask(input, target).matchedSkills.length, 2);
  assert.equal(matchTask(input, { ...target, title: "Python Python Python" }).matchScore, 100);
});
test("matching: token boundaries prevent substring matches and safely handle punctuation", () => {
  for (const [skill, falseText, trueText] of [["Java", "JavaScript", "Java."], ["SQL", "NoSQL", "SQL,"], ["C", "C++", "C"], ["C++", "C#", "C++"], ["Node.js", "nodeXjs", "Node.js"], ["R", "Retail", "R"]]) {
    const team = { interests: [], skills: [skill], technologies: [] };
    assert.equal(matchTask(team, { ...task, industry: "", skills: [], title: falseText }).matchScore, 0, skill);
    assert.equal(matchTask(team, { ...task, industry: "", skills: [], title: trueText }).matchScore, 10, skill);
  }
});
test("matching: ranking keeps zero matches, does not mutate input, and ignores readiness", () => {
  const tasks = [
    { ...task, id: "zero", industry: "", title: "", skills: [], score: 100 },
    { ...task, id: "best", score: 0 },
    { ...task, id: "tie", score: 100 },
  ];
  const before = structuredClone(tasks);
  const results = recommendTasks(profile, tasks);
  assert.deepEqual(results.map(result => result.task.id), ["best", "tie", "zero"]);
  assert.equal(results[2].matchScore, 0);
  assert.deepEqual(tasks, before);
  assert.deepEqual(matchTask(profile, tasks[1]), matchTask(profile, tasks[2]));
  assert.deepEqual(recommendTasks(profile, []), []);
});
test("matching: changing a team profile changes recommendations", () => {
  assert.equal(matchTask(profile, task).matchScore, 100);
  assert.equal(matchTask({ interests: ["Образование"], skills: ["UX/UI"], technologies: ["Figma"] }, task).matchScore, 0);
});
