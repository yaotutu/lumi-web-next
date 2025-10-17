/*
  Warnings:

  - You are about to drop the `TaskModel` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "TaskModel";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Model" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'AI_GENERATED',
    "taskId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "modelUrl" TEXT NOT NULL,
    "previewImageUrl" TEXT,
    "prompt" TEXT,
    "format" TEXT NOT NULL DEFAULT 'OBJ',
    "fileSize" INTEGER,
    "faceCount" INTEGER,
    "vertexCount" INTEGER,
    "quality" TEXT,
    "generationStatus" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "apiTaskId" TEXT,
    "apiRequestId" TEXT,
    "sliceTaskId" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "publishedAt" DATETIME,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "failedAt" DATETIME,
    "errorMessage" TEXT,
    CONSTRAINT "Model_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Model_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Model_userId_createdAt_idx" ON "Model"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Model_visibility_publishedAt_idx" ON "Model"("visibility", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "Model_visibility_likeCount_idx" ON "Model"("visibility", "likeCount" DESC);

-- CreateIndex
CREATE INDEX "Model_source_idx" ON "Model"("source");

-- CreateIndex
CREATE INDEX "Model_generationStatus_idx" ON "Model"("generationStatus");
