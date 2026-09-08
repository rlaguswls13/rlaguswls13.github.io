import { Children, isValidElement } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

function hostChildren<T extends "tbody" | "tr" | "td">(
  node: ReactNode,
  type: T,
): ComponentPropsWithoutRef<T> | null {
  if (!isValidElement<ComponentPropsWithoutRef<T>>(node) || node.type !== type) return null;
  return node.props;
}

export function NotionTable({ children }: { readonly children: ReactNode }) {
  const body = Children.toArray(children).find((child) => hostChildren(child, "tbody") !== null);
  const bodyProps = hostChildren(body, "tbody");
  const rows = Children.toArray(bodyProps?.children);
  const headerRowProps = hostChildren(rows[0], "tr");
  const headerCells = Children.toArray(headerRowProps?.children).map((cell, index) => {
    const cellProps = hostChildren(cell, "td");
    return cellProps === null ? cell : <th key={`column-${index}`} {...cellProps} scope="col" />;
  });

  return (
    <div className="w-full overflow-x-auto my-6 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] shadow-sm custom-scrollbar">
      <table className="w-full text-left border-collapse m-0 min-w-max [&_td]:px-5 [&_td]:py-3.5 [&_td]:border-b [&_td]:border-[var(--border-color)] [&_td]:text-sm [&_th]:px-5 [&_th]:py-3.5 [&_th]:border-b-2 [&_th]:border-[var(--border-color)] [&_th]:bg-[var(--bg-tertiary)]/80 [&_th]:text-sm [&_th]:font-semibold [&_th]:text-[var(--text-primary)] [&_tr:last-child_td]:border-b-0 [&_tr]:transition-colors [&_tr:hover]:bg-[var(--bg-tertiary)]/40">
        {headerCells.length > 0 ? <thead><tr>{headerCells}</tr></thead> : null}
        <tbody>{rows.slice(1)}</tbody>
      </table>
    </div>
  );
}
