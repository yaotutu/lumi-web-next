"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api-client";
import { getErrorMessage, isSuccess } from "@/lib/utils/api-helpers";
import { useUser } from "@/stores/auth-store";

export type GalleryCardProps = {
  modelId: string;
  image: string;
  title: string;
  author: string;
  likes: number;
  favorites: number;
  onClick: (modelId: string) => void;
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
  onClick,
  initialInteractionStatus,
}: GalleryCardProps) {
  const handleClick = () => {
    onClick(modelId);
  };
  const user = useUser();
  const [interactionStatus, setInteractionStatus] = useState({
    isLiked: initialInteractionStatus?.isLiked || false,
    isFavorited: initialInteractionStatus?.isFavorited || false,
  });
  const [currentLikes, setCurrentLikes] = useState(likes);
  const [currentFavorites, setCurrentFavorites] = useState(favorites);
  const [isLoading, setIsLoading] = useState(false);

  // 如果没有预设状态，单独获取交互状态
  useEffect(() => {
    if (user && !initialInteractionStatus) {
      (async () => {
        try {
          const response = await apiGet(
            `/api/gallery/models/${modelId}/interactions`,
          );

          if (response.ok) {
            const data = await response.json();
            // JSend 格式判断
            if (isSuccess(data)) {
              const interactionInfo = data.data as {
                isAuthenticated: boolean;
                isLiked?: boolean;
                isFavorited?: boolean;
              };
              if (interactionInfo.isAuthenticated) {
                setInteractionStatus({
                  isLiked: interactionInfo.isLiked || false,
                  isFavorited: interactionInfo.isFavorited || false,
                });
              }
            }
          }
        } catch (error) {
          console.error("Failed to fetch interaction status:", error);
        }
      })();
    }
  }, [user, modelId, initialInteractionStatus]);

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
    const isInteracted =
      type === "LIKE"
        ? interactionStatus.isLiked
        : interactionStatus.isFavorited;

    if (type === "LIKE") {
      setInteractionStatus((prev) => ({ ...prev, isLiked: !prev.isLiked }));
      setCurrentLikes((prev) => (isInteracted ? prev - 1 : prev + 1));
    } else {
      setInteractionStatus((prev) => ({
        ...prev,
        isFavorited: !prev.isFavorited,
      }));
      setCurrentFavorites((prev) => (isInteracted ? prev - 1 : prev + 1));
    }

    try {
      const response = await apiPost(
        `/api/gallery/models/${modelId}/interactions`,
        { type },
      );

      if (!response.ok) {
        throw new Error("操作失败");
      }

      const data = await response.json();
      // JSend 格式判断
      if (isSuccess(data)) {
        // 使用服务器返回的权威数据（确保前后端同步）
        const interactionResult = data.data as {
          isInteracted: boolean;
          likeCount: number;
          favoriteCount: number;
        };
        setCurrentLikes(interactionResult.likeCount);
        setCurrentFavorites(interactionResult.favoriteCount);
        setInteractionStatus((prev) => ({
          ...prev,
          isLiked:
            type === "LIKE" ? interactionResult.isInteracted : prev.isLiked,
          isFavorited:
            type === "FAVORITE"
              ? interactionResult.isInteracted
              : prev.isFavorited,
        }));
      } else {
        throw new Error(getErrorMessage(data));
      }
    } catch (error) {
      console.error("Interaction failed:", error);
      // 回滚到初始状态
      if (type === "LIKE") {
        setInteractionStatus((prev) => ({ ...prev, isLiked: isInteracted }));
        setCurrentLikes(likes);
      } else {
        setInteractionStatus((prev) => ({
          ...prev,
          isFavorited: isInteracted,
        }));
        setCurrentFavorites(favorites);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className="gallery-card cursor-pointer text-left"
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="gallery-card__media">
        <Image
          src={image}
          alt={title}
          fill
          unoptimized
          className="gallery-card__image"
          sizes="(min-width: 1280px) 20vw, (min-width: 768px) 28vw, 80vw"
        />
        <div className="gallery-card__overlay" />
      </div>
      <div className="gallery-card__meta">
        <p className="gallery-card__title">{title}</p>
        <div className="gallery-card__footer">
          <span>{author}</span>
          <div
            className="gallery-card__interactions"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 点赞按钮 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleInteraction("LIKE");
              }}
              disabled={isLoading}
              className={`gallery-card__interaction-btn ${
                interactionStatus.isLiked
                  ? "gallery-card__interaction-btn--liked"
                  : ""
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
              onClick={(e) => {
                e.stopPropagation();
                handleInteraction("FAVORITE");
              }}
              disabled={isLoading}
              className={`gallery-card__interaction-btn ${
                interactionStatus.isFavorited
                  ? "gallery-card__interaction-btn--favorited"
                  : ""
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
