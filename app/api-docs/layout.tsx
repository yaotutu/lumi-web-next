/**
 * API 文档页面独立布局
 * 覆盖全局深色样式，使用 Swagger UI 默认的浅色主题
 */

export default function APIDocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* 覆盖全局深色样式 */}
      <style>{`
        html, body {
          color-scheme: light !important;
          background: white !important;
        }
      `}</style>
      {children}
    </>
  );
}
