import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { GoogleAnalytics } from "@blog/ga4-analytics/react";
import "./globals.css";
import { siteConfig } from "@/lib/site";
import { buildStaticRouteMetadata } from "@/lib/seo/routes";

const { adsenseAccount, ga4MeasurementId, searchConsoleVerification } = siteConfig.google;
const { siteVerification: naverSiteVerification } = siteConfig.naver;
const themeBootstrap = `(() => { let theme; try { theme = localStorage.getItem("theme"); } catch { theme = null; } if (theme === "dark") document.documentElement.classList.replace("theme-light", "theme-dark"); })();`;

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  ...buildStaticRouteMetadata("root").metadata,
  other: {
    ...(adsenseAccount ? { "google-adsense-account": adsenseAccount } : {}),
    ...(searchConsoleVerification ? { "google-site-verification": searchConsoleVerification } : {}),
    ...(naverSiteVerification ? { "naver-site-verification": naverSiteVerification } : {}),
  },
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
        {ga4MeasurementId ? <GoogleAnalytics measurementId={ga4MeasurementId} /> : null}
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
