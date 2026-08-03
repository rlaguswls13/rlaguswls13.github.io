import profileData from "@/data/pages/main/profile.json";
import projectsData from "@/data/indexes/projects.json";
import { SkillBar } from "@/components/ui/SkillBar";
import Image from "next/image";
import type { Project, Skill } from "@/types";
import myImage from "../../../public/images/myImage.png";
import { GithubIcon, PhoneIcon, MailIcon } from "@/components/ui/Icons";
import { AboutBioStory } from "@/components/ui/AboutBioStory";
import { AboutHighlights } from "@/components/ui/AboutHighlights";
import { AboutProjectShowcase } from "@/components/ui/AboutProjectShowcase";
import { PageHeader } from "@/components/layout/PageHeader";

export default function AboutPage() {
  const { profile, others } = profileData;

  return (
    <main className="about-page">
      <PageHeader
        eyebrow="ABOUT ME"
        title="경험으로 문제를 해결하는 개발자"
        description="개발 과정과 프로젝트 경험, 관심 기술을 소개합니다."
        marker="01"
        className="about-page-header"
      />

      <div className="about-top-grid">
        <div className="profile-card">
          <Image src={myImage} alt="김현진 프로필" className="profile-img" width={200} height={200} priority />
          <div className="about-profile-name">{profile.name}</div>
          <p className="role" style={{ margin: "5px 0" }}>{profile.role}</p>
          <p className="univ">{profile.organization}</p>
          <div className="about-social-links">
            {profile.social.map((social, index) => (
              <a
                key={index}
                href={social.url || social.link}
                className="social-link"
                target={social.icon === "mail" ? undefined : "_blank"}
                rel={social.icon === "mail" ? undefined : "noopener noreferrer"}
                aria-label={social.icon}
              >
                {social.icon === "github" ? <GithubIcon width={22} height={22} />
                  : social.icon === "phone" ? <PhoneIcon width={22} height={22} />
                  : social.icon === "mail" ? <MailIcon width={22} height={22} />
                  : <span>{social.icon}</span>}
              </a>
            ))}
          </div>
        </div>

        <div className="bio-card">
          <span className="about-intro-kicker">PROFILE</span>
          <div className="about-intro-title">{profile.bio_title}</div>
          <AboutHighlights items={profile.bio_highlights} />
          <AboutBioStory paragraphs={profile.bio_story} />
        </div>
      </div>

      <AboutProjectShowcase projects={projectsData.projects as Project[]} />

      <section className="render-lazy" style={{ marginTop: "40px" }}>
        <div className="about-section-title">Tech / Interests</div>
        <div className="about-interests-grid">
          <div className="others-card">
            <div className="about-card-title">Interests</div>
            <ul className="about-simple-list">
              {others.interests.map((item, index) => <li key={index}>• {item}</li>)}
            </ul>
          </div>
          <div className="others-card">
            <div className="about-card-title">Education</div>
            <ul className="about-simple-list">
              {others.education.map((education, index) => (
                <li key={index}><strong>{education.degree}</strong><br />{education.school} ({education.year})</li>
              ))}
            </ul>
          </div>
          <div className="skills-card">
            <div className="about-card-title">Technical</div>
            {others.technical.map((skill: Skill) => <SkillBar key={skill.name} skill={skill} />)}
          </div>
          <div className="skills-card">
            <div className="about-card-title">Hobbies</div>
            {others.hobbies.map((skill: Skill) => <SkillBar key={skill.name} skill={skill} />)}
          </div>
        </div>
      </section>
    </main>
  );
}
