/**
 * GeneratedModel 服务层 - 业务逻辑层
 *
 * 职责：
 * - GeneratedModel 实体的业务逻辑处理
 * - 模型生成任务管理
 * - 调用 Repository 层进行数据访问
 *
 * 原则：
 * - 函数式编程，纯函数优先
 * - 使用统一错误处理
 * - 不直接操作数据库，通过 Repository 层
 */

import { AppError } from "@/lib/utils/errors";
import {
  GeneratedModelRepository,
  GeneratedImageRepository,
  GenerationRequestRepository,
} from "@/lib/repositories";

/**
 * 根据ID获取生成的模型详情
 * @param modelId 模型ID
 * @returns 模型详情
 * @throws AppError NOT_FOUND - 模型不存在
 */
export async function getModelById(modelId: string) {
  const model = await GeneratedModelRepository.findModelById(modelId);

  if (!model) {
    throw new AppError("NOT_FOUND", `模型不存在: ${modelId}`);
  }

  return model;
}

/**
 * 为图片创建 3D 模型生成任务
 *
 * 流程：
 * 1. 验证图片存在且属于该请求
 * 2. 检查该图片是否已有模型（一对一关系）
 * 3. 创建 GeneratedModel 和 ModelGenerationJob（事务）
 * 4. Worker 自动监听 Job 并执行生成
 *
 * @param requestId 生成请求ID
 * @param sourceImageId 源图片ID
 * @returns 创建的模型对象（包含 Job 信息）
 * @throws AppError NOT_FOUND - 图片不存在
 * @throws AppError INVALID_STATE - 图片已有关联模型
 */
export async function createModelForImage(
  requestId: string,
  sourceImageId: string,
) {
  // 1. 验证图片存在
  const image = await GeneratedImageRepository.findImageById(sourceImageId);

  if (!image) {
    throw new AppError("NOT_FOUND", `图片不存在: ${sourceImageId}`);
  }

  // 2. 验证图片属于该请求
  if (image.requestId !== requestId) {
    throw new AppError(
      "INVALID_STATE",
      `图片不属于该生成请求`,
      {
        imageRequestId: image.requestId,
        providedRequestId: requestId,
      },
    );
  }

  // 3. 检查该图片是否已有关联模型
  const existingModel = await GeneratedModelRepository.findModelBySourceImageId(
    sourceImageId,
  );

  if (existingModel) {
    throw new AppError(
      "INVALID_STATE",
      `该图片已有关联模型: ${existingModel.id}`,
      {
        existingModelId: existingModel.id,
      },
    );
  }

  // 4. 生成模型名称
  const request = await GenerationRequestRepository.findRequestById(requestId);
  if (!request) {
    throw new AppError("NOT_FOUND", `生成请求不存在: ${requestId}`);
  }

  const modelName = `${request.prompt.substring(0, 20)}_${image.index}.obj`;

  // 5. 创建 GeneratedModel 和 ModelGenerationJob（事务）
  const { model, jobId } = await GeneratedModelRepository.createModelWithJob({
    requestId,
    sourceImageId,
    name: modelName,
  });

  console.log(
    `✅ 创建3D模型任务: modelId=${model.id}, jobId=${jobId}, sourceImageId=${sourceImageId}`,
  );

  // 6. 查询完整的模型对象（包含关联数据）
  return getModelById(model.id);
}

/**
 * 删除生成的模型
 * @param modelId 模型ID
 * @throws AppError NOT_FOUND - 模型不存在
 */
export async function deleteModel(modelId: string) {
  // 验证模型存在
  await getModelById(modelId);

  // TODO: 删除文件资源
  // const storageProvider = createStorageProvider();
  // await storageProvider.deleteModelFile(modelId);

  // 调用 Repository 层删除数据库记录（级联删除 Job）
  await GeneratedModelRepository.deleteModel(modelId);
}
