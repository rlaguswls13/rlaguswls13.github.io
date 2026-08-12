"use client";

import { Children, isValidElement, useState, type ReactElement, type ReactNode } from "react";

interface ProjectTabProps {
  readonly title: string;
  readonly children: ReactNode;
}

interface ProjectTabsProps {
  readonly children: ReactNode;
}

type ProjectTabEntry = {
  readonly key: string;
  readonly title: string;
  readonly content: ReactNode;
};

function isProjectTabElement(child: ReactNode): child is ReactElement<ProjectTabProps> {
  return isValidElement<ProjectTabProps>(child) && typeof child.props.title === "string";
}

function isTagElement(
  child: ReactNode,
  tagName: string,
): child is ReactElement<{ readonly children?: ReactNode }> {
  return isValidElement<{ readonly children?: ReactNode }>(child) && child.type === tagName;
}

export function ProjectTab({ children }: ProjectTabProps) {
  return <>{children}</>;
}

export function ProjectTabs({ children }: ProjectTabsProps) {
  const childNodes = Children.toArray(children);
  const tabs = childNodes.flatMap((child, index): ProjectTabEntry[] => {
    if (!isProjectTabElement(child)) return [];
    return [{ key: `project-tab-${index}`, title: child.props.title, content: child.props.children }];
  });
  const tocHeadingIndex = childNodes.findIndex(
    (child, index) => isTagElement(child, "h2") && isTagElement(childNodes[index + 1], "ul"),
  );
  const tocHeading = tocHeadingIndex >= 0 ? childNodes[tocHeadingIndex] : null;
  const tocList = tocHeadingIndex >= 0 ? childNodes[tocHeadingIndex + 1] : null;
  const projectToc = isTagElement(tocHeading, "h2") && isTagElement(tocList, "ul") ? (
    <details className="article-toc" open>
      <summary>{tocHeading.props.children}</summary>
      {tocList}
    </details>
  ) : null;
  const nonTabContent = childNodes.filter((child, index) => (
    !isProjectTabElement(child) && index !== tocHeadingIndex && index !== tocHeadingIndex + 1
  ));
  const [activeKey, setActiveKey] = useState(tabs[0]?.key || "");
  const activeTab = tabs.find((tab) => tab.key === activeKey) || tabs[0];

  if (tabs.length === 0) return <>{children}</>;

  return (
    <>
      <section className="project-tabs" aria-label="프로젝트 상세 페이지">
        <div className="project-tabs-list" role="tablist" aria-label="프로젝트 상세 탭">
          {tabs.map((tab, index) => (
            <button
              key={tab.key}
              id={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab?.key === tab.key}
              aria-controls={`${tab.key}-panel`}
              tabIndex={activeTab?.key === tab.key ? 0 : -1}
              className={`project-tab-button${activeTab?.key === tab.key ? " active" : ""}`}
              onClick={() => setActiveKey(tab.key)}
              onKeyDown={(event) => {
                let nextIndex: number | undefined;
                if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
                if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
                if (event.key === "Home") nextIndex = 0;
                if (event.key === "End") nextIndex = tabs.length - 1;
                if (nextIndex === undefined) return;

                event.preventDefault();
                const nextTab = tabs[nextIndex];
                setActiveKey(nextTab.key);
                document.getElementById(nextTab.key)?.focus();
              }}
            >
              {tab.title}
            </button>
          ))}
        </div>
        {activeTab && (
            <div
              id={`${activeTab.key}-panel`}
              className="project-tab-panel"
              role="tabpanel"
              aria-labelledby={activeTab.key}
              tabIndex={0}
            >
            {projectToc}
            {nonTabContent}
            {activeTab.content}
          </div>
        )}
      </section>
    </>
  );
}
