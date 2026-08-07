import Image from "next/image";
import Link from "next/link";

const enterButtonClassName =
  "enter-button condensed-type flex h-[35px] w-[142px] items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.04] text-[0.61rem] font-medium uppercase tracking-[0.25em] text-[#F4F7F6] backdrop-blur-[12px] transition-[background-color,border-color,color,backdrop-filter,transform] duration-300 ease-out hover:border-[#00C2B3]/70 hover:bg-white/[0.06] hover:text-[#00C2B3] focus-visible:border-[#00C2B3]/70 focus-visible:outline-none focus-visible:ring-0 active:translate-y-[2px] disabled:cursor-default disabled:opacity-100 [text-shadow:none]";

export default function NotFound() {
  return (
    <main className="starkvis-fade-in relative min-h-dvh w-full overflow-hidden bg-black">
      <Image
        src="/404-site-starkvis.jpeg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />

      <div className="absolute inset-0 bg-black/18" aria-hidden="true" />

      <Link
        href="/"
        aria-label="STARKVIS"
        className="absolute left-6 top-6 z-20 block transition-opacity duration-[200ms] ease-out hover:opacity-90 focus-visible:outline-none focus-visible:ring-0 sm:left-10 sm:top-8"
      >
        <Image
          src="/starkvis-logo-white.png"
          alt=""
          width={1536}
          height={1024}
          priority
          quality={100}
          className="h-[30px] w-auto sm:h-[36px] lg:h-[40px]"
        />
      </Link>

      <section className="absolute left-1/2 top-1/2 z-10 w-[min(90vw,42rem)] -translate-x-1/2 -translate-y-1/2 px-4 text-center">
        <Link
          href="/"
          className={`${enterButtonClassName} mx-auto mt-12 w-[min(86vw,19rem)] text-[0.82rem] sm:w-[19rem]`}
        >
          RETURN TO THE JOURNEY
        </Link>
      </section>
    </main>
  );
}
