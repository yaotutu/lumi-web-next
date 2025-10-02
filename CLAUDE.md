# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个使用 App Router 的 Next.js 15 项目，技术栈包括 React 19、TypeScript 和 Tailwind CSS v4。

## 技术栈

- **Next.js 15.5.4** - 使用 App Router 和 Turbopack
- **React 19.1.0** 和 React DOM 19.1.0
- **TypeScript 5** - 启用严格模式
- **Tailwind CSS 4** - 使用 PostCSS
- **Biome 2.2.0** - 代码检查和格式化工具（替代 ESLint/Prettier）

## 开发命令

```bash
# 启动开发服务器（使用 Turbopack）
npm run dev

# 构建生产版本（使用 Turbopack）
npm run build

# 启动生产服务器
npm start

# 使用 Biome 检查代码
npm run lint

# 使用 Biome 格式化代码
npm run format
```

## 项目结构

- **app/** - Next.js App Router 页面和布局
  - `layout.tsx` - 根布局，包含元数据和字体配置
  - `page.tsx` - 首页
  - `globals.css` - 全局样式，包含 Tailwind 指令
- **@/** - 路径别名，指向项目根目录

## 代码规范

### 代码检查与格式化
- 使用 **Biome** 替代 ESLint/Prettier
- 2 空格缩进
- 自动整理 imports
- 启用 Next.js 和 React 推荐规则
- 提交前运行 `npm run format`

### TypeScript 配置
- 启用严格模式
- 路径别名：`@/*` 映射到项目根目录
- 编译目标：ES2017
- 模块解析：bundler

## 关键配置

### Next.js
- 使用 TypeScript 配置文件（`next.config.ts`）
- 开发和构建均启用 Turbopack
- App Router 架构

### Tailwind CSS
- 版本 4（最新的基于 PostCSS 的架构）
- 配置文件：`postcss.config.mjs`
- 全局样式：`app/globals.css`

## 开发注意事项

- 开发服务器运行在 http://localhost:3000
- 通过 Turbopack 启用热重载
- 使用 `next/font` 优化字体，采用 Geist 字体系列
