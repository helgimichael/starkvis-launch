"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type ExperienceController = {
  musicEnabled: boolean;
  animationEnabled: boolean;
  volume: number;
  currentTrack: number;
  playbackPosition: number;
  hydrated: boolean;
};

type ExperienceContextValue = ExperienceController & {
  setMusicEnabled: (value: boolean) => void;
  setAnimationEnabled: (value: boolean) => void;
  setVolume: (value: number) => void;
  setCurrentTrack: (value: number) => void;
  setPlaybackPosition: (value: number) => void;
};

const EXPERIENCE_SETTINGS_KEY = "starkvis.experience.settings.v1";

const DEFAULT_EXPERIENCE_CONTROLLER: ExperienceController = {
  musicEnabled: true,
  animationEnabled: true,
  volume: 1,
  currentTrack: 0,
  playbackPosition: 0,
  hydrated: false,
};

const ExperienceContext = createContext<ExperienceContextValue | null>(null);

function clampVolume(value: number) {
  return Math.max(0, Math.min(1, value));
}

function loadExperienceController(): ExperienceController {
  if (typeof window === "undefined") {
    return DEFAULT_EXPERIENCE_CONTROLLER;
  }

  const raw = window.localStorage.getItem(EXPERIENCE_SETTINGS_KEY);
  if (!raw) {
    return DEFAULT_EXPERIENCE_CONTROLLER;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ExperienceController> & { ambientEnabled?: unknown };
    return {
      musicEnabled: DEFAULT_EXPERIENCE_CONTROLLER.musicEnabled,
      animationEnabled:
        typeof parsed.animationEnabled === "boolean" ? parsed.animationEnabled : DEFAULT_EXPERIENCE_CONTROLLER.animationEnabled,
      volume:
        typeof parsed.volume === "number" && Number.isFinite(parsed.volume)
          ? clampVolume(parsed.volume)
          : DEFAULT_EXPERIENCE_CONTROLLER.volume,
      currentTrack:
        typeof parsed.currentTrack === "number" && Number.isFinite(parsed.currentTrack)
          ? Math.max(0, Math.floor(parsed.currentTrack))
          : DEFAULT_EXPERIENCE_CONTROLLER.currentTrack,
      playbackPosition:
        typeof parsed.playbackPosition === "number" && Number.isFinite(parsed.playbackPosition)
          ? Math.max(0, parsed.playbackPosition)
          : DEFAULT_EXPERIENCE_CONTROLLER.playbackPosition,
      hydrated: false,
    };
  } catch {
    return DEFAULT_EXPERIENCE_CONTROLLER;
  }
}

export function ExperienceProvider({ children }: { children: ReactNode }) {
  const [controller, setController] = useState<ExperienceController>(DEFAULT_EXPERIENCE_CONTROLLER);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      setController({
        ...loadExperienceController(),
        hydrated: true,
      });
      return;
    }

    const { hydrated, playbackPosition, ...persistedController } = controller;
    void hydrated;
    void playbackPosition;
    window.localStorage.setItem(EXPERIENCE_SETTINGS_KEY, JSON.stringify(persistedController));
  }, [controller]);

  const value = useMemo<ExperienceContextValue>(
    () => ({
      ...controller,
      setMusicEnabled: (musicEnabled) => setController((current) => ({ ...current, musicEnabled })),
      setAnimationEnabled: (animationEnabled) => setController((current) => ({ ...current, animationEnabled })),
      setVolume: (volume) => setController((current) => ({ ...current, volume: clampVolume(volume) })),
      setCurrentTrack: (currentTrack) => setController((current) => ({ ...current, currentTrack: Math.max(0, Math.floor(currentTrack)) })),
      setPlaybackPosition: (playbackPosition) =>
        setController((current) => ({ ...current, playbackPosition: Math.max(0, playbackPosition) })),
    }),
    [controller],
  );

  return <ExperienceContext.Provider value={value}>{children}</ExperienceContext.Provider>;
}

export function useExperienceController() {
  const context = useContext(ExperienceContext);
  if (!context) {
    throw new Error("useExperienceController must be used within an ExperienceProvider");
  }

  return context;
}
