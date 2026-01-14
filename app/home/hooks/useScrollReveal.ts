/**
 * useScrollReveal - 滚动显示动画 Hook
 * 当元素进入视口时触发动画
 */
import { useEffect, useRef, useState } from "react";

interface ScrollRevealOptions {
  threshold?: number; // 触发阈值 (0-1)
  rootMargin?: string; // 提前触发距离
  once?: boolean; // 是否只触发一次
}

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>({
  threshold = 0.1,
  rootMargin = "0px",
  once = true,
}: ScrollRevealOptions = {}) {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // 创建 Intersection Observer
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // 如果只触发一次,立即取消观察
          if (once) {
            observer.unobserve(element);
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, once]);

  return { ref, isVisible };
}
