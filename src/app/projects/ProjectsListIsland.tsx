"use client";

import React, { useState } from "react";
import { TagList } from "@/components/ui/TagBadge";
import { formatPeriods, calculateTotalPeriod } from "@/lib/utils";
import Link from "next/link";
import { CalendarIcon, SearchIcon } from "@/components/ui/Icons";
import type { Project } from "@/types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { CardThumbnail } from "@/components/ui/CardThumbnail";
import { getProjectThumbnail } from "@/lib/thumbnails";
import { TabGroup } from "@/components/ui/TabGroup";
import { projectListQuery } from "@/lib/list-query";

type ProjectTab = "all" | "enterprise" | "personal";

const projectTabs = [
  { key: "all", label: "전체" },
  { key: "enterprise", label: "참여 작업" },
  { key: "personal", label: "토이프로젝트" },
];

type ProjectsListIslandProps = Readonly<{
  projects: readonly Project[];
  initialProjects: readonly Project[];
}>;

export function ProjectsListIsland({ projects, initialProjects }: ProjectsListIslandProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<ProjectTab>("all");
  const [activeSubcategory, setActiveSubcategory] = useState<string>("전체");
  const [hasUrlState, setHasUrlState] = useState(false);
  const itemsPerPage = 6; // 6 cards per page

  const allProjects = projects;

  const categoryProjects = useMemo(() => activeTab === "all"
    ? allProjects
    : allProjects.filter((project) =>
      (project.category || project.type || "enterprise") === activeTab
    ), [activeTab, allProjects]);

  const subcategories = useMemo(
    () => ["전체", ...new Set(categoryProjects
      .map((project) => project.subcategory || "전체")
      .filter((value) => value !== "전체"))],
    [categoryProjects],
  );

  // Filter projects
  const filteredProjects = useMemo(() => {
    let result = categoryProjects;

    if (activeSubcategory !== "전체") {
      result = result.filter((project) =>
        (project.subcategory || "전체") === activeSubcategory,
      );
    }

    // 2. Filter by Search Query
    if (searchQuery.trim()) {
      const lowerQ = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.title.toLowerCase().includes(lowerQ) ||
        p.description.toLowerCase().includes(lowerQ) ||
        p.tags?.some(t => t.toLowerCase().includes(lowerQ))
      );
    }
    return result;
  }, [activeSubcategory, categoryProjects, searchQuery]);

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const clampedPage = projectListQuery.clampPage(currentPage, filteredProjects.length, itemsPerPage);
  const paginatedProjects = hasUrlState
    ? filteredProjects.slice((clampedPage - 1) * itemsPerPage, clampedPage * itemsPerPage)
    : initialProjects;

  useEffect(() => {
    const applyLocation = () => {
      const queryState = projectListQuery.parse(new URLSearchParams(window.location.search));
      setSearchQuery(queryState.q);
      setIsSearchOpen(Boolean(queryState.q));
      setCurrentPage(queryState.page);
      setActiveTab(queryState.tab);
      setActiveSubcategory(queryState.sub);
      setHasUrlState(true);
    };
    applyLocation();
    window.addEventListener("popstate", applyLocation);
    return () => window.removeEventListener("popstate", applyLocation);
  }, []);

  useEffect(() => {
    if (!hasUrlState) return;
    const state = projectListQuery.parse(new URLSearchParams({
      tab: activeTab,
      sub: activeSubcategory,
      q: searchQuery,
      page: String(clampedPage),
    }));
    if (window.location.search.slice(1) !== projectListQuery.serialize(state)) {
      router.replace(projectListQuery.href(state), { scroll: false });
    }
  }, [searchQuery, clampedPage, activeTab, activeSubcategory, hasUrlState, router]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as ProjectTab);
    setActiveSubcategory("전체");
    setSearchQuery("");
    setIsSearchOpen(false);
    setCurrentPage(1);
  };

  return (
    <>
      <PageHeader
        eyebrow="SELECTED WORK"
        title="작업과 해결 과정"
        description={activeTab === "enterprise"
          ? "참여한 주요 엔터프라이즈 작업과 담당 역할을 소개합니다."
          : activeTab === "personal"
            ? "직접 기획하고 구현한 토이프로젝트를 소개합니다."
            : "참여 작업과 직접 구현한 토이프로젝트를 함께 소개합니다."}
        marker="02"
      />
      <div className="devlog-container">
        <TabGroup tabs={projectTabs} activeTab={activeTab} onTabChange={handleTabChange} />

        <div className="devlog-layout" style={{ marginTop: "30px" }}>
          <aside className="devlog-sidebar">
            <nav aria-label="프로젝트 하위 카테고리">
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
            <div className="sidebar-search projects-search">
              {!isSearchOpen ? (
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(true)}
                  className="pkg-pill"
                >
                  <SearchIcon style={{ position: 'relative', left: '0', transform: 'none' }} /> 검색
                </button>
              ) : (
                <div style={{ position: "relative" }}>
                  <span
                    onClick={() => setIsSearchOpen(false)}
                    style={{ cursor: "pointer", position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", zIndex: 10, display: "flex" }}
                  >
                    <SearchIcon style={{ position: "relative", left: "0", transform: "none" }} />
                  </span>
                  <input
                    type="text"
                    placeholder="검색어 입력..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    autoFocus
                  />
                </div>
              )}
            </div>
          </aside>

          <main className="devlog-main">
            <div className="projects-grid">
              {paginatedProjects.map((p, index) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.slug || p.id}?page=${clampedPage}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}${activeTab !== "all" ? `&tab=${activeTab}` : ""}${activeSubcategory !== "전체" ? `&sub=${encodeURIComponent(activeSubcategory)}` : ""}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div className="project-card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                    <CardThumbnail src={getProjectThumbnail(p.id)} alt="" className="project-card-thumbnail" priority={index === 0} />
                    <div className="item-title">{p.title}</div>
                    <p className="project-period">
                      <CalendarIcon /> {formatPeriods(p.periods)} {calculateTotalPeriod(p.periods)}
                    </p>
                    <TagList tags={p.tags} />
                    <p style={{ color: "var(--text-secondary)", marginTop: 12, flexGrow: 1 }}>
                      {p.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages >= 1 && (
              <div className="pagination-container">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`pagination-btn ${clampedPage === pageNum ? "active" : ""}`}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}

