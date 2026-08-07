"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { getSagornaContentTypeMeta } from "./sagorna-content";
import { SagornaItemCard, SagornaModalBody } from "./sagorna-render";
import { SagornaIconButton } from "./sagorna-icon-button";
import { useExperienceController } from "./experience-provider";
import {
  findCmsItemBySlug,
  type SagornaItem,
} from "./sagorna-content";
import { listArchivedCmsItems, listPublishedCmsItems } from "@/lib/cms-repository";

const TRACKS = [
  { title: "Iron Frost", src: "/iron-frost.mp3" },
  { title: "Silent Sky", src: "/silent-sky.mp3" },
  { title: "Adaptation", src: "/adaptation.mp3" },
  { title: "Affordance", src: "/affordance.mp3" },
  { title: "Constraints", src: "/constraints.mp3" },
  { title: "Emergence", src: "/emergence.mp3" },
  { title: "The Pattern", src: "/the-pattern.mp3" },
  { title: "Ginnungagap", src: "/ginnungagap.mp3" },
] as const;

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    return "0:00";
  }

  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

type SagornaWorkspaceProps = {
  activeSlug?: string;
};

export function SagornaWorkspace({ activeSlug }: SagornaWorkspaceProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loadedTrackRef = useRef("");
  const soundEnabledRef = useRef(true);
  const isPlayingRef = useRef(false);
  const backgroundPausedRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveFocusedSlug, setArchiveFocusedSlug] = useState("");
  const [archiveItems, setArchiveItems] = useState<SagornaItem[]>([]);
  const [items, setItems] = useState<SagornaItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const {
    musicEnabled,
    animationEnabled,
    volume,
    currentTrack,
    playbackPosition,
    hydrated,
    setMusicEnabled,
    setAnimationEnabled,
    setCurrentTrack,
    setPlaybackPosition,
  } = useExperienceController();

  const controllerReady = hydrated;

  const activeTrack = useMemo(() => TRACKS[currentTrack] ?? TRACKS[0], [currentTrack]);
  const soundEnabled = musicEnabled;
  const backgroundPaused = !animationEnabled;
  const displayedTime = currentTime || playbackPosition;
  const activeItem = useMemo(() => {
    if (!activeSlug) {
      return null;
    }

    return findCmsItemBySlug(items, activeSlug);
  }, [activeSlug, items]);
  const archiveFocusedItem = useMemo(() => {
    if (!archiveFocusedSlug) {
      return null;
    }

    return findCmsItemBySlug(archiveItems, archiveFocusedSlug);
  }, [archiveFocusedSlug, archiveItems]);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const [reloadedPublished, reloadedArchived] = await Promise.all([
          listPublishedCmsItems(),
          listArchivedCmsItems(),
        ]);

        if (!cancelled) {
          setItems(reloadedPublished);
          setArchiveItems(reloadedArchived);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    };

    void refresh();
    const interval = window.setInterval(() => {
      void refresh();
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!loaded || !activeSlug) {
      return;
    }

    if (!activeItem) {
      router.replace("/sagorna");
    }
  }, [activeSlug, activeItem, loaded, router]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    backgroundPausedRef.current = backgroundPaused;
  }, [backgroundPaused]);

  useLayoutEffect(() => {
    const video = videoRef.current;
    if (!video || backgroundPausedRef.current) {
      return;
    }

    video.playsInline = true;
    video.muted = true;
    video.volume = 1;

    void video.play()
      .then(() => {
        if (!backgroundPausedRef.current && soundEnabledRef.current && !isPlayingRef.current) {
          requestAnimationFrame(() => {
            const currentVideo = videoRef.current;
            if (currentVideo && !backgroundPausedRef.current && soundEnabledRef.current && !isPlayingRef.current) {
              currentVideo.muted = false;
            }
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (backgroundPaused) {
      video.pause();
      return;
    }

    video.volume = 1;
    video.muted = isPlaying || !soundEnabled;

    void video.play().catch(() => {});
  }, [backgroundPaused, isPlaying, soundEnabled]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (!controllerReady) {
      return;
    }

    audio.volume = volume;
    audio.muted = !soundEnabled || !isPlayingRef.current;

    const trackChanged = loadedTrackRef.current !== activeTrack.src;
    if (trackChanged) {
      loadedTrackRef.current = activeTrack.src;
      audio.src = activeTrack.src;
      if (Math.abs(audio.currentTime - playbackPosition) > 0.05) {
        audio.currentTime = playbackPosition;
      }

      if (isPlayingRef.current) {
        void audio.play().catch(() => {
          setIsPlaying(false);
        });
      }
    } else if (!isPlayingRef.current) {
      audio.pause();
    }
  }, [activeTrack.src, controllerReady, playbackPosition, soundEnabled, volume]);

  useEffect(() => {
    if (!activeItem) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        router.push("/sagorna");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeItem, router]);

  const togglePlayback = () => {
    const audio = audioRef.current;
    const video = videoRef.current;
    if (!audio) {
      return;
    }

    if (isPlaying) {
      audio.pause();
      if (video) {
        video.muted = !soundEnabled;
      }
      setIsPlaying(false);
      return;
    }

    if (video) {
      video.muted = true;
    }

    audio.muted = !soundEnabled;
    void audio.play().then(() => {
      setIsPlaying(true);
    });
  };

  const toggleSound = () => {
    const nextValue = !musicEnabled;
    setMusicEnabled(nextValue);

    const audio = audioRef.current;
    if (audio) {
      audio.muted = !nextValue || !isPlayingRef.current;
      audio.volume = volume;
    }

    const video = videoRef.current;
    if (video) {
      video.muted = !nextValue || isPlayingRef.current;
    }
  };

  const toggleBackground = () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const next = !animationEnabled;
    setAnimationEnabled(next);

    if (!next) {
      void video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  const selectTrack = (index: number) => {
    const nextTrack = Math.max(0, Math.min(TRACKS.length - 1, index));
    setCurrentTrack(nextTrack);
    setPlaybackPosition(0);

  const audio = audioRef.current;
  if (audio) {
    audio.currentTime = 0;
  }
  };

  const handleTrackChange = (event: ChangeEvent<HTMLSelectElement>) => {
    selectTrack(Number(event.target.value));
  };

  const handleSeek = (event: ChangeEvent<HTMLInputElement>) => {
    const nextTime = Number(event.target.value);
    setCurrentTime(nextTime);
    setPlaybackPosition(nextTime);

    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = nextTime;
    }
  };

  const handleTrackEnded = () => {
    const nextTrack = (currentTrack + 1) % TRACKS.length;
    setCurrentTrack(nextTrack);
    setPlaybackPosition(0);
  };

  const archivedItems = useMemo(
    () => [...archiveItems].sort((left, right) => left.createdAt - right.createdAt),
    [archiveItems],
  );

  const closeModal = () => {
    router.push("/sagorna");
  };

  const closeArchive = () => {
    setArchiveFocusedSlug("");
    setArchiveOpen(false);
  };

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-black">
      <Link
        href="/"
        aria-label="STARKVIS"
        className="absolute left-6 top-6 z-[25] block transition-opacity duration-[200ms] ease-out hover:opacity-90 focus-visible:outline-none focus-visible:ring-0 sm:left-10 sm:top-8"
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

      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        src="/sagorna-bakgrund.mp4"
        autoPlay
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
      />

      <audio
        ref={audioRef}
        preload="auto"
        onEnded={handleTrackEnded}
        onTimeUpdate={(event) => {
          const nextTime = event.currentTarget.currentTime;
          setCurrentTime(nextTime);
          setPlaybackPosition(nextTime);
        }}
        onLoadedMetadata={(event) => {
          setDuration(event.currentTarget.duration || 0);
          setCurrentTime(playbackPosition);
        }}
      />

      <div className="absolute inset-0 z-10 pointer-events-none">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/sagorna/${item.slug}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
            style={{ left: `${item.position.x}%`, top: `${item.position.y}%` }}
          >
            <SagornaItemCard item={item} size="regular" />
          </Link>
        ))}
      </div>

      <div className="absolute bottom-4 right-4 z-20 w-[min(92vw,15rem)] rounded-[16px] border border-white/10 bg-white/[0.04] p-2.5 backdrop-blur-[12px]">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="condensed-type text-[0.56rem] font-semibold uppercase tracking-[0.24em] text-[#F4F7F6]/70">
              Music
            </p>
            <p className="mt-1 truncate text-[0.7rem] text-[#F4F7F6]">{activeTrack.title}</p>
            <p className="mt-0.5 text-[0.6rem] text-[#F4F7F6]/55">
              {formatTime(displayedTime)} / {formatTime(duration)}
            </p>
          </div>

          <button
            type="button"
            onClick={togglePlayback}
            className="enter-button inline-flex h-8 w-8 items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.04] text-[#F4F7F6] backdrop-blur-[12px] transition-[background-color,border-color,color,backdrop-filter,transform] duration-300 ease-out hover:border-[#00C2B3]/70 hover:bg-white/[0.06] hover:text-[#00C2B3] focus-visible:border-[#00C2B3]/70 focus-visible:outline-none focus-visible:ring-0 active:translate-y-[2px]"
            aria-label={isPlaying ? "Pause music" : "Play music"}
          >
            {isPlaying ? (
              <span className="flex gap-1">
                <span className="h-3 w-1 rounded-full bg-current" />
                <span className="h-3 w-1 rounded-full bg-current" />
              </span>
            ) : (
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                <path d="M8 5.5v13l11-6.5-11-6.5Z" />
              </svg>
            )}
          </button>
        </div>

        <div className="mt-2">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step="0.01"
            value={Math.min(displayedTime, duration || 0)}
            onChange={handleSeek}
            className="sagorna-range w-full"
            aria-label="Seek within track"
          />
        </div>

        <div className="mt-2 relative">
          <select
            value={currentTrack}
            onChange={handleTrackChange}
            className="sagorna-select h-8 w-full rounded-[12px] border border-white/10 bg-white/[0.03] px-2.5 pr-8 text-[0.58rem] uppercase tracking-[0.22em] text-[#F4F7F6]/80 outline-none transition-[background-color,border-color,color] duration-300 ease-out focus:border-[#00C2B3]/60 focus:text-[#00C2B3]"
            aria-label="Choose track"
          >
            {TRACKS.map((track, index) => (
              <option key={track.title} value={index}>
                {track.title}
              </option>
            ))}
          </select>
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[#F4F7F6]/55"
            fill="none"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={toggleBackground}
          aria-label={backgroundPaused ? "Resume background video" : "Pause background video"}
          className="enter-button inline-flex h-[29px] w-[29px] items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.04] text-[#F4F7F6] backdrop-blur-[12px] transition-[background-color,border-color,color,backdrop-filter,transform,opacity] duration-300 ease-out hover:border-[#00C2B3]/70 hover:bg-white/[0.06] hover:text-[#00C2B3] focus-visible:border-[#00C2B3]/70 focus-visible:outline-none focus-visible:ring-0 active:translate-y-[2px]"
        >
          {backgroundPaused ? (
            <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="currentColor" aria-hidden="true">
              <path d="M8 5.5v13l11-6.5-11-6.5Z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" aria-hidden="true">
              <path
                d="M5 7.5h10.5a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5H5V7.5Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M17 10.25 20.25 8.5v7L17 13.75"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>

        <SagornaIconButton
          ariaLabel={soundEnabled ? "Turn background sound off" : "Turn background sound on"}
          onClick={toggleSound}
          icon={
            soundEnabled ? (
              <svg viewBox="0 0 24 24" className="h-[16px] w-[16px]" fill="none" aria-hidden="true">
                <path d="M4.75 10.5v3h3.2l4.25 3.25V7.25L7.95 10.5h-3.2Z" fill="currentColor" />
                <path d="M15.5 8.5c1.1 1.05 1.75 2.47 1.75 4s-.65 2.95-1.75 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M17.75 6.25c1.7 1.65 2.75 3.92 2.75 6.25s-1.05 4.6-2.75 6.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-[16px] w-[16px]" fill="none" aria-hidden="true">
                <path d="M4.75 10.5v3h3.2l4.25 3.25V7.25L7.95 10.5h-3.2Z" fill="currentColor" />
                <path d="M16.25 8.25 20 12l-3.75 3.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M20 8.25 16.25 12 20 15.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )
          }
        />
      </div>

      <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 pointer-events-auto">
        <Link
          href="/"
          aria-label="Go back to the launch page"
          className="enter-button inline-flex h-[29px] w-[29px] items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.04] text-[#F4F7F6] backdrop-blur-[12px] transition-[background-color,border-color,color,backdrop-filter,transform,opacity] duration-300 ease-out hover:border-[#00C2B3]/70 hover:bg-white/[0.06] hover:text-[#00C2B3] focus-visible:border-[#00C2B3]/70 focus-visible:outline-none focus-visible:ring-0 active:translate-y-[2px]"
        >
          <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" aria-hidden="true">
            <path d="M14.5 6.5 8 12l6.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>

        <button
          type="button"
          onClick={() => setArchiveOpen(true)}
          aria-label="Open archive"
          className="enter-button inline-flex h-[29px] w-[29px] items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.04] text-[#F4F7F6] backdrop-blur-[12px] transition-[background-color,border-color,color,backdrop-filter,transform,opacity] duration-300 ease-out hover:border-[#00C2B3]/70 hover:bg-white/[0.06] hover:text-[#00C2B3] focus-visible:border-[#00C2B3]/70 focus-visible:outline-none focus-visible:ring-0 active:translate-y-[2px]"
        >
          <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" aria-hidden="true">
            <path d="M5.5 8.5h13v10h-13v-10Z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 8.5V6.75A1.75 1.75 0 0 1 9.75 5h4.5A1.75 1.75 0 0 1 16 6.75V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M9 12h6M9 15h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {activeItem ? (
        <div
          className="fixed inset-0 z-[70] bg-black/72 backdrop-blur-[10px]"
          onClick={closeModal}
        >
          <div
            className="fixed left-4 right-4 top-4 max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-[16px] border border-white/10 bg-[#050607]/95 p-4 text-[#F4F7F6] shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <p className="text-[0.58rem] uppercase tracking-[0.28em] text-[#F4F7F6]/45">
                  {getSagornaContentTypeMeta(activeItem.type).label}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-[#F4F7F6]">{activeItem.title}</h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-[0.6rem] uppercase tracking-[0.22em] text-[#F4F7F6]/45 hover:text-[#F4F7F6]"
              >
                Close
              </button>
            </div>

            <div className="mt-4">
              <SagornaModalBody item={activeItem} />
            </div>
          </div>
        </div>
      ) : null}

      {archiveOpen ? (
        <div
          className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-[10px]"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeArchive();
            }
          }}
        >
          <div
            className="fixed bottom-16 left-4 right-4 top-16 overflow-hidden rounded-[16px] border border-white/10 bg-[#050607]/95 p-4 text-[#F4F7F6] shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <p className="text-[0.58rem] uppercase tracking-[0.28em] text-[#F4F7F6]/45">Archive</p>
                <h2 className="mt-1 text-lg font-semibold text-[#F4F7F6]">Archived Items</h2>
              </div>
              <button
                type="button"
                onClick={closeArchive}
                className="text-[0.6rem] uppercase tracking-[0.22em] text-[#F4F7F6]/45 hover:text-[#F4F7F6]"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid max-h-[calc(100%-3.5rem)] gap-4 overflow-y-auto pr-2 md:grid-cols-3">
              {(["text", "video", "sound"] as const).map((type) => {
                const meta = getSagornaContentTypeMeta(type);
                const list = archivedItems.filter((item) => item.type === type);
                return (
                  <section key={type} className="rounded-[16px] border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-center gap-3">
                      <Image src={meta.iconSrc} alt="" width={32} height={32} className="h-8 w-8 rounded-[10px] object-cover" />
                      <div>
                        <p className="text-[0.58rem] uppercase tracking-[0.24em] text-[#F4F7F6]/50">{meta.label}</p>
                        <p className="text-[0.68rem] text-[#F4F7F6]/45">{list.length} items</p>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      {list.length === 0 ? (
                        <p className="text-sm leading-6 text-[#F4F7F6]/35">No archived items yet.</p>
                      ) : (
                        list.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setArchiveFocusedSlug(item.slug)}
                            className="w-full rounded-[14px] border border-white/10 bg-black/25 p-2.5 text-left"
                          >
                            <p className="truncate text-sm text-[#F4F7F6]">{item.title}</p>
                            <p className="mt-1 line-clamp-2 text-[0.65rem] leading-5 text-[#F4F7F6]/55">
                              {item.excerpt || item.content}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>

          {archiveFocusedItem ? (
            <div
              className="fixed inset-0 z-[65] flex items-center justify-center bg-black/45 px-4 py-4 backdrop-blur-[6px]"
              onClick={() => setArchiveFocusedSlug("")}
            >
              <div
                className="w-full max-w-3xl overflow-hidden rounded-[16px] border border-white/10 bg-[#050607]/96 p-4 text-[#F4F7F6]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <div>
                    <p className="text-[0.58rem] uppercase tracking-[0.28em] text-[#F4F7F6]/45">
                      {getSagornaContentTypeMeta(archiveFocusedItem.type).label}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-[#F4F7F6]">{archiveFocusedItem.title}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setArchiveFocusedSlug("")}
                    className="text-[0.6rem] uppercase tracking-[0.22em] text-[#F4F7F6]/45 hover:text-[#F4F7F6]"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-4">
                  <SagornaModalBody item={archiveFocusedItem} />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
