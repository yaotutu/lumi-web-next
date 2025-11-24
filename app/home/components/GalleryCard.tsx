"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { getCurrentUser } from "@/lib/auth-client";

export type GalleryCardProps = {
  modelId: string;
  image: string;
  title: string;
  author: string;
  likes: number;
  favorites: number;
  href: string;
  // 预设的交互状态（可选，用于批量加载优化）
  initialInteractionStatus?: {
    isLiked: boolean;
    isFavorited: boolean;
  };
};

export default function GalleryCard({
  modelId,
  image,
  title,
  author,
  likes,
  favorites,
  href,
  initialInteractionStatus,
}: GalleryCardProps) {
  const [user, setUser] = useState<any>(null);
  const [interactionStatus, setInteractionStatus] = useState({
    isLiked: initialInteractionStatus?.isLiked || false,
    isFavorited: initialInteractionStatus?.isFavorited || false,
  });
  const [currentLikes, setCurrentLikes] = useState(likes);
  const [currentFavorites, setCurrentFavorites] = useState(favorites);
  const [isLoading, setIsLoading] = useState(false);

  // 获取用户信息
  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      // 如果没有预设状态，单独获取交互状态
      if (currentUser && !initialInteractionStatus) {
        try {
          const response = await fetch(`/api/gallery/models/${modelId}/interactions`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data.isAuthenticated) {
              setInteractionStatus({
                isLiked: data.data.isLiked || false,
                isFavorited: data.data.isFavorited || false,
              });
            }
          }
        } catch (error) {
          console.error("Failed to fetch interaction status:", error);
        }
      }
    };

    fetchUser();
  }, [modelId, initialInteractionStatus]);

  // 处理交互操作
  const handleInteraction = async (type: "LIKE" | "FAVORITE") => {
    if (!user) {
      // 未登录用户，显示提示或跳转登录页
      alert("请先登录后再进行操作");
      return;
    }

    if (isLoading) return;

    setIsLoading(true);

    // 乐观更新 UI
    const isInteracted = type === "LIKE" ? interactionStatus.isLiked : interactionStatus.isFavorited;

    if (type === "LIKE") {
      setInteractionStatus(prev => ({ ...prev, isLiked: !prev.isLiked }));
      setCurrentLikes(prev => isInteracted ? prev - 1 : prev + 1);
    } else {
      setInteractionStatus(prev => ({ ...prev, isFavorited: !prev.isFavorited }));
      setCurrentFavorites(prev => isInteracted ? prev - 1 : prev + 1);
    }

    try {
      const response = await fetch(`/api/gallery/models/${modelId}/interactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type }),
      });

      if (!response.ok) {
        // 回滚乐观更新
        if (type === "LIKE") {
          setInteractionStatus(prev => ({ ...prev, isLiked }));
          setCurrentLikes(likes);
        } else {
          setInteractionStatus(prev => ({ ...prev, isFavorited }));
          setCurrentFavorites(favorites);
        }
        throw new Error("操作失败");
      }

      const data = await response.json();
      if (data.success) {
        // 使用服务器返回的最新数据
        setCurrentLikes(data.data.likeCount);
        setCurrentFavorites(data.data.favoriteCount);
        setInteractionStatus(prev => ({
          ...prev,
          isLiked: type === "LIKE" ? data.data.isInteracted : prev.isLiked,
          isFavorited: type === "FAVORITE" ? data.data.isInteracted : prev.isFavorited,
        }));
      }
    } catch (error) {
      console.error("Interaction failed:", error);
      // 回滚到初始状态
      if (type === "LIKE") {
        setInteractionStatus(prev => ({ ...prev, isLiked: initialInteractionStatus?.isLiked || false }));
        setCurrentLikes(likes);
      } else {
        setInteractionStatus(prev => ({ ...prev, isFavorited: initialInteractionStatus?.isFavorited || false }));
        setCurrentFavorites(favorites);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="gallery-card">
      <div className="gallery-card__media">
        <div className="gallery-card__icons">
          <span>📘</span>
          <span>⭐</span>
        </div>
        <a href={href} target="_blank" rel="noreferrer">
          <Image
            src={image}
            alt={title}
            fill
            unoptimized
            className="gallery-card__image"
            sizes="(min-width: 1280px) 20vw, (min-width: 768px) 28vw, 80vw"
          />
        </a>
        <div className="gallery-card__overlay" />
      </div>
      <div className="gallery-card__meta">
        <p className="gallery-card__title">{title}</p>
        <div className="gallery-card__footer">
          <span>{author}</span>
          <div className="gallery-card__interactions">
            {/* 点赞按钮 */}
            <button
              onClick={() => handleInteraction("LIKE")}
              disabled={isLoading}
              className={`gallery-card__interaction-btn ${
                interactionStatus.isLiked ? "gallery-card__interaction-btn--liked" : ""
              }`}
              title={user ? "点赞" : "请先登录"}
            >
              <svg
                aria-hidden="true"
                role="presentation"
                focusable="false"
                viewBox="0 0 20 20"
                fill={interactionStatus.isLiked ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
              </svg>
              <span>{currentLikes}</span>
            </button>

            {/* 收藏按钮 */}
            <button
              onClick={() => handleInteraction("FAVORITE")}
              disabled={isLoading}
              className={`gallery-card__interaction-btn ${
                interactionStatus.isFavorited ? "gallery-card__interaction-btn--favorited" : ""
              }`}
              title={user ? "收藏" : "请先登录"}
            >
              <svg
                aria-hidden="true"
                role="presentation"
                focusable="false"
                viewBox="0 0 20 20"
                fill={interactionStatus.isFavorited ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539 1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span>{currentFavorites}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 加载状态指示器 */}
      {isLoading && (
        <div className="gallery-card__loading">
          <div className="gallery-card__loading-spinner"></div>
        </div>
      )}
    </div>
  );
}
