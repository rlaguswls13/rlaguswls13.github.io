"use client";

import React from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  maxPageButtons?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  maxPageButtons = 5,
}: PaginationProps) {
  // Always show at least 1 page even if totalPages is 0 or 1
  const displayPages = totalPages > 0 ? totalPages : 1;

  const currentGroup = Math.floor((currentPage - 1) / maxPageButtons);
  const startPage = currentGroup * maxPageButtons + 1;
  const endPage = Math.min(startPage + maxPageButtons - 1, displayPages);

  const pageNumbers = [];
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <nav className="pagination-container" aria-label="페이지 탐색">
      <button
        type="button"
        onClick={() => {
          if (currentPage > 1) onPageChange(currentPage - 1);
        }}
        aria-disabled={currentPage === 1}
        className="pagination-btn arrow"
        aria-label="Previous page"
      >
        &lt;
      </button>

      {pageNumbers.map((num) => (
        <button
          key={num}
          type="button"
          onClick={() => onPageChange(num)}
          className={`pagination-btn ${currentPage === num ? "active" : ""}`}
          aria-label={currentPage === num ? `Page ${num}, current page` : `Page ${num}`}
          aria-current={currentPage === num ? "page" : undefined}
        >
          {num}
        </button>
      ))}

      <button
        type="button"
        onClick={() => {
          if (currentPage < displayPages) onPageChange(currentPage + 1);
        }}
        aria-disabled={currentPage === displayPages}
        className="pagination-btn arrow"
        aria-label="Next page"
      >
        &gt;
      </button>
    </nav>
  );
}
