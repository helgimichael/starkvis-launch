import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { generateExcerpt } from "@/app/sagorna/sagorna-content";
import { getPublishedCmsItemBySlug } from "@/lib/cms-repository";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const dynamic = "force-dynamic";

function resolveOgImage(item: NonNullable<Awaited<ReturnType<typeof getPublishedCmsItemBySlug>>>) {
  const candidate = item.thumbnail.trim() || item.mediaUrl.trim();
  if (candidate.startsWith("/") || candidate.startsWith("http://") || candidate.startsWith("https://")) {
    return candidate;
  }

  return "/sagorna-still.jpeg";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPublishedCmsItemBySlug(decodeURIComponent(slug));

  if (!item) {
    return {
      metadataBase: new URL(siteUrl),
      title: "STARKVIS",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const description = item.excerpt.trim() || generateExcerpt(item.content);
  const canonical = `/sagorna/${item.slug}`;
  const ogImage = resolveOgImage(item);

  return {
    metadataBase: new URL(siteUrl),
    title: item.title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: "article",
      url: canonical,
      siteName: "STARKVIS",
      title: item.title,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: item.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: item.title,
      description,
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function SagornaSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = await getPublishedCmsItemBySlug(decodeURIComponent(slug));

  if (!item) {
    notFound();
  }

  return null;
}
