/**
 * Mock Model3D 适配器
 *
 * 职责：提供开发和测试阶段的假数据
 * 使用场景：
 * - 开发阶段节省 API 调用成本
 * - 网络环境不佳时进行本地开发
 * - 快速原型验证和 UI 调试
 */

import { BaseModel3DProvider } from "../base";
import type {
  ModelJobResponse,
  ModelTaskStatusResponse,
  SubmitModelJobParams,
} from "../types";

/**
 * Mock Model3D 适配器
 *
 * 注意：此适配器始终返回 Mock 数据，不会调用真实 API
 */
export class MockModel3DAdapter extends BaseModel3DProvider {
  getName(): string {
    return "MockModel3DProvider";
  }

  protected async submitModelGenerationJobImpl(
    _params: SubmitModelJobParams,
  ): Promise<ModelJobResponse> {
    // 实际逻辑由 BaseModel3DProvider 的 Mock 模式处理
    // 此方法不会被调用
    throw new Error("Mock 适配器不应调用此方法");
  }

  protected async queryModelTaskStatusImpl(
    _jobId: string,
  ): Promise<ModelTaskStatusResponse> {
    // 实际逻辑由 BaseModel3DProvider 的 Mock 模式处理
    // 此方法不会被调用
    throw new Error("Mock 适配器不应调用此方法");
  }
}
