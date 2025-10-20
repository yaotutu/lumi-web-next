-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GenerationRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    CONSTRAINT "GenerationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GeneratedImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "imagePrompt" TEXT,
    "imageStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "providerTaskId" TEXT,
    "providerRequestId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "failedAt" DATETIME,
    "errorMessage" TEXT,
    CONSTRAINT "GeneratedImage_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "GenerationRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GeneratedModel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "sourceImageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "modelUrl" TEXT,
    "previewImageUrl" TEXT,
    "format" TEXT NOT NULL DEFAULT 'OBJ',
    "fileSize" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "failedAt" DATETIME,
    "errorMessage" TEXT,
    CONSTRAINT "GeneratedModel_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "GenerationRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GeneratedModel_sourceImageId_fkey" FOREIGN KEY ("sourceImageId") REFERENCES "GeneratedImage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImageGenerationJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "imageId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "nextRetryAt" DATETIME,
    "timeoutAt" DATETIME,
    "providerName" TEXT,
    "providerJobId" TEXT,
    "providerRequestId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "failedAt" DATETIME,
    "cancelledAt" DATETIME,
    "timeoutedAt" DATETIME,
    "errorMessage" TEXT,
    "errorCode" TEXT,
    "errorStack" TEXT,
    "executionDuration" INTEGER,
    "workerNodeId" TEXT,
    CONSTRAINT "ImageGenerationJob_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "GeneratedImage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ModelGenerationJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modelId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "nextRetryAt" DATETIME,
    "timeoutAt" DATETIME,
    "providerName" TEXT,
    "providerJobId" TEXT,
    "providerRequestId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "failedAt" DATETIME,
    "cancelledAt" DATETIME,
    "timeoutedAt" DATETIME,
    "errorMessage" TEXT,
    "errorCode" TEXT,
    "errorStack" TEXT,
    "executionDuration" INTEGER,
    "workerNodeId" TEXT,
    CONSTRAINT "ModelGenerationJob_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "GeneratedModel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QueueConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "queueName" TEXT NOT NULL,
    "maxConcurrency" INTEGER NOT NULL DEFAULT 1,
    "jobTimeout" INTEGER NOT NULL DEFAULT 300000,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "retryDelayBase" INTEGER NOT NULL DEFAULT 5000,
    "retryDelayMax" INTEGER NOT NULL DEFAULT 60000,
    "enablePriority" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT
);

-- CreateTable
CREATE TABLE "UserAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "generatedModelId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "modelUrl" TEXT NOT NULL,
    "previewImageUrl" TEXT,
    "format" TEXT NOT NULL,
    "fileSize" INTEGER,
    "faceCount" INTEGER,
    "vertexCount" INTEGER,
    "quality" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "publishedAt" DATETIME,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "sliceTaskId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserAsset_generatedModelId_fkey" FOREIGN KEY ("generatedModelId") REFERENCES "GeneratedModel" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "GenerationRequest_userId_createdAt_idx" ON "GenerationRequest"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "GeneratedImage_requestId_idx" ON "GeneratedImage"("requestId");

-- CreateIndex
CREATE INDEX "GeneratedImage_imageStatus_idx" ON "GeneratedImage"("imageStatus");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedImage_requestId_index_key" ON "GeneratedImage"("requestId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedModel_sourceImageId_key" ON "GeneratedModel"("sourceImageId");

-- CreateIndex
CREATE INDEX "GeneratedModel_requestId_createdAt_idx" ON "GeneratedModel"("requestId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ImageGenerationJob_imageId_key" ON "ImageGenerationJob"("imageId");

-- CreateIndex
CREATE INDEX "ImageGenerationJob_status_priority_createdAt_idx" ON "ImageGenerationJob"("status", "priority" DESC, "createdAt");

-- CreateIndex
CREATE INDEX "ImageGenerationJob_status_nextRetryAt_idx" ON "ImageGenerationJob"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "ImageGenerationJob_status_timeoutAt_idx" ON "ImageGenerationJob"("status", "timeoutAt");

-- CreateIndex
CREATE UNIQUE INDEX "ModelGenerationJob_modelId_key" ON "ModelGenerationJob"("modelId");

-- CreateIndex
CREATE INDEX "ModelGenerationJob_status_priority_createdAt_idx" ON "ModelGenerationJob"("status", "priority" DESC, "createdAt");

-- CreateIndex
CREATE INDEX "ModelGenerationJob_status_nextRetryAt_idx" ON "ModelGenerationJob"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "ModelGenerationJob_status_timeoutAt_idx" ON "ModelGenerationJob"("status", "timeoutAt");

-- CreateIndex
CREATE UNIQUE INDEX "QueueConfig_queueName_key" ON "QueueConfig"("queueName");

-- CreateIndex
CREATE INDEX "QueueConfig_queueName_idx" ON "QueueConfig"("queueName");

-- CreateIndex
CREATE UNIQUE INDEX "UserAsset_generatedModelId_key" ON "UserAsset"("generatedModelId");

-- CreateIndex
CREATE INDEX "UserAsset_userId_createdAt_idx" ON "UserAsset"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "UserAsset_visibility_publishedAt_idx" ON "UserAsset"("visibility", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "UserAsset_visibility_likeCount_idx" ON "UserAsset"("visibility", "likeCount" DESC);

-- CreateIndex
CREATE INDEX "UserAsset_source_idx" ON "UserAsset"("source");
