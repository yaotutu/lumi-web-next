/**
 * GET /api/openapi
 * 返回 OpenAPI 规范文件（YAML 格式）
 *
 * 用途：为 Swagger UI 提供规范文件
 */

import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export async function GET() {
  try {
    // 读取 OpenAPI 规范文件
    const openapiPath = join(process.cwd(), "docs", "openapi.yaml");
    const openapiContent = readFileSync(openapiPath, "utf-8");

    // 返回 YAML 内容
    return new NextResponse(openapiContent, {
      status: 200,
      headers: {
        "Content-Type": "application/x-yaml",
        // 允许 Swagger UI 跨域访问
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache", // 开发环境不缓存，方便调试
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "无法读取 OpenAPI 规范文件",
      },
      { status: 500 },
    );
  }
}
