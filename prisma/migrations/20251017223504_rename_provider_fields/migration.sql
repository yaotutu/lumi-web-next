-- 重命名字段以使其提供商无关（provider-agnostic）

-- TaskImage 表：重命名阿里云特定字段为通用字段
ALTER TABLE "TaskImage" RENAME COLUMN "aliyunTaskId" TO "providerTaskId";
ALTER TABLE "TaskImage" RENAME COLUMN "aliyunRequestId" TO "providerRequestId";

-- Model 表：重命名 API 字段为更清晰的提供商字段
ALTER TABLE "Model" RENAME COLUMN "apiTaskId" TO "providerJobId";
ALTER TABLE "Model" RENAME COLUMN "apiRequestId" TO "providerRequestId";
