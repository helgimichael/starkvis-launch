import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "STARKVIS — The Pattern Was Always There",
    template: "%s — STARKVIS",
  },
  description:
    "STARKVIS is building a new way of understanding sport through research, stories and intelligent coaching systems.",
  keywords: ["STARKVIS", "Handball", "Coaching", "Performance Analysis", "Research", "Artificial Intelligence", "Sports Science"],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "STARKVIS",
    title: "STARKVIS — The Pattern Was Always There",
    description:
      "STARKVIS is building a new way of understanding sport through research, stories and intelligent coaching systems.",
    images: [
      {
        url: "/intro-bakgrund.jpeg",
        width: 2048,
        height: 1024,
        alt: "STARKVIS launch landscape",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "STARKVIS — The Pattern Was Always There",
    description:
      "STARKVIS is building a new way of understanding sport through research, stories and intelligent coaching systems.",
    images: ["/intro-bakgrund.jpeg"],
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico?v=20260807" },
      { url: "/favicon-16x16.png?v=20260807", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png?v=20260807", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/favicon.ico?v=20260807",
    apple: [{ url: "/apple-touch-icon.png?v=20260807", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full overflow-x-hidden bg-black text-[var(--foreground)]">
        {children}
      </body>
    </html>
  );
}
