import type { Metadata } from "next";
import { buildStaticRouteMetadata } from "@/lib/seo/routes";
import ContactPageClient from "./ContactPageClient";

export const metadata: Metadata = buildStaticRouteMetadata("contact").metadata;

export default function ContactPage() {
  return <ContactPageClient />;
}
