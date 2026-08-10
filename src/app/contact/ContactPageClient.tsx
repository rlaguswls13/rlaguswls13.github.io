"use client";
import contactData from "@/data/pages/main/contact.json";
import Image from "next/image";
import { GithubIcon, PhoneIcon, MailIcon } from "@/components/ui/Icons";
import { PageHeader } from "@/components/layout/PageHeader";

export default function ContactPageClient() {
  const { contact } = contactData;

  return (
    <div className="contact-page">
      <PageHeader
        eyebrow="GET IN TOUCH"
        title="함께 이야기해요"
        description="프로젝트와 기술, 새로운 기회에 관한 이야기를 기다리고 있습니다."
        marker="05"
      />
      <div className="project-card" style={{ padding: "50px", textAlign: "center" }}>
        <div
          style={{
            width: "100%",
            maxWidth: "320px",
            margin: "0 auto 28px",
            borderRadius: "18px",
            overflow: "hidden",
            border: "1px solid var(--border-color)",
            boxShadow: "var(--card-shadow)",
          }}
        >
          <Image
            src="/images/2022_picture.jpg"
            alt="Contact visual"
            style={{ width: "100%", height: "auto", display: "block" }}
            priority
          />
        </div>

        <div className="section-title">연락처</div>
        <p className="contact-intro">
          {contact.intro}
        </p>

        <a
          href={`mailto:${contact.email}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            padding: "15px 30px",
            backgroundColor: "var(--accent-primary)",
            color: "var(--text-on-accent)",
            borderRadius: "30px",
            fontWeight: 700,
            textDecoration: "none",
            marginBottom: "40px",
            transition: "all 0.3s",
            boxShadow: "var(--accent-cta-shadow)",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = "translateY(-3px)";
            e.currentTarget.style.boxShadow = "var(--accent-cta-shadow-hv)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "var(--accent-cta-shadow)";
          }}
        >
          <MailIcon width={24} height={24} />
          {contact.email}
        </a>

        <div style={{ display: "flex", justifyContent: "center", gap: "20px", flexWrap: "wrap" }}>
          {contact.links.map((link, idx) => (
            <a
              key={idx}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                backgroundColor: "var(--bg-tertiary)",
                color: "var(--text-primary)",
                borderRadius: "12px",
                textDecoration: "none",
                fontWeight: 600,
                transition: "all 0.3s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "var(--accent-primary)";
                e.currentTarget.style.color = "var(--text-on-accent)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "var(--bg-tertiary)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
            >
              <span style={{ display: "flex", alignItems: "center" }}>
                {link.icon === "github" ? (
                  <GithubIcon width={20} height={20} />
                ) : link.icon === "phone" ? (
                  <PhoneIcon width={20} height={20} />
                ) : link.icon === "mail" ? (
                  <MailIcon width={20} height={20} />
                ) : (
                  link.icon
                )}
              </span>
              <span>{link.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
