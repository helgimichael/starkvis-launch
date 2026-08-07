import type { MetadataRoute } from "next";
import { listPublishedCmsItems } from "@/lib/cms-repository";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const publishedItems = await listPublishedCmsItems();

  return [
    {
      url: new URL("/", siteUrl).toString(),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: new URL("/sagorna", siteUrl).toString(),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...publishedItems.map((item) => ({
      url: new URL(`/sagorna/${item.slug}`, siteUrl).toString(),
      lastModified: new Date(item.publishedAt ?? item.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
