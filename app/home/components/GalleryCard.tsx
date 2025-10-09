import Image from "next/image";

export type GalleryCardProps = {
  image: string;
  title: string;
  author: string;
  likes: number;
  href: string;
};

export default function GalleryCard({
  image,
  title,
  author,
  likes,
  href,
}: GalleryCardProps) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="gallery-card">
      <div className="gallery-card__media">
        <div className="gallery-card__icons">
          <span>📘</span>
          <span>⭐</span>
        </div>
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
          <span className="gallery-card__likes">
            <svg
              aria-hidden="true"
              role="presentation"
              focusable="false"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
            </svg>
            {likes}
          </span>
        </div>
      </div>
    </a>
  );
}
