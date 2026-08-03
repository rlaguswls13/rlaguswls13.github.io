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
import { CardThumbnail } from "@/components/ui/CardThumbnail";
import { CalendarIcon, SearchIcon } from "@/components/ui/Icons";
import { getDevlogHref } from "@/lib/devlog-slugs";
import { sortByDateDesc } from "@/lib/utils";
import { getDevlogThumbnail } from "@/lib/thumbnails";
import type { DevlogEntry } from "@/types";

type JournalCategory = "personal" | "education";
type JournalTab = JournalCategory | "all";
type JournalDisplayEntry = DevlogEntry & { journalCategory: JournalCategory };

const tabs = [
  { key: "all", label: "전체" },
  { key: "personal", label: "개인일지" },
  { key: "education", label: "교육일지" },
];
const entries = journalData as Record<JournalCategory, DevlogEntry[]>;

function JournalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestedCategory = searchParams.get("category") || searchParams.get("journal") || "all";
  const initialCategory = tabs.some((tab) => tab.key === requestedCategory)
    ? requestedCategory as JournalTab
    : "all";
  const [activeCategory, setActiveCategory] = useState<JournalTab>(initialCategory);
  const [activeSubcategory, setActiveSubcategory] = useState(searchParams.get("sub") || "전체");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [isSearchOpen, setIsSearchOpen] = useState(Boolean(searchParams.get("q")));
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get("page")) || 1);
  const itemsPerPage = 6;

  useEffect(() => {
    const query = new URLSearchParams({
      category: activeCategory,
      sub: activeSubcategory,
      page: String(currentPage),
    });
    if (searchQuery) query.set("q", searchQuery);
    const next = `/journal?${query.toString()}`;
    if (`/journal?${searchParams.toString()}` !== next) router.replace(next, { scroll: false });
  }, [activeCategory, activeSubcategory, currentPage, router, searchParams, searchQuery]);

  const categoryEntries = useMemo<JournalDisplayEntry[]>(() => {
    const categories: JournalCategory[] = activeCategory === "all"
      ? ["personal", "education"]
      : [activeCategory];
    return sortByDateDesc(categories.flatMap((category) =>
      entries[category].map((entry) => ({ ...entry, journalCategory: category })),
    ));
  }, [activeCategory]);

  const subcategories = useMemo(
    () => ["전체", ...new Set(categoryEntries
      .map((entry) => entry.subcategory || "전체")
      .filter((value) => value !== "전체"))],
    [categoryEntries],
  );

  const personalEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return categoryEntries.filter((entry) => {
      const subcategoryMatches = activeSubcategory === "전체"
        || (entry.subcategory || "전체") === activeSubcategory;
      const searchMatches = !query
        || entry.title.toLowerCase().includes(query)
        || entry.description.toLowerCase().includes(query)
        || entry.tags.some((tag) => tag.toLowerCase().includes(query));
      return subcategoryMatches && searchMatches;
    });
  }, [activeSubcategory, categoryEntries, searchQuery]);

  const totalPages = Math.ceil(personalEntries.length / itemsPerPage);
  const paginatedEntries = personalEntries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const changeCategory = (key: string) => {
    setActiveCategory(key as JournalTab);
    setActiveSubcategory("전체");
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
              {subcategories.map((subcategory) => (
                <button
                  key={subcategory}
                  type="button"
                  className={`pkg-pill ${activeSubcategory === subcategory ? "active" : ""}`}
                  onClick={() => {
                    setActiveSubcategory(subcategory);
                    setCurrentPage(1);
                  }}
                >
                  {subcategory === "전체" ? "전체 보기" : subcategory}
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
              <EducationLog entries={personalEntries} searchQuery={searchQuery} itemsPerPage={6} />
            ) : (
              <>
                <JournalSectionHeader
                  title={activeCategory === "all" ? "전체 일지" : "개인일지"}
                  count={personalEntries.length}
                />

                {paginatedEntries.length === 0 ? (
                  <div className="devlog-empty-state">조건에 맞는 일지가 없습니다.</div>
                ) : (
                  <>
                    <div className="devlog-grid">
                      {paginatedEntries.map((entry) => (
                        <Link
                          key={entry.id}
                          href={`${getDevlogHref(entry.journalCategory === "education" ? "education" : "blog", entry.id)}?journal=${entry.journalCategory}&page=${currentPage}`}
                          className="devlog-card-link"
                          style={{ textDecoration: "none", color: "inherit" }}
                        >
                          <div className="devlog-card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                            <CardThumbnail
                              src={getDevlogThumbnail(entry.journalCategory === "education" ? "education" : "blog", entry.id)}
                              alt=""
                              className="devlog-card-thumbnail"
                            />
                            <div className="devlog-card-topline">
                              <span className="devlog-card-category">
                                {entry.journalCategory === "education" ? "교육일지" : "개인일지"}
                              </span>
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
