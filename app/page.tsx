"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

type NotifyStatus = "idle" | "loading" | "success" | "duplicate" | "invalid" | "error";

const productIcons = [
  {
    name: "FIELD",
    src: "/branding/field/field-icon.png",
    href: "https://field.starkv.is",
    glow: "drop-shadow-[0_0_7px_rgba(0,194,179,0.5)]",
    hoverGlow: "hover:drop-shadow-[0_0_11px_rgba(58,255,190,0.72)] focus-visible:drop-shadow-[0_0_11px_rgba(58,255,190,0.72)]",
  },
  {
    name: "LENS",
    src: "/branding/lens/lens-icon.png",
    href: "https://lens.starkv.is",
    glow: "drop-shadow-[0_0_7px_rgba(167,91,255,0.52)]",
    hoverGlow: "hover:drop-shadow-[0_0_11px_rgba(190,120,255,0.74)] focus-visible:drop-shadow-[0_0_11px_rgba(190,120,255,0.74)]",
  },
  {
    name: "FORGE",
    src: "/branding/forge/forge-icon.png",
    glow: "drop-shadow-[0_0_7px_rgba(255,125,45,0.48)]",
  },
  {
    name: "SIGNAL",
    src: "/branding/signal/signal-icon.png",
    glow: "drop-shadow-[0_0_7px_rgba(67,174,255,0.5)]",
  },
  {
    name: "TRACE",
    src: "/branding/trace/trace-icon.png",
    glow: "drop-shadow-[0_0_7px_rgba(255,65,177,0.5)]",
  },
] as const;

