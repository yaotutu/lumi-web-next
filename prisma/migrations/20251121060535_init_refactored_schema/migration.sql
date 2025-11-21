-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatar" TEXT,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EmailVerificationCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "verifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    CONSTRAINT "EmailVerificationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GenerationRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IMAGE_PENDING',
    "phase" TEXT NOT NULL DEFAULT 'IMAGE_GENERATION',
    "selectedImageIndex" INTEGER,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "failedAt" DATETIME,
    "errorMessage" TEXT,
    CONSTRAINT "GeneratedImage_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "GenerationRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Model" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'AI_GENERATED',
    "requestId" TEXT,
    "sourceImageId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "modelUrl" TEXT,
    "previewImageUrl" TEXT,
    "format" TEXT NOT NULL DEFAULT 'OBJ',
    "fileSize" INTEGER,
    "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "publishedAt" DATETIME,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "favoriteCount" INTEGER NOT NULL DEFAULT 0,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "failedAt" DATETIME,
    "errorMessage" TEXT,
    CONSTRAINT "Model_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Model_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "GenerationRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Model_sourceImageId_fkey" FOREIGN KEY ("sourceImageId") REFERENCES "GeneratedImage" ("id") ON DELETE SET NULL ON UPDATE CASCADE
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "failedAt" DATETIME,
    "errorMessage" TEXT,
    "errorCode" TEXT,
    "executionDuration" INTEGER,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "failedAt" DATETIME,
    "errorMessage" TEXT,
    "errorCode" TEXT,
    "executionDuration" INTEGER,
    CONSTRAINT "ModelGenerationJob_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ModelInteraction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ModelInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ModelInteraction_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "EmailVerificationCode_email_createdAt_idx" ON "EmailVerificationCode"("email", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "EmailVerificationCode_email_expiresAt_idx" ON "EmailVerificationCode"("email", "expiresAt");

-- CreateIndex
CREATE INDEX "GenerationRequest_userId_createdAt_idx" ON "GenerationRequest"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "GenerationRequest_status_phase_idx" ON "GenerationRequest"("status", "phase");

-- CreateIndex
CREATE INDEX "GeneratedImage_requestId_idx" ON "GeneratedImage"("requestId");

-- CreateIndex
CREATE INDEX "GeneratedImage_imageStatus_idx" ON "GeneratedImage"("imageStatus");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedImage_requestId_index_key" ON "GeneratedImage"("requestId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "Model_requestId_key" ON "Model"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "Model_sourceImageId_key" ON "Model"("sourceImageId");

-- CreateIndex
CREATE INDEX "Model_userId_createdAt_idx" ON "Model"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Model_source_idx" ON "Model"("source");

-- CreateIndex
CREATE INDEX "Model_visibility_publishedAt_idx" ON "Model"("visibility", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "Model_visibility_likeCount_idx" ON "Model"("visibility", "likeCount" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ImageGenerationJob_imageId_key" ON "ImageGenerationJob"("imageId");

-- CreateIndex
CREATE INDEX "ImageGenerationJob_status_priority_createdAt_idx" ON "ImageGenerationJob"("status", "priority" DESC, "createdAt");

-- CreateIndex
CREATE INDEX "ImageGenerationJob_status_nextRetryAt_idx" ON "ImageGenerationJob"("status", "nextRetryAt");

-- CreateIndex
CREATE UNIQUE INDEX "ModelGenerationJob_modelId_key" ON "ModelGenerationJob"("modelId");

-- CreateIndex
CREATE INDEX "ModelGenerationJob_status_priority_createdAt_idx" ON "ModelGenerationJob"("status", "priority" DESC, "createdAt");

-- CreateIndex
CREATE INDEX "ModelGenerationJob_status_nextRetryAt_idx" ON "ModelGenerationJob"("status", "nextRetryAt");

-- CreateIndex
CREATE UNIQUE INDEX "QueueConfig_queueName_key" ON "QueueConfig"("queueName");

-- CreateIndex
CREATE INDEX "ModelInteraction_userId_type_createdAt_idx" ON "ModelInteraction"("userId", "type", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ModelInteraction_modelId_type_idx" ON "ModelInteraction"("modelId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "ModelInteraction_userId_modelId_type_key" ON "ModelInteraction"("userId", "modelId", "type");
