/**
 * ParticleBackground - 轻量级粒子背景组件
 * 使用 CSS 动画实现,性能优秀
 */
"use client";

import { useEffect, useMemo, useState } from "react";

// 粒子配置
interface ParticleConfig {
  count: number; // 粒子数量
  maxSize: number; // 最大尺寸
  minSize: number; // 最小尺寸
  maxDuration: number; // 最长动画时长(秒)
  minDuration: number; // 最短动画时长(秒)
}

export default function ParticleBackground({
  count = 30,
  maxSize = 6,
  minSize = 2,
  maxDuration = 25,
  minDuration = 10,
}: Partial<ParticleConfig> = {}) {
  // 使用 state 而不是 useMemo,避免 SSR/客户端不一致
  const [particles, setParticles] = useState<Array<{
    id: number;
    size: number;
    x: number;
    y: number;
    duration: number;
    delay: number;
    opacity: number;
  }>>([]);

  // 只在客户端生成粒子数据
  useEffect(() => {
    const generatedParticles = Array.from({ length: count }, (_, i) => ({
      id: i,
      size: Math.random() * (maxSize - minSize) + minSize,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * (maxDuration - minDuration) + minDuration,
      delay: Math.random() * -20,
      opacity: Math.random() * 0.3 + 0.1,
    }));
    setParticles(generatedParticles);
  }, [count, maxSize, minSize, maxDuration, minDuration]);

  // 服务端渲染时返回空内容,避免 hydration 错误
  if (particles.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full bg-white"
          style={{
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            opacity: particle.opacity,
            animation: `float-particle ${particle.duration}s ease-in-out infinite`,
            animationDelay: `${particle.delay}s`,
          }}
        />
      ))}

      {/* 添加粒子浮动动画 */}
      <style jsx>{`
        @keyframes float-particle {
          0%,
          100% {
            transform: translateY(0px) translateX(0px);
          }
          25% {
            transform: translateY(-20px) translateX(10px);
          }
          50% {
            transform: translateY(-10px) translateX(-10px);
          }
          75% {
            transform: translateY(-30px) translateX(5px);
          }
        }
      `}</style>
    </div>
  );
}
