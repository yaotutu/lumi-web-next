/**
 * GenerationRequest 服务层 - 业务逻辑层
 *
 * 职责：
 * - GenerationRequest 实体的业务逻辑处理
 * - 任务状态管理、业务规则判断
 * - 调用 Repository 层进行数据访问
 *
 * 原则：
 * - 函数式编程，纯函数优先
 * - 使用统一错误处理
 * - 不直接操作数据库，通过 Repository 层
 */

import { AppError } from "@/lib/utils/errors";
import { GenerationRequestRepository } from "@/lib/repositories";

/**
 * 获取生成请求列表
 * @param userId 用户ID
 * @param options 查询选项（分页限制）
 * @returns 生成请求列表（包含关联的图片和模型）
 */
export async function listRequests(
  userId: string,
  options?: {
    limit?: number;
  },
) {
  return GenerationRequestRepository.findRequestsByUserId(userId, options);
}

/**
 * 根据ID获取生成请求详情
 * @param requestId 生成请求ID
 * @returns 生成请求详情
 * @throws AppError NOT_FOUND - 生成请求不存在
 */
export async function getRequestById(requestId: string) {
  const request = await GenerationRequestRepository.findRequestById(requestId);

  if (!request) {
    throw new AppError("NOT_FOUND", `生成请求不存在: ${requestId}`);
  }

  return request;
}

/**
 * 创建新的生成请求
 *
 * 自动创建：
 * - 1 个 GenerationRequest（无状态）
 * - 4 个 GeneratedImage（imageStatus=PENDING，imageUrl=null）
 * - 4 个 ImageGenerationJob（status=PENDING）
 *
 * @param userId 用户ID
 * @param prompt 文本提示词（已验证）
 * @returns 创建的生成请求对象（包含关联的 Images 和 Jobs）
 * @throws AppError VALIDATION_ERROR - 提示词验证失败
 */
export async function createRequest(userId: string, prompt: string) {
  // 参数已在外层API路由验证，但为了服务层的独立性，我们也进行基本验证
  const trimmedPrompt = prompt.trim();

  // 验证提示词不为空
  if (trimmedPrompt.length === 0) {
    throw new AppError("VALIDATION_ERROR", "提示词不能为空");
  }

  // 验证提示词长度
  if (trimmedPrompt.length > 500) {
    throw new AppError("VALIDATION_ERROR", "提示词长度不能超过500个字符");
  }

  // 调用 Repository 层创建生成请求、4个 Image 和 4个 Job
  const { request, imageIds, jobIds } =
    await GenerationRequestRepository.createRequestWithImagesAndJobs({
      userId,
      prompt: trimmedPrompt,
    });

  console.log(
    `✅ 创建生成请求: requestId=${request.id}, imageIds=${imageIds.join(",")}, jobIds=${jobIds.join(",")}`,
  );

  // 查询完整的生成请求对象（包含关联数据）
  return getRequestById(request.id);
}

/**
 * 删除生成请求及其所有资源（图片、模型文件）
 * @param requestId 生成请求ID
 * @throws AppError NOT_FOUND - 生成请求不存在
 */
export async function deleteRequest(requestId: string) {
  // 验证生成请求存在
  await getRequestById(requestId);

  // TODO: 删除文件资源（图片和模型）
  // const storageProvider = createStorageProvider();
  // await storageProvider.deleteTaskResources(requestId);

  // 调用 Repository 层删除数据库记录（级联删除 images 和 models）
  await GenerationRequestRepository.deleteRequest(requestId);
}
