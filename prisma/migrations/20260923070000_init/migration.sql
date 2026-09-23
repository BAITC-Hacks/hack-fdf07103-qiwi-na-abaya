-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "interests" JSONB NOT NULL DEFAULT [],
    "skills" JSONB NOT NULL DEFAULT [],
    "technologies" JSONB NOT NULL DEFAULT [],
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL DEFAULT '',
    "rawDescription" TEXT NOT NULL DEFAULT '',
    "industry" TEXT NOT NULL DEFAULT '',
    "context" TEXT NOT NULL DEFAULT '',
    "need" TEXT NOT NULL DEFAULT '',
    "users" TEXT NOT NULL DEFAULT '',
    "dataMaterials" TEXT NOT NULL DEFAULT '',
    "expectedResult" TEXT NOT NULL DEFAULT '',
    "successCriteria" TEXT NOT NULL DEFAULT '',
    "constraints" TEXT NOT NULL DEFAULT '',
    "businessContact" TEXT NOT NULL DEFAULT '',
    "skills" JSONB NOT NULL DEFAULT [],
    "score" INTEGER NOT NULL DEFAULT 0,
    "readinessLevel" TEXT NOT NULL DEFAULT 'DRAFT',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "businessId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "confirmedAt" DATETIME,
    "publishedAt" DATETIME,
    CONSTRAINT "Task_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "solutionIdea" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "estimatedTime" TEXT NOT NULL,
    "prototypeUrl" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Proposal_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Proposal_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Clarification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Clarification_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Task_businessId_status_idx" ON "Task"("businessId", "status");

-- CreateIndex
CREATE INDEX "Task_status_score_idx" ON "Task"("status", "score");

-- CreateIndex
CREATE INDEX "Task_industry_idx" ON "Task"("industry");

-- CreateIndex
CREATE INDEX "Proposal_taskId_status_idx" ON "Proposal"("taskId", "status");

-- CreateIndex
CREATE INDEX "Proposal_teamId_idx" ON "Proposal"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_taskId_teamId_key" ON "Proposal"("taskId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Clarification_taskId_position_key" ON "Clarification"("taskId", "position");
