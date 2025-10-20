/**
 * Repository 层统一导出
 *
 * Repository 模式：数据访问层
 * - 封装所有数据库操作
 * - 提供清晰的 CRUD 接口
 * - 不包含业务逻辑
 *
 * 使用示例：
 * import { ModelRepository, TaskRepository } from '@/lib/repositories';
 *
 * const model = await ModelRepository.findModelById(id);
 * const task = await TaskRepository.createTask({ userId, prompt });
 */

import * as ModelRepository from "./model.repository";
import * as TaskRepository from "./task.repository";
import * as TaskImageRepository from "./task-image.repository";

export { ModelRepository, TaskRepository, TaskImageRepository };
