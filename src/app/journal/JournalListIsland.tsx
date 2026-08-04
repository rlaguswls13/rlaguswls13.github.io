"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TabGroup } from "@/components/ui/TabGroup";
import { JournalSectionHeader } from "@/components/ui/JournalSectionHeader";
import { EducationLog } from "@/components/ui/EducationLog";
import { Pagination } from "@/components/ui/Pagination";
import { TagList } from "@/components/ui/TagBadge";
import { CardThumbnail } from "@/components/ui/CardThumbnail";
import { CalendarIcon, SearchIcon } from "@/components/ui/Icons";
import { getDevlogHref } from "@/lib/devlog-slugs";
import { getDevlogThumbnail } from "@/lib/thumbnails";
import { journalListQuery } from "@/lib/list-query";
import type { DevlogEntry } from "@/types";

type JournalCategory = "personal" | "education";
type JournalTab = JournalCategory | "all";
type JournalDisplayEntry = DevlogEntry & { journalCategory: JournalCategory };

const tabs = [
  { key: "all", label: "전체" },
  { key: "personal", label: "개인일지" },
  { key: "education", label: "교육일지" },
];
type JournalListIslandProps = Readonly<{
  entries: readonly JournalDisplayEntry[];
  initialEntries: readonly JournalDisplayEntry[];
}>;

export function JournalListIsland({ entries, initialEntries }: JournalListIslandProps) {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<JournalTab>("all");
  const [activeSubcategory, setActiveSubcategory] = useState<string>("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasUrlState, setHasUrlState] = useState(false);
  const itemsPerPage = 6;

  const categoryEntries = useMemo<JournalDisplayEntry[]>(() => {
    if (activeCategory === "all") return [...entries];
    return entries.filter((entry) => entry.journalCategory === activeCategory);
  }, [activeCategory, entries]);

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
  const clampedPage = journalListQuery.clampPage(currentPage, personalEntries.length, itemsPerPage);
  const paginatedEntries = hasUrlState
    ? personalEntries.slice((clampedPage - 1) * itemsPerPage, clampedPage * itemsPerPage)
    : initialEntries;

  useEffect(() => {
    const applyLocation = () => {
      const queryState = journalListQuery.parse(new URLSearchParams(window.location.search));
      setActiveCategory(queryState.tab);
      setActiveSubcategory(queryState.sub);
      setSearchQuery(queryState.q);
      setIsSearchOpen(Boolean(queryState.q));
      setCurrentPage(queryState.page);
      setHasUrlState(true);
    };
    applyLocation();
    window.addEventListener("popstate", applyLocation);
    return () => window.removeEventListener("popstate", applyLocation);
  }, []);

  useEffect(() => {
    if (!hasUrlState) return;
    const state = journalListQuery.parse(new URLSearchParams({
      category: activeCategory,
      sub: activeSubcategory,
      q: searchQuery,
      page: String(clampedPage),
    }));
    if (window.location.search.slice(1) !== journalListQuery.serialize(state)) {
      router.replace(journalListQuery.href(state), { scroll: false });
    }
  }, [activeCategory, activeSubcategory, clampedPage, hasUrlState, router, searchQuery]);

  const changeCategory = (key: string) => {
    setActiveCategory(key as JournalTab);
    setActiveSubcategory("전체");
    setSearchQuery("");
    setIsSearchOpen(false);
    setCurrentPage(1);
  };

  return (
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
                          href={`${getDevlogHref(entry.journalCategory === "education" ? "education" : "blog", entry.id)}?journal=${entry.journalCategory}&page=${clampedPage}`}
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
                            <div className="item-title" style={{ marginTop: 0, marginBottom: "12px", wordBreak: "keep-all" }}>{entry.title}</div>
                            <TagList tags={entry.tags} />
                            <p className="devlog-description" style={{ flexGrow: 1 }}>{entry.description}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                    <Pagination
                      currentPage={clampedPage}
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
  );
}
