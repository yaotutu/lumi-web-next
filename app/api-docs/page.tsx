"use client";

/**
 * API 文档页面
 * 使用 Swagger UI 展示 OpenAPI 规范
 *
 * 访问路径: http://localhost:4000/api-docs
 */

import { useEffect } from "react";

export default function APIDocsPage() {
  useEffect(() => {
    // 动态加载 Swagger UI CSS 和 JS
    const loadSwaggerUI = async () => {
      // 1. 加载 CSS
      const linkElement = document.createElement("link");
      linkElement.rel = "stylesheet";
      linkElement.href =
        "https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css";
      document.head.appendChild(linkElement);

      // 2. 加载主 JS 包
      const bundleScript = document.createElement("script");
      bundleScript.src =
        "https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js";

      // 3. 加载独立预设包（必需）
      const standaloneScript = document.createElement("script");
      standaloneScript.src =
        "https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js";

      // 4. 等待两个脚本都加载完成后初始化
      let bundleLoaded = false;
      let standaloneLoaded = false;

      const initSwaggerUI = () => {
        if (bundleLoaded && standaloneLoaded) {
          // @ts-expect-error - SwaggerUIBundle 和 SwaggerUIStandalonePreset 由外部脚本提供
          if (window.SwaggerUIBundle && window.SwaggerUIStandalonePreset) {
            // @ts-expect-error
            window.SwaggerUIBundle({
              // 使用 /api/openapi 端点获取规范文件
              url: "/api/openapi",
              dom_id: "#swagger-ui",
              deepLinking: true,
              presets: [
                // @ts-expect-error
                window.SwaggerUIBundle.presets.apis,
                // @ts-expect-error
                window.SwaggerUIStandalonePreset,
              ],
              layout: "StandaloneLayout",
            });
          }
        }
      };

      bundleScript.onload = () => {
        bundleLoaded = true;
        initSwaggerUI();
      };

      standaloneScript.onload = () => {
        standaloneLoaded = true;
        initSwaggerUI();
      };

      document.body.appendChild(bundleScript);
      document.body.appendChild(standaloneScript);
    };

    loadSwaggerUI();
  }, []);

  return (
    <>
      {/* Swagger UI 容器 - 完全使用默认样式 */}
      <div id="swagger-ui" />
    </>
  );
}
