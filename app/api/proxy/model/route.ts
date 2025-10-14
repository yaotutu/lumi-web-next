/**
 * 3D模型文件代理接口
 * 作用：解决腾讯云COS的CORS跨域问题
 *
 * 工作原理：
 * 1. 接收前端请求（带有腾讯云模型URL作为查询参数）
 * 2. 后端服务器fetch腾讯云URL（服务端请求无CORS限制）
 * 3. 将获取的GLB文件流式传输给前端
 * 4. 设置正确的Content-Type和CORS头
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // 从查询参数获取模型URL
    const modelUrl = request.nextUrl.searchParams.get("url");

    // 验证URL参数
    if (!modelUrl) {
      return NextResponse.json(
        { error: "Missing model URL parameter" },
        { status: 400 },
      );
    }

    // 验证URL是腾讯云COS域名（安全检查，防止代理被滥用）
    const allowedDomains = [
      "hunyuan-prod-1258344699.cos.ap-guangzhou.tencentcos.cn",
      "cos.ap-guangzhou.tencentcos.cn",
    ];

    let isAllowed = false;
    try {
      const url = new URL(modelUrl);
      isAllowed = allowedDomains.some((domain) => url.hostname.includes(domain));
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 },
      );
    }

    if (!isAllowed) {
      return NextResponse.json(
        { error: "URL not from allowed domain" },
        { status: 403 },
      );
    }

    // 从腾讯云获取模型文件
    const response = await fetch(modelUrl);

    // 检查响应状态
    if (!response.ok) {
      console.error("Failed to fetch model from Tencent COS:", {
        status: response.status,
        statusText: response.statusText,
      });
      return NextResponse.json(
        { error: "Failed to fetch model file" },
        { status: response.status },
      );
    }

    // 获取文件数据
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 返回文件流，设置正确的Content-Type
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "model/gltf-binary", // GLB文件的MIME类型
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=31536000", // 缓存1年（模型文件不会变）
        "Access-Control-Allow-Origin": "*", // 允许跨域
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    console.error("Model proxy error:", error);
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
