/**
 * 阿里云图片生成适配器
 *
 * 文档: https://help.aliyun.com/zh/model-studio/qwen-image-api
 *
 * ⚠️ 重要说明：
 * - 阿里云返回的图片URL为临时链接，有效期仅 24小时
 * - 当前实现直接使用临时URL，未下载到本地存储
 * - TODO: 对接OSS后，需要下载图片并保存到永久存储
 */

import { ExternalAPIError } from "@/lib/utils/retry";
import { BaseImageProvider } from "../base";
import type { ImageGenerationConfig } from "../types";

/**
 * 阿里云 API 错误类
 */
export class AliyunAPIError extends ExternalAPIError {
  constructor(statusCode: number, message: string) {
    super("aliyun", statusCode, message);
    this.name = "AliyunAPIError";
  }
}

/**
 * 阿里云 API 请求类型
 */
interface QwenImageRequest {
  model: string;
  input: {
    messages: Array<{
      role: string;
      content: Array<{
        text: string;
      }>;
    }>;
  };
  parameters?: {
    size?: string; // 图片尺寸
    prompt_extend?: boolean; // 是否启用智能改写
    watermark?: boolean; // 是否添加水印
    negative_prompt?: string; // 负向提示词
  };
}

/**
 * 阿里云 API 响应类型
 */
interface QwenImageResponse {
  output: {
    choices: Array<{
      finish_reason: string;
      message: {
        role: string;
        content: Array<{
          image: string;
        }>;
      };
    }>;
    task_metric?: {
      TOTAL: number;
      FAILED: number;
      SUCCEEDED: number;
    };
  };
  usage: {
    width: number;
    height: number;
    image_count: number;
  };
  request_id: string;
}

/**
 * 阿里云图片生成适配器
 */
export class AliyunImageAdapter extends BaseImageProvider {
  getName(): string {
    return "AliyunImageProvider";
  }

  protected getConfig(): ImageGenerationConfig {
    const apiKey =
      process.env.ALIYUN_IMAGE_API_KEY ||
      process.env.NEXT_PUBLIC_ALIYUN_IMAGE_API_KEY ||
      "";
    const endpoint =
      process.env.ALIYUN_IMAGE_API_ENDPOINT ||
      process.env.NEXT_PUBLIC_ALIYUN_IMAGE_API_ENDPOINT ||
      "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";
    const model = "qwen-image-plus"; // 使用 qwen-image-plus（性价比更高）

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

    // 注意: API一次只能生成1张图片，需要多次调用
    for (let i = 0; i < count; i++) {
      const requestBody: QwenImageRequest = {
        model: config.model!,
        input: {
          messages: [
            {
              role: "user",
              content: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        },
        parameters: {
          size: "1328*1328", // 支持的尺寸: 1664*928, 1472*1140, 1328*1328, 1140*1472, 928*1664
          prompt_extend: true, // 启用智能改写，提升生成效果
          watermark: false, // 不添加水印
          negative_prompt: "", // 负向提示词
        },
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

          throw new AliyunAPIError(
            response.status,
            `阿里云API错误: ${response.status} - ${errorData.message || response.statusText}`,
          );
        }

        const data: QwenImageResponse = await response.json();

        // 调试：打印完整响应数据
        this.log.debug("generateImagesImpl", "API响应", {
          imageIndex: i + 1,
          totalCount: count,
          response: data,
        });

        // 检查响应数据结构
        if (!data || !data.output || !data.output.choices) {
          throw new Error(`API响应格式错误: ${JSON.stringify(data)}`);
        }

        // 提取图片URL
        const choice = data.output.choices[0];
        if (choice?.message?.content) {
          const imageContent = choice.message.content.find((c) => c.image);
          if (imageContent?.image) {
            allImages.push(imageContent.image);
          } else {
            throw new Error("响应中未找到图片URL");
          }
        } else {
          throw new Error("响应格式不正确");
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

    for (let i = 0; i < count; i++) {
      const requestBody: QwenImageRequest = {
        model: config.model!,
        input: {
          messages: [
            {
              role: "user",
              content: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        },
        parameters: {
          size: "1328*1328",
          prompt_extend: true,
          watermark: false,
          negative_prompt: "",
        },
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

        throw new AliyunAPIError(
          response.status,
          `阿里云API错误: ${response.status} - ${errorData.message || response.statusText}`,
        );
      }

      const data: QwenImageResponse = await response.json();

      this.log.info("generateImageStreamImpl", "图片生成成功", {
        imageIndex: i + 1,
        totalCount: count,
      });

      if (!data || !data.output || !data.output.choices) {
        throw new Error(`API响应格式错误: ${JSON.stringify(data)}`);
      }

      const choice = data.output.choices[0];
      if (choice?.message?.content) {
        const imageContent = choice.message.content.find((c) => c.image);
        if (imageContent?.image) {
          // ⚠️ 返回值可能是以下格式之一：
          // 1. HTTP URL: https://dashscope-result.oss-cn-beijing.aliyuncs.com/xxx.png
          // 2. Base64: data:image/png;base64,iVBORw0KG...
          // 注意: URL有效期仅24小时
          yield imageContent.image;
        } else {
          throw new Error("响应中未找到图片URL");
        }
      } else {
        throw new Error("响应格式不正确");
      }
    }
  }
}
