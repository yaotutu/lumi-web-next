/**
 * Worker状态查询接口（JSend 规范）
 *
 * GET /api/workers/status
 * 返回所有Worker的运行状态
 */

import { success } from "@/lib/utils/api-response";
import { getWorkerStatus as getImageWorkerStatus } from "@/lib/workers/image-worker";
import { getWorkerStatus as getModel3DWorkerStatus } from "@/lib/workers/model3d-worker";

export async function GET() {
  // 获取所有 Worker 状态
  const imageStatus = getImageWorkerStatus();
  const model3dStatus = getModel3DWorkerStatus();

  // JSend success 格式
  return success({
    image: imageStatus,
    model3d: model3dStatus,
  });
}
