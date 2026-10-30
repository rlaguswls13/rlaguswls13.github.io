"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatMiniPeriod } from "@/lib/utils";

type ProjectCarouselItem = {
  id: string;
  readonly slug?: string;
  title: string;
  periods: string[];
  tags: string[];
  description: string;
};

type AboutProjectCarouselProps = {
  projects: ProjectCarouselItem[];
};

const CARDS_PER_VIEW = 3;
const AUTO_FLOW_MS = 9000;

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  if (items.length === 0) return [[]];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

export function AboutProjectCarousel({ projects }: AboutProjectCarouselProps) {
  const pages = useMemo(() => chunkArray(projects, CARDS_PER_VIEW), [projects]);
  const totalPages = pages.length;
  const displayPages = useMemo(() => {
    if (totalPages <= 1) return pages;
    return [pages[totalPages - 1], ...pages, pages[0]];
  }, [pages, totalPages]);

  const [trackPage, setTrackPage] = useState(1);
  const [isTrackJumping, setIsTrackJumping] = useState(false);
  const [isAutoFlow, setIsAutoFlow] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const goNext = useCallback(() => {
    if (totalPages <= 1) return;
    setIsTrackJumping(false);
    setTrackPage((prev) => Math.min(prev + 1, totalPages + 1));
  }, [totalPages]);

  const goPrev = useCallback(() => {
    if (totalPages <= 1) return;
    setIsTrackJumping(false);
    setTrackPage((prev) => Math.max(prev - 1, 0));
  }, [totalPages]);

  useEffect(() => {
    if (!isAutoFlow || isHovered || totalPages <= 1) return;
    const timer = setInterval(() => {
      goNext();
    }, AUTO_FLOW_MS);

    return () => clearInterval(timer);
  }, [goNext, isAutoFlow, isHovered, totalPages]);

  useEffect(() => {
    if (!isTrackJumping) return;
    const rafId = requestAnimationFrame(() => {
      setIsTrackJumping(false);
    });

    return () => cancelAnimationFrame(rafId);
  }, [isTrackJumping]);

  const effectiveTrackPage = totalPages <= 1 ? 0 : Math.min(Math.max(trackPage, 0), totalPages + 1);
  const safeCurrentPage =
    totalPages === 0 ? 0 : totalPages === 1 ? 0 : (effectiveTrackPage - 1 + totalPages) % totalPages;

  const handleTrackTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || e.propertyName !== "transform") return;
    if (totalPages <= 1) return;

    if (trackPage === 0) {
      setIsTrackJumping(true);
      setTrackPage(totalPages);
      return;
    }

    if (trackPage === totalPages + 1) {
      setIsTrackJumping(true);
      setTrackPage(1);
    }
  };

  const handleViewportClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest("a, button, input, textarea, select, label, [role='button']")) return;
    setIsAutoFlow((prev) => !prev);
  };

  if (projects.length === 0) return null;

  return (
    <>
      <div className="about-project-carousel-header">
        <div className="about-project-carousel-title">Project</div>
        <span className="about-project-carousel-count">{projects.length}건</span>
      </div>

      <button
        type="button"
        className="carousel-edge-btn left"
        onClick={goPrev}
        aria-label="이전"
        title="이전"
      >
        ⏮
      </button>

      <button
        type="button"
        className="carousel-edge-btn right"
        onClick={goNext}
        aria-label="다음"
        title="다음"
      >
        ⏭
      </button>

      <div
        className="about-project-carousel-viewport"
        aria-label="프로젝트 캐러셀"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleViewportClick}
      >
        <div
          className={`about-project-carousel-track${isTrackJumping ? " no-transition" : ""}`}
          style={{ transform: `translateX(-${effectiveTrackPage * 100}%)` }}
          onTransitionEnd={handleTrackTransitionEnd}
        >
          {displayPages.map((pageItems, pageIndex) => (
            <div key={`project-page-${pageIndex}`} className="about-project-carousel-page">
              <div className="about-project-page-grid">
                {pageItems.map((project) => (
                  <article key={`${project.id}-${pageIndex}`} className="about-project-slide">
                    <span className="about-project-period">{formatMiniPeriod(project.periods)}</span>
                    <h3 className="about-project-title">
                      <Link href={`/projects/${project.slug || project.id}`}>{project.title}</Link>
                    </h3>
                    <p className="about-project-description">{project.description}</p>
                    <div className="about-project-tags">
                      {project.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="about-project-tag">#{tag}</span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="about-project-carousel-footer">
        <div className="about-project-carousel-pagination" aria-label="프로젝트 페이지 상태">
          {pages.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                if (totalPages <= 1) return;
                setIsTrackJumping(false);
                setTrackPage(Math.min(Math.max(index + 1, 1), totalPages));
              }}
              className={`about-project-carousel-dot ${index === safeCurrentPage ? "active" : ""}`}
              aria-label={`${index + 1} 페이지 보기`}
            />
          ))}
        </div>
      </div>
    </>
  );
}
