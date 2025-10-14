/**
 * SiliconFlow 文生图API服务
 * 文档: https://docs.siliconflow.cn/api-reference/images/generations
 *
 * 特性:
 * - 支持多种开源图像生成模型
 * - 返回永久URL（无24小时限制）
 * - 性价比高，适合大规模生成
 */

import { createLogger } from "@/lib/logger";
import { ExternalAPIError } from "@/lib/utils/retry";

// 创建日志器
const log = createLogger("SiliconFlowImageProvider");

// ============================================
// 自定义错误类
// ============================================

/**
 * SiliconFlow API错误类
 * 继承统一的ExternalAPIError，用于结构化错误表示
 */
export class SiliconFlowAPIError extends ExternalAPIError {
  constructor(
    statusCode: number, // HTTP状态码
    message: string, // 错误描述
  ) {
    super("siliconflow", statusCode, message);
    this.name = "SiliconFlowAPIError";
  }
}

// 是否启用mock模式（开发阶段使用假数据）
const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

// Mock图片数据 - 开发阶段使用的假图片URL
const MOCK_IMAGES = [
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=512&h=512&fit=crop",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=512&h=512&fit=crop",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=512&h=512&fit=crop",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=512&h=512&fit=crop",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=512&h=512&fit=crop",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=512&h=512&fit=crop",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=512&h=512&fit=crop",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=512&h=512&fit=crop",
];

// ============================================
// 类型定义
// ============================================

interface SiliconFlowImageRequest {
  model: string; // 模型名称
  prompt: string; // 生成提示词
  image_size?: string; // 图片尺寸，默认 "1024x1024"
  batch_size?: number; // 批次大小，默认 1
  num_inference_steps?: number; // 推理步数，默认 20
  guidance_scale?: number; // 引导系数，默认 7.5
  negative_prompt?: string; // 负向提示词
  seed?: number; // 随机种子
}

interface SiliconFlowImageResponse {
  images: Array<{
    url: string; // 图片URL
  }>;
  timings: {
    inference: number; // 推理时长（毫秒）
  };
  seed: number; // 使用的随机种子
}

// ============================================
// 核心函数
// ============================================

/**
 * 调用 SiliconFlow 文生图API生成图片
 *
 * @param prompt 生成提示词
 * @param count 生成图片数量
 * @returns 图片URL数组
 */
