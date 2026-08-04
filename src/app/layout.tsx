import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { GoogleAnalytics } from "@blog/ga4-analytics/react";
import "./globals.css";
import { siteConfig } from "@/lib/site";
import { buildStaticRouteMetadata } from "@/lib/seo/routes";

// ADSENSE_ACCOUNT 저장소 Variable이 설정된 빌드(예: commercial-blog)에서만 AdSense 메타 태그 추가
const adsenseAccount = process.env.ADSENSE_ACCOUNT;
const ga4MeasurementId = process.env.GA4_PROPERTY_ID || "";
const themeBootstrap = `(() => { let theme; try { theme = localStorage.getItem("theme"); } catch { theme = null; } if (theme === "dark") document.documentElement.classList.replace("theme-light", "theme-dark"); })();`;

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  ...buildStaticRouteMetadata("root").metadata,
  ...(adsenseAccount ? { other: { "google-adsense-account": adsenseAccount } } : {}),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning className="theme-light">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>
        <GoogleAnalytics measurementId={ga4MeasurementId} />
        <ThemeProvider>
          <div className="container">
            <Navbar />
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
