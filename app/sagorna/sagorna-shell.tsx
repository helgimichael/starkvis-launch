"use client";

import { usePathname } from "next/navigation";
import { ExperienceProvider } from "./experience-provider";
import { SagornaWorkspace } from "./sagorna-workspace";

export function SagornaShell() {
  const pathname = usePathname();
  const activeSlug = pathname?.startsWith("/sagorna/") ? decodeURIComponent(pathname.split("/")[2] ?? "") : "";

  return (
    <ExperienceProvider>
      <SagornaWorkspace activeSlug={activeSlug || undefined} />
    </ExperienceProvider>
  );
}