export async function generateImages(
  prompt: string,
  count: number = 4,
): Promise<string[]> {
  // 如果启用mock模式，返回mock数据
  if (MOCK_MODE) {
    // 模拟API延迟
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 返回mock图片数据
    const mockImages = [];
    for (let i = 0; i < count; i++) {
      const mockImageIndex = i % MOCK_IMAGES.length;
      mockImages.push(MOCK_IMAGES[mockImageIndex]);
    }
    log.info("generateImages", "Mock模式：生成图片成功", { count });
    return mockImages;
  }

  // 从环境变量获取API配置
  const API_KEY = process.env.SILICONFLOW_API_KEY || "";
  const API_ENDPOINT =
    process.env.SILICONFLOW_API_ENDPOINT ||
    "https://api.siliconflow.cn/v1/images/generations";
  const MODEL =
    process.env.SILICONFLOW_IMAGE_MODEL || "Qwen/Qwen-Image-Edit-2509"; // 通义万相文生图模型

  // 验证API密钥
  if (!API_KEY) {
    throw new Error(
      "缺少 SiliconFlow API密钥配置，请检查环境变量 SILICONFLOW_API_KEY",
    );
  }

  log.info("generateImages", "开始生成图片", {
    count,
    model: MODEL,
    promptLength: prompt.length,
  });

  // 注意: 虽然API支持batch_size，但为了与阿里云保持一致，我们逐张生成
  const allImages: string[] = [];

  for (let i = 0; i < count; i++) {
    const requestBody: SiliconFlowImageRequest = {
      model: MODEL,
      prompt: prompt,
      image_size: "1024x1024", // 支持的尺寸: 512x512, 768x768, 1024x1024, 1280x720, 720x1280
      batch_size: 1, // 每次生成1张
      num_inference_steps: 20, // 推理步数，影响质量和速度
      guidance_scale: 7.5, // 引导系数，影响生成效果
      negative_prompt: "", // 负向提示词
    };

    try {
      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // 记录详细错误信息
        log.error("generateImages", "SiliconFlow API调用失败", null, {
          status: response.status,
          statusText: response.statusText,
          errorData: JSON.stringify(errorData),
          requestBody: JSON.stringify(requestBody),
        });

        // 抛出携带状态码的自定义错误
        throw new SiliconFlowAPIError(
          response.status,
          `SiliconFlow API错误: ${response.status} - ${errorData.error?.message || errorData.message || response.statusText}`,
        );
      }

      const data: SiliconFlowImageResponse = await response.json();

      // 调试: 打印完整响应数据
      log.debug("generateImages", "API响应", {
        imageIndex: i + 1,
        totalCount: count,
        response: data,
      });

      // 检查响应数据结构
      if (!data || !data.images || data.images.length === 0) {
        throw new Error(`API响应格式错误: ${JSON.stringify(data)}`);
      }

      // 提取图片URL
      const imageUrl = data.images[0].url;
      if (imageUrl) {
        allImages.push(imageUrl);
        log.info("generateImages", "图片生成成功", {
          imageIndex: i + 1,
          totalCount: count,
          inferenceTime: data.timings.inference,
          seed: data.seed,
        });
      } else {
        throw new Error("响应中未找到图片URL");
      }
    } catch (error) {
      log.error("generateImages", "生成图片失败", error, {
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

/**
 * 生成器函数 - 逐张生成图片并yield返回
 * 支持流式处理，生成一张返回一张
 *
 * @param prompt 生成提示词
 * @param count 生成图片数量
 * @yields 图片URL
 */
export async function* generateImageStream(
  prompt: string,
  count: number = 4,
): AsyncGenerator<string> {
  // 如果启用mock模式，返回mock数据
  if (MOCK_MODE) {
    // 模拟API延迟
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    for (let i = 0; i < count; i++) {
      // 模拟API调用延迟
      await delay(500);

      // 循环使用mock图片数据
      const mockImageIndex = i % MOCK_IMAGES.length;
      log.info("generateImageStream", "Mock模式：生成图片", {
        imageIndex: i + 1,
        totalCount: count,
      });
      yield MOCK_IMAGES[mockImageIndex];
    }
    return;
  }

  // 从环境变量获取API配置
  const API_KEY = process.env.SILICONFLOW_API_KEY || "";
  const API_ENDPOINT =
    process.env.SILICONFLOW_API_ENDPOINT ||
    "https://api.siliconflow.cn/v1/images/generations";
  const MODEL =
    process.env.SILICONFLOW_IMAGE_MODEL || "Qwen/Qwen-Image-Edit-2509"; // 通义万相文生图模型

  // 验证API密钥
  if (!API_KEY) {
    throw new Error(
      "缺少 SiliconFlow API密钥配置，请检查环境变量 SILICONFLOW_API_KEY",
    );
  }

  log.info("generateImageStream", "开始生成图片流", {
    count,
    model: MODEL,
    promptLength: prompt.length,
  });

  for (let i = 0; i < count; i++) {
    const requestBody: SiliconFlowImageRequest = {
      model: MODEL,
      prompt: prompt,
      image_size: "1024x1024",
      batch_size: 1,
      num_inference_steps: 20,
      guidance_scale: 7.5,
      negative_prompt: "",
    };

    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // 记录详细错误信息
      log.error("generateImageStream", "SiliconFlow API调用失败", null, {
        status: response.status,
        statusText: response.statusText,
        errorData: JSON.stringify(errorData),
        requestBody: JSON.stringify(requestBody),
      });

      // 抛出携带状态码的自定义错误
      throw new SiliconFlowAPIError(
        response.status,
        `SiliconFlow API错误: ${response.status} - ${errorData.error?.message || errorData.message || response.statusText}`,
      );
    }

    const data: SiliconFlowImageResponse = await response.json();

    log.info("generateImageStream", "图片生成成功", {
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
      // 立即yield返回这张图片的URL
      // SiliconFlow 返回永久URL，无24小时限制
      yield imageUrl;
    } else {
      throw new Error("响应中未找到图片URL");
    }
  }
}
