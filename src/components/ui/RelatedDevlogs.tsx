import Link from "next/link";

export type RelatedDevlogItem = {
  category: string;
  id: string;
  title: string;
  date: string;
  tags: string[];
  href: string;
  sharedKeywords: string[];
  score: number;
};

const categoryLabels: Record<string, string> = {
  tech_study: "기술 학습",
  tech_study_series: "학습 시리즈",
  problem_solving: "문제 해결",
  competition_event: "대회·행사",
  education: "교육일지",
  blog: "일지",
};

export function RelatedDevlogs({ items }: { items: RelatedDevlogItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="related-devlogs" aria-labelledby="related-devlogs-title">
      <div className="related-devlogs-heading">
        <div>
          <span className="page-heading-eyebrow">RELATED POSTS</span>
          <h2 id="related-devlogs-title">키워드 연관 추천</h2>
        </div>
        <span>{items.length} POSTS</span>
      </div>
      <div className="related-devlogs-grid">
        {items.map((item, index) => {
          const visibleKeywords = item.sharedKeywords.length > 0
            ? item.sharedKeywords.slice(0, 2)
            : item.tags.slice(0, 2);

          return (
            <Link href={item.href} className="related-devlog-card" key={`${item.category}/${item.id}`}>
              <div className="related-devlog-topline">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <b>{categoryLabels[item.category] || item.category}</b>
              </div>
              <strong>{item.title}</strong>
              <div className="related-devlog-meta">
                <time>{item.date}</time>
                {visibleKeywords.length > 0 && (
                  <span>{visibleKeywords.map((keyword) => `#${keyword}`).join(" ")}</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
