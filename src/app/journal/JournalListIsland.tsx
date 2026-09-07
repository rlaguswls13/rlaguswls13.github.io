"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TabGroup } from "@/components/ui/TabGroup";
import { JournalLog } from "@/components/ui/JournalLog";
import { CloseIcon, SearchIcon } from "@/components/ui/Icons";
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
}>;

const tabTitle = (tab: JournalTab) =>
  tab === "all" ? "전체 일지" : tab === "education" ? "교육일지" : "개인일지";

export function JournalListIsland({ entries }: JournalListIslandProps) {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<JournalTab>("all");
  const [activeSubcategory, setActiveSubcategory] = useState<string>("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [draftSearchQuery, setDraftSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasUrlState, setHasUrlState] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
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

  const visibleEntries = useMemo(() => {
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

  const clampedPage = journalListQuery.clampPage(currentPage, visibleEntries.length, itemsPerPage);

  useEffect(() => {
    const applyLocation = () => {
      const queryState = journalListQuery.parse(new URLSearchParams(window.location.search));
      setActiveCategory(queryState.tab);
      setActiveSubcategory(queryState.sub);
      setSearchQuery(queryState.q);
      setDraftSearchQuery(queryState.q);
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
    setDraftSearchQuery("");
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
                  aria-pressed={activeSubcategory === subcategory}
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
                <form onSubmit={(event) => {
                  event.preventDefault();
                  setSearchQuery(draftSearchQuery.trim());
                  setCurrentPage(1);
                }}>
                  <SearchIcon />
                  <input
                    ref={searchInputRef}
                    type="search"
                    aria-label="검색"
                    placeholder="검색어 입력..."
                    value={draftSearchQuery}
                    onChange={(event) => {
                      setDraftSearchQuery(event.target.value);
                    }}
                    autoFocus
                  />
                  {draftSearchQuery && (
                    <button
                      type="button"
                      className="search-clear"
                      aria-label="검색 지우기"
                      onClick={() => {
                        searchInputRef.current?.focus();
                        setDraftSearchQuery("");
                        setSearchQuery("");
                        setCurrentPage(1);
                      }}
                    >
                      <CloseIcon />
                    </button>
                  )}
                </form>
              )}
            </div>
          </aside>

          <main className="devlog-main">
            <JournalLog
              entries={visibleEntries}
              title={tabTitle(activeCategory)}
              searchQuery={searchQuery}
              itemsPerPage={itemsPerPage}
              currentPage={clampedPage}
              onPageChange={setCurrentPage}
            />
          </main>
        </div>
    </div>
  );
}
