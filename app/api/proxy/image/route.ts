/**
 * 图片代理接口
 * 作用：解决跨域问题 + 提供本地文件服务
 *
 * 工作原理：
 * 1. 接收前端请求（带有图片URL作为查询参数）
 * 2. 智能判断：本地文件 vs 外部OSS URL
 * 3. 本地文件：直接从storage目录读取
 * 4. 外部URL：后端fetch并转发（服务端无CORS限制）
 * 5. 设置正确的Content-Type和CORS头
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export async function GET(request: NextRequest) {
  try {
    // 从查询参数获取图片URL
    const imageUrl = request.nextUrl.searchParams.get("url");

    // 验证URL参数
    if (!imageUrl) {
      return NextResponse.json(
        { error: "Missing image URL parameter" },
        { status: 400 },
      );
    }

    // 检查是否为本地文件路径
    if (imageUrl.startsWith('/generated/images/')) {
      return handleLocalImage(imageUrl);
    }

    // 验证URL是允许的外部域名（安全检查，防止代理被滥用）
    // 支持两种格式：
    // 1. 图片生成 API 的临时 URL：xxx.aliyuncs.com, xxx.siliconflow.cn 等
    // 2. 我们自己的 COS：xxx.myqcloud.com
    let isAllowed = false;
    try {
      const url = new URL(imageUrl);
      // 检查是否包含允许的域名
      isAllowed =
        url.hostname.includes(".myqcloud.com") || // 腾讯云 COS
        url.hostname.includes(".aliyuncs.com") || // 阿里云 OSS（阿里云图片生成）
        url.hostname.includes(".siliconflow.cn"); // SiliconFlow（图片生成）
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 },
      );
    }

    if (!isAllowed) {
      return NextResponse.json(
        {
          error:
            "URL not from allowed domain (must be .myqcloud.com, .aliyuncs.com, or .siliconflow.cn)",
        },
        { status: 403 },
      );
    }

    // 从源获取图片文件
    const response = await fetch(imageUrl);

    // 检查响应状态
    if (!response.ok) {
      console.error("Failed to fetch image:", {
        url: imageUrl,
        status: response.status,
        statusText: response.statusText,
      });
      return NextResponse.json(
        { error: "Failed to fetch image file" },
        { status: response.status },
      );
    }

    // 获取原始 Content-Type，如果没有则默认为 image/png
    const contentType = response.headers.get("content-type") || "image/png";

    // 获取文件数据
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 返回文件流，设置正确的Content-Type
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType, // 使用原始的 Content-Type
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=31536000", // 缓存1年（图片文件不会变）
        "Access-Control-Allow-Origin": "*", // 允许跨域
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    console.error("Image proxy error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * 处理本地图片文件服务
 */
function handleLocalImage(imageUrl: string): NextResponse {
  try {
    // 映射URL到本地文件系统路径
    const relativePath = imageUrl.replace('/generated/images/', '');
    const storageRoot = path.join(process.cwd(), 'storage');
    const filePath = path.join(storageRoot, 'images', relativePath);

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "Image file not found" },
        { status: 404 }
      );
    }

    // 读取文件
    const buffer = fs.readFileSync(filePath);

    // 根据文件扩展名确定Content-Type
    const ext = path.extname(filePath).toLowerCase();
    let contentType = 'image/png'; // 默认
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
      case '.svg':
        contentType = 'image/svg+xml';
        break;
    }

    // 返回文件
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=31536000", // 缓存1年
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });

  } catch (error) {
    console.error("Local image file error:", error);
    return NextResponse.json(
      { error: "Failed to read local image file" },
      { status: 500 }
    );
  }
}

// 处理OPTIONS预检请求
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
