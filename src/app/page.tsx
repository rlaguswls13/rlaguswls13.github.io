"use client";

import { useState } from "react";
import Link from "next/link";
import devlogData from "@/data/indexes/devlog.json";
import journalData from "@/data/indexes/journal.json";
import engagementData from "@/data/indexes/engagement.json";
import type { DevlogCategory, DevlogEntry } from "@/types";
import { CalendarIcon, CloseIcon, CommentIcon } from "@/components/ui/Icons";
import { TagList } from "@/components/ui/TagBadge";
import { parseDate, sortByDateDesc } from "@/lib/utils";
import { CardThumbnail } from "@/components/ui/CardThumbnail";
import { getDevlogThumbnail } from "@/lib/thumbnails";
import { getDevlogHref } from "@/lib/devlog-slugs";
import { devlogListQuery, journalListQuery } from "@/lib/list-query";

type HomeContentCategory = DevlogCategory | "education";
type HomeFilter = Exclude<DevlogCategory, "blog"> | "journal";
type HomeEntry = DevlogEntry & { category: HomeContentCategory };
type Engagement = { comments: number };

const contentCategoryInfo: Record<HomeContentCategory, { label: string; description: string }> = {
  tech_study: { label: "기술 학습", description: "새롭게 익힌 기술과 핵심 개념" },
  problem_solving: { label: "문제 해결", description: "실무 장애 분석과 개선 과정" },
  competition_event: { label: "대회·행사", description: "도전과 경험에서 얻은 인사이트" },
  blog: { label: "개인일지", description: "개발과 커리어에 대한 생각과 기록" },
  education: { label: "교육일지", description: "Notion에 기록한 교육과 학습 내용" },
};

const filters: HomeFilter[] = ["tech_study", "problem_solving", "competition_event", "journal"];
const filterInfo: Record<HomeFilter, { label: string; description: string }> = {
  tech_study: contentCategoryInfo.tech_study,
  problem_solving: contentCategoryInfo.problem_solving,
  competition_event: contentCategoryInfo.competition_event,
  journal: { label: "일지", description: "Notion에 기록한 교육과 개인 기록" },
};
const devlogCategories: Exclude<DevlogCategory, "blog">[] = [
  "tech_study",
  "problem_solving",
  "competition_event",
];
const fixedDevlogEntries: HomeEntry[] = devlogCategories.flatMap((category) =>
  ((devlogData[category] || []) as DevlogEntry[]).map((entry) => ({ ...entry, category })),
);
const blogEntries: HomeEntry[] = (journalData.personal as DevlogEntry[])
  .map((entry) => ({ ...entry, category: "blog" }));
const devlogEntries: HomeEntry[] = [...fixedDevlogEntries, ...blogEntries];
const educationEntries: HomeEntry[] = (journalData.education as DevlogEntry[])
  .map((entry) => ({ ...entry, category: "education" }));
const allEntries: HomeEntry[] = [...devlogEntries, ...educationEntries];
const sortedHomeEntries = sortByDateDesc(allEntries);

const tagCounts = allEntries.flatMap((entry) => entry.tags).reduce<Record<string, number>>((counts, tag) => {
  counts[tag] = (counts[tag] || 0) + 1;
  return counts;
}, {});
const SIDEBAR_TAG_LIMIT = 12;
const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
const sidebarTags = sortedTags.slice(0, SIDEBAR_TAG_LIMIT);
const engagementPosts = engagementData.posts as Record<string, Engagement>;

function getEngagement(entry: HomeEntry): Engagement {
  return engagementPosts[getDevlogHref(entry.category, entry.id)] || { comments: 0 };
}

function compareByEngagement(left: HomeEntry, right: HomeEntry) {
  const leftEngagement = getEngagement(left);
  const rightEngagement = getEngagement(right);
  const leftDate = parseDate(left.date)?.getTime() || 0;
  const rightDate = parseDate(right.date)?.getTime() || 0;

  return rightEngagement.comments - leftEngagement.comments
    || rightDate - leftDate;
}

const popularEntries = [...sortedHomeEntries].sort(compareByEngagement);

function getCategoryListHref(category: HomeFilter) {
  return category === "journal"
    ? journalListQuery.href({ tab: "education" })
    : devlogListQuery.href({ tab: category });
}

