/**
 * 3D模型文件代理接口
 * 作用：解决跨域问题 + 提供本地文件服务
 *
 * 支持的格式：
 * - OBJ: text/plain（3D 几何体）
 * - MTL: text/plain（材质定义）
 * - GLB: model/gltf-binary
 * - GLTF: model/gltf+json
 * - FBX: application/octet-stream
 * - PNG/JPG/JPEG: image/png, image/jpeg（纹理图片）
 *
 * 工作原理：
 * 1. 接收前端请求（带有模型URL作为查询参数）
 * 2. 智能判断：本地文件 vs 外部OSS URL
 * 3. 本地文件：直接从storage目录读取
 * 4. 外部URL：后端fetch并转发（服务端无CORS限制）
 * 5. 根据文件扩展名设置正确的Content-Type
 * 6. 将获取的模型文件流式传输给前端
 * 7. 设置CORS头允许跨域访问
 */

import { type NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export async function GET(request: NextRequest) {
  try {
    // 从查询参数获取模型URL
    const modelUrl = request.nextUrl.searchParams.get("url");

    // 验证URL参数
    if (!modelUrl) {
      return NextResponse.json(
        { error: "Missing model URL parameter" },
        { status: 400 },
      );
    }

    // 检查是否为本地文件路径
    if (modelUrl.startsWith('/generated/models/')) {
      return handleLocalModel(modelUrl);
    }

    // 检查是否为 localhost URL，转换为本地文件路径处理
    let actualModelUrl = modelUrl;
    try {
      const url = new URL(modelUrl);
      if (url.hostname === "localhost" && url.pathname.startsWith('/generated/models/')) {
        // 将 localhost URL 转换为本地路径处理
        actualModelUrl = url.pathname;
        return handleLocalModel(actualModelUrl);
      }
    } catch {
      // URL 解析失败，继续后续处理
    }

    // 验证URL是允许的外部域名（安全检查，防止代理被滥用）
    // 支持两种格式：
    // 1. 腾讯云混元 3D：xxx.tencentcos.cn
    // 2. 我们自己的 COS：xxx.myqcloud.com
    let isAllowed = false;
    try {
      const url = new URL(actualModelUrl);
      // 检查是否包含允许的域名
      isAllowed =
        url.hostname.includes(".tencentcos.cn") ||
        url.hostname.includes(".myqcloud.com");
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 },
      );
    }

    if (!isAllowed) {
      return NextResponse.json(
        {
          error:
            "URL not from allowed domain (must be .tencentcos.cn or .myqcloud.com)",
        },
        { status: 403 },
      );
    }

    // 从外部存储获取模型文件
    const response = await fetch(actualModelUrl);

    // 检查响应状态
    if (!response.ok) {
      console.error("Failed to fetch model from Tencent COS:", {
        status: response.status,
        statusText: response.statusText,
      });
      return NextResponse.json(
        { error: "Failed to fetch model file" },
        { status: response.status },
      );
    }

    // 获取文件数据
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 根据文件扩展名确定 Content-Type
    const extension = actualModelUrl.split(".").pop()?.toLowerCase() || "";
    let contentType = "application/octet-stream"; // 默认二进制流

    // 3D 模型格式
    if (extension === "glb") {
      contentType = "model/gltf-binary";
    } else if (extension === "gltf") {
      contentType = "model/gltf+json";
    } else if (extension === "obj") {
      // OBJ 文件调试：检查文件头
      const fileHeader = buffer.toString(
        "utf8",
        0,
        Math.min(100, buffer.length),
      );
      console.log("OBJ 文件头:", fileHeader);
      console.log("OBJ 文件大小:", buffer.length, "bytes");

      // 检查是否是有效的 OBJ 文件（应该包含 'v ' 或 'f ' 等标记）
      if (!fileHeader.includes("v ") && !fileHeader.includes("f ")) {
        console.warn("警告: OBJ 文件格式可能不正确");
      }

      contentType = "text/plain"; // OBJ 是文本格式
    } else if (extension === "mtl") {
      // MTL 材质文件（文本格式）
      contentType = "text/plain";
    } else if (extension === "fbx") {
      contentType = "application/octet-stream";
    }
    // 图片格式（纹理）
    else if (extension === "png") {
      contentType = "image/png";
    } else if (extension === "jpg" || extension === "jpeg") {
      contentType = "image/jpeg";
    } else if (extension === "gif") {
      contentType = "image/gif";
    } else if (extension === "webp") {
      contentType = "image/webp";
    }

    // 返回文件流，设置正确的Content-Type
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=31536000", // 缓存1年（模型文件不会变）
        "Access-Control-Allow-Origin": "*", // 允许跨域
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    console.error("Model proxy error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * 处理本地3D模型文件服务
 */
function handleLocalModel(modelUrl: string): NextResponse {
  try {
    // 映射URL到本地文件系统路径
    const relativePath = modelUrl.replace('/generated/models/', '');
    const storageRoot = path.join(process.cwd(), 'storage');
    const filePath = path.join(storageRoot, 'models', relativePath);

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "Model file not found" },
        { status: 404 }
      );
    }

    // 读取文件
    const buffer = fs.readFileSync(filePath);

    // 根据文件扩展名确定 Content-Type
    const extension = path.extname(filePath).toLowerCase().slice(1); // 去掉点号
    let contentType = "application/octet-stream"; // 默认二进制流

    // 3D 模型格式
    if (extension === "glb") {
      contentType = "model/gltf-binary";
    } else if (extension === "gltf") {
      contentType = "model/gltf+json";
    } else if (extension === "obj") {
      // OBJ 文件调试：检查文件头
      const fileHeader = buffer.toString("utf8", 0, Math.min(100, buffer.length));
      console.log("本地OBJ 文件头:", fileHeader);
      console.log("本地OBJ 文件大小:", buffer.length, "bytes");

      // 检查是否是有效的 OBJ 文件（应该包含 'v ' 或 'f ' 等标记）
      if (!fileHeader.includes("v ") && !fileHeader.includes("f ")) {
        console.warn("警告: OBJ 文件格式可能不正确");
      }

      contentType = "text/plain"; // OBJ 是文本格式
    } else if (extension === "mtl") {
      // MTL 材质文件（文本格式）
      contentType = "text/plain";
    } else if (extension === "fbx") {
      contentType = "application/octet-stream";
    }
    // 图片格式（纹理）
    else if (extension === "png") {
      contentType = "image/png";
    } else if (extension === "jpg" || extension === "jpeg") {
      contentType = "image/jpeg";
    } else if (extension === "gif") {
      contentType = "image/gif";
    } else if (extension === "webp") {
      contentType = "image/webp";
    }

    // 返回文件
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=31536000", // 缓存1年
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });

  } catch (error) {
    console.error("Local model file error:", error);
    return NextResponse.json(
      { error: "Failed to read local model file" },
      { status: 500 }
    );
  }
}

// 处理OPTIONS预检请求
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
