/**
 * useParallax - 滚动视差效果 Hook
 * 用于创建平滑的视差滚动效果
 */
import { useEffect, useState } from "react";

export function useParallax(speed = 0.5) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      // 使用 requestAnimationFrame 优化性能
      requestAnimationFrame(() => {
        setOffset(window.pageYOffset * speed);
      });
    };

    // 添加滚动监听
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [speed]);

  return offset;
}
