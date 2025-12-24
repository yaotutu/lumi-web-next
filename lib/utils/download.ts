/**
 * 文件下载工具函数
 * 支持直接 URL 和代理 URL 的下载
 */

/**
 * 从 URL 中提取文件名
 * @param url - 文件 URL（可能是代理 URL）
 * @param fallbackName - 备用文件名
 * @returns 提取的文件名
 */
function extractFilename(url: string, fallbackName: string): string {
  try {
    // 解析 URL 对象
    const urlObj = new URL(url, window.location.origin);

    // 检查是否是代理 URL（包含 ?url= 查询参数）
    const originalUrl = urlObj.searchParams.get('url');

    if (originalUrl) {
      // 代理 URL：从原始 URL 中提取文件名
      const originalFilename = originalUrl.split('/').pop()?.split('?')[0];
      if (originalFilename) {
        return originalFilename;
      }
    } else {
      // 非代理 URL：直接从路径提取
      const pathFilename = urlObj.pathname.split('/').pop();
      if (pathFilename) {
        return pathFilename;
      }
    }
  } catch (error) {
    console.warn('文件名提取失败，使用备用名称:', error);
  }

  return fallbackName;
}

/**
 * 下载文件（支持代理 URL 和跨域 URL）
 * 使用 Fetch + Blob 方式确保可靠下载
 *
 * @param url - 文件 URL（支持代理 URL）
 * @param filename - 可选的自定义文件名，如果不提供则自动从 URL 提取
 * @returns Promise<void>
 *
 * @example
 * // 基本用法
 * await downloadFile('http://example.com/model.obj');
 *
 * // 自定义文件名
 * await downloadFile('http://example.com/file', 'my-model.obj');
 *
 * // 代理 URL
 * await downloadFile('/api/proxy/model?url=https://s3.../model.obj');
 */
export async function downloadFile(
  url: string,
  filename?: string
): Promise<void> {
  try {
    // 1. 使用 fetch 获取文件内容
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`文件下载失败: HTTP ${response.status}`);
    }

    // 2. 转换为 Blob
    const blob = await response.blob();

    // 3. 创建 Blob URL（浏览器内部 URL）
    const blobUrl = window.URL.createObjectURL(blob);

    // 4. 确定文件名
    const finalFilename = filename || extractFilename(url, 'download');

    // 5. 创建临时下载链接
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = finalFilename;

    // 6. 触发下载
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 7. 释放 Blob URL（避免内存泄漏）
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('文件下载失败:', error);
    throw error;
  }
}

/**
 * 下载 3D 模型文件
 * 根据模型信息自动生成文件名
 *
 * @param modelUrl - 模型文件 URL
 * @param modelId - 模型 ID（用于生成备用文件名）
 * @param format - 模型格式（obj, glb, 3mf 等）
 * @returns Promise<void>
 *
 * @example
 * await downloadModel(
 *   'http://example.com/model.obj',
 *   'abc123',
 *   'obj'
 * );
 */
export async function downloadModel(
  modelUrl: string,
  modelId: string,
  format: string
): Promise<void> {
  // 生成备用文件名
  const fallbackFilename = `model-${modelId}.${format.toLowerCase()}`;

  // 尝试从 URL 提取文件名，失败则使用备用名称
  const filename = extractFilename(modelUrl, fallbackFilename);

  return downloadFile(modelUrl, filename);
}
