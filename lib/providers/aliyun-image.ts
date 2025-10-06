/**
 * 阿里云百炼-通义千问文生图API服务
 * 文档: https://help.aliyun.com/zh/model-studio/qwen-image-api
 *
 * ⚠️ 重要说明：
 * - 阿里云返回的图片URL为临时链接，有效期仅 24小时
 * - 当前实现直接使用临时URL，未下载到本地存储
 * - TODO: 对接OSS后，需要下载图片并保存到永久存储
 */

// ============================================
// 自定义错误类
// ============================================

/**
 * 阿里云API错误类
 * 携带HTTP状态码，便于精确的错误处理
 */
export class AliyunAPIError extends Error {
  constructor(
    public statusCode: number, // HTTP状态码
    message: string, // 错误描述
  ) {
    super(message);
    this.name = "AliyunAPIError";
  }
}

// 是否启用mock模式（开发阶段使用假数据）
const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

// Mock图片数据 - 开发阶段使用的假图片URL
const MOCK_IMAGES = [
  "https://images.unsplash.com/photo-1543857778-c4a1a569e7bd?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1505506874110-6a7a69069a08?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1519641270515-6a66300309a9?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=400&h=400&fit=crop",
];

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

// 从环境变量获取API配置
// 为了确保在Node.js环境中也能正确加载，提供默认值
const API_KEY = process.env.ALIYUN_IMAGE_API_KEY || process.env.NEXT_PUBLIC_ALIYUN_IMAGE_API_KEY || "";
const API_ENDPOINT =
  process.env.ALIYUN_IMAGE_API_ENDPOINT ||
  process.env.NEXT_PUBLIC_ALIYUN_IMAGE_API_ENDPOINT ||
  "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";

/**
 * 调用阿里云文生图API生成图片
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
    console.log(`[MOCK] 生成 ${count} 张图片成功`);
    return mockImages;
  }

  // 从环境变量获取API配置（在运行时获取，确保最新）
  const API_KEY = process.env.ALIYUN_IMAGE_API_KEY || process.env.NEXT_PUBLIC_ALIYUN_IMAGE_API_KEY || "";
  const API_ENDPOINT =
    process.env.ALIYUN_IMAGE_API_ENDPOINT ||
    process.env.NEXT_PUBLIC_ALIYUN_IMAGE_API_ENDPOINT ||
    "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";

  // 验证API密钥
  if (!API_KEY) {
    throw new Error(
      "缺少阿里云API密钥配置，请检查环境变量ALIYUN_IMAGE_API_KEY",
    );
  }

  // 注意: API一次只能生成1张图片,需要多次调用
  const allImages: string[] = [];

  for (let i = 0; i < count; i++) {
    const requestBody: QwenImageRequest = {
      model: "qwen-image-plus", // 使用 qwen-image-plus (性价比更高)
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
        prompt_extend: true, // 启用智能改写,提升生成效果
        watermark: false, // 不添加水印
        negative_prompt: "", // 负向提示词
      },
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

        // 抛出携带状态码的自定义错误
        throw new AliyunAPIError(
          response.status,
          `阿里云API错误: ${response.status} - ${errorData.message || response.statusText}`,
        );
      }

      const data: QwenImageResponse = await response.json();

      // 调试: 打印完整响应数据
      console.log(
        `图片 ${i + 1}/${count} API响应:`,
        JSON.stringify(data, null, 2),
      );

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
      console.error(`生成第 ${i + 1} 张图片失败:`, error);
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
 * 支持流式处理,生成一张返回一张
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
      console.log(`[MOCK] 图片 ${i + 1}/${count} 生成成功`);
      yield MOCK_IMAGES[mockImageIndex];
    }
    return;
  }

  // 从环境变量获取API配置（在运行时获取，确保最新）
  const API_KEY = process.env.ALIYUN_IMAGE_API_KEY || process.env.NEXT_PUBLIC_ALIYUN_IMAGE_API_KEY || "";
  const API_ENDPOINT =
    process.env.ALIYUN_IMAGE_API_ENDPOINT ||
    process.env.NEXT_PUBLIC_ALIYUN_IMAGE_API_ENDPOINT ||
    "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";

  // 验证API密钥
  if (!API_KEY) {
    throw new Error(
      "缺少阿里云API密钥配置，请检查环境变量ALIYUN_IMAGE_API_KEY",
    );
  }

  for (let i = 0; i < count; i++) {
    const requestBody: QwenImageRequest = {
      model: "qwen-image-plus",
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

      // 抛出携带状态码的自定义错误
      throw new AliyunAPIError(
        response.status,
        `阿里云API错误: ${response.status} - ${errorData.message || response.statusText}`,
      );
    }

    const data: QwenImageResponse = await response.json();

    console.log(`图片 ${i + 1}/${count} 生成成功`);

    if (!data || !data.output || !data.output.choices) {
      throw new Error(`API响应格式错误: ${JSON.stringify(data)}`);
    }

    const choice = data.output.choices[0];
    if (choice?.message?.content) {
      const imageContent = choice.message.content.find((c) => c.image);
      if (imageContent?.image) {
        // 立即yield返回这张图片的URL
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