export default function Home() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notifyWrapperRef = useRef<HTMLDivElement | null>(null);
  const [launching, setLaunching] = useState(false);
  const [blackout, setBlackout] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [notifyStatus, setNotifyStatus] = useState<NotifyStatus>("idle");

  const launchControlClassName =
    "enter-button condensed-type flex h-[35px] w-[142px] items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.04] text-[0.61rem] font-medium uppercase tracking-[0.25em] text-[#F4F7F6] backdrop-blur-[12px] transition-[background-color,border-color,color,backdrop-filter,transform] duration-300 ease-out hover:border-[#00C2B3]/70 hover:bg-white/[0.06] hover:text-[#00C2B3] focus-visible:border-[#00C2B3]/70 focus-visible:outline-none focus-visible:ring-0 active:translate-y-[2px] disabled:cursor-default disabled:opacity-100 [text-shadow:none]";
  const launchIconClassName =
    "enter-button inline-flex h-[29px] w-[29px] items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.04] text-[#F4F7F6] backdrop-blur-[12px] transition-[background-color,border-color,color,backdrop-filter,transform] duration-300 ease-out hover:border-[#00C2B3]/70 hover:bg-white/[0.06] hover:text-[#00C2B3] focus-visible:border-[#00C2B3]/70 focus-visible:outline-none focus-visible:ring-0 active:translate-y-[2px] disabled:cursor-default disabled:opacity-100";
  useEffect(() => {
    return () => {
      if (navigateTimerRef.current) {
        clearTimeout(navigateTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!notifyOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const container = notifyWrapperRef.current;
      if (!container || container.contains(event.target as Node)) {
        return;
      }

      setNotifyOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [notifyOpen]);

  const handleEnter = () => {
    if (launching) {
      return;
    }

    setNotifyOpen(false);
    setLaunching(true);

    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      video.volume = 1;
      void video.play().catch(() => {
        // Playback should start from the user gesture, but we keep the
        // transition quiet if a browser still declines it.
      });
    }
  };

  const handleVideoEnded = () => {
    setBlackout(true);

    navigateTimerRef.current = setTimeout(() => {
      router.replace("/sagorna");
    }, 400);
  };

  const handleNotifySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextEmail = email.trim();
    if (!nextEmail) {
      setNotifyStatus("invalid");
      return;
    }

    setNotifyStatus("loading");

    try {
      const response = await fetch("/api/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: nextEmail }),
      });

      if (response.status === 200) {
        setEmail("");
        setNotifyStatus("success");
        return;
      }

      if (response.status === 409) {
        setNotifyStatus("duplicate");
        return;
      }

      if (response.status === 400) {
        setNotifyStatus("invalid");
        return;
      }

      setNotifyStatus("error");
    } catch {
      setNotifyStatus("error");
    }
  };

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-black">
      <div
        className={`absolute inset-0 bg-center bg-cover bg-no-repeat transition-opacity duration-[600ms] ease-out ${
          launching ? "opacity-0" : "opacity-100"
        }`}
        style={{ backgroundImage: "url('/intro-bakgrund.jpeg')" }}
        aria-hidden="true"
      />

      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[600ms] ease-out ${
          launching ? "opacity-100" : "opacity-0"
        }`}
        src="/launch-ambient.mp4"
        playsInline
        preload="auto"
        onEnded={handleVideoEnded}
        aria-hidden="true"
      />

      <div
        className={`absolute inset-0 bg-black transition-opacity duration-[400ms] ease-out ${
          blackout ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden="true"
      />

      <Link
        href="/"
        aria-label="STARKVIS"
        className={`absolute left-6 top-6 z-20 block transition-opacity duration-[200ms] ease-out hover:opacity-90 focus-visible:outline-none focus-visible:ring-0 sm:left-10 sm:top-8 ${
          launching ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
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

      <div className="absolute right-4 top-4 z-20 flex flex-nowrap items-center gap-2">
        {productIcons.map((product) => {
          const icon = (
            <Image
              src={product.src}
              alt=""
              width={96}
              height={96}
              quality={100}
              className={`h-[41px] w-[41px] object-contain transition-[filter,opacity,transform] duration-300 ease-out ${product.glow}`}
            />
          );

          if ("href" in product) {
            return (
              <a
                key={product.name}
                href={product.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open STARKVIS ${product.name}`}
                className={`inline-flex h-[57px] w-[57px] items-center justify-center rounded-[16px] transition-[filter,opacity,transform] duration-300 ease-out hover:scale-[1.04] focus-visible:scale-[1.04] focus-visible:outline-none focus-visible:ring-0 ${product.hoverGlow}`}
              >
                {icon}
              </a>
            );
          }

          return (
            <span
              key={product.name}
              aria-hidden="true"
              className="inline-flex h-[57px] w-[57px] cursor-default items-center justify-center rounded-[16px]"
            >
              {icon}
            </span>
          );
        })}
      </div>


      <section
        className={`absolute left-1/2 top-[44vh] z-20 w-[min(90vw,34rem)] -translate-x-1/2 -translate-y-1/2 px-4 text-center sm:top-[43vh] sm:w-[min(84vw,38rem)] transition-opacity duration-[600ms] ease-out ${
          launching ? "opacity-0" : "opacity-100"
        } ${launching ? "pointer-events-none" : ""}`}
      >
        <h1 className="condensed-type mx-auto max-w-[14ch] text-[clamp(1.55rem,4.2vw,4rem)] font-semibold uppercase leading-[0.74] tracking-[0.1em] text-[#F4F7F6] [text-shadow:none] text-balance">
          <span className="block">THE PATTERN</span>
          <span className="block">WAS ALWAYS THERE.</span>
        </h1>

        <p className="condensed-type mx-auto mt-[clamp(2.4rem,5vw,4rem)] max-w-[22ch] text-[clamp(0.9rem,1.8vw,1.25rem)] font-medium leading-[1.1] tracking-[0.13em] text-[#00C2B3]/70 [text-shadow:none]">
          You just couldn&apos;t see it.
        </p>

        <button
          type="button"
          onClick={handleEnter}
          disabled={launching}
          aria-disabled={launching}
          className={`${launchControlClassName} mx-auto mt-[clamp(3rem,7vw,5rem)] h-20 w-[288px] text-[1.08rem]`}
        >
          ENTER
        </button>
      </section>

      <div
        className={`absolute inset-x-0 bottom-6 z-20 px-6 transition-opacity duration-[600ms] ease-out sm:bottom-8 sm:px-10 ${
          launching ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <div className="mx-auto grid w-full max-w-7xl grid-cols-[1fr_auto_1fr] items-end">
          <div ref={notifyWrapperRef} className="relative flex justify-start">
            {notifyOpen ? (
              <div className="absolute bottom-full left-0 mb-3 w-[min(92vw,24rem)] rounded-[16px] border border-white/10 bg-white/[0.04] p-4 text-left backdrop-blur-[12px] sm:w-[24rem]">
                <form onSubmit={handleNotifySubmit} className="space-y-4">
                  <div className="space-y-2 text-[#F4F7F6]">
                    <p className="condensed-type text-[0.84rem] font-semibold uppercase tracking-[0.2em]">
                      Stay close to the journey.
                    </p>
                    <p className="text-sm leading-6 text-[#F4F7F6]/80">
                      Be among the first to experience STARKVIS.
                    </p>
                    <p className="text-sm leading-6 text-[#F4F7F6]/70">
                      We&apos;ll only email you when there&apos;s something genuinely worth
                      sharing - major milestones, early access, and important discoveries.
                    </p>
                    <p className="text-sm leading-6 text-[#F4F7F6]/70">No spam. Ever.</p>
                  </div>

                  {notifyStatus !== "idle" ? (
                    <div
                      className={`rounded-[14px] border px-3 py-2 text-sm leading-6 ${
                        notifyStatus === "success"
                          ? "border-[#00C2B3]/30 bg-[#00C2B3]/10 text-[#F4F7F6]"
                          : notifyStatus === "duplicate"
                            ? "border-white/10 bg-white/[0.03] text-[#F4F7F6]/85"
                            : notifyStatus === "invalid"
                              ? "border-white/10 bg-white/[0.03] text-[#F4F7F6]/78"
                              : "border-white/10 bg-white/[0.03] text-[#F4F7F6]/78"
                      }`}
                      aria-live="polite"
                    >
                      {notifyStatus === "loading" ? (
                        "Loading..."
                      ) : notifyStatus === "success" ? (
                        <>
                          <span className="block">✓ Thank you.</span>
                          <span className="mt-1 block">We&apos;ll let you know when STARKVIS is ready.</span>
                        </>
                      ) : notifyStatus === "duplicate" ? (
                        "You&apos;re already on the list."
                      ) : notifyStatus === "invalid" ? (
                        "Please enter a valid email address."
                      ) : (
                        "Something went wrong. Please try again."
                      )}
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="Email address"
                      disabled={notifyStatus === "loading"}
                      className="h-12 w-full rounded-[16px] border border-white/10 bg-black/20 px-4 text-sm text-[#F4F7F6] placeholder:text-[#F4F7F6]/35 outline-none transition-colors duration-300 ease-out focus:border-[#00C2B3]/70"
                    />
                    <button type="submit" disabled={notifyStatus === "loading"} className={`${launchControlClassName} w-full`}>
                      {notifyStatus === "loading" ? "Loading..." : "Send"}
                    </button>
                  </div>
                </form>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setNotifyStatus("idle");
                setNotifyOpen((current) => !current);
              }}
              disabled={launching}
              aria-expanded={notifyOpen}
              aria-disabled={launching}
              className={launchControlClassName}
            >
              Notify Me
            </button>
          </div>

          <a
            href="https://www.instagram.com/starkv.is/"
            className={`${launchIconClassName} mb-[1px]`}
            aria-label="Instagram"
            target="_self"
            rel="noreferrer"
          >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              className="h-[18px] w-[18px]"
            >
              <path
                d="M7.5 3.75h9A3.75 3.75 0 0 1 20.25 7.5v9A3.75 3.75 0 0 1 16.5 20.25h-9A3.75 3.75 0 0 1 3.75 16.5v-9A3.75 3.75 0 0 1 7.5 3.75Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <circle cx="12" cy="12" r="3.1" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="16.75" cy="7.35" r="0.9" fill="currentColor" />
            </svg>
          </a>

          <div className="flex justify-end">
            <span title="Coming soon" className="inline-block">
              <button
                type="button"
                disabled
                aria-disabled
                className={`${launchControlClassName} pointer-events-none cursor-default opacity-70`}
              >
                Contact
              </button>
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
