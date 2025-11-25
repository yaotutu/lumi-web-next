/**
 * Model 服务层 - 业务逻辑层
 *
 * 职责：
 * - Model 实体的业务逻辑处理（AI生成 + 用户上传）
 * - 模型生成任务管理
 * - 模型发布/取消发布
 * - 调用 Repository 层进行数据访问
 *
 * 原则：
 * - 函数式编程，纯函数优先
 * - 使用统一错误处理
 * - 不直接操作数据库，通过 Repository 层
 */

import {
  GenerationRequestRepository,
  ModelRepository,
} from "@/lib/repositories";
import { AppError } from "@/lib/utils/errors";

// ============================================
// 查询操作
// ============================================

/**
 * 根据ID获取模型详情
 * @param modelId 模型ID
 * @returns 模型详情
 * @throws AppError NOT_FOUND - 模型不存在
 */
export async function getModelById(modelId: string) {
  const model = await ModelRepository.findModelById(modelId);

  if (!model) {
    throw new AppError("NOT_FOUND", `模型不存在: ${modelId}`);
  }

  return model;
}

/**
 * 获取用户的模型列表
 * @param userId 用户ID
 * @param options 查询选项
 */
export async function getUserModels(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
  },
) {
  return ModelRepository.findModelsByUserId(userId, options);
}

/**
 * 获取公开模型列表（模型广场）
 * @param options 查询选项
 */
export async function getPublicModels(options?: {
  limit?: number;
  offset?: number;
  orderBy?: "latest" | "popular";
}) {
  return ModelRepository.findPublicModels(options);
}

// ============================================
// 创建操作
// ============================================

/**
 * 为选中的图片创建 3D 模型生成任务
 *
 * 新架构核心变更：
 * - 1 Request : 1 Model（通过 requestId 唯一约束）
 * - 必须先设置 selectedImageIndex
 *
 * 流程：
 * 1. 验证请求存在且处于正确状态
 * 2. 验证图片存在且属于该请求
 * 3. 检查该请求是否已有模型（1:1 约束）
 * 4. 创建 Model 和 ModelGenerationJob（事务）
 * 5. 更新 Request 状态
 * 6. Worker 自动监听 Job 并执行生成
 *
 * @param requestId 生成请求ID
 * @param imageIndex 选中的图片索引 (0-3)
 * @returns 创建的模型对象（包含 Job 信息）
 * @throws AppError NOT_FOUND - 请求或图片不存在
 * @throws AppError INVALID_STATE - 状态不允许或已有模型
 */
export async function createModelForRequest(
  requestId: string,
  imageIndex: number,
) {
  // 1. 验证请求存在
  const request = await GenerationRequestRepository.findRequestById(requestId);

  if (!request) {
    throw new AppError("NOT_FOUND", `生成请求不存在: ${requestId}`);
  }

  // 2. 验证请求状态（必须是图片已完成阶段）
  if (
    request.phase !== "AWAITING_SELECTION" &&
    request.status !== "IMAGE_COMPLETED"
  ) {
    throw new AppError("INVALID_STATE", `请求状态不允许创建模型`, {
      currentPhase: request.phase,
      currentStatus: request.status,
    });
  }

  // 3. 检查该请求是否已有模型（1:1 约束）
  const existingModel = await ModelRepository.findModelByRequestId(requestId);

  if (existingModel) {
    throw new AppError(
      "INVALID_STATE",
      `该请求已有关联模型，每个请求只能生成一个3D模型`,
      {
        existingModelId: existingModel.id,
        requestId,
      },
    );
  }

  // 4. 验证图片索引有效
  if (imageIndex < 0 || imageIndex > 3) {
    throw new AppError("VALIDATION_ERROR", `图片索引无效，必须是 0-3`, {
      providedIndex: imageIndex,
    });
  }

  // 5. 获取选中的图片
  const selectedImage = request.images.find((img) => img.index === imageIndex);

  if (!selectedImage) {
    throw new AppError("NOT_FOUND", `图片不存在: index=${imageIndex}`);
  }

  // 6. 验证图片已完成
  if (selectedImage.imageStatus !== "COMPLETED" || !selectedImage.imageUrl) {
    throw new AppError("INVALID_STATE", `选中的图片尚未生成完成`, {
      imageStatus: selectedImage.imageStatus,
    });
  }

  // 7. 生成模型名称
  const modelName = `${request.prompt.substring(0, 20)}_model`;

  // 8. 更新请求状态（设置选中图片索引）
  await GenerationRequestRepository.setSelectedImageIndex(
    requestId,
    imageIndex,
  );

  // 9. 创建 Model 和 ModelGenerationJob（事务）
  const { model, jobId } = await ModelRepository.createModelWithJob({
    userId: request.userId,
    requestId,
    sourceImageId: selectedImage.id,
    name: modelName,
    previewImageUrl: selectedImage.imageUrl,
  });

  console.log(
    `✅ 创建3D模型任务: modelId=${model.id}, jobId=${jobId}, requestId=${requestId}, imageIndex=${imageIndex}`,
  );

  // 10. 查询完整的模型对象（包含关联数据）
  return getModelById(model.id);
}

