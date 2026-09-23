import assert from "node:assert/strict";
import test from "node:test";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  rmdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { PrismaClient } from "@prisma/client";
import { saveTaskEdit } from "../src/lib/task-edit.ts";
import { emptyCard } from "../src/lib/task-assistant.ts";
import { calculateReadiness } from "../src/lib/scoring.ts";
test("SQLite: task editing recalculates score, persists fields, preserves workflow and rejects stale/foreign edits", async () => {
  const directory = mkdtempSync(join(tmpdir(), "qadam-edit-test-"));
  const filename = join(directory, "test.db");
  const sql = new DatabaseSync(filename);
  const migrations = new URL("../prisma/migrations/", import.meta.url);
  for (const item of readdirSync(migrations, { withFileTypes: true })
    .filter((item) => item.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name)))
    sql.exec(
      readFileSync(new URL(`${item.name}/migration.sql`, migrations), "utf8"),
    );
  sql.close();
  const db = new PrismaClient({
    datasourceUrl: `file:${filename.replaceAll("\\", "/")}`,
  });
  try {
    const business = await db.business.create({ data: { name: "Test business", contactName: "Coordinator", contact: "Meeting" } });
    const task = await db.task.create({ data: { businessId: business.id, title: "Weak task", status: "PUBLISHED", rawDescription: "Original description", score: 0 } });
    const card = { ...emptyCard, title: "Edited task", industry: "Ритейл", skills: "Python, SQL, Python", expectedResult: "Подготовить прототип отчёта для руководителя магазина" };
    const saved = await saveTaskEdit(db, business.id, { id: task.id, revision: 0, card, score: 100, readinessLevel: "PRIORITY", status: "COMPLETED", businessId: "other" });
    assert.equal(saved.score, 15);
    let stored = await db.task.findUniqueOrThrow({ where: { id: task.id } });
    assert.equal(stored.score, 15);
    assert.equal(stored.readinessLevel, "DRAFT");
    assert.equal(stored.status, "PUBLISHED");
    assert.equal(stored.rawDescription, "Original description");
    assert.deepEqual(stored.skills, ["Python", "SQL"]);
    assert.equal(stored.title, card.title);
    assert.equal(stored.industry, card.industry);
    await assert.rejects(() => saveTaskEdit(db, "other", { id: task.id, revision: 1, card }), /недоступна/);
    await assert.rejects(() => saveTaskEdit(db, business.id, { id: task.id, revision: 0, card }), /другой вкладке/);
    await assert.rejects(() => saveTaskEdit(db, business.id, { id: task.id, revision: 1, card: { ...card, title: "   " } }));
    const complete = { ...card, context: "У нас сеть небольших продуктовых магазинов", need: "Нужно уменьшить ежедневные потери свежей выпечки", users: "Руководители магазинов проверяют отчёты каждое утро", dataMaterials: "Передадим обезличенные выгрузки продаж за полгода", successCriteria: "Проверим результаты на десяти контрольных примерах", constraints: "Срок две недели без платных сервисов", businessContact: "Координатор проводит рабочие встречи каждую пятницу" };
    const result = await saveTaskEdit(db, business.id, { id: task.id, revision: 1, card: complete, score: 0 });
    assert.equal(result.score, 100);
    await db.$disconnect(); await db.$connect();
    stored = await db.task.findUniqueOrThrow({ where: { id: task.id } });
    assert.equal(stored.score, calculateReadiness(complete).total);
    assert.equal(stored.readinessLevel, "PRIORITY");
    for (const key of ["context", "need", "users", "dataMaterials", "expectedResult", "successCriteria", "constraints", "businessContact"] as const) assert.equal(stored[key], complete[key]);
    for (const status of ["DRAFT", "IN_PROGRESS", "COMPLETED"] as const) {
      const item = await db.task.create({ data: { businessId: business.id, status } });
      await saveTaskEdit(db, business.id, { id: item.id, revision: 0, card });
      assert.equal((await db.task.findUniqueOrThrow({ where: { id: item.id } })).status, status);
    }
    const decreased = await saveTaskEdit(db, business.id, { id: task.id, revision: 2, card: { ...emptyCard, title: "Cleared task" }, score: 100 });
    assert.equal(decreased.score, 0);
    assert.equal((await db.task.findUniqueOrThrow({ where: { id: task.id } })).readinessLevel, "DRAFT");
  } finally {
    await db.$disconnect();
    // Delete only files in the uniquely created test directory, no recursive removal.
    for (const file of readdirSync(directory))
      unlinkSync(join(directory, file));
    rmdirSync(directory);
  }
});
