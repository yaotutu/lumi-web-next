/**
 * Worker启动接口
 *
 * POST /api/workers/start
 * 手动启动所有Worker
 */

import { NextResponse } from "next/server";
import { startWorker } from "@/lib/workers/model3d-worker";

export async function POST() {
  try {
    startWorker();

    return NextResponse.json({
      success: true,
      message: "Worker已启动",
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
      },
      { status: 500 },
    );
  }
}
