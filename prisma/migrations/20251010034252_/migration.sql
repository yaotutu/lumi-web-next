/*
  Warnings:

  - You are about to drop the `Image` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Model3D` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `selectedImage` on the `Task` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Model3D_taskId_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Image";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Model3D";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "TaskImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "aliyunTaskId" TEXT,
    "aliyunRequestId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskImage_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskModel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "modelUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "format" TEXT NOT NULL DEFAULT 'GLB',
    "fileSize" INTEGER,
    "faceCount" INTEGER,
    "vertexCount" INTEGER,
    "quality" TEXT NOT NULL DEFAULT '高清',
    "apiTaskId" TEXT,
    "apiRequestId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "failedAt" DATETIME,
    "errorMessage" TEXT,
    CONSTRAINT "TaskModel_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "imageGenerationStartedAt" DATETIME,
    "imageGenerationCompletedAt" DATETIME,
    "selectedImageIndex" INTEGER,
    "modelGenerationStartedAt" DATETIME,
    "modelGenerationCompletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "failedAt" DATETIME,
    "errorMessage" TEXT,
    CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("createdAt", "id", "prompt", "status", "updatedAt", "userId") SELECT "createdAt", "id", "prompt", "status", "updatedAt", "userId" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE INDEX "Task_userId_createdAt_idx" ON "Task"("userId", "createdAt" DESC);
CREATE INDEX "Task_status_idx" ON "Task"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "TaskImage_taskId_idx" ON "TaskImage"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskImage_taskId_index_key" ON "TaskImage"("taskId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "TaskModel_taskId_key" ON "TaskModel"("taskId");

-- CreateIndex
CREATE INDEX "TaskModel_status_idx" ON "TaskModel"("status");
