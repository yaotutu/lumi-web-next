/**
 * SiliconFlow 图片生成适配器
 *
 * 文档: https://docs.siliconflow.cn/api-reference/images/generations
 *
 * 特性:
 * - 支持多种开源图像生成模型
 * - 返回永久URL（无24小时限制）
 * - 性价比高，适合大规模生成
 */

import { ExternalAPIError } from "@/lib/utils/retry";
import { BaseImageProvider } from "../base";
import type { ImageGenerationConfig } from "../types";

/**
 * SiliconFlow API 错误类
 */
export class SiliconFlowAPIError extends ExternalAPIError {
  constructor(statusCode: number, message: string) {
    super("siliconflow", statusCode, message);
    this.name = "SiliconFlowAPIError";
  }
}

/**
 * SiliconFlow API 请求类型
 */
interface SiliconFlowImageRequest {
  model: string; // 模型名称
  prompt: string; // 生成提示词
  image_size?: string; // 图片尺寸
  batch_size?: number; // 批次大小
  num_inference_steps?: number; // 推理步数
  guidance_scale?: number; // 引导系数
  negative_prompt?: string; // 负向提示词
  seed?: number; // 随机种子
}

/**
 * SiliconFlow API 响应类型
 */
interface SiliconFlowImageResponse {
  images: Array<{
    url: string; // 图片URL
  }>;
  timings: {
    inference: number; // 推理时长（毫秒）
  };
  seed: number; // 使用的随机种子
}

/**
 * SiliconFlow 图片生成适配器
 */
export class SiliconFlowImageAdapter extends BaseImageProvider {
  getName(): string {
    return "SiliconFlowImageProvider";
  }

  protected getConfig(): ImageGenerationConfig {
    const apiKey = process.env.SILICONFLOW_API_KEY || "";
    const endpoint =
      process.env.SILICONFLOW_API_ENDPOINT ||
      "https://api.siliconflow.cn/v1/images/generations";
    const model = process.env.SILICONFLOW_IMAGE_MODEL || "Qwen/Qwen-Image"; // 通义万相文生图模型

    return {
      apiKey,
      endpoint,
      model,
    };
  }

  protected async generateImagesImpl(
    prompt: string,
    count: number,
  ): Promise<string[]> {
    const config = this.getConfig();
    const allImages: string[] = [];

    // 逐张生成（与阿里云保持一致）
    for (let i = 0; i < count; i++) {
      const requestBody: SiliconFlowImageRequest = {
        model: config.model!,
        prompt: prompt,
        image_size: "1024x1024",
        batch_size: 1,
        num_inference_steps: 20,
        guidance_scale: 7.5,
        negative_prompt: "",
      };

      try {
        const response = await fetch(config.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          // 记录详细错误
          this.log.error("generateImagesImpl", "API 调用失败", null, {
            status: response.status,
            statusText: response.statusText,
            errorData: JSON.stringify(errorData),
            requestBody: JSON.stringify(requestBody),
          });

          throw new SiliconFlowAPIError(
            response.status,
            `SiliconFlow API错误: ${response.status} - ${errorData.error?.message || errorData.message || response.statusText}`,
          );
        }

        const data: SiliconFlowImageResponse = await response.json();

        // 验证响应格式
        if (!data || !data.images || data.images.length === 0) {
          throw new Error(`API响应格式错误: ${JSON.stringify(data)}`);
        }

        const imageUrl = data.images[0].url;
        if (imageUrl) {
          allImages.push(imageUrl);

          this.log.info("generateImagesImpl", "图片生成成功", {
            imageIndex: i + 1,
            totalCount: count,
            inferenceTime: data.timings.inference,
            seed: data.seed,
          });
        } else {
          throw new Error("响应中未找到图片URL");
        }
      } catch (error) {
        this.log.error("generateImagesImpl", "生成图片失败", error, {
          imageIndex: i + 1,
          totalCount: count,
        });
        throw error;
      }
    }

    if (allImages.length === 0) {
      throw new Error("未生成任何图片");
    }

    return allImages;
  }

  protected async *generateImageStreamImpl(
    prompt: string,
    count: number,
  ): AsyncGenerator<string, void, unknown> {
    const config = this.getConfig();

    this.log.info("generateImageStreamImpl", "开始流式生成图片", {
      count,
      model: config.model,
      promptLength: prompt.length,
    });

    for (let i = 0; i < count; i++) {
      const requestBody: SiliconFlowImageRequest = {
        model: config.model!,
        prompt: prompt,
        image_size: "1024x1024",
        batch_size: 1,
        num_inference_steps: 20,
        guidance_scale: 7.5,
        negative_prompt: "",
      };

      const response = await fetch(config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // 记录详细错误
        this.log.error("generateImageStreamImpl", "API 调用失败", null, {
          status: response.status,
          statusText: response.statusText,
          errorData: JSON.stringify(errorData),
          requestBody: JSON.stringify(requestBody),
        });

        throw new SiliconFlowAPIError(
          response.status,
          `SiliconFlow API错误: ${response.status} - ${errorData.error?.message || errorData.message || response.statusText}`,
        );
      }

      const data: SiliconFlowImageResponse = await response.json();

      this.log.info("generateImageStreamImpl", "图片生成成功", {
        imageIndex: i + 1,
        totalCount: count,
        inferenceTime: data.timings.inference,
        seed: data.seed,
      });

      if (!data || !data.images || data.images.length === 0) {
        throw new Error(`API响应格式错误: ${JSON.stringify(data)}`);
      }

      const imageUrl = data.images[0].url;
      if (imageUrl) {
        // SiliconFlow 返回永久URL，无24小时限制
        yield imageUrl;
      } else {
        throw new Error("响应中未找到图片URL");
      }
    }
  }
}
