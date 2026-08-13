import profileData from "@/data/pages/main/profile.json";
import { siteConfig } from "@/lib/site";
import { buildPageMetadata, type PageMetadataContract } from "./metadata";

const staticRoutes = {
  root: {
    pathname: "/",
    title: "김현진 | TECH LOG",
    description: "Java & Spring Boot 기반 풀스택 개발자 김현진의 포트폴리오와 기술 기록입니다.",
  },
  about: {
    pathname: "/about",
    title: "소개 | 김현진 TECH LOG",
    description: "개발자 김현진의 경험, 프로젝트, 기술 역량과 성장 과정을 소개합니다.",
  },
  career: {
    pathname: "/career",
    title: "경력 | 김현진 TECH LOG",
    description: "김현진의 경력, 학력, 자격 및 개발자로서의 성장 과정을 시간순으로 정리합니다.",
  },
  contact: {
    pathname: "/contact",
    title: "연락처 | 김현진 TECH LOG",
    description: "프로젝트, 기술 협업과 새로운 기회에 대해 김현진에게 연락할 수 있는 방법을 안내합니다.",
  },
  devlog: {
    pathname: "/devlog",
    title: "Devlog | 김현진 TECH LOG",
    description: "기술 학습과 실무 문제를 분석하고 해결한 과정을 정리한 개발 기록입니다.",
  },
  journal: {
    pathname: "/journal",
    title: "Journal | 김현진 TECH LOG",
    description: "일상의 생각과 교육 과정에서 배운 내용을 정리한 개인 기록입니다.",
  },
  projects: {
    pathname: "/projects",
    title: "Projects | 김현진 TECH LOG",
    description: "실무와 개인 프로젝트에서 해결한 문제, 적용한 기술과 결과를 소개합니다.",
  },
  tags: {
    pathname: "/tags",
    title: "Tags | 김현진 TECH LOG",
    description: "프로젝트, Devlog와 일지의 모든 기록을 태그와 검색어로 찾아봅니다.",
  },
} as const;

export type StaticRouteKey = keyof typeof staticRoutes;
export const siteAuthor = profileData.profile.name;

export function buildRouteMetadata(
  pathname: string,
  title: string,
  description: string,
  kind: "article" | "website" = "website",
  author?: string,
  publishedTime?: string,
): PageMetadataContract {
  return buildPageMetadata({
    siteUrl: siteConfig.siteUrl,
    basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
    pathname,
    title,
    description,
    kind,
    ...(author ? { author } : {}),
    ...(publishedTime ? { publishedTime } : {}),
  });
}

export function buildStaticRouteMetadata(route: StaticRouteKey): PageMetadataContract {
  const page = staticRoutes[route];
  return buildRouteMetadata(page.pathname, page.title, page.description);
}
