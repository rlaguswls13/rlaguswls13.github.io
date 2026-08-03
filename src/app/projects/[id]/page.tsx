import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import projectsMeta from "@/data/indexes/projects.json";
import type { Project, ProjectDetail } from "@/types";
import ProjectDetailClient from "./ProjectDetailClient";
import { ProjectBackLink } from "@/components/layout/ProjectBackLink";
import { TagList } from "@/components/ui/TagBadge";
import { CalendarIcon } from "@/components/ui/Icons";
import { formatPeriods } from "@/lib/utils";
import { NotionImage } from "@/components/ui/notion/NotionImage";
import { NotionTable } from "@/components/ui/notion/NotionTable";
import { NotionToggle } from "@/components/ui/notion/NotionToggle";
import { NotionCallout } from "@/components/ui/notion/NotionCallout";
import { NotionDivider } from "@/components/ui/notion/NotionDivider";
import { NotionIndent } from "@/components/ui/notion/NotionIndent";

const projects = projectsMeta.projects as Project[];
const components = { NotionImage, NotionTable, NotionToggle, NotionCallout, NotionDivider, NotionIndent };

export async function generateStaticParams() {
  return projects.map((project) => ({ id: project.slug || project.id }));
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meta = projects.find((project) => project.slug === id || project.id === id);
  if (!meta?.sourceFile) notFound();
  const filePath = path.join(process.cwd(), "src", "content", "projects", meta.sourceFile);
  if (!fs.existsSync(filePath)) notFound();
  const { data, content } = matter(fs.readFileSync(filePath, "utf8"));

  if (data.legacyDetail) {
    const detail = JSON.parse(String(data.legacyDetail)) as ProjectDetail;
    return <ProjectDetailClient meta={meta} detail={detail} />;
  }

  return (
    <article className="detail-content-page project-detail-page">
      <ProjectBackLink />
      <header className="detail-page-heading project-card" style={{ marginBottom: 40 }}>
        <span className="page-heading-eyebrow">PROJECT · {(meta.subcategory || "general").toUpperCase()}</span>
        <h1 className="page-title">{meta.title}</h1>
        <p className="project-period"><CalendarIcon /> {formatPeriods(meta.periods)}</p>
        <TagList tags={meta.tags} />
      </header>
      <div className="mdx-content">
        <MDXRemote source={content} components={components} />
      </div>
    </article>
  );
}
