/**
 * 本地模型处理路由
 * 将 /generated/models/* 路径重定向到代理API
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  try {
    // 等待异步参数
    const resolvedParams = await params;

    // 构造原始模型URL
    const modelUrl = `${request.nextUrl.origin}/generated/models/${resolvedParams.slug.join('/')}`;

    // 重定向到代理API
    const proxyUrl = `${request.nextUrl.origin}/api/proxy/model?url=${encodeURIComponent(modelUrl)}`;

    return NextResponse.redirect(proxyUrl);
  } catch (error) {
    console.error("模型路由处理失败:", error);
    return NextResponse.json(
      { error: "模型处理失败" },
      { status: 500 }
    );
  }
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}