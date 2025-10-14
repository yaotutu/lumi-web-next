/**
 * 腾讯云图生3D API Provider
 * 封装腾讯云AI3D服务的底层API调用
 */

import { ai3d } from "tencentcloud-sdk-nodejs-ai3d";
import { AppError } from "@/lib/utils/errors";
import { ExternalAPIError } from "@/lib/utils/retry";

/**
 * 腾讯云API错误类
 * 继承统一的ExternalAPIError，用于结构化错误表示
 */
export class TencentAPIError extends ExternalAPIError {
  constructor(
    message: string,
    statusCode?: number,
    public readonly code?: string, // 腾讯云错误码
  ) {
    super("tencent", statusCode, message);
    this.name = "TencentAPIError";
  }
}

// 导入腾讯云AI3D客户端类型
const Ai3dClient = ai3d.v20250513.Client;

/**
 * 3D模型生成任务提交参数
 */
interface SubmitModelJobParams {
  imageUrl: string; // 图片URL
  prompt?: string; // 可选的提示词
}

/**
 * 腾讯云3D任务提交响应
 */
interface TencentModelJobResponse {
  JobId: string; // 任务ID（24小时有效）
  RequestId: string; // 请求ID
}

/**
 * 腾讯云3D任务查询响应
 */
interface TencentModelTaskStatus {
  JobId: string; // 任务ID
  Status: string; // 任务状态: "WAIT" | "RUN" | "DONE" | "FAIL"
  ErrorCode?: string; // 错误码
  ErrorMessage?: string; // 错误信息
  ResultFile3Ds?: Array<{
    Type?: string; // 文件格式
    Url?: string; // 文件URL（24小时有效）
    PreviewImageUrl?: string; // 预览图片URL
  }>;
  RequestId: string; // 请求ID
}

/**
 * 创建腾讯云AI3D客户端实例
 * @returns 配置好的客户端实例
 */
function createTencentAi3dClient() {
  // 从环境变量读取密钥配置（使用腾讯云官方推荐的环境变量名）
  const secretId = process.env.TENCENTCLOUD_SECRET_ID;
  const secretKey = process.env.TENCENTCLOUD_SECRET_KEY;
  const region = process.env.TENCENTCLOUD_REGION || "ap-guangzhou";

  // 验证必需的环境变量
  if (!secretId || !secretKey) {
    throw new AppError(
      "EXTERNAL_API_ERROR",
      "腾讯云密钥配置缺失: TENCENTCLOUD_SECRET_ID 或 TENCENTCLOUD_SECRET_KEY 未设置",
    );
  }

  // 客户端配置
  const clientConfig = {
    credential: {
      secretId,
      secretKey,
    },
    region,
    profile: {
      httpProfile: {
        endpoint: "ai3d.tencentcloudapi.com",
      },
    },
  };

  // 返回客户端实例
  return new Ai3dClient(clientConfig);
}

/**
 * 提交图生3D模型任务到腾讯云
 * @param params - 任务参数
 * @returns 任务ID和请求ID
 * @throws AppError - 当API调用失败时
 */
export async function submitModelGenerationJob(
  params: SubmitModelJobParams,
): Promise<TencentModelJobResponse> {
  try {
    // 创建客户端实例
    const client = createTencentAi3dClient();

    // 构建API请求参数（根据SDK定义）
    const apiParams = {
      ImageUrl: params.imageUrl, // 图片URL（必填）
      ResultFormat: "GLB", // 生成GLB格式模型
      EnablePBR: false, // 不启用PBR材质
    };

    // 调用腾讯云API - 提交图生3D快速任务
    const response = await client.SubmitHunyuanTo3DRapidJob(apiParams);

    // 验证响应数据
    if (!response.JobId) {
      throw new AppError(
        "EXTERNAL_API_ERROR",
        "腾讯云API返回数据异常: 缺少JobId",
        { response },
      );
    }

    // 返回格式化响应
    return {
      JobId: response.JobId,
      RequestId: response.RequestId || "",
    };
  } catch (error) {
    // 捕获并转换腾讯云SDK错误
    if (error instanceof AppError) {
      throw error;
    }

    // 处理腾讯云SDK原生错误
    const tencentError = error as { code?: string; message?: string };
    const errorMsg = tencentError.message || "未知错误";

    // 判断错误类型并设置合适的HTTP状态码
    let statusCode: number | undefined;

    // 并发限制错误 - 等同于HTTP 429
    if (
      errorMsg.includes("任务上限") ||
      errorMsg.includes("并发") ||
      errorMsg.includes("限流")
    ) {
      statusCode = 429;
    }
    // 认证错误 - 等同于HTTP 401
    else if (
      errorMsg.includes("认证失败") ||
      errorMsg.includes("签名错误") ||
      errorMsg.includes("SecretId")
    ) {
      statusCode = 401;
    }
    // 权限/余额错误 - 等同于HTTP 403
    else if (errorMsg.includes("权限") || errorMsg.includes("余额")) {
      statusCode = 403;
    }

    // 抛出结构化的TencentAPIError
    throw new TencentAPIError(
      `腾讯云图生3D任务提交失败: ${errorMsg}`,
      statusCode,
      tencentError.code,
    );
  }
}

/**
 * 查询腾讯云3D模型生成任务状态
 * @param jobId - 腾讯云任务ID
 * @returns 任务状态信息
 * @throws AppError - 当API调用失败时
 */
export async function queryModelTaskStatus(
  jobId: string,
): Promise<TencentModelTaskStatus> {
  try {
    // 创建客户端实例
    const client = createTencentAi3dClient();

    // 调用腾讯云API - 查询快速任务状态
    const response = await client.QueryHunyuanTo3DRapidJob({
      JobId: jobId,
    });

    // 验证响应数据
    if (!response.Status) {
      throw new AppError(
        "EXTERNAL_API_ERROR",
        "腾讯云API返回数据异常: 缺少Status字段",
        { response },
      );
    }

    // 返回格式化响应
    return {
      JobId: jobId,
      Status: response.Status, // WAIT, RUN, DONE, FAIL
      ErrorCode: response.ErrorCode,
      ErrorMessage: response.ErrorMessage,
      ResultFile3Ds: response.ResultFile3Ds,
      RequestId: response.RequestId || "",
    };
  } catch (error) {
    // 捕获并转换腾讯云SDK错误
    if (error instanceof AppError) {
      throw error;
    }

    // 处理腾讯云SDK原生错误
    const tencentError = error as { code?: string; message?: string };
    const errorMsg = tencentError.message || "未知错误";

    // 状态查询失败通常是网络或临时性错误，可重试
    // 不设置特殊状态码，使用默认的可重试错误处理
    throw new TencentAPIError(
      `腾讯云任务状态查询失败: ${errorMsg}`,
      undefined,
      tencentError.code,
    );
  }
}
