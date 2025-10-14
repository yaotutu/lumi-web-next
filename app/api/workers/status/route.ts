/**
 * Worker状态查询接口
 *
 * GET /api/workers/status
 * 返回所有Worker的运行状态
 */

import { NextResponse } from "next/server";
import { getWorkerStatus } from "@/lib/workers/model3d-worker";

export async function GET() {
  const model3dStatus = getWorkerStatus();

  return NextResponse.json({
    success: true,
    data: {
      model3d: model3dStatus,
    },
  });
}
