/**
 * Repository 层统一导出
 *
 * Repository 模式：数据访问层
 * - 封装所有数据库操作
 * - 提供清晰的 CRUD 接口
 * - 不包含业务逻辑
 *
 * 使用示例：
 * import { GenerationRequestRepository, ModelRepository } from '@/lib/repositories';
 *
 * const request = await GenerationRequestRepository.findRequestById(id);
 * const model = await ModelRepository.createModelWithJob({ ... });
 */

import * as EmailVerificationRepository from "./email-verification.repository";
import * as GeneratedImageRepository from "./generated-image.repository";
import * as GenerationRequestRepository from "./generation-request.repository";
import * as JobRepository from "./job.repository";
import * as ModelRepository from "./model.repository";
import * as ModelInteractionRepository from "./model-interaction.repository";
import * as QueueConfigRepository from "./queue-config.repository";
import * as UserRepository from "./user.repository";

export {
  GenerationRequestRepository,
  GeneratedImageRepository,
  ModelRepository,
  ModelInteractionRepository,
  JobRepository,
  QueueConfigRepository,
  UserRepository,
  EmailVerificationRepository,
};
