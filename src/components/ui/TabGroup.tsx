"use client";

interface TabGroupProps {
  tabs: { key: string; label: string; href?: string; isExternal?: boolean }[];
  activeTab: string;
  onTabChange: (key: string) => void;
}

export function TabGroup({ tabs, activeTab, onTabChange }: TabGroupProps) {
  return (
    <div className="category-tabs" role="group" aria-label="카테고리 필터">
      {tabs.map((tab) => {
        if (tab.href) {
          return (
            <a
              key={tab.key}
              href={tab.href}
              target={tab.isExternal !== false ? "_blank" : "_self"}
              rel={tab.isExternal !== false ? "noopener noreferrer" : undefined}
              className={`category-tab ${activeTab === tab.key ? "active" : ""}`}
            >
              {tab.label}
              {tab.isExternal !== false && <span className="category-tab-ext">↗</span>}
            </a>
          );
        }

        return (
          <button
            key={tab.key}
            type="button"
            className={`category-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => onTabChange(tab.key)}
            aria-pressed={activeTab === tab.key}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
