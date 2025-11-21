#!/usr/bin/env node

/**
 * 测试适配器逻辑
 */

import { adaptGenerationRequest } from '../lib/utils/task-adapter-client';

// 模拟 API 返回的原始数据（从 curl 获取）
const mockApiResponse = {
  success: true,
  data: {
    id: "cmi8i7n440003nuc9jq0usiaz",
    prompt: "我要一个超级马里奥",
    status: "COMPLETED",
    phase: "COMPLETED",
    selectedImageIndex: 1,
    createdAt: "2025-11-21T06:53:31.088Z",
    completedAt: "2025-11-21T07:12:05.851Z",
    images: [
      {
        id: "cmi8i7n450005nuc9hyvc6x4s",
        index: 0,
        imageStatus: "COMPLETED",
        imageUrl: "https://ai3d-1375240212.cos.ap-guangzhou.myqcloud.com/images/cmi8i7n450005nuc9hyvc6x4s/image.png",
        completedAt: "2025-11-21T06:53:57.895Z"
      },
      {
        id: "cmi8i7n460007nuc9egqeyk49",
        index: 1,
        imageStatus: "COMPLETED",
        imageUrl: "https://ai3d-1375240212.cos.ap-guangzhou.myqcloud.com/images/cmi8i7n460007nuc9egqeyk49/image.png",
        completedAt: "2025-11-21T06:54:00.727Z"
      },
      {
        id: "cmi8i7n470009nuc9fh3h8z6x",
        index: 2,
        imageStatus: "COMPLETED",
        imageUrl: "https://ai3d-1375240212.cos.ap-guangzhou.myqcloud.com/images/cmi8i7n470009nuc9fh3h8z6x/image.png",
        completedAt: "2025-11-21T06:54:01.948Z"
      },
      {
        id: "cmi8i7n48000bnuc93s9y1fx9",
        index: 3,
        imageStatus: "COMPLETED",
        imageUrl: "https://ai3d-1375240212.cos.ap-guangzhou.myqcloud.com/images/cmi8i7n48000bnuc93s9y1fx9/image.png",
        completedAt: "2025-11-21T06:54:34.951Z"
      }
    ],
    model: {
      id: "cmi8itn4k0001nu8jikdyinpm",
      name: "我要一个超级马里奥_model",
      modelUrl: "https://ai3d-1375240212.cos.ap-guangzhou.myqcloud.com/models/cmi8itn4k0001nu8jikdyinpm/model.obj",
      previewImageUrl: "https://ai3d-1375240212.cos.ap-guangzhou.myqcloud.com/models/cmi8itn4k0001nu8jikdyinpm/preview.png",
      format: "OBJ",
      source: "AI_GENERATED",
      visibility: "PRIVATE",
      sliceTaskId: null,
      sourceImageId: "cmi8i7n460007nuc9egqeyk49",
      createdAt: "2025-11-21T07:10:37.652Z",
      completedAt: "2025-11-21T07:12:05.426Z",
      failedAt: null,
      errorMessage: null,
      generationJob: {
        id: "cmi8itn4m0003nu8ji21ho6ya",
        status: "COMPLETED",
        progress: 100
      }
    }
  }
};

console.log('=== 测试适配器 ===\n');

console.log('输入数据:');
console.log('模型 completedAt:', mockApiResponse.data.model.completedAt);
console.log('模型 jobStatus:', mockApiResponse.data.model.generationJob.status);
console.log('');

const adaptedData = adaptGenerationRequest(mockApiResponse.data);

console.log('适配结果:');
console.log('任务 status:', adaptedData.status);
console.log('任务 phase:', adaptedData.phase);
console.log('');

if (adaptedData.model) {
  console.log('模型 generationStatus:', (adaptedData.model as any).generationStatus);
  console.log('模型 progress:', (adaptedData.model as any).progress);
  console.log('模型 modelUrl:', adaptedData.model.modelUrl);
} else {
  console.log('❌ 没有模型数据');
}

console.log('\n=== 模型字段详情 ===');
if (adaptedData.models && adaptedData.models.length > 0) {
  const model = adaptedData.models[0];
  console.log('models[0].generationStatus:', model.generationStatus);
  console.log('models[0].progress:', model.progress);
  console.log('models[0].modelUrl:', model.modelUrl);
} else {
  console.log('❌ models 数组为空');
}