type JournalSectionHeaderProps = {
  title: string;
  count: number;
};

export function JournalSectionHeader({ title, count }: JournalSectionHeaderProps) {
  return (
    <div className="education-list-header journal-list-header">
      <div>
        <span className="journal-list-eyebrow">NOTION JOURNAL</span>
        <div className="section-title journal-list-title">
          {title} 목록 <small>{count}</small>
        </div>
      </div>
    </div>
  );
}
