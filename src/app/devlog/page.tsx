"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import devlogData from "@/data/indexes/devlog.json";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingPlaceholder } from "@/components/ui/DeferredContent";
import { TabGroup } from "@/components/ui/TabGroup";
import { DevlogSectionHeader } from "@/components/ui/DevlogSectionHeader";
import { Pagination } from "@/components/ui/Pagination";
import { TagList } from "@/components/ui/TagBadge";
import { CardThumbnail } from "@/components/ui/CardThumbnail";
import { CalendarIcon, SearchIcon } from "@/components/ui/Icons";
import { getDevlogHref } from "@/lib/devlog-slugs";
import { getDevlogThumbnail } from "@/lib/thumbnails";
import { sortByDateDesc } from "@/lib/utils";
import type { DevlogCategory, DevlogEntry } from "@/types";

type CoreCategory = Exclude<DevlogCategory, "blog">;
type TabKey = CoreCategory | "all";
type DisplayEntry = DevlogEntry & { category: CoreCategory };

const categories: CoreCategory[] = ["tech_study", "problem_solving", "competition_event"];
const labels: Record<CoreCategory, string> = {
  tech_study: "기술 학습",
  problem_solving: "문제 해결",
  competition_event: "대회·행사",
};
const tabs = [
  { key: "all", label: "전체 글" },
  ...categories.map((key) => ({ key, label: labels[key] })),
];
const indexedEntries = devlogData as Record<CoreCategory, DevlogEntry[]>;

function DevlogContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestedTab = searchParams.get("tab") || "all";
  const initialTab = tabs.some((tab) => tab.key === requestedTab) ? requestedTab as TabKey : "all";
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [activePkg, setActivePkg] = useState(searchParams.get("sub") || "전체");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [isSearchOpen, setIsSearchOpen] = useState(Boolean(searchParams.get("q")));
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get("page")) || 1);
  const itemsPerPage = 6;

  useEffect(() => {
    if (["journal", "blog", "education_log"].includes(requestedTab)) {
      const category = requestedTab === "education_log"
        ? "education"
        : searchParams.get("journal") === "education" ? "education" : "personal";
      router.replace(`/journal?category=${category}`, { scroll: false });
      return;
    }
    const query = new URLSearchParams({
      tab: activeTab,
      sub: activePkg,
      page: String(currentPage),
    });
    if (searchQuery) query.set("q", searchQuery);
    const next = `/devlog?${query.toString()}`;
    if (`/devlog?${searchParams.toString()}` !== next) router.replace(next, { scroll: false });
  }, [activePkg, activeTab, currentPage, requestedTab, router, searchParams, searchQuery]);

  const allEntries = useMemo<DisplayEntry[]>(() => {
    const selected = activeTab === "all" ? categories : [activeTab];
    return sortByDateDesc(selected.flatMap((category) =>
      (indexedEntries[category] || []).map((entry) => ({ ...entry, category })),
    ));
  }, [activeTab]);

  const packages = useMemo(
    () => ["전체", ...new Set(allEntries.map((entry) => entry.subcategory || entry.package || "전체").filter((value) => value !== "전체"))],
    [allEntries],
  );

  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return allEntries.filter((entry) => {
      const packageMatches = activePkg === "전체"
        || (entry.subcategory || entry.package || "전체") === activePkg;
      const searchMatches = !query
        || entry.title.toLowerCase().includes(query)
        || entry.description.toLowerCase().includes(query)
        || entry.tags.some((tag) => tag.toLowerCase().includes(query));
      return packageMatches && searchMatches;
    });
  }, [activePkg, allEntries, searchQuery]);

  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
  const paginatedEntries = filteredEntries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const changeTab = (key: string) => {
    setActiveTab(key as TabKey);
    setActivePkg("전체");
    setSearchQuery("");
    setIsSearchOpen(false);
    setCurrentPage(1);
  };

  return (
    <>
      <PageHeader
        eyebrow="ENGINEERING LOG"
        title="기술 학습과 문제 해결 기록"
        description="학습한 기술과 실무 문제를 분석하고 해결한 과정을 기록합니다."
        marker="03"
      />

      <div className="devlog-container">
        <TabGroup tabs={tabs} activeTab={activeTab} onTabChange={changeTab} />

        <div className="devlog-layout" style={{ marginTop: "30px" }}>
          <aside className="devlog-sidebar">
            <nav aria-label="패키지 필터">
              {packages.map((pkg) => (
                <button
                  key={pkg}
                  type="button"
                  className={`pkg-pill ${activePkg === pkg ? "active" : ""}`}
                  onClick={() => {
                    setActivePkg(pkg);
                    setCurrentPage(1);
                  }}
                >
                    {pkg === "전체" ? "전체 보기" : pkg.toUpperCase()}
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
            <DevlogSectionHeader
              title={activeTab === "all" ? "전체 글" : labels[activeTab]}
              count={filteredEntries.length}
              context={activePkg === "전체" ? undefined : activePkg.toUpperCase()}
            />

            {paginatedEntries.length === 0 ? (
              <div className="devlog-empty-state">조건에 맞는 Devlog가 없습니다.</div>
            ) : (
              <>
                <div className="devlog-grid">
                  {paginatedEntries.map((entry, index) => (
                    <Link
                      key={entry.id}
                      href={`${getDevlogHref(entry.category, entry.id)}?sub=${activePkg}&page=${currentPage}`}
                      className="devlog-card-link"
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <div className="devlog-card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                        <CardThumbnail
                          src={getDevlogThumbnail(entry.category, entry.id)}
                          alt=""
                          className="devlog-card-thumbnail"
                          priority={index === 0}
                        />
                        <div className="devlog-card-topline">
                          <span className="devlog-card-category">{labels[entry.category]}</span>
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
          </main>
        </div>
      </div>
    </>
  );
}

export default function DevlogPage() {
  return (
    <Suspense fallback={<LoadingPlaceholder label="Devlog 목록 불러오는 중" minHeight={360} />}>
      <DevlogContent />
    </Suspense>
  );
}
