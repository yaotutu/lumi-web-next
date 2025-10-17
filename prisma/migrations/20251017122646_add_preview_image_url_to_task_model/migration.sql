-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IMAGE_PENDING',
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
INSERT INTO "new_Task" ("completedAt", "createdAt", "errorMessage", "failedAt", "id", "imageGenerationCompletedAt", "imageGenerationStartedAt", "modelGenerationCompletedAt", "modelGenerationStartedAt", "prompt", "selectedImageIndex", "status", "updatedAt", "userId") SELECT "completedAt", "createdAt", "errorMessage", "failedAt", "id", "imageGenerationCompletedAt", "imageGenerationStartedAt", "modelGenerationCompletedAt", "modelGenerationStartedAt", "prompt", "selectedImageIndex", "status", "updatedAt", "userId" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE INDEX "Task_userId_createdAt_idx" ON "Task"("userId", "createdAt" DESC);
CREATE INDEX "Task_status_idx" ON "Task"("status");
CREATE TABLE "new_TaskModel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "modelUrl" TEXT,
    "previewImageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "format" TEXT NOT NULL DEFAULT 'OBJ',
    "fileSize" INTEGER,
    "faceCount" INTEGER,
    "vertexCount" INTEGER,
    "quality" TEXT NOT NULL DEFAULT '高清',
    "apiTaskId" TEXT,
    "apiRequestId" TEXT,
    "sliceTaskId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "failedAt" DATETIME,
    "errorMessage" TEXT,
    CONSTRAINT "TaskModel_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TaskModel" ("apiRequestId", "apiTaskId", "completedAt", "createdAt", "errorMessage", "faceCount", "failedAt", "fileSize", "format", "id", "modelUrl", "name", "progress", "quality", "status", "taskId", "updatedAt", "vertexCount") SELECT "apiRequestId", "apiTaskId", "completedAt", "createdAt", "errorMessage", "faceCount", "failedAt", "fileSize", "format", "id", "modelUrl", "name", "progress", "quality", "status", "taskId", "updatedAt", "vertexCount" FROM "TaskModel";
DROP TABLE "TaskModel";
ALTER TABLE "new_TaskModel" RENAME TO "TaskModel";
CREATE UNIQUE INDEX "TaskModel_taskId_key" ON "TaskModel"("taskId");
CREATE INDEX "TaskModel_status_idx" ON "TaskModel"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
