/**
 * Repository 层统一导出
 *
 * Repository 模式：数据访问层
 * - 封装所有数据库操作
 * - 提供清晰的 CRUD 接口
 * - 不包含业务逻辑
 *
 * 使用示例：
 * import { GenerationRequestRepository, GeneratedModelRepository } from '@/lib/repositories';
 *
 * const request = await GenerationRequestRepository.findRequestById(id);
 * const model = await GeneratedModelRepository.createModelWithJob({ ... });
 */

import * as GenerationRequestRepository from "./generation-request.repository";
import * as GeneratedImageRepository from "./generated-image.repository";
import * as GeneratedModelRepository from "./generated-model.repository";
import * as JobRepository from "./job.repository";
import * as UserAssetRepository from "./user-asset.repository";
import * as QueueConfigRepository from "./queue-config.repository";

export {
  GenerationRequestRepository,
  GeneratedImageRepository,
  GeneratedModelRepository,
  JobRepository,
  UserAssetRepository,
  QueueConfigRepository,
};
