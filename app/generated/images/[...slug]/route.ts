/**
 * 本地图片处理路由
 * 将 /generated/images/* 路径重定向到代理API
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  try {
    // 等待异步参数
    const resolvedParams = await params;

    // 构造图片相对路径（本地文件格式）
    const imageUrl = `/generated/images/${resolvedParams.slug.join('/')}`;

    // 重定向到代理API
    const proxyUrl = `${request.nextUrl.origin}/api/proxy/image?url=${encodeURIComponent(imageUrl)}`;

    return NextResponse.redirect(proxyUrl);
  } catch (error) {
    console.error("图片路由处理失败:", error);
    return NextResponse.json(
      { error: "图片处理失败" },
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