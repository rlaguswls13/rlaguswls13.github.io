"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarIcon, SearchIcon } from "@/components/ui/Icons";
import type { TagSearchCategory, TagSearchEntry } from "@/lib/tag-search";

type TagFilter = "all" | TagSearchCategory;

const filters: readonly { key: TagFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "project", label: "프로젝트" },
  { key: "devlog", label: "Devlog" },
  { key: "journal", label: "일지" },
];

function renderTitle(title: string) {
  const parts = title.split("Andrej Karpathy");
  return parts.map((part, index) => (
    <Fragment key={`${part}-${index}`}>
      {part}
      {index < parts.length - 1 && <span className="tag-search-nowrap">Andrej Karpathy</span>}
    </Fragment>
  ));
}

type TagSearchIslandProps = Readonly<{
  entries: readonly TagSearchEntry[];
}>;

function getInitialFilter(value: string | null): TagFilter {
  return filters.some((filter) => filter.key === value) ? value as TagFilter : "all";
}

export function TagSearchIsland({ entries }: TagSearchIslandProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get("q")?.trim() || "");
  const [draftQuery, setDraftQuery] = useState(() => searchParams.get("q")?.trim() || "");
  const [selectedTag, setSelectedTag] = useState(() => searchParams.get("tag")?.trim() || "");
  const [activeFilter, setActiveFilter] = useState<TagFilter>(() => getInitialFilter(searchParams.get("category")));

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.toLocaleLowerCase();
    const normalizedTag = selectedTag.toLocaleLowerCase();

    return entries.filter((entry) => {
      const matchesCategory = activeFilter === "all" || entry.category === activeFilter;
      const matchesTag = !normalizedTag || entry.tags.some((tag) => tag.toLocaleLowerCase() === normalizedTag);
      const matchesQuery = !normalizedQuery || [entry.title, entry.description, ...entry.tags]
        .some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
      return matchesCategory && matchesTag && matchesQuery;
    });
  }, [activeFilter, entries, query, selectedTag]);

  const updateUrl = (next: Readonly<{ query?: string; tag?: string; category?: TagFilter }>) => {
    const params = new URLSearchParams();
    const nextQuery = next.query ?? query;
    const nextTag = next.tag ?? selectedTag;
    const nextCategory = next.category ?? activeFilter;
    if (nextQuery) params.set("q", nextQuery);
    if (nextTag) params.set("tag", nextTag);
    if (nextCategory !== "all") params.set("category", nextCategory);
    const search = params.toString();
    router.replace(search ? `/tags?${search}` : "/tags", { scroll: false });
  };

  const applyQuery = (value: string) => {
    const nextQuery = value.trim();
    setQuery(nextQuery);
    setDraftQuery(nextQuery);
    updateUrl({ query: nextQuery });
  };

  const applyTag = (tag: string) => {
    const nextTag = selectedTag === tag ? "" : tag;
    setSelectedTag(nextTag);
    updateUrl({ tag: nextTag });
  };

  const applyCategory = (category: TagFilter) => {
    setActiveFilter(category);
    updateUrl({ category });
  };

  return (
    <section className="tag-search-container" aria-label="전체 콘텐츠 태그 검색">
      <div className="tag-search-toolbar">
        <form
          className="tag-search-form"
          onSubmit={(event) => {
            event.preventDefault();
            applyQuery(draftQuery);
          }}
        >
          <SearchIcon />
          <input
            type="search"
            aria-label="태그 또는 글 검색"
            placeholder="태그나 글 제목을 검색하세요"
            value={draftQuery}
            onChange={(event) => setDraftQuery(event.target.value)}
          />
          <button type="submit">검색</button>
        </form>
        <div className="tag-search-filters" role="group" aria-label="콘텐츠 범위">
          {filters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              className={activeFilter === filter.key ? "active" : ""}
              aria-pressed={activeFilter === filter.key}
              onClick={() => applyCategory(filter.key)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {selectedTag && (
        <div className="tag-search-selected">
          <span>선택한 태그</span>
          <button type="button" onClick={() => applyTag(selectedTag)}>{selectedTag} ×</button>
        </div>
      )}

      <div className="tag-search-results-heading">
        <div>
          <span>TAG INDEX</span>
          <h2>{selectedTag ? `#${selectedTag}` : query ? `“${query}” 검색 결과` : "모든 콘텐츠의 태그"}</h2>
        </div>
        <strong>{filteredEntries.length}건</strong>
      </div>

      <div className="tag-search-grid">
        {filteredEntries.map((entry) => (
          <article className="tag-search-card" key={`${entry.category}-${entry.id}`}>
            <div className="tag-search-card-topline">
              <span className="devlog-card-category">{entry.categoryLabel}</span>
              <span>{entry.subcategoryLabel}</span>
            </div>
            <Link href={entry.href} className="tag-search-card-link">
              <h3>{renderTitle(entry.title)}</h3>
              <p>{entry.description}</p>
            </Link>
            <div className="tag-search-card-date"><CalendarIcon /> {entry.date || "날짜 없음"}</div>
            <div className="tag-search-card-actions">
              {entry.tags.map((tag) => (
                <button type="button" key={tag} onClick={() => applyTag(tag)} aria-label={`${tag} 태그로 검색`}>
                  #{tag}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>

      {filteredEntries.length === 0 && (
        <div className="devlog-empty-state">검색 조건에 맞는 콘텐츠가 없습니다.</div>
      )}
    </section>
  );
}
