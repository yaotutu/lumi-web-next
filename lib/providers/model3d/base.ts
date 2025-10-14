/**
 * Model3D Provider 抽象基类
 *
 * 职责：
 * - 定义统一的接口和公共逻辑
 * - 处理 Mock 模式
 * - 提供日志记录
 */

import { createLogger } from "@/lib/logger";
import type {
  Model3DProvider,
  ModelJobResponse,
  ModelTaskStatusResponse,
  SubmitModelJobParams,
} from "./types";

/**
 * Model3D Provider 抽象基类
 *
 * 子类需要实现：
 * - getName(): 返回渠道名称
 * - submitModelGenerationJobImpl(): 提交任务的具体实现
 * - queryModelTaskStatusImpl(): 查询状态的具体实现
 */
export abstract class BaseModel3DProvider implements Model3DProvider {
  protected readonly log = createLogger(this.getName());
  protected readonly isMockMode: boolean;

  constructor() {
    // 检查是否启用 Mock 模式
    this.isMockMode = process.env.NEXT_PUBLIC_MOCK_MODE === "true";
  }

  /**
   * 获取 Provider 名称（子类实现）
   */
  abstract getName(): string;

  /**
   * 提交任务的具体实现（子类实现）
   */
  protected abstract submitModelGenerationJobImpl(
    params: SubmitModelJobParams,
  ): Promise<ModelJobResponse>;

  /**
   * 查询状态的具体实现（子类实现）
   */
  protected abstract queryModelTaskStatusImpl(
    jobId: string,
  ): Promise<ModelTaskStatusResponse>;

  /**
   * 提交 3D 模型生成任务 - 公共实现
   */
  async submitModelGenerationJob(
    params: SubmitModelJobParams,
  ): Promise<ModelJobResponse> {
    // Mock 模式：返回假数据
    if (this.isMockMode) {
      return this.mockSubmitModelGenerationJob(params);
    }

    this.log.info("submitModelGenerationJob", "提交 3D 模型生成任务", {
      imageUrl: params.imageUrl,
      hasPrompt: !!params.prompt,
    });

    try {
      const response = await this.submitModelGenerationJobImpl(params);

      this.log.info("submitModelGenerationJob", "任务提交成功", {
        jobId: response.jobId,
        requestId: response.requestId,
      });

      return response;
    } catch (error) {
      this.log.error("submitModelGenerationJob", "任务提交失败", error);
      throw error;
    }
  }

  /**
   * 查询 3D 模型任务状态 - 公共实现
   */
  async queryModelTaskStatus(jobId: string): Promise<ModelTaskStatusResponse> {
    // Mock 模式：返回假数据
    if (this.isMockMode) {
      return this.mockQueryModelTaskStatus(jobId);
    }

    this.log.info("queryModelTaskStatus", "查询任务状态", { jobId });

    try {
      const response = await this.queryModelTaskStatusImpl(jobId);

      this.log.info("queryModelTaskStatus", "查询成功", {
        jobId,
        status: response.status,
        hasResultFiles:
          !!response.resultFiles && response.resultFiles.length > 0,
      });

      return response;
    } catch (error) {
      this.log.error("queryModelTaskStatus", "查询失败", error, { jobId });
      throw error;
    }
  }

  // ============================================
  // Mock 模式实现
  // ============================================

  /**
   * Mock 模式：提交任务
   */
  protected mockSubmitModelGenerationJob(
    params: SubmitModelJobParams,
  ): Promise<ModelJobResponse> {
    this.log.info("mockSubmitModelGenerationJob", "使用 Mock 模式", {
      imageUrl: params.imageUrl,
    });

    // 模拟延迟
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          jobId: `mock-job-${Date.now()}`,
          requestId: `mock-request-${Date.now()}`,
        });
      }, 500); // 模拟 500ms 延迟
    });
  }

  /**
   * Mock 模式：查询任务状态
   * 模拟任务从 WAIT -> RUN -> DONE 的状态变化
   */
  protected mockQueryModelTaskStatus(
    jobId: string,
  ): Promise<ModelTaskStatusResponse> {
    this.log.info("mockQueryModelTaskStatus", "使用 Mock 模式", { jobId });

    // 模拟延迟
    return new Promise((resolve) => {
      setTimeout(() => {
        // 解析 jobId 中的时间戳，模拟状态变化
        const timestamp = Number.parseInt(jobId.replace("mock-job-", ""), 10);
        const elapsed = Date.now() - timestamp;

        let status: "WAIT" | "RUN" | "DONE" | "FAIL";
        let resultFiles:
          | Array<{ type: string; url: string; previewImageUrl: string }>
          | undefined;

        if (elapsed < 2000) {
          // 前 2 秒：等待中
          status = "WAIT";
        } else if (elapsed < 5000) {
          // 2-5 秒：运行中
          status = "RUN";
        } else {
          // 5 秒后：完成
          status = "DONE";
          resultFiles = [
            {
              type: "GLB",
              url: "/mock-model.glb",
              previewImageUrl: "/mock-preview.png",
            },
          ];
        }

        resolve({
          jobId,
          status,
          resultFiles,
          requestId: `mock-request-${Date.now()}`,
        });
      }, 300); // 模拟 300ms 延迟
    });
  }
}
