"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { ProjectBackLink } from "@/components/layout/ProjectBackLink";
import { TagList } from "@/components/ui/TagBadge";
import { CalendarIcon } from "@/components/ui/Icons";
import { formatPeriods } from "@/lib/utils";
import type { Project, ProjectDetail, ProjectSection } from "@/types";
import { TabGroup } from "@/components/ui/TabGroup";
import { DeferredContent, LoadingPlaceholder } from "@/components/ui/DeferredContent";

interface ProjectDetailClientProps {
  meta: Project;
  detail: ProjectDetail;
}

export function LegacyProjectSections({
  sections,
}: {
  readonly sections: readonly ProjectSection[];
}) {
  return sections.map((section, index) => (
    <div key={`${section.title}-${index}`} style={{ marginTop: "30px" }}>
      <h3>{section.title}</h3>
      {section.body && (
        <p>
          {section.body.split("\n").map((line, lineIndex) => (
            <React.Fragment key={`${section.title}-${lineIndex}`}>
              {lineIndex > 0 && <br />}
              {line}
            </React.Fragment>
          ))}
        </p>
      )}
      {section.list && (
        <ul>
          {section.list.map((item, itemIndex) => (
            <li key={itemIndex}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  ));
}

export default function ProjectDetailClient({
  meta,
  detail,
}: ProjectDetailClientProps) {
  const [activeTabKey, setActiveTabKey] = useState("0");
  const activeTab = detail.tabs[Number.parseInt(activeTabKey, 10)];
  const tabItems = detail.tabs.map((tab, index) => ({
    key: index.toString(),
    label: tab.title,
  }));
  const currentSections = activeTab ? activeTab.sections : detail.sections;
  const currentDiagram = activeTab ? activeTab.flow_diagram : detail.flow_diagram;

  return (
    <article className="detail-content-page project-detail-page">
      <ProjectBackLink />
      <header className="detail-page-heading project-card" style={{ marginBottom: "40px" }}>
        <span className="page-heading-eyebrow">PROJECT DETAIL</span>
        <h1 className="page-title">{meta.title}</h1>
        <p className="project-period">
          <CalendarIcon /> {formatPeriods(meta.periods)}
        </p>
        <TagList tags={meta.tags} />
      </header>

      <div className="mdx-content">
        <div className="section-title">프로젝트 개요</div>
        <p>{meta.description}</p>

        {detail.tabs.length > 0 && (
          <div style={{ marginTop: "40px", marginBottom: "30px" }}>
            <TabGroup
              tabs={tabItems}
              activeTab={activeTabKey}
              onTabChange={setActiveTabKey}
            />
          </div>
        )}

        <div style={{ marginTop: "30px" }}>
          <ProjectDiagram flowDiagram={currentDiagram} />
          <LegacyProjectSections sections={currentSections} />
        </div>
      </div>
    </article>
  );
}

function ProjectDiagram({ flowDiagram }: { readonly flowDiagram: string | undefined }) {
  if (!flowDiagram) return null;
  const filename = flowDiagram.split("/").pop() as keyof typeof projectDiagrams | undefined;
  if (!filename || !(filename in projectDiagrams)) return null;
  const Diagram = projectDiagrams[filename];
  return (
    <DeferredContent label="다이어그램 불러오는 중" minHeight={280} rootMargin="280px 0px" className="lazy-diagram-slot">
      <Diagram />
    </DeferredContent>
  );
}

const diagramLoading = () => <LoadingPlaceholder label="다이어그램 불러오는 중" minHeight={280} />;
const projectDiagrams = {
  "email-large-scale.html": dynamic(() => import("@/components/diagrams/projects/EmailLargeScale").then((module) => module.EmailLargeScale), { ssr: false, loading: diagramLoading }),
  "email-hybrid.html": dynamic(() => import("@/components/diagrams/projects/EmailHybrid").then((module) => module.EmailHybrid), { ssr: false, loading: diagramLoading }),
  "sso-filter.html": dynamic(() => import("@/components/diagrams/projects/SsoFilter").then((module) => module.SsoFilter), { ssr: false, loading: diagramLoading }),
  "rbac-flow.html": dynamic(() => import("@/components/diagrams/projects/RbacFlow").then((module) => module.RbacFlow), { ssr: false, loading: diagramLoading }),
  "container-support.html": dynamic(() => import("@/components/diagrams/projects/ContainerSupport").then((module) => module.ContainerSupport), { ssr: false, loading: diagramLoading }),
  "cs-pipeline.html": dynamic(() => import("@/components/diagrams/projects/CSPipeline").then((module) => module.CSPipeline), { ssr: false, loading: diagramLoading }),
  "integrated-portal.html": dynamic(() => import("@/components/diagrams/projects/IntegratedPortal").then((module) => module.IntegratedPortal), { ssr: false, loading: diagramLoading }),
  "cloud-migration-flow.html": dynamic(() => import("@/components/diagrams/projects/CloudMigrationFlow").then((module) => module.CloudMigrationFlow), { ssr: false, loading: diagramLoading }),
  "devops-db-arch.html": dynamic(() => import("@/components/diagrams/projects/DevopsDbArch").then((module) => module.DevopsDbArch), { ssr: false, loading: diagramLoading }),
  "devops-pipeline.html": dynamic(() => import("@/components/diagrams/projects/DevopsPipeline").then((module) => module.DevopsPipeline), { ssr: false, loading: diagramLoading }),
} as const;
