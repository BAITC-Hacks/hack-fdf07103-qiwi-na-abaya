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
import { submitProgress, confirmProgress, completeTask } from "../src/lib/progress.ts";
import { decideProposal } from "../src/lib/proposal-storage.ts";
test("SQLite: manual progress, ownership, idempotent points, stale protection and completion", async () => {
  const directory = mkdtempSync(join(tmpdir(), "qadam-progress-test-"));
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
    const business = await db.business.create({data:{name:"Progress business",contactName:"Manager",contact:"Meeting"}});
    const team = await db.team.create({data:{name:"Progress team",description:"Test"}});
    const task = await db.task.create({data:{businessId:business.id,status:"PUBLISHED",title:"Progress task",score:30}});
    const proposal = await db.proposal.create({data:{taskId:task.id,teamId:team.id,solutionIdea:"Idea",plan:"Plan",estimatedTime:"Week"}});
    const read = () => db.proposal.findUniqueOrThrow({where:{id:proposal.id}});
    const input = {proposalId:proposal.id,revision:0,progressPercent:40,progressComment:"Прототип готов к проверке"};
    await assert.rejects(()=>submitProgress(db,team.id,input));
    await decideProposal(db,business.id,{proposalId:proposal.id,status:"ACCEPTED",expectedStatus:"PENDING",confirmed:true});
    input.revision=(await read()).progressRevision;
    await assert.rejects(()=>submitProgress(db,"other",input));
    for(const value of [-1,101,2.5,NaN]) await assert.rejects(()=>submitProgress(db,team.id,{...input,progressPercent:value}));
    await assert.rejects(()=>submitProgress(db,team.id,{...input,progressComment:" "}));
    await submitProgress(db,team.id,input);
    let current=await read();
    assert.equal(current.confirmedByBusiness,false);assert.equal(current.awardedPoints,0);assert.ok(current.submittedAt);
    await assert.rejects(()=>confirmProgress(db,"other",{proposalId:proposal.id,revision:current.progressRevision}));
    await assert.rejects(()=>confirmProgress(db,business.id,{proposalId:proposal.id,revision:input.revision}));
    await assert.rejects(()=>completeTask(db,business.id,{proposalId:proposal.id,revision:current.progressRevision}));
    await confirmProgress(db,business.id,{proposalId:proposal.id,revision:current.progressRevision});
    current=await read();assert.equal(current.awardedPoints,40);assert.equal(current.confirmedPercent,40);assert.equal(current.confirmedByBusiness,true);
    await assert.rejects(()=>confirmProgress(db,business.id,{proposalId:proposal.id,revision:current.progressRevision}));
    for(const percent of [40,20,70,100]) {
      current=await read();await submitProgress(db,team.id,{...input,revision:current.progressRevision,progressPercent:percent});
      current=await read();assert.equal(current.confirmedByBusiness,false);
      await assert.rejects(()=>completeTask(db,business.id,{proposalId:proposal.id,revision:current.progressRevision}));
      await confirmProgress(db,business.id,{proposalId:proposal.id,revision:current.progressRevision});
      assert.equal((await read()).awardedPoints,Math.max(40,percent));
    }
    current=await read();
    assert.equal((await db.task.findUniqueOrThrow({where:{id:task.id}})).status,"IN_PROGRESS");
    await assert.rejects(()=>completeTask(db,"other",{proposalId:proposal.id,revision:current.progressRevision}));
    // New submission invalidates the 100% confirmation, even for the same number.
    await submitProgress(db,team.id,{...input,revision:current.progressRevision,progressPercent:100});
    await assert.rejects(()=>completeTask(db,business.id,{proposalId:proposal.id,revision:current.progressRevision}));
    current=await read();await confirmProgress(db,business.id,{proposalId:proposal.id,revision:current.progressRevision});
    current=await read();await completeTask(db,business.id,{proposalId:proposal.id,revision:current.progressRevision});
    assert.equal((await db.task.findUniqueOrThrow({where:{id:task.id}})).status,"COMPLETED");
    assert.equal((await db.task.findUniqueOrThrow({where:{id:task.id}})).score,30);
    await assert.rejects(()=>submitProgress(db,team.id,{...input,revision:current.progressRevision}));
    await assert.rejects(()=>completeTask(db,business.id,{proposalId:proposal.id,revision:current.progressRevision}));
    await db.$disconnect();await db.$connect();
    assert.equal((await read()).awardedPoints,100);
    assert.equal((await db.proposal.aggregate({where:{teamId:team.id},_sum:{awardedPoints:true}}))._sum.awardedPoints,100);
  } finally {
    await db.$disconnect();
    // Delete only files in the uniquely created test directory, no recursive removal.
    for (const file of readdirSync(directory))
      unlinkSync(join(directory, file));
    rmdirSync(directory);
  }
});
