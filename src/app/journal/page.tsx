"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import journalData from "@/data/indexes/journal.json";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingPlaceholder } from "@/components/ui/DeferredContent";
import { TabGroup } from "@/components/ui/TabGroup";
import { JournalSectionHeader } from "@/components/ui/JournalSectionHeader";
import { EducationLog } from "@/components/ui/EducationLog";
import { Pagination } from "@/components/ui/Pagination";
import { TagList } from "@/components/ui/TagBadge";
import { CalendarIcon, SearchIcon } from "@/components/ui/Icons";
import { getDevlogHref } from "@/lib/devlog-slugs";
import { sortByDateDesc } from "@/lib/utils";
import type { DevlogEntry } from "@/types";

type JournalCategory = "personal" | "education";

const tabs = [
  { key: "personal", label: "개인일지" },
  { key: "education", label: "교육일지" },
];
const entries = journalData as Record<JournalCategory, DevlogEntry[]>;

function JournalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestedCategory = searchParams.get("category") || searchParams.get("journal") || "personal";
  const initialCategory = tabs.some((tab) => tab.key === requestedCategory)
    ? requestedCategory as JournalCategory
    : "personal";
  const [activeCategory, setActiveCategory] = useState<JournalCategory>(initialCategory);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [isSearchOpen, setIsSearchOpen] = useState(Boolean(searchParams.get("q")));
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get("page")) || 1);
  const itemsPerPage = 6;

  useEffect(() => {
    const query = new URLSearchParams({
      category: activeCategory,
      page: String(currentPage),
    });
    if (searchQuery) query.set("q", searchQuery);
    const next = `/journal?${query.toString()}`;
    if (`/journal?${searchParams.toString()}` !== next) router.replace(next, { scroll: false });
  }, [activeCategory, currentPage, router, searchParams, searchQuery]);

  const personalEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return sortByDateDesc(entries.personal).filter((entry) =>
      !query
      || entry.title.toLowerCase().includes(query)
      || entry.description.toLowerCase().includes(query)
      || entry.tags.some((tag) => tag.toLowerCase().includes(query)),
    );
  }, [searchQuery]);

  const totalPages = Math.ceil(personalEntries.length / itemsPerPage);
  const paginatedEntries = personalEntries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const changeCategory = (key: string) => {
    setActiveCategory(key as JournalCategory);
    setSearchQuery("");
    setIsSearchOpen(false);
    setCurrentPage(1);
  };

  return (
    <>
      <PageHeader
        eyebrow="PERSONAL JOURNAL"
        title="개인일지와 교육일지"
        description="일상의 생각과 교육 과정에서 배운 내용을 기록합니다."
        marker="04"
      />

      <div className="devlog-container">
        <TabGroup tabs={tabs} activeTab={activeCategory} onTabChange={changeCategory} />

        <div className="devlog-layout" style={{ marginTop: "30px" }}>
          <aside className="devlog-sidebar">
            <nav aria-label="Journal 카테고리">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`pkg-pill ${activeCategory === tab.key ? "active" : ""}`}
                  onClick={() => changeCategory(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="sidebar-search">
              {!isSearchOpen ? (
                <button type="button" className="pkg-pill" onClick={() => setIsSearchOpen(true)}>
                  <SearchIcon style={{ position: "relative", left: 0, transform: "none" }} /> 검색
                </button>
              ) : (
                <input
                  type="text"
                  placeholder="검색어 입력..."
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setCurrentPage(1);
                  }}
                  autoFocus
                />
              )}
            </div>
          </aside>

          <main className="devlog-main">
            {activeCategory === "education" ? (
              <EducationLog entries={entries.education} searchQuery={searchQuery} />
            ) : (
              <>
                <JournalSectionHeader
                  categoryKey="personal"
                  title="개인일지"
                  count={personalEntries.length}
                />

                {paginatedEntries.length === 0 ? (
                  <div className="devlog-empty-state">조건에 맞는 개인일지가 없습니다.</div>
                ) : (
                  <>
                    <div className="devlog-grid">
                      {paginatedEntries.map((entry) => (
                        <Link
                          key={entry.id}
                          href={`${getDevlogHref("blog", entry.id)}?journal=personal&page=${currentPage}`}
                          className="devlog-card-link"
                          style={{ textDecoration: "none", color: "inherit" }}
                        >
                          <div className="devlog-card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                            <div className="devlog-card-topline">
                              <span className="devlog-card-category">개인일지</span>
                              <span className="devlog-meta"><CalendarIcon /> {entry.date}</span>
                            </div>
                            <div className="item-title" style={{ marginTop: 0, marginBottom: "12px" }}>{entry.title}</div>
                            <TagList tags={entry.tags} />
                            <p className="devlog-description" style={{ flexGrow: 1 }}>{entry.description}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                      maxPageButtons={5}
                    />
                  </>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </>
  );
}

export default function JournalPage() {
  return (
    <Suspense fallback={<LoadingPlaceholder label="Journal 목록 불러오는 중" minHeight={360} />}>
      <JournalContent />
    </Suspense>
  );
}
