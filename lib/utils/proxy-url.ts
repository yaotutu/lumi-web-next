/**
 * URL 代理工具函数
 *
 * 用于处理腾讯云 COS 和其他云服务的 CORS 问题
 */

/**
 * 生成图片代理 URL
 *
 * @param imageUrl 原始图片 URL
 * @returns 代理后的 URL（如果需要代理）或原始 URL
 */
export function getProxiedImageUrl(
  imageUrl: string | undefined | null,
): string {
  if (!imageUrl) return "";

  // 如果是本地文件（以/开头），直接返回
  if (imageUrl.startsWith("/")) return imageUrl;

  // 如果是相对路径或 data URL，直接返回
  if (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  // 检查是否需要代理（来自云存储服务的 URL）
  const needsProxy =
    imageUrl.includes(".myqcloud.com") || // 腾讯云 COS
    imageUrl.includes(".aliyuncs.com") || // 阿里云 OSS
    imageUrl.includes(".siliconflow.cn"); // SiliconFlow

  if (needsProxy) {
    return `/api/proxy/image?url=${encodeURIComponent(imageUrl)}`;
  }

  // 其他 URL 直接返回
  return imageUrl;
}

/**
 * 生成模型代理 URL
 *
 * @param modelUrl 原始模型 URL
 * @returns 代理后的 URL（如果需要代理）或原始 URL
 */
export function getProxiedModelUrl(
  modelUrl: string | undefined | null,
): string {
  if (!modelUrl) return "/demo.glb";

  // 所有本地文件路径都通过代理处理
  if (modelUrl.startsWith("/")) {
    return `/api/proxy/model?url=${encodeURIComponent(modelUrl)}`;
  }

  // 如果是纯文件名（如：cmix143j10018i0nm4i0fvc8g.obj），假设是本地文件
  if (modelUrl.match(/^[a-z0-9]+\.(obj|glb|gltf|fbx)$/i)) {
    // 这是迁移后的本地文件，需要添加本地路径前缀
    const localPath = `/generated/models/${modelUrl}`;
    return `/api/proxy/model?url=${encodeURIComponent(localPath)}`;
  }

  // 检查是否是腾讯云 COS URL（格式：https://bucket.cos.region.myqcloud.com/...）
  // 或腾讯云混元 3D URL（xxx.tencentcos.cn）
  const needsProxy =
    modelUrl.includes(".myqcloud.com") || // 我们自己的 COS
    modelUrl.includes(".tencentcos.cn"); // 腾讯云混元 3D

  if (needsProxy) {
    return `/api/proxy/model?url=${encodeURIComponent(modelUrl)}`;
  }

  // 其他情况，如果是相对路径但没有/开头，加上/
  if (!modelUrl.startsWith("http://") && !modelUrl.startsWith("https://")) {
    const normalizedUrl = modelUrl.startsWith("/") ? modelUrl : `/${modelUrl}`;
    return `/api/proxy/model?url=${encodeURIComponent(normalizedUrl)}`;
  }

  // 其他 URL 直接返回（可能有 CORS 问题）
  return modelUrl;
}
