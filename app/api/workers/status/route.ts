/**
 * Worker状态查询接口
 *
 * GET /api/workers/status
 * 返回所有Worker的运行状态
 */

import { NextResponse } from "next/server";
import { getWorkerStatus as getImageWorkerStatus } from "@/lib/workers/image-worker";
import { getWorkerStatus as getModel3DWorkerStatus } from "@/lib/workers/model3d-worker";

export async function GET() {
  // 获取所有 Worker 状态
  const imageStatus = getImageWorkerStatus();
  const model3dStatus = getModel3DWorkerStatus();

  return NextResponse.json({
    success: true,
    data: {
      image: imageStatus,
      model3d: model3dStatus,
    },
  });
}
