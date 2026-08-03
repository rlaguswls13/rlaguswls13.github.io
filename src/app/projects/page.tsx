"use client";

import React, { useState } from "react";
import projectsData from "@/data/indexes/projects.json";
import { TagList } from "@/components/ui/TagBadge";
import { formatPeriods, calculateTotalPeriod, sortByDateDesc } from "@/lib/utils";
import Link from "next/link";
import { CalendarIcon, SearchIcon } from "@/components/ui/Icons";
import type { Project } from "@/types";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { CardThumbnail } from "@/components/ui/CardThumbnail";
import { getProjectThumbnail } from "@/lib/thumbnails";
import { LoadingPlaceholder } from "@/components/ui/DeferredContent";
import { TabGroup } from "@/components/ui/TabGroup";

type ProjectTab = "all" | "enterprise" | "personal";

const projectTabs = [
  { key: "all", label: "전체" },
  { key: "enterprise", label: "참여 작업" },
  { key: "personal", label: "토이프로젝트" },
];

function ProjectsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialSearch = searchParams.get("q") || "";
  const initialPage = parseInt(searchParams.get("page") || "1", 10);
  const requestedTab = searchParams.get("tab") || "all";
  const initialTab = projectTabs.some((tab) => tab.key === requestedTab)
    ? requestedTab as ProjectTab
    : "all";

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [isSearchOpen, setIsSearchOpen] = useState(!!initialSearch);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [activeTab, setActiveTab] = useState<ProjectTab>(initialTab);
  const [activeSubcategory, setActiveSubcategory] = useState(searchParams.get("sub") || "전체");
  const itemsPerPage = 6; // 6 cards per page

  useEffect(() => {
    const currentQ = searchParams.get("q") || "";
    const currentPg = searchParams.get("page");
    const currentTab = searchParams.get("tab") || "all";
    const currentSubcategory = searchParams.get("sub") || "전체";

    if (currentQ !== searchQuery || currentPg !== String(currentPage) || currentTab !== activeTab || currentSubcategory !== activeSubcategory) {
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (currentPage > 1) params.set("page", String(currentPage));
      if (activeTab !== "all") params.set("tab", activeTab);
      if (activeSubcategory !== "전체") params.set("sub", activeSubcategory);

      const qParam = params.toString() ? `?${params.toString()}` : "";
      router.replace(`/projects${qParam}`, { scroll: false });
    }
  }, [searchQuery, currentPage, activeTab, activeSubcategory, router, searchParams]);

  const allProjects = sortByDateDesc(projectsData.projects as Project[]);

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
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
                  href={`/projects/${p.slug || p.id}?page=${currentPage}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}${activeTab !== "all" ? `&tab=${activeTab}` : ""}${activeSubcategory !== "전체" ? `&sub=${encodeURIComponent(activeSubcategory)}` : ""}`}
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
                    className={`pagination-btn ${currentPage === pageNum ? "active" : ""}`}
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

export default function ProjectsPage() {
  return (
    <Suspense fallback={<LoadingPlaceholder label="프로젝트 목록 불러오는 중" minHeight={360} />}>
      <ProjectsContent />
    </Suspense>
  );
}

