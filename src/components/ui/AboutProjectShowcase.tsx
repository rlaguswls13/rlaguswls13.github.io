import Link from "next/link";
import type { Project } from "@/types";
import { formatMiniPeriod } from "@/lib/utils";
import { getProjectThumbnail } from "@/lib/thumbnails";
import { CardThumbnail } from "@/components/ui/CardThumbnail";

function ProjectGroup({ title, eyebrow, projects, startIndex }: { title: string; eyebrow: string; projects: Project[]; startIndex: number }) {
  return (
    <section className="about-work-group render-lazy">
      <div className="about-work-group-header">
        <div><span>{eyebrow}</span><h3>{title}</h3></div>
        <strong>{projects.length} PROJECTS</strong>
      </div>
      <div className="about-work-grid">
        {projects.map((project, index) => (
          <Link key={project.id} href={`/projects/${project.slug || project.id}`} className="about-work-card">
            <div className={`about-work-thumbnail work-thumb-${(startIndex + index) % 6}`}>
              <CardThumbnail src={getProjectThumbnail(project.id)} alt="" className="about-work-thumbnail-image" priority={startIndex + index === 0} />
              <span>{String(startIndex + index + 1).padStart(2, "0")}</span>
              <b>{project.tags[0]}</b>
            </div>
            <div className="about-work-body">
              <time>{formatMiniPeriod(project.periods)}</time>
              <h4>{project.title}</h4>
              <p>{project.description}</p>
              <div className="about-work-tags">
                {project.tags.slice(0, 3).map((tag) => <span key={tag}>#{tag}</span>)}
              </div>
              <strong>작업 상세 보기 →</strong>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function AboutProjectShowcase({ projects }: { projects: Project[] }) {
  const enterprise = projects.filter((project) => project.type !== "personal");
  const personal = projects.filter((project) => project.type === "personal");

  return (
    <section className="about-work-showcase">
      <div className="about-work-intro">
        <div><span className="about-intro-kicker">SELECTED WORK</span><h2>문제를 해결해 온 작업</h2></div>
        <p>담당 역할과 해결한 문제를 중심으로 실무 작업과 개인 프로젝트를 구분했습니다.</p>
      </div>
      <ProjectGroup title="참여 작업" eyebrow="ENTERPRISE" projects={enterprise} startIndex={0} />
      <ProjectGroup title="개인 작업" eyebrow="PERSONAL" projects={personal} startIndex={enterprise.length} />
      <Link href="/projects" className="about-work-all-link">전체 작업 목록 보기 →</Link>
    </section>
  );
}
