import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "STARKVIS — Sagorna",
  description: "STARKVIS stories, film, sound and research in one cinematic space.",
  alternates: {
    canonical: "/sagorna",
  },
  openGraph: {
    type: "website",
    url: "/sagorna",
    siteName: "STARKVIS",
    title: "STARKVIS — Sagorna",
    description: "STARKVIS stories, film, sound and research in one cinematic space.",
    images: [
      {
        url: "/sagorna-still.jpeg",
        width: 2048,
        height: 1024,
        alt: "STARKVIS Sagorna preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "STARKVIS — Sagorna",
    description: "STARKVIS stories, film, sound and research in one cinematic space.",
    images: ["/sagorna-still.jpeg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function SagornaPage() {
  return null;
}