export default function TechBlogHome() {
  const [activeCategory, setActiveCategory] = useState<"all" | HomeFilter>("all");
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const visibleEntries = sortedHomeEntries
    .filter((entry) => activeCategory === "all"
      || (activeCategory === "journal"
        ? entry.category === "blog" || entry.category === "education"
        : entry.category === activeCategory))
    .slice(0, 3);

  const selectCategory = (category: "all" | HomeFilter, focusRecent = false) => {
    setActiveCategory(category);
    if (focusRecent) {
      requestAnimationFrame(() => {
        document.getElementById("recent-posts")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  const categoryListHref = activeCategory === "all"
    ? devlogListQuery.href({})
    : activeCategory === "journal"
      ? journalListQuery.href({ tab: "education" })
      : devlogListQuery.href({ tab: activeCategory });

  const getFilterCount = (filter: HomeFilter) => filter === "journal"
    ? educationEntries.length + blogEntries.length
    : ((devlogData[filter] || []) as DevlogEntry[]).length;

  return (
    <main className="tech-home">
      <section className="tech-hero">
        <div className="tech-hero-copy">
          <span className="tech-hero-kicker">ENGINEERING NOTES · {sortedHomeEntries.length} ARTICLES</span>
          <h1>개발 지식과 경험을<br />기록합니다</h1>
          <p>Java, Spring Boot, 아키텍처와 DevOps까지.<br />실무에서 배운 문제 해결 과정과 기술적 인사이트를 공유합니다.</p>
          <div className="tech-hero-actions">
            <Link href="/devlog" className="tech-primary-button">전체 글 보기 <span>→</span></Link>
            <Link href="/about" className="tech-secondary-button">작성자 소개</Link>
          </div>
        </div>
        <div className="tech-hero-visual" aria-hidden="true">
          <div className="tech-orbit tech-orbit-one" />
          <div className="tech-orbit tech-orbit-two" />
          <div className="tech-code-layer tech-code-layer-back"><span>DATA</span></div>
          <div className="tech-code-layer tech-code-layer-mid"><span>API</span></div>
          <div className="tech-code-layer tech-code-layer-front"><strong>&lt;/&gt;</strong></div>
          <div className="tech-mini-code"><i /><i /><i /><b>spring.boot.run()</b></div>
        </div>
      </section>

      <section className="tech-category-bar" aria-label="글 카테고리">
        <button type="button" className={activeCategory === "all" ? "active" : ""} onClick={() => selectCategory("all")}>
          전체
        </button>
        {filters.map((category) => (
          <button
            key={category}
            type="button"
            className={activeCategory === category ? "active" : ""}
            onClick={() => selectCategory(category)}
          >
            {filterInfo[category].label}
          </button>
        ))}
      </section>

      <div className="tech-content-layout">
        <section className="tech-posts-section" id="recent-posts">
          <div className="tech-section-heading tech-recent-heading">
            <div>
              <span>RECENT POSTS</span>
              <h2>{activeCategory === "all" ? "최근 등록된 기록" : `${filterInfo[activeCategory].label} 최근 기록`}</h2>
            </div>
            <Link href={categoryListHref}>모든 글 보기 →</Link>
          </div>

          <div className="tech-featured-grid">
            {visibleEntries.map((entry, index) => {
              const engagement = getEngagement(entry);
              return (
                <Link key={`${entry.category}-${entry.id}`} href={getDevlogHref(entry.category, entry.id)} className="tech-post-card">
                  {entry.category !== "blog" && (
                    <div className={`tech-post-cover cover-${index + 1}`}>
                      <CardThumbnail src={getDevlogThumbnail(entry.category, entry.id)} alt="" className="tech-post-cover-image" priority={index < 3} />
                      <span>{entry.package || contentCategoryInfo[entry.category].label}</span>
                    </div>
                  )}
                  <div className="tech-post-body">
                    <span className="tech-post-category">{contentCategoryInfo[entry.category].label}</span>
                    <h3>{entry.title}</h3>
                    <p>{entry.description}</p>
                    <TagList tags={entry.tags.slice(0, 3)} />
                    <div className="tech-post-meta">
                      <span><CalendarIcon /> {entry.date}</span>
                      <span className="tech-engagement-meta">
                        <span title="댓글 수"><CommentIcon style={{ width: 13, height: 13, marginRight: 0 }} /> {engagement.comments}</span>
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {visibleEntries.length === 0 && <div className="tech-empty-state">이 카테고리에는 아직 기록이 없습니다.</div>}

          <div className="tech-category-cards">
            {filters.map((category) => (
              <Link
                key={category}
                href={getCategoryListHref(category)}
                className={`tech-category-card${activeCategory === category ? " active" : ""}`}
              >
                <span>{String(getFilterCount(category)).padStart(2, "0")}</span>
                <div><strong>{filterInfo[category].label}</strong><p>{filterInfo[category].description}</p></div>
                <b>→</b>
              </Link>
            ))}
          </div>
        </section>

        <aside className="tech-home-sidebar">
          <section className="tech-sidebar-card">
            <h2>인기 태그</h2>
            <div className="tech-tag-cloud">
              {sidebarTags.map(([tag, count]) => (
                <Link key={tag} href={devlogListQuery.href({ q: tag })}>
                  {tag}<small>{count}</small>
                </Link>
              ))}
              {sortedTags.length > SIDEBAR_TAG_LIMIT && (
                <button type="button" className="tech-tag-more-button" onClick={() => setIsTagModalOpen(true)} aria-label="모든 인기 태그 보기">
                  …
                </button>
              )}
            </div>
          </section>

          <section className="tech-sidebar-card">
            <h2>인기 콘텐츠</h2>
            <div className="tech-update-list">
              {popularEntries.slice(0, 5).map((entry, index) => {
                const engagement = getEngagement(entry);
                return (
                  <Link key={`${entry.category}-${entry.id}`} href={getDevlogHref(entry.category, entry.id)}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <strong>{entry.title}</strong>
                      <time>댓글 {engagement.comments}</time>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </aside>
      </div>

      {isTagModalOpen && (
        <div className="education-modal-overlay" onClick={() => setIsTagModalOpen(false)}>
          <section className="education-modal tech-tag-modal" role="dialog" aria-modal="true" aria-labelledby="tag-modal-title" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="education-modal-close" onClick={() => setIsTagModalOpen(false)} aria-label="태그 팝업 닫기">
              <CloseIcon />
            </button>
            <span className="page-heading-eyebrow">ALL TAGS</span>
            <h2 id="tag-modal-title">전체 인기 태그</h2>
            <p>태그를 선택하면 관련 기록을 바로 확인할 수 있습니다.</p>
            <div className="tech-tag-cloud tech-tag-modal-cloud">
              {sortedTags.map(([tag, count]) => (
                <Link key={tag} href={devlogListQuery.href({ q: tag })} onClick={() => setIsTagModalOpen(false)}>
                  {tag}<small>{count}</small>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
