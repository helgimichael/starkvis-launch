"use client";

import Image from "next/image";
import type { DragEvent, ReactNode } from "react";
import { getSagornaContentTypeMeta, getSagornaItemExcerpt, type SagornaItem } from "./sagorna-content";

type SagornaCardProps = {
  item: SagornaItem;
  size?: "compact" | "regular";
  dimmed?: boolean;
  draggable?: boolean;
  onClick?: () => void;
  onDragStart?: (event: DragEvent<HTMLDivElement>) => void;
};

export function SagornaItemCard({
  item,
  size = "regular",
  dimmed = false,
  draggable = false,
  onClick,
  onDragStart,
}: SagornaCardProps) {
  const meta = getSagornaContentTypeMeta(item.type);
  const widthClass =
    size === "compact" ? "w-[clamp(8.5rem,14vw,11rem)]" : "w-[clamp(10rem,18vw,16rem)]";
  const excerpt = getSagornaItemExcerpt(item);

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onClick}
      className={`group ${onClick ? "cursor-pointer" : ""} ${dimmed ? "opacity-60" : ""}`}
    >
      <div
        className={`${widthClass} rounded-[16px] border border-white/10 bg-black/55 p-2.5 backdrop-blur-[12px] transition-colors duration-300 ease-out group-hover:border-[#00C2B3]/30`}
      >
        <div className="flex items-start gap-2.5">
          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-[12px] border border-white/10 bg-white/[0.04]">
            <Image src={meta.iconSrc} alt="" fill className="object-cover" />
          </div>
          <div className="min-w-0">
            <p className="text-[0.52rem] uppercase tracking-[0.18em] text-[#F4F7F6]/45">{meta.label}</p>
            <p className="mt-1 truncate text-[0.8rem] text-[#F4F7F6]">{item.title || meta.label}</p>
            {excerpt ? <p className="mt-1 line-clamp-2 text-[0.6rem] leading-4 text-[#F4F7F6]/72">{excerpt}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

type SagornaModalBodyProps = {
  item: SagornaItem;
};

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url);
}

function isAudioUrl(url: string) {
  return /\.(mp3|wav|ogg|m4a)(\?.*)?$/i.test(url);
}

function isYouTubeUrl(url: string) {
  return /(?:youtube\.com\/watch\?v=|youtu\.be\/)/i.test(url);
}

function youtubeEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);
    const id =
      parsed.hostname.includes("youtu.be")
        ? parsed.pathname.replace("/", "")
        : parsed.searchParams.get("v") ?? "";
    return id ? `https://www.youtube.com/embed/${id}` : "";
  } catch {
    return "";
  }
}

function MediaBlock({ item }: SagornaModalBodyProps) {
  if (!item.mediaUrl) {
    return null;
  }

  if (item.type === "sound" || isAudioUrl(item.mediaUrl)) {
    return <audio controls className="w-full" src={item.mediaUrl} />;
  }

  if (item.type === "video" || isVideoUrl(item.mediaUrl)) {
    if (isYouTubeUrl(item.mediaUrl)) {
      const embedUrl = youtubeEmbedUrl(item.mediaUrl);
      if (embedUrl) {
        return (
          <iframe
            src={embedUrl}
            title={item.title}
            className="aspect-video w-full rounded-[14px] border border-white/10"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        );
      }
    }

    return <video controls className="aspect-video w-full rounded-[14px] border border-white/10" src={item.mediaUrl} />;
  }

  return (
    <a
      href={item.mediaUrl}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-[#F4F7F6] transition-colors hover:border-[#00C2B3]/35 hover:text-[#00C2B3]"
    >
      Open link
    </a>
  );
}

export function SagornaModalBody({ item }: SagornaModalBodyProps) {
  const meta = getSagornaContentTypeMeta(item.type);
  const body: Record<typeof item.type, ReactNode> = {
    text: (
      <div className="space-y-4">
        {item.thumbnail ? (
          <div className="relative aspect-video w-full overflow-hidden rounded-[14px] border border-white/10">
            <Image src={item.thumbnail} alt="" fill className="object-cover" unoptimized />
          </div>
        ) : null}
        {item.excerpt ? <p className="text-sm leading-7 text-[#F4F7F6]/82">{item.excerpt}</p> : null}
        {item.content ? <p className="whitespace-pre-wrap text-sm leading-7 text-[#F4F7F6]/82">{item.content}</p> : null}
        <MediaBlock item={item} />
      </div>
    ),
    video: (
      <div className="space-y-4">
        <MediaBlock item={item} />
        {item.excerpt ? <p className="text-sm leading-7 text-[#F4F7F6]/78">{item.excerpt}</p> : null}
        {item.content ? <p className="whitespace-pre-wrap text-sm leading-7 text-[#F4F7F6]/78">{item.content}</p> : null}
      </div>
    ),
    sound: (
      <div className="space-y-4">
        <MediaBlock item={item} />
        {item.excerpt ? <p className="text-sm leading-7 text-[#F4F7F6]/78">{item.excerpt}</p> : null}
        {item.content ? <p className="whitespace-pre-wrap text-sm leading-7 text-[#F4F7F6]/78">{item.content}</p> : null}
      </div>
    ),
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[0.58rem] uppercase tracking-[0.24em] text-[#F4F7F6]/45">{meta.label}</p>
        <h3 className="mt-1 text-xl font-semibold text-[#F4F7F6]">{item.title}</h3>
      </div>
      {body[item.type]}
    </div>
  );
}
