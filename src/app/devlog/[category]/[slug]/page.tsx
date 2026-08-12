import fs from "fs";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isValidElement, type ComponentPropsWithoutRef } from "react";
import matter from "gray-matter";
import { MDXRemote } from "next-mdx-remote/rsc";
import rehypePrettyCode from "rehype-pretty-code";
import { DevlogBackLink } from "@/components/layout/DevlogBackLink";
import { TagList } from "@/components/ui/TagBadge";
import { CalendarIcon } from "@/components/ui/Icons";
import { Indent } from "@/components/ui/Indent";
import { LazyMdxDiagram, type LazyMdxDiagramName } from "@/components/ui/LazyMdxDiagram";
import { CodePopup } from "@/components/layout/CodePopup";
import { Collapsible } from "@/components/ui/Collapsible";
import { MdxImageFigure } from "@/components/ui/MdxImageFigure";
import { NotionImage } from "@/components/ui/notion/NotionImage";
import { NotionTable } from "@/components/ui/notion/NotionTable";
import { NotionToggle } from "@/components/ui/notion/NotionToggle";
import { NotionCallout } from "@/components/ui/notion/NotionCallout";
import { NotionDivider } from "@/components/ui/notion/NotionDivider";
import { NotionIndent } from "@/components/ui/notion/NotionIndent";
import { NotionCode } from "@/components/ui/notion/NotionCode";
import { GiscusComments } from "@/components/ui/GiscusComments";
import recommendationData from "@/data/indexes/devlog-recommendations.json";
import { RelatedDevlogs, type RelatedDevlogItem } from "@/components/ui/RelatedDevlogs";
import { getDevlogIdBySlug } from "@/lib/devlog-slugs";
import {
  createDetailContentRoots,
  resolveDevlogDetailSource,
} from "@/content/detail/boundaries";
import { JsonLd } from "@/lib/seo/JsonLd";
import { buildBlogPostingJsonLd } from "@/lib/seo/metadata";
import { buildRouteMetadata, siteAuthor } from "@/lib/seo/routes";
import { siteConfig } from "@/lib/site";
import { rehypeArticleToc } from "@/lib/content/rehype-article-toc";

type DevlogPageIndexItem = {
  category: string;
  id: string;
  slug: string;
  sourceFile: string;
  title: string;
  date: string;
  description: string;
  author: string;
  href: string;
  discussionTerm: string;
};

const pageIndex = recommendationData.pages as DevlogPageIndexItem[];

function metadataForEntry(entry: DevlogPageIndexItem) {
  return buildRouteMetadata(
    entry.href,
    `${entry.title} | TECH LOG`,
    entry.description,
    "article",
    entry.author || siteAuthor,
    entry.date,
  );
}

type PrettyCodeFigureProps = ComponentPropsWithoutRef<"figure"> & {
  "data-rehype-pretty-code-figure"?: string;
};

const lazyDiagram = (name: LazyMdxDiagramName) => function LazyDiagramSlot() {
  return <LazyMdxDiagram name={name} />;
};

const components = {
  G1GCMemory: lazyDiagram("G1GCMemory"),
  KahaDBBlocks: lazyDiagram("KahaDBBlocks"),
  QuartzMechanism: lazyDiagram("QuartzMechanism"),
  QuartzHAClustering: lazyDiagram("QuartzHAClustering"),
  QuartzSharding: lazyDiagram("QuartzSharding"),
  Indent,
  ApiFlowDiagram: lazyDiagram("ApiFlowDiagram"),
  DbBottleneckDiagram: lazyDiagram("DbBottleneckDiagram"),
  MqPriorityDiagram: lazyDiagram("MqPriorityDiagram"),
  TimeoutPolicyDiagram: lazyDiagram("TimeoutPolicyDiagram"),
  PubSubArchitecture: lazyDiagram("PubSubArchitecture"),
  EventBusSimulator: lazyDiagram("EventBusSimulator"),
  StorageArchitectureDiagram: lazyDiagram("StorageArchitectureDiagram"),
  StorageNetworkDiagram: lazyDiagram("StorageNetworkDiagram"),
  StoragePhysicalDiagram: lazyDiagram("StoragePhysicalDiagram"),
  ContainerVsVmDiagram: lazyDiagram("ContainerVsVmDiagram"),
  K8sSecurityDiagram: lazyDiagram("K8sSecurityDiagram"),
  CodePopup,
  Collapsible,
  MdxImageFigure,
  NotionImage,
  NotionTable,
  NotionToggle,
  NotionCallout,
  NotionDivider,
  NotionIndent,
  figure: (props: PrettyCodeFigureProps) => {
    if (props["data-rehype-pretty-code-figure"] !== undefined) {
      const language = isValidElement<{ "data-language"?: string }>(props.children)
        ? props.children.props["data-language"] || "text"
        : "text";
      return <NotionCode language={language}>{props.children}</NotionCode>;
    }
    return <figure {...props} />;
  },
};

export async function generateStaticParams() {
  return pageIndex.map((entry) => ({ category: entry.category, slug: entry.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const { category, slug } = await params;
  const id = getDevlogIdBySlug(category, slug);
  const entry = pageIndex.find((item) => item.category === category && item.id === id);
  if (!entry) return {};

  return metadataForEntry(entry).metadata;
}

export default async function DevlogDetailPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const id = getDevlogIdBySlug(category, slug);
  const pageEntry = pageIndex.find((item) => item.category === category && item.id === id);
  if (!pageEntry) notFound();
  const source = resolveDevlogDetailSource(
    pageEntry.sourceFile,
    createDetailContentRoots(process.cwd()),
  );
  if (!source.ok) notFound();
  const fileContent = fs.readFileSync(source.value, "utf8");

  const { data, content } = matter(fileContent);
  const recommendationItems = recommendationData.items as Record<string, RelatedDevlogItem[]>;
  const relatedDevlogs = recommendationItems[`${category}/${pageEntry.id}`] || [];
  const jsonLd = buildBlogPostingJsonLd(metadataForEntry(pageEntry));

  return (
    <article className="detail-content-page devlog-detail-page">
      <JsonLd id="blog-posting-json-ld" document={jsonLd} />
      <DevlogBackLink category={category} />
      <header className="detail-page-heading project-card" style={{ marginBottom: "40px" }}>
        <span className="page-heading-eyebrow">DEVLOG · {category.replaceAll("_", " ")}</span>
        <div className="devlog-meta" style={{ marginBottom: "15px" }}>
          <span><CalendarIcon /> {data.date}</span>
        </div>
        <h1 className="page-title">
          {data.title}
        </h1>
        {data.tags && <TagList tags={data.tags} />}
      </header>

      <RelatedDevlogs items={relatedDevlogs} />

      <div className="mdx-content">
        <MDXRemote
          source={content}
          components={components}
          options={{
            mdxOptions: {
              rehypePlugins: [
                rehypeArticleToc,
                [
                  rehypePrettyCode,
                  {
                    theme: "github-dark-dimmed",
                    keepBackground: true,
                  },
                ],
              ],
            },
          }}
        />
      </div>
      <GiscusComments config={siteConfig.giscus} term={pageEntry.discussionTerm} />
    </article>
  );
}
