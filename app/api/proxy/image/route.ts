/**
 * 图片代理接口
 * 作用：解决腾讯云COS的CORS跨域问题
 *
 * 工作原理：
 * 1. 接收前端请求（带有腾讯云图片URL作为查询参数）
 * 2. 后端服务器fetch腾讯云URL（服务端请求无CORS限制）
 * 3. 将获取的图片流式传输给前端
 * 4. 设置正确的Content-Type和CORS头
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

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

    // 验证URL是腾讯云COS域名（安全检查，防止代理被滥用）
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
