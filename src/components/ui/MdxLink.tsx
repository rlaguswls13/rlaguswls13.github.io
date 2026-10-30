import type { ComponentPropsWithoutRef } from "react";
import { resolveLegacyContentLink } from "@/lib/content/legacy-links";

export function MdxLink({ href, ...props }: ComponentPropsWithoutRef<"a">) {
  return <a {...props} href={href === undefined ? undefined : resolveLegacyContentLink(href)} />;
}
