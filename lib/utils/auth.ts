/**
 * 认证工具函数
 * 职责：用户身份验证和获取当前用户信息
 *
 * 当前实现：使用固定的测试用户 ID
 * 未来实现：从 Session/JWT 中获取真实用户 ID
 */

/**
 * 获取当前用户 ID
 *
 * **当前实现（开发阶段）**：
 * - 返回固定的测试用户 ID: `user_dev_001`
 * - 该用户在 `prisma/seed.ts` 中创建
 *
 * **未来实现**：
 * - 从 Session（如 NextAuth.js）或 JWT 中获取真实用户 ID
 * - 添加用户认证检查（未登录抛出 UNAUTHORIZED 错误）
 *
 * @returns 当前用户 ID
 * @throws AppError UNAUTHORIZED - 用户未认证（未来实现）
 *
 * @example
 * ```typescript
 * // API 路由中使用
 * export const POST = withErrorHandler(async (request: NextRequest) => {
 *   const userId = getCurrentUserId();
 *   const task = await createTask(userId, prompt);
 *   return NextResponse.json({ success: true, data: task });
 * });
 * ```
 */
export function getCurrentUserId(): string {
  // TODO: 替换为真实的用户认证逻辑
  // 示例实现（NextAuth.js）：
  // const session = await getServerSession(authOptions);
  // if (!session?.user?.id) {
  //   throw new AppError("UNAUTHORIZED", "用户未登录");
  // }
  // return session.user.id;

  // 当前返回固定的开发用户 ID（与数据库中创建的测试用户匹配）
  return "user_dev_001";
}

/**
 * 检查当前用户是否有权限访问指定资源
 *
 * **当前实现（开发阶段）**：
 * - 固定返回 true（因为只有一个测试用户）
 *
 * **未来实现**：
 * - 检查资源的 userId 是否与当前用户 ID 匹配
 * - 支持管理员权限检查
 *
 * @param resourceUserId 资源所属的用户 ID
 * @returns 是否有权限访问
 *
 * @example
 * ```typescript
 * const task = await getTaskById(taskId);
 * if (!canAccessResource(task.userId)) {
 *   throw new AppError("FORBIDDEN", "无权访问该资源");
 * }
 * ```
 */
export function canAccessResource(resourceUserId: string): boolean {
  // TODO: 替换为真实的权限检查逻辑
  // 示例实现：
  // const currentUserId = getCurrentUserId();
  // return currentUserId === resourceUserId || isAdmin(currentUserId);

  // 当前实现：所有资源都属于同一个测试用户，始终有权限
  return true;
}

/**
 * 验证当前用户是否有权限访问资源（抛出异常版本）
 *
 * 这是 canAccessResource 的便捷封装，如果没有权限会直接抛出 AppError
 *
 * @param resourceUserId 资源所属的用户 ID
 * @throws AppError FORBIDDEN - 无权访问该资源
 *
 * @example
 * ```typescript
 * const task = await getTaskById(taskId);
 * requireResourceAccess(task.userId); // 无权限时自动抛出错误
 * // 继续处理...
 * ```
 */
export function requireResourceAccess(resourceUserId: string): void {
  // 导入 AppError（延迟导入避免循环依赖）
  // if (!canAccessResource(resourceUserId)) {
  //   const { AppError } = require("./errors");
  //   throw new AppError("FORBIDDEN", "无权访问该资源");
  // }

  // 当前实现：始终通过验证
  // 未来实现时需要取消上面的注释
}
