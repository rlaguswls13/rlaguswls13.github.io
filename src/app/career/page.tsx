import type { Metadata } from "next";
import resumeData from "@/data/pages/main/resume.json";
import { TimelineItem } from "@/components/ui/Timeline";
import { PageHeader } from "@/components/layout/PageHeader";
import { buildStaticRouteMetadata } from "@/lib/seo/routes";

export const metadata: Metadata = buildStaticRouteMetadata("career").metadata;

export default function CareerPage() {
  const { resume } = resumeData;

  return (
    <>
      <PageHeader
        eyebrow="CAREER JOURNEY"
        title="경력과 성장의 기록"
        description="맡아온 역할과 기술적 성장 과정을 시간의 흐름에 따라 정리했습니다."
        marker="04"
      />
      <div className="project-card" style={{ marginBottom: "40px", padding: "40px" }}>
        <div className="section-title">경력 요약</div>
        <div style={{ marginTop: "30px" }}>
          {resume.work.map((item, index) => (
            <TimelineItem
              key={index}
              title={item.title}
              date={item.date}
              description={item.description}
            />
          ))}
        </div>
      </div>

      <div className="grid-2 render-lazy">
        <div className="project-card">
          <div className="section-title">학력</div>
          <div style={{ marginTop: "25px" }}>
            {resume.education.map((item, index) => (
              <TimelineItem
                key={index}
                title={item.title}
                date={item.date}
                description={item.description}
              />
            ))}
          </div>
        </div>

        <div className="project-card">
          <div className="section-title">자격증</div>
          <div style={{ marginTop: "25px" }}>
            {resume.certification.map((item, index) => (
              <TimelineItem
                key={index}
                title={item.title}
                date={item.date}
                description={item.description}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
