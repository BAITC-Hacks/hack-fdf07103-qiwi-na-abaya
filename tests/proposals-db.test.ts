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
import { createTeamProposal } from "../src/lib/proposal-storage.ts";
test("SQLite: many teams can respond; pending state, counts, persistence and duplicate protection", async () => {
  const directory = mkdtempSync(join(tmpdir(), "qadam-proposals-test-"));
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
    const business = await db.business.create({
      data: {
        name: "Тестовый бизнес",
        contactName: "Координатор",
        contact: "Рабочая встреча",
      },
    });
    const task = await db.task.create({
      data: {
        businessId: business.id,
        title: "Задача с нулевым рейтингом",
        status: "PUBLISHED",
        score: 0,
      },
    });
    const teams: { id: string }[] = [];
    for (let i = 0; i < 7; i++)
      teams.push(
        await db.team.create({
          data: {
            name: `Тестовая команда ${i}`,
            description: "Изолированный тест",
          },
        }),
      );
    const input = {
      taskId: task.id,
      solutionIdea: "Собрать прототип решения",
      plan: "Изучить процесс и проверить прототип",
      estimatedTime: "2 недели",
      prototypeUrl: "",
    };
    for (const team of teams) {
      const proposal = await createTeamProposal(db, team.id, input);
      assert.equal(proposal.status, "PENDING");
      assert.equal(proposal.prototypeUrl, "");
    }
    assert.equal(await db.proposal.count({ where: { taskId: task.id } }), 7);
    assert.equal(
      (
        await db.task.findUniqueOrThrow({
          where: { id: task.id },
          include: { _count: { select: { proposals: true } } },
        })
      )._count.proposals,
      7,
    );
    assert.equal(
      (await db.task.findUniqueOrThrow({ where: { id: task.id } })).status,
      "PUBLISHED",
    );
    await assert.rejects(() => createTeamProposal(db, teams[0].id, input), {
      code: "P2002",
    });
    const draft = await db.task.create({ data: { businessId: business.id } });
    await assert.rejects(
      () => createTeamProposal(db, teams[0].id, { ...input, taskId: draft.id }),
      /недоступна/,
    );
    await assert.rejects(
      () =>
        createTeamProposal(db, teams[0].id, { ...input, taskId: "missing" }),
      /недоступна/,
    );
    await assert.rejects(() =>
      createTeamProposal(db, teams[0].id, { ...input, plan: "   " }),
    );
    const mine = await db.proposal.findMany({
      where: { teamId: teams[0].id },
      include: { task: { include: { business: true } } },
    });
    assert.equal(mine.length, 1);
    assert.equal(mine[0].task.business.name, business.name);
    assert.ok(mine[0].createdAt instanceof Date);
    await db.$disconnect();
    await db.$connect();
    assert.equal(
      await db.proposal.count({
        where: { taskId: task.id, status: "PENDING" },
      }),
      7,
    );
  } finally {
    await db.$disconnect();
    // Delete only files in the uniquely created test directory, no recursive removal.
    for (const file of readdirSync(directory))
      unlinkSync(join(directory, file));
    rmdirSync(directory);
  }
});
