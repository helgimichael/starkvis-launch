import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "STARKVIS",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NextPage() {
  return <main className="h-dvh w-full bg-black" />;
}