// ============================================
// 更新操作
// ============================================

/**
 * 更新模型信息
 * @param modelId 模型ID
 * @param userId 用户ID（权限验证）
 * @param data 更新数据
 * @throws AppError NOT_FOUND - 模型不存在
 * @throws AppError FORBIDDEN - 无权限
 */
export async function updateModel(
  modelId: string,
  userId: string,
  data: {
    name?: string;
    description?: string;
  },
) {
  const model = await getModelById(modelId);

  // 验证权限
  if (model.userId !== userId) {
    throw new AppError("FORBIDDEN", `无权限修改此模型`);
  }

  return ModelRepository.updateModel(modelId, data);
}

/**
 * 发布模型到广场
 * @param modelId 模型ID
 * @param userId 用户ID（权限验证）
 * @throws AppError NOT_FOUND - 模型不存在
 * @throws AppError FORBIDDEN - 无权限
 * @throws AppError INVALID_STATE - 模型未完成
 */
export async function publishModel(modelId: string, userId: string) {
  const model = await getModelById(modelId);

  // 验证权限
  if (model.userId !== userId) {
    throw new AppError("FORBIDDEN", `无权限发布此模型`);
  }

  // 验证模型已完成
  if (!model.completedAt || !model.modelUrl) {
    throw new AppError("INVALID_STATE", `模型尚未生成完成，无法发布`);
  }

  return ModelRepository.publishModel(modelId);
}

/**
 * 取消发布模型
 * @param modelId 模型ID
 * @param userId 用户ID（权限验证）
 * @throws AppError NOT_FOUND - 模型不存在
 * @throws AppError FORBIDDEN - 无权限
 */
export async function unpublishModel(modelId: string, userId: string) {
  const model = await getModelById(modelId);

  // 验证权限
  if (model.userId !== userId) {
    throw new AppError("FORBIDDEN", `无权限操作此模型`);
  }

  return ModelRepository.unpublishModel(modelId);
}

// ============================================
// 删除操作
// ============================================

/**
 * 删除模型
 * @param modelId 模型ID
 * @param userId 用户ID（权限验证）
 * @throws AppError NOT_FOUND - 模型不存在
 * @throws AppError FORBIDDEN - 无权限
 */
export async function deleteModel(modelId: string, userId: string) {
  const model = await getModelById(modelId);

  // 验证权限
  if (model.userId !== userId) {
    throw new AppError("FORBIDDEN", `无权限删除此模型`);
  }

  // TODO: 删除文件资源
  // const storageProvider = createStorageProvider();
  // await storageProvider.deleteModelFile(modelId);

  await ModelRepository.deleteModel(modelId);
}

// ============================================
// 统计操作
// ============================================

/**
 * 增加模型浏览次数
 * @param modelId 模型ID
 */
export async function incrementViewCount(modelId: string) {
  return ModelRepository.incrementModelCount(modelId, "viewCount");
}

/**
 * 增加模型下载次数
 * @param modelId 模型ID
 */
export async function incrementDownloadCount(modelId: string) {
  return ModelRepository.incrementModelCount(modelId, "downloadCount");
}

// ============================================
// 打印相关操作
// ============================================

/**
 * 更新模型的切片任务ID
 * @param modelId 模型ID
 * @param sliceTaskId 切片任务ID
 */
export async function updateSliceTaskId(modelId: string, sliceTaskId: string) {
  return ModelRepository.updateModel(modelId, { sliceTaskId });
}
