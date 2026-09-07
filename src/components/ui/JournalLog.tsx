"use client";

import { useMemo, useState } from "react";
import { CalendarIcon, BlogIcon, CommentIcon, CloseIcon } from "@/components/ui/Icons";
import { TagList } from "@/components/ui/TagBadge";
import { Pagination } from "@/components/ui/Pagination";
import { sortByDateDesc } from "@/lib/utils";
import Link from "next/link";
import { JournalSectionHeader } from "@/components/ui/JournalSectionHeader";
import { CardThumbnail } from "@/components/ui/CardThumbnail";
import { getDevlogThumbnail } from "@/lib/thumbnails";
import { getDevlogHref } from "@/lib/devlog-slugs";
import type { DevlogEntry } from "@/types";
import { Dialog } from "@/components/ui/Dialog";

type JournalCategory = "personal" | "education";
type JournalLogSource = DevlogEntry & { journalCategory: JournalCategory };

interface JournalPreviewEntry {
  id: string;
  title: string;
  round: string;
  date: string;
  keywords: string[];
  impression: string;
  blogTitle: string;
  notionUrl: string;
  slug: string;
  journalCategory: JournalCategory;
}

interface JournalLogProps {
  entries: JournalLogSource[];
  title: string;
  itemsPerPage?: number;
  maxPageButtons?: number;
  searchQuery?: string;
  currentPage: number;
  onPageChange: (page: number) => void;
}

// Personal journal posts are full articles, education logs are Notion notes.
// Both live under the devlog routing tree, keyed by their own category slug.
const contentCategory = (journalCategory: JournalCategory) =>
  journalCategory === "education" ? "education" : "blog";

export function JournalLog({
  entries: sourceEntries,
  title,
  itemsPerPage = 9,
  maxPageButtons = 5,
  searchQuery = "",
  currentPage,
  onPageChange,
}: JournalLogProps) {
  const [selectedEntry, setSelectedEntry] = useState<JournalPreviewEntry | null>(null);

  const entries = useMemo<JournalPreviewEntry[]>(() => sortByDateDesc(sourceEntries.map((entry) => ({
    id: entry.id,
    title: entry.title,
    round: entry.round || (entry.journalCategory === "education" ? "교육일지" : "개인일지"),
    date: entry.date,
    keywords: entry.tags,
    impression: entry.impression || entry.description,
    blogTitle: entry.blogTitle || entry.title,
    notionUrl: entry.notionUrl || "",
    slug: entry.slug || "",
    journalCategory: entry.journalCategory,
  }))), [sourceEntries]);

  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((entry) =>
      entry.title.toLowerCase().includes(query)
      || entry.blogTitle.toLowerCase().includes(query)
      || entry.round.toLowerCase().includes(query)
      || entry.impression.toLowerCase().includes(query)
      || entry.keywords.some((keyword) => keyword.toLowerCase().includes(query)),
    );
  }, [entries, searchQuery]);

  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEntries = filteredEntries.slice(indexOfFirstItem, indexOfLastItem);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    return dateStr.replace(/-/g, ".");
  };

  const previewLabel = (entry: JournalPreviewEntry) =>
    entry.journalCategory === "education" ? "느낀점" : "요약";

  return (
    <>
      <JournalSectionHeader title={title} count={filteredEntries.length} />

      <div className="devlog-grid">
        {currentEntries.map((entry, index) => (
          <article
            key={entry.id}
            className="devlog-card education-card"
          >
            <button
              type="button"
              className="education-preview-trigger"
              aria-label={`${entry.blogTitle} 미리보기`}
              onClick={() => setSelectedEntry(entry)}
            />
            <div className="education-card-content">
              <CardThumbnail src={getDevlogThumbnail(contentCategory(entry.journalCategory), entry.id)} alt="" className="devlog-card-thumbnail" priority={index === 0} />
              <div className="devlog-card-topline">
                <span className="devlog-card-category">{entry.round}</span>
                <span className="devlog-meta">
                  <CalendarIcon /> {formatDate(entry.date)}
                </span>
              </div>

              {entry.blogTitle && (
                <div className="item-title">
                  {entry.blogTitle}
                </div>
              )}

              <TagList tags={entry.keywords} />

              <p className="devlog-description">
                {entry.impression || "내용 없음"}
              </p>
            </div>

            {entry.slug && (
              <Link
                href={`${getDevlogHref(contentCategory(entry.journalCategory), entry.id)}?journal=${entry.journalCategory}`}
                className="education-blog-link"
              >
                <BlogIcon /> 상세내용 ↗
              </Link>
            )}
          </article>
        ))}
      </div>

      {currentEntries.length === 0 && (
        <div className="devlog-empty-state">검색 조건에 맞는 일지가 없습니다.</div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        maxPageButtons={maxPageButtons}
      />


      {/* Modal */}
      {selectedEntry && (
        <Dialog
          isOpen
          labelledBy={`journal-dialog-title-${selectedEntry.id}`}
          onClose={() => setSelectedEntry(null)}
          overlayClassName="education-modal-overlay"
          dialogClassName="education-modal"
        >
            <button
              type="button"
              className="education-modal-close"
              onClick={() => setSelectedEntry(null)}
              aria-label="닫기"
              data-dialog-close
            >
              <CloseIcon />
            </button>

            <div className="education-modal-header">
              <span className="education-round">{selectedEntry.round}</span>
              <span className="devlog-meta">
                <CalendarIcon /> {formatDate(selectedEntry.date)}
              </span>
            </div>

            {selectedEntry.blogTitle && (
              <h2 id={`journal-dialog-title-${selectedEntry.id}`} className="section-title" style={{ margin: "12px 0 16px" }}>
                {selectedEntry.blogTitle}
              </h2>
            )}

            <TagList tags={selectedEntry.keywords} />

            <div className="education-modal-section">
              <h4><CommentIcon /> {previewLabel(selectedEntry)}</h4>
              <p className="education-modal-impression">
                {selectedEntry.impression || "내용이 아직 없습니다."}
              </p>
            </div>

            {selectedEntry.slug && (
              <Link
                href={`${getDevlogHref(contentCategory(selectedEntry.journalCategory), selectedEntry.id)}?journal=${selectedEntry.journalCategory}`}
                className="education-blog-link"
              >
                <BlogIcon /> 상세내용 ↗
              </Link>
            )}
        </Dialog>
      )}
    </>
  );
}
