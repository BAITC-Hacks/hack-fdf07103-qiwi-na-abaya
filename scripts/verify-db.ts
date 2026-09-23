import "dotenv/config";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { calculateReadiness } from "../src/lib/scoring.ts";

const db = new PrismaClient();
async function main() {
  const [businesses, teams, tasks, proposals, questions] = await Promise.all([
    db.business.count(), db.team.findMany(), db.task.findMany(), db.proposal.findMany(), db.clarification.findMany(),
  ]);
  assert.ok(businesses >= 1);
  assert.ok(teams.length >= 5);
  assert.ok(tasks.filter((task) => task.status === "DRAFT").length >= 5);
  const published = tasks.filter((task) => task.status === "PUBLISHED");
  assert.ok(published.length >= 5);
  assert.ok(new Set(published.map((task) => task.score)).size >= 5);
  assert.ok(proposals.length >= 5);
  assert.ok(questions.length >= 3);
  for (const team of teams) for (const value of [team.interests, team.skills, team.technologies]) {
    assert.ok(Array.isArray(value) && value.every((entry) => typeof entry === "string"));
  }
  for (const task of tasks) {
    const expected = calculateReadiness(task);
    assert.equal(task.score, expected.score, task.id);
    assert.equal(task.readinessLevel, expected.readinessLevel, task.id);
    if (task.status === "PUBLISHED") assert.ok(task.confirmedAt && task.publishedAt);
  }
  const lowScoreTask = published.find((task) => task.score < 40);
  assert.ok(lowScoreTask && proposals.some((proposal) => proposal.taskId === lowScoreTask.id));
  assert.ok(proposals.some(p => p.status === "PENDING"));
  assert.ok(proposals.some(p => p.status === "ACCEPTED"));
  assert.ok(proposals.some(p => p.status === "REJECTED"));
  for (const p of proposals.filter(p => p.status === "ACCEPTED")) assert.ok(["IN_PROGRESS", "COMPLETED"].includes(tasks.find(t => t.id === p.taskId)!.status));
  const demo = tasks.find(t => t.id === "draft-demo-retention");
  assert.ok(demo && demo.status === "DRAFT" && demo.score === 0);
  assert.equal(demo.rawDescription, "Мы теряем клиентов интернет-магазина и хотим понять почему.");
  assert.deepEqual(await db.$queryRawUnsafe("PRAGMA foreign_key_check"), []);
  console.log(JSON.stringify({ businesses, teams: teams.length, published: published.length, drafts: tasks.filter(task => task.status === "DRAFT").length, proposals: proposals.length, questions: questions.length, scores: published.map((task) => task.score) }, null, 2));
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());

