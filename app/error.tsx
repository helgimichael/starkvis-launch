"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";

const enterButtonClassName =
  "enter-button condensed-type flex h-[35px] w-[142px] items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.04] text-[0.61rem] font-medium uppercase tracking-[0.25em] text-[#F4F7F6] backdrop-blur-[12px] transition-[background-color,border-color,color,backdrop-filter,transform] duration-300 ease-out hover:border-[#00C2B3]/70 hover:bg-white/[0.06] hover:text-[#00C2B3] focus-visible:border-[#00C2B3]/70 focus-visible:outline-none focus-visible:ring-0 active:translate-y-[2px] disabled:cursor-default disabled:opacity-100 [text-shadow:none]";

export default function Error({
  reset,
}: {
  reset: () => void;
}) {
  useEffect(() => {
    console.error("STARKVIS error boundary triggered");
  }, []);

  return (
    <main className="relative min-h-dvh overflow-hidden bg-black px-6 py-6 text-[#F4F7F6]">
      <Link href="/" aria-label="STARKVIS" className="absolute left-6 top-6 block sm:left-10 sm:top-8">
        <Image src="/starkvis-logo-white.png" alt="" width={1536} height={1024} priority className="h-[30px] w-auto sm:h-[36px] lg:h-[40px]" />
      </Link>

      <div className="flex min-h-dvh items-center justify-center">
        <div className="w-[min(90vw,32rem)] text-center">
          <p className="condensed-type text-[0.58rem] uppercase tracking-[0.38em] text-[#F4F7F6]/45">Unexpected error</p>
          <h1 className="condensed-type mt-4 text-[clamp(1.8rem,4.6vw,3.6rem)] font-semibold uppercase leading-[0.88] tracking-[0.1em]">
            Something went wrong.
          </h1>
          <p className="mt-5 text-sm leading-6 text-[#F4F7F6]/70">
            The journey paused for a moment. Please try again.
          </p>

          <div className="mt-8 flex items-center justify-center gap-3">
            <button type="button" onClick={reset} className={enterButtonClassName}>
              Try Again
            </button>
            <Link href="/" className={enterButtonClassName}>
              Return Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

