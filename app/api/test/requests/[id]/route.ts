/**
 * 测试 API：GenerationRequest 详情
 *
 * GET /api/test/requests/[id] - 获取生成请求详情
 */

import { type NextRequest, NextResponse } from "next/server";
import * as GenerationRequestService from "@/lib/services/generation-request-service";
import { withErrorHandler } from "@/lib/utils/errors";

/**
 * GET /api/test/requests/[id]
 * 获取生成请求详情
 */
export const GET = withErrorHandler(
  async (
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id } = await params;

    const generationRequest = await GenerationRequestService.getRequestById(id);

    return NextResponse.json({
      success: true,
      data: generationRequest,
    });
  },
);
