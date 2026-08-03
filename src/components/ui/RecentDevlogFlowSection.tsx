"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import devlogData from "@/data/indexes/devlog.json";
import type { DevlogEntry, DevlogCategory } from "@/types";
import { TagList } from "@/components/ui/TagBadge";
import { BlogIcon, CalendarIcon, CloseIcon, CommentIcon } from "@/components/ui/Icons";

import { getDevlogHref } from "@/lib/devlog-slugs";

type FlowItem = {
  id: string;
  title: string;
  date: string;
  description: string;
  href: string;
  external?: boolean;
  fullDescription?: string;
  notionUrl?: string;
  isEducation?: boolean;
  keywords?: string[];
};

type FlowSection = {
  key: string;
  label: string;
  items: FlowItem[];
};

const DEVLOG_TAB_ORDER: { key: Exclude<DevlogCategory, "blog">; label: string }[] = [
  { key: "tech_study", label: "기술 학습 기록" },
  { key: "problem_solving", label: "문제 해결 기록" },
  { key: "competition_event", label: "대회/행사" },
];

const CARDS_PER_VIEW = 3;
const AUTO_FLOW_MS = 9000;

function parseFlexibleDate(date: string): number {
  if (!date) return 0;
  const dotPattern = /^(\d{4})\.(\d{2})\.(\d{2})$/;
  const match = date.match(dotPattern);
  if (match) {
    const y = Number(match[1]);
    const m = Number(match[2]) - 1;
    const d = Number(match[3]);
    return new Date(y, m, d).getTime();
  }
  const parsed = new Date(date).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  return dateStr.replace(/-/g, ".");
}

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  if (items.length === 0) return [[]];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

function normalizeDevlogSections(): FlowSection[] {
  const devlogMap = devlogData as Record<DevlogCategory, DevlogEntry[]>;
  const sections = DEVLOG_TAB_ORDER.map(({ key, label }) => {
    const sourceEntries = devlogMap[key] || [];
    const list = (sourceEntries as DevlogEntry[])
      .map((entry) => ({
        id: entry.id,
        title: entry.title,
        date: entry.date || "",
        description: entry.description || "",
        href: getDevlogHref(key, entry.id),
      }))
      .sort((a, b) => parseFlexibleDate(b.date) - parseFlexibleDate(a.date));

    return {
      key,
      label,
      items: list,
    };
  });

  return sections.filter((section) => section.items.length > 0);
}

export function RecentDevlogFlowSection() {
  const [trackPage, setTrackPage] = useState(1);
  const [isTrackJumping, setIsTrackJumping] = useState(false);
  const [isAutoFlow, setIsAutoFlow] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [selectedEducation, setSelectedEducation] = useState<FlowItem | null>(null);

  const sections = useMemo(() => normalizeDevlogSections(), []);
  const pages = useMemo(() => chunkArray(sections, CARDS_PER_VIEW), [sections]);
  const totalPages = pages.length;
  const displayPages = useMemo(() => {
    if (totalPages <= 1) return pages;
    return [pages[totalPages - 1], ...pages, pages[0]];
  }, [pages, totalPages]);

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

  if (sections.length === 0) return null;

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

  return (
    <section className="devlog-flow-section" aria-label="Devlog 흐름">
      <div className="devlog-flow-header">
        <div>
          <h2 className="devlog-flow-title">Devlog</h2>
        </div>
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
        className="devlog-flow-viewport"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleViewportClick}
      >
        <div
          className={`devlog-flow-track${isTrackJumping ? " no-transition" : ""}`}
          style={{ transform: `translateX(-${effectiveTrackPage * 100}%)` }}
          onTransitionEnd={handleTrackTransitionEnd}
        >
          {displayPages.map((pageSections, pageIndex) => (
            <div className="devlog-flow-page" key={`flow-page-${pageIndex}`}>
              <div className="devlog-flow-grid" role="list">
                {pageSections.map((section) => {
                  const [featured, ...rest] = section.items;

                  return (
                    <article className="devlog-flow-card" key={`${section.key}-${pageIndex}`} role="listitem">
                      <header className="devlog-flow-card-header">
                        <div className="devlog-card-label">{section.label}</div>
                        <span className="devlog-flow-count">{section.items.length}건</span>
                      </header>

                      <div className="devlog-flow-featured">
                        {featured.isEducation ? (
                          <button
                            type="button"
                            className="devlog-flow-link-btn"
                            onClick={() => setSelectedEducation(featured)}
                          >
                            {featured.title}
                          </button>
                        ) : featured.external ? (
                          <a href={featured.href} target="_blank" rel="noopener noreferrer">
                            {featured.title}
                          </a>
                        ) : (
                          <Link href={featured.href}>{featured.title}</Link>
                        )}
                        <p>{featured.description}</p>
                        <span>{featured.date}</span>
                      </div>

                      <div className="devlog-flow-list-wrap">
                        <strong>목록</strong>
                        <ul className="devlog-flow-list">
                          {rest.length === 0 ? (
                            <li className="empty">내용이 없습니다.</li>
                          ) : (
                            rest.map((item) => (
                              <li key={item.id}>
                                {item.isEducation ? (
                                  <button
                                    type="button"
                                    className="devlog-flow-link-btn"
                                    onClick={() => setSelectedEducation(item)}
                                  >
                                    {item.title}
                                  </button>
                                ) : item.external ? (
                                  <a href={item.href} target="_blank" rel="noopener noreferrer">
                                    {item.title}
                                  </a>
                                ) : (
                                  <Link href={item.href}>{item.title}</Link>
                                )}
                                {item.isEducation && item.description && (
                                  <p className="devlog-flow-list-summary">{item.description}</p>
                                )}
                                <span>{item.date}</span>
                              </li>
                            ))
                          )}
                        </ul>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="devlog-flow-footer">
        <div className="devlog-flow-pagination" aria-label="페이지 상태">
          {pages.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                if (totalPages <= 1) return;
                setIsTrackJumping(false);
                setTrackPage(Math.min(Math.max(index + 1, 1), totalPages));
              }}
              className={`devlog-flow-dot ${index === safeCurrentPage ? "active" : ""}`}
              aria-label={`${index + 1} 페이지 보기`}
            />
          ))}
        </div>
      </div>

      {selectedEducation && (
        <div
          className="education-modal-overlay"
          onClick={() => setSelectedEducation(null)}
          role="presentation"
        >
          <div className="education-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="education-modal-close"
              onClick={() => setSelectedEducation(null)}
              aria-label="모달 닫기"
            >
              <CloseIcon />
            </button>

            <div className="education-modal-header">
              <span className="education-round">{selectedEducation.title}</span>
              <span className="devlog-meta">
                <CalendarIcon /> {formatDate(selectedEducation.date)}
              </span>
            </div>

            <TagList tags={selectedEducation.keywords || []} />

            <div className="education-modal-section">
              <h4><CommentIcon /> 느낀점</h4>
              <p className="education-modal-impression">
                {selectedEducation.fullDescription || "내용이 아직 없습니다."}
              </p>
              {selectedEducation.id && (
                <Link
                  href={getDevlogHref("education", selectedEducation.id)}
                  className="education-blog-link"
                >
                  <BlogIcon /> 마크다운 상세 보기 ↗
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
