import { Children, isValidElement } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

const TABLE_CLASS =
  "w-full text-left border-collapse m-0 min-w-max " +
  "[&_td]:px-5 [&_td]:py-3.5 [&_td]:border-b [&_td]:border-[var(--border-color)] [&_td]:text-sm " +
  "[&_th]:px-5 [&_th]:py-3.5 [&_th]:border-b-2 [&_th]:border-[var(--border-color)] [&_th]:bg-[var(--bg-tertiary)]/80 [&_th]:text-sm [&_th]:font-semibold [&_th]:text-[var(--text-primary)] " +
  "[&_tbody_tr:last-child_td]:border-b-0 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-[var(--bg-tertiary)]/40";

const WRAPPER_CLASS =
  "w-full overflow-x-auto my-6 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] shadow-sm custom-scrollbar";

function hostChildren<T extends "thead" | "tbody" | "tr" | "td">(
  node: ReactNode,
  type: T,
): ComponentPropsWithoutRef<T> | null {
  if (!isValidElement<ComponentPropsWithoutRef<T>>(node) || node.type !== type) return null;
  return node.props;
}

export function NotionTable({ children }: { readonly children: ReactNode }) {
  const kids = Children.toArray(children);

  // Legacy tables (normalized from raw HTML in Notion) already carry a real
  // <thead>. Render them untouched — every child, in order — so the header row,
  // caption, and colgroup all survive.
  if (kids.some((child) => hostChildren(child, "thead") !== null)) {
    return (
      <div className={WRAPPER_CLASS}>
        <table className={TABLE_CLASS}>{kids}</table>
      </div>
    );
  }

  // Notion-generated tables arrive as <tbody> only: promote the first row to a
  // semantic <thead> so screen readers announce column headers.
  const bodyIndex = kids.findIndex((child) => hostChildren(child, "tbody") !== null);
  const bodyProps = hostChildren(kids[bodyIndex], "tbody");
  const rows = Children.toArray(bodyProps?.children);
  const headerRowProps = hostChildren(rows[0], "tr");
  const headerCells = Children.toArray(headerRowProps?.children).map((cell, index) => {
    const cellProps = hostChildren(cell, "td");
    return cellProps === null ? cell : <th key={`column-${index}`} {...cellProps} scope="col" />;
  });
  const otherChildren = kids.filter((_, index) => index !== bodyIndex);

  return (
    <div className={WRAPPER_CLASS}>
      <table className={TABLE_CLASS}>
        {otherChildren}
        {headerCells.length > 0 ? <thead><tr>{headerCells}</tr></thead> : null}
        <tbody>{rows.slice(1)}</tbody>
      </table>
    </div>
  );
}
