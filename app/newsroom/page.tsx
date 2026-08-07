"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent as ReactDragEvent } from "react";
import { SagornaItemCard } from "../sagorna/sagorna-render";
import {
  CMS_CHANGE_EVENT,
  clampPercent,
  cloneForEditing,
  createEmptySagornaItem,
  createNewSagornaItem,
  duplicateCmsItem,
  deleteCmsItem,
  formatSagornaDateTime,
  getSagornaContentTypeMeta,
  loadCmsItemsSafe,
  parsePublishDate,
  prepareCmsItem,
  restoreCmsItem,
  saveCmsItems,
  setCmsItemPosition,
  supportedSagornaContentTypes,
  isValidMediaReference,
  type SagornaContentType,
  type SagornaItem,
  type SagornaStatus,
  upsertCmsItem,
  validateSagornaItem,
} from "../sagorna/sagorna-content";

function matchesQuery(item: SagornaItem, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [
    item.slug,
    item.type,
    item.title,
    item.excerpt,
    item.content,
    item.mediaUrl,
    item.thumbnail,
    item.series ?? "",
    item.tags.join(" "),
    item.status,
    item.publishMode,
    item.publishDate ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function sortByRecency(left: SagornaItem, right: SagornaItem) {
  return right.updatedAt - left.updatedAt || right.createdAt - left.createdAt;
}

function joinTags(tags: string[]) {
  return tags.join(", ");
}

function splitTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
}

export default function NewsroomPage() {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const draggedItemIdRef = useRef("");
  const [items, setItems] = useState<SagornaItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<SagornaItem>(() => createEmptySagornaItem("text"));
  const [search, setSearch] = useState("");
  const [publishDateField, setPublishDateField] = useState("");
  const [publishTimeField, setPublishTimeField] = useState("");
  const [status, setStatus] = useState("Local draft workspace");

  const listItems = useMemo(
    () => [...items].filter((item) => matchesQuery(item, search.trim().toLowerCase())).sort(sortByRecency),
    [items, search],
  );
  const publishedItems = useMemo(
    () => items.filter((item) => item.status === "published").sort((left, right) => left.createdAt - right.createdAt),
    [items],
  );
  const previewRenderItems = publishedItems;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const loaded = loadCmsItemsSafe().sort(sortByRecency);
      setItems(loaded);

      if (loaded.length > 0) {
        const firstItem = loaded[0];
        setSelectedId(firstItem.id);
        setDraft(cloneForEditing(firstItem));
        if (typeof firstItem.publishDate === "number") {
          const date = new Date(firstItem.publishDate);
          const year = date.getFullYear();
          const month = `${date.getMonth() + 1}`.padStart(2, "0");
          const day = `${date.getDate()}`.padStart(2, "0");
          const hours = `${date.getHours()}`.padStart(2, "0");
          const minutes = `${date.getMinutes()}`.padStart(2, "0");
          setPublishDateField(`${year}-${month}-${day}`);
          setPublishTimeField(`${hours}:${minutes}`);
        }
      }
    }, 0);

    const refresh = () => {
      const reloaded = loadCmsItemsSafe().sort(sortByRecency);
      setItems(reloaded);
    };

    window.addEventListener("storage", refresh);
    window.addEventListener(CMS_CHANGE_EVENT, refresh);
    const interval = window.setInterval(refresh, 30000);

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
      window.removeEventListener("storage", refresh);
      window.removeEventListener(CMS_CHANGE_EVENT, refresh);
    };
  }, []);

  const commitItems = (nextItems: SagornaItem[], nextSelectedId?: string) => {
    const sorted = [...nextItems].sort(sortByRecency);
    setItems(sorted);
    saveCmsItems(sorted);

    if (typeof nextSelectedId === "string") {
      setSelectedId(nextSelectedId);
    }
  };

  const selectItem = (item: SagornaItem) => {
    setSelectedId(item.id);
    setDraft(cloneForEditing(item));

    if (typeof item.publishDate === "number") {
      const date = new Date(item.publishDate);
      const year = date.getFullYear();
      const month = `${date.getMonth() + 1}`.padStart(2, "0");
      const day = `${date.getDate()}`.padStart(2, "0");
      const hours = `${date.getHours()}`.padStart(2, "0");
      const minutes = `${date.getMinutes()}`.padStart(2, "0");
      setPublishDateField(`${year}-${month}-${day}`);
      setPublishTimeField(`${hours}:${minutes}`);
    } else {
      setPublishDateField("");
      setPublishTimeField("");
    }
  };

  const createItem = (type: SagornaContentType = "text") => {
    const titleSeed = draft.title.trim() || getSagornaContentTypeMeta(type).label;
    const item = createNewSagornaItem(type, items, titleSeed);
    commitItems(upsertCmsItem(items, item), item.id);
    selectItem(item);
    setStatus("New item created");
  };

  const updateDraft = <K extends keyof SagornaItem>(key: K, value: SagornaItem[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleFileUpload = async (field: "mediaUrl" | "thumbnail", file: File | null) => {
    if (!file) {
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (!dataUrl || !isValidMediaReference(dataUrl)) {
        setStatus("Could not read uploaded file");
        return;
      }

      updateDraft(field, dataUrl as SagornaItem[typeof field]);
      setStatus(`${field === "mediaUrl" ? "Media" : "Thumbnail"} uploaded`);
    } catch {
      setStatus("Could not read uploaded file");
    }
  };

  const duplicateCurrentItem = () => {
    const source = draft.id ? draft : createNewSagornaItem(draft.type, items, draft.title || getSagornaContentTypeMeta(draft.type).label);
    const duplicated = duplicateCmsItem(source, items);
    commitItems(upsertCmsItem(items, duplicated), duplicated.id);
    selectItem(duplicated);
    setStatus("Item duplicated");
  };

  const saveEditorItem = (nextStatus: SagornaStatus, nextPublishDate?: number) => {
    const source = draft.id ? draft : createNewSagornaItem(draft.type, items, draft.title || getSagornaContentTypeMeta(draft.type).label);
    const normalized = prepareCmsItem(
      {
        ...source,
        ...draft,
        tags: draft.tags,
        series: draft.series,
        publishDate: nextPublishDate ?? draft.publishDate,
        publishAt: nextStatus === "scheduled" ? new Date(nextPublishDate ?? Date.now()).toISOString() : draft.publishAt,
        status: nextStatus,
        publishMode: nextStatus === "scheduled" ? "scheduled" : "now",
        publishedAt: nextStatus === "published" ? Date.now() : draft.publishedAt,
        archivedAt: nextStatus === "archived" ? Date.now() : draft.archivedAt,
      },
      items,
      {
        status: nextStatus,
        publishMode: nextStatus === "scheduled" ? "scheduled" : "now",
        publishDate: nextPublishDate ?? (nextStatus === "draft" ? draft.publishDate : undefined),
        publishAt: nextStatus === "scheduled" ? new Date(nextPublishDate ?? Date.now()).toISOString() : draft.publishAt,
        publishedAt: nextStatus === "published" ? Date.now() : undefined,
        archivedAt: nextStatus === "archived" ? Date.now() : undefined,
      },
    );

    const validationErrors = validateSagornaItem(normalized, items.filter((item) => item.id !== normalized.id));
    if (validationErrors.length > 0) {
      setStatus(validationErrors[0]);
      return null;
    }

    commitItems(upsertCmsItem(items, normalized), normalized.id);
    selectItem(normalized);

    if (normalized.status === "published") {
      setStatus("Published to Sagorna");
    } else if (normalized.status === "scheduled") {
      setStatus("Scheduled");
    } else {
      setStatus("Draft saved");
    }

    return normalized;
  };

  const handleSaveDraft = () => {
    saveEditorItem("draft");
  };

  const handlePublishNow = () => {
    saveEditorItem("published");
  };

  const handleSchedule = () => {
    const publishDate = parsePublishDate(publishDateField, publishTimeField);
    if (!publishDate) {
      setStatus("Pick a valid publish date and time");
      return;
    }

    saveEditorItem("scheduled", publishDate);
  };

  const handleArchive = () => {
    if (!draft.id) {
      return;
    }

    const archived = prepareCmsItem(
      {
        ...draft,
        status: "archived",
        publishMode: draft.publishMode,
        publishedAt: draft.publishedAt,
        archivedAt: Date.now(),
      },
      items,
      {
        status: "archived",
        archivedAt: Date.now(),
      },
    );

    commitItems(upsertCmsItem(items, archived), archived.id);
    selectItem(archived);
    setStatus("Archived");
  };

  const handleRestore = () => {
    if (!draft.id) {
      return;
    }

    const restored = restoreCmsItem(draft, items);
    commitItems(upsertCmsItem(items, restored), restored.id);
    selectItem(restored);
    setStatus("Restored to draft");
  };

  const handleDelete = (id: string) => {
    const target = items.find((item) => item.id === id);
    const confirmed = window.confirm(`Delete "${target?.title || "this item"}" permanently?`);
    if (!confirmed) {
      return;
    }

    const nextItems = deleteCmsItem(items, id);
    const nextSelectedId = selectedId === id ? nextItems[0]?.id ?? "" : selectedId;
    commitItems(nextItems, nextSelectedId);

    if (selectedId === id) {
      const next = nextItems[0] ?? createEmptySagornaItem("text");
      setDraft(cloneForEditing(next));
      if (typeof next.publishDate === "number") {
        const date = new Date(next.publishDate);
        const year = date.getFullYear();
        const month = `${date.getMonth() + 1}`.padStart(2, "0");
        const day = `${date.getDate()}`.padStart(2, "0");
        const hours = `${date.getHours()}`.padStart(2, "0");
        const minutes = `${date.getMinutes()}`.padStart(2, "0");
        setPublishDateField(`${year}-${month}-${day}`);
        setPublishTimeField(`${hours}:${minutes}`);
      } else {
        setPublishDateField("");
        setPublishTimeField("");
      }
    }

    setStatus("Deleted permanently");
  };

  const handlePreviewItemDragStart = (event: ReactDragEvent<HTMLDivElement>, item: SagornaItem) => {
    draggedItemIdRef.current = item.id;
    event.dataTransfer.setData("application/x-starkvis-item-id", item.id);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleTypeDragStart = (event: ReactDragEvent<HTMLButtonElement>, type: SagornaContentType) => {
    event.dataTransfer.setData("application/x-starkvis-type", type);
    event.dataTransfer.effectAllowed = "copy";
  };

  const handlePreviewDrop = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    const draggedId = event.dataTransfer.getData("application/x-starkvis-item-id") || draggedItemIdRef.current;

    if (draggedId) {
      const draggedItem = items.find((item) => item.id === draggedId);
      if (!draggedItem) {
        return;
      }

      const nextItems = setCmsItemPosition(items, draggedItem.id, x, y);
      commitItems(nextItems, draggedItem.id);
      const updatedItem = nextItems.find((item) => item.id === draggedItem.id);
      if (updatedItem) {
        setDraft(cloneForEditing(updatedItem));
      }
      draggedItemIdRef.current = "";
      setStatus("Item moved");
      return;
    }

    const type = event.dataTransfer.getData("application/x-starkvis-type") as SagornaContentType;
    if (!supportedSagornaContentTypes.includes(type as (typeof supportedSagornaContentTypes)[number])) {
      return;
    }

    const titleSeed = draft.title.trim() || getSagornaContentTypeMeta(type).label;
    const nextItem = createNewSagornaItem(type, items, titleSeed);
    nextItem.position = {
      x: clampPercent(x),
      y: clampPercent(y),
    };
    commitItems(upsertCmsItem(items, nextItem), nextItem.id);
    selectItem(nextItem);
    setStatus(`New ${getSagornaContentTypeMeta(type).label.toLowerCase()} item placed`);
  };

  const updateItemField = <K extends keyof SagornaItem>(key: K, value: SagornaItem[K]) => {
    updateDraft(key, value);
  };

  return (
    <main className="min-h-dvh bg-[#050607] px-3 py-3 text-[#F4F7F6] sm:px-4 sm:py-4">
      <div className="mx-auto flex max-w-[1800px] flex-col gap-3">
        <header className="border-b border-white/10 pb-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[0.58rem] uppercase tracking-[0.38em] text-[#F4F7F6]/45">Private</p>
              <h1 className="mt-1.5 text-[1.25rem] font-semibold tracking-[0.02em] text-[#F4F7F6] sm:text-[1.5rem]">
                STARKVIS Newsroom
              </h1>
            </div>
            <p className="max-w-sm text-right text-[0.8rem] leading-5 text-[#F4F7F6]/55">{status}</p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(22rem,24rem)_minmax(0,1fr)_minmax(20rem,21rem)]">
          <aside className="grid gap-3 xl:sticky xl:top-4 xl:max-h-[calc(100dvh-2rem)] xl:overflow-y-auto xl:pr-1">
            <section className="rounded-[16px] border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[0.58rem] uppercase tracking-[0.26em] text-[#F4F7F6]/55">Content Type</p>
                <button
                  type="button"
                  onClick={() => createItem(draft.type)}
                  className="text-[0.58rem] uppercase tracking-[0.2em] text-[#F4F7F6]/45 hover:text-[#00C2B3]"
                >
                  + New Item
                </button>
              </div>

              <div className="mt-2.5 grid grid-cols-3 gap-2">
                {supportedSagornaContentTypes.map((type) => {
                  const selected = draft.type === type;
                  const meta = getSagornaContentTypeMeta(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      draggable
                      onDragStart={(event) => handleTypeDragStart(event, type)}
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          type,
                          title: current.title || meta.label,
                        }))
                      }
                      className={`rounded-[14px] border px-2 py-2.5 text-left transition-colors duration-300 ease-out ${
                        selected
                          ? "border-[#00C2B3]/60 bg-white/[0.06] text-[#F4F7F6]"
                          : "border-white/10 bg-black/20 text-[#F4F7F6]/70 hover:border-[#00C2B3]/35 hover:text-[#F4F7F6]"
                      }`}
                    >
                      <div className="flex flex-col items-start gap-2">
                        <Image src={meta.iconSrc} alt="" width={28} height={28} className="h-7 w-7 rounded-[10px] object-cover" />
                        <p className="text-[0.58rem] uppercase tracking-[0.2em]">{meta.label.toUpperCase()}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[16px] border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[0.58rem] uppercase tracking-[0.26em] text-[#F4F7F6]/55">Editor</p>

              <div className="mt-2.5 space-y-2.5">
                <label className="block">
                  <span className="mb-1 block text-[0.55rem] uppercase tracking-[0.2em] text-[#F4F7F6]/45">Title</span>
                  <input
                    value={draft.title}
                    onChange={(event) => updateItemField("title", event.target.value)}
                    className="h-9 w-full rounded-[14px] border border-white/10 bg-black/20 px-3 text-[0.85rem] outline-none transition-colors focus:border-[#00C2B3]/50"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[0.55rem] uppercase tracking-[0.2em] text-[#F4F7F6]/45">
                    Slug
                  </span>
                  <input
                    value={draft.slug}
                    readOnly
                    className="h-9 w-full rounded-[14px] border border-white/10 bg-black/35 px-3 text-[0.78rem] text-[#F4F7F6]/55 outline-none"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[0.55rem] uppercase tracking-[0.2em] text-[#F4F7F6]/45">
                    Excerpt
                  </span>
                  <textarea
                    value={draft.excerpt}
                    onChange={(event) => updateItemField("excerpt", event.target.value)}
                    rows={2}
                    className="w-full rounded-[14px] border border-white/10 bg-black/20 px-3 py-2 text-[0.85rem] outline-none transition-colors focus:border-[#00C2B3]/50"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[0.55rem] uppercase tracking-[0.2em] text-[#F4F7F6]/45">
                    Content
                  </span>
                  <textarea
                    value={draft.content}
                    onChange={(event) => updateItemField("content", event.target.value)}
                    rows={4}
                    className="w-full rounded-[14px] border border-white/10 bg-black/20 px-3 py-2 text-[0.85rem] outline-none transition-colors focus:border-[#00C2B3]/50"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[0.55rem] uppercase tracking-[0.2em] text-[#F4F7F6]/45">
                    Media URL
                  </span>
                  <input
                    value={draft.mediaUrl}
                    onChange={(event) => updateItemField("mediaUrl", event.target.value)}
                    placeholder="Optional"
                    className="h-9 w-full rounded-[14px] border border-white/10 bg-black/20 px-3 text-[0.85rem] outline-none transition-colors focus:border-[#00C2B3]/50"
                  />
                  <div className="mt-1 flex items-center gap-2">
                    <label className="inline-flex h-8 cursor-pointer items-center rounded-[12px] border border-white/10 bg-white/[0.03] px-3 text-[0.55rem] uppercase tracking-[0.18em] text-[#F4F7F6]/70 transition-colors hover:border-[#00C2B3]/35 hover:text-[#00C2B3]">
                      Upload File
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.webp,.mp4,.webm,.mov,.mp3,.wav,.m4a,.flac,.pdf,.docx,.txt,.md"
                        className="hidden"
                        onChange={(event) => {
                          void handleFileUpload("mediaUrl", event.target.files?.[0] ?? null);
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                    <span className="text-[0.55rem] text-[#F4F7F6]/35">or paste URL</span>
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1 block text-[0.55rem] uppercase tracking-[0.2em] text-[#F4F7F6]/45">
                    Thumbnail
                  </span>
                  <input
                    value={draft.thumbnail}
                    onChange={(event) => updateItemField("thumbnail", event.target.value)}
                    placeholder="Optional"
                    className="h-9 w-full rounded-[14px] border border-white/10 bg-black/20 px-3 text-[0.85rem] outline-none transition-colors focus:border-[#00C2B3]/50"
                  />
                  <div className="mt-1 flex items-center gap-2">
                    <label className="inline-flex h-8 cursor-pointer items-center rounded-[12px] border border-white/10 bg-white/[0.03] px-3 text-[0.55rem] uppercase tracking-[0.18em] text-[#F4F7F6]/70 transition-colors hover:border-[#00C2B3]/35 hover:text-[#00C2B3]">
                      Upload File
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.webp,.mp4,.webm,.mov,.mp3,.wav,.m4a,.flac,.pdf,.docx,.txt,.md"
                        className="hidden"
                        onChange={(event) => {
                          void handleFileUpload("thumbnail", event.target.files?.[0] ?? null);
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1 block text-[0.55rem] uppercase tracking-[0.2em] text-[#F4F7F6]/45">
                    Series
                  </span>
                  <input
                    value={draft.series ?? ""}
                    onChange={(event) => updateItemField("series", event.target.value)}
                    placeholder="research, podcast, development..."
                    className="h-9 w-full rounded-[14px] border border-white/10 bg-black/20 px-3 text-[0.85rem] outline-none transition-colors focus:border-[#00C2B3]/50"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[0.55rem] uppercase tracking-[0.2em] text-[#F4F7F6]/45">
                    Tags
                  </span>
                  <input
                    value={joinTags(draft.tags)}
                    onChange={(event) => updateItemField("tags", splitTags(event.target.value))}
                    placeholder="comma-separated"
                    className="h-9 w-full rounded-[14px] border border-white/10 bg-black/20 px-3 text-[0.85rem] outline-none transition-colors focus:border-[#00C2B3]/50"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-[16px] border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[0.58rem] uppercase tracking-[0.26em] text-[#F4F7F6]/55">Publish</p>

              <label className="mt-2.5 flex items-start gap-3 rounded-[12px] border border-white/10 bg-white/[0.03] p-2.5">
                <input
                  type="checkbox"
                  checked={draft.instagramEnabled}
                  onChange={(event) => updateItemField("instagramEnabled", event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-black/20 text-[#00C2B3] focus:ring-0 focus:ring-offset-0"
                />
                <span className="min-w-0">
                  <span className="block text-[0.85rem] text-[#F4F7F6]">Publish to Instagram</span>
                  <span className="mt-1 block text-[0.58rem] leading-4 text-[#F4F7F6]/45">
                    Stored for later use. No API integration yet.
                  </span>
                </span>
              </label>

              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="h-9 rounded-[14px] border border-white/10 bg-white/[0.04] text-[0.58rem] uppercase tracking-[0.2em] text-[#F4F7F6] transition-colors hover:border-[#00C2B3]/45 hover:text-[#00C2B3]"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={handlePublishNow}
                  className="h-9 rounded-[14px] border border-[#00C2B3]/35 bg-[#00C2B3]/10 text-[0.58rem] uppercase tracking-[0.2em] text-[#F4F7F6] transition-colors hover:border-[#00C2B3]/55 hover:bg-[#00C2B3]/15"
                >
                  Publish
                </button>
              </div>

              <button
                type="button"
                onClick={duplicateCurrentItem}
                className="mt-2.5 h-9 w-full rounded-[14px] border border-white/10 bg-black/20 text-[0.58rem] uppercase tracking-[0.2em] text-[#F4F7F6]/70 transition-colors hover:border-[#00C2B3]/35 hover:text-[#00C2B3]"
              >
                Duplicate
              </button>

              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block text-[0.52rem] uppercase tracking-[0.18em] text-[#F4F7F6]/45">
                    Date
                  </span>
                  <input
                    type="date"
                    value={publishDateField}
                    onChange={(event) => setPublishDateField(event.target.value)}
                    className="h-9 w-full rounded-[12px] border border-white/10 bg-black/20 px-2 text-[0.82rem] outline-none focus:border-[#00C2B3]/50"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[0.52rem] uppercase tracking-[0.18em] text-[#F4F7F6]/45">
                    Time
                  </span>
                  <input
                    type="time"
                    value={publishTimeField}
                    onChange={(event) => setPublishTimeField(event.target.value)}
                    className="h-9 w-full rounded-[12px] border border-white/10 bg-black/20 px-2 text-[0.82rem] outline-none focus:border-[#00C2B3]/50"
                  />
                </label>
              </div>

              <div className="mt-2.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSchedule}
                  className="h-9 flex-1 rounded-[14px] border border-white/10 bg-white/[0.04] text-[0.58rem] uppercase tracking-[0.2em] text-[#F4F7F6] transition-colors hover:border-[#00C2B3]/35 hover:text-[#00C2B3]"
                >
                  Schedule
                </button>
                <button
                  type="button"
                  onClick={draft.status === "archived" ? handleRestore : handleArchive}
                  className="h-9 flex-1 rounded-[14px] border border-white/10 bg-black/20 text-[0.58rem] uppercase tracking-[0.2em] text-[#F4F7F6]/70 transition-colors hover:border-[#00C2B3]/35 hover:text-[#00C2B3]"
                >
                  {draft.status === "archived" ? "Restore" : "Archive"}
                </button>
              </div>
            </section>
          </aside>

          <section className="flex flex-col gap-3 xl:sticky xl:top-4">
            <div
              ref={previewRef}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handlePreviewDrop}
              className="relative min-h-[36rem] overflow-hidden rounded-[16px] border border-white/10 bg-black xl:min-h-[calc(100dvh-2rem)]"
            >
              <Image
                src="/sagorna-still.jpeg"
                alt="Sagorna style preview"
                fill
                priority
                className="object-cover opacity-90"
              />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04),transparent_55%)]" />

              {previewRenderItems.map((item) => {
                const meta = getSagornaContentTypeMeta(item.type);
                const opacity = item.status === "published" ? "opacity-100" : "opacity-45";
                const isDraggingDraft = item.id === "__draft_preview__";

                return (
                  <div
                    key={item.id}
                    draggable={!isDraggingDraft}
                    onDragStart={
                      isDraggingDraft ? undefined : (event) => handlePreviewItemDragStart(event, item)
                    }
                    className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 ${opacity}`}
                    style={{ left: `${item.position.x}%`, top: `${item.position.y}%` }}
                  >
                    <SagornaItemCard item={{ ...item, type: meta === undefined ? item.type : item.type }} size="compact" />
                  </div>
                );
              })}

              <div className="absolute left-4 top-4 rounded-[16px] border border-white/10 bg-black/35 px-3 py-2 text-[0.55rem] uppercase tracking-[0.2em] text-[#F4F7F6]/55 backdrop-blur-[12px]">
                Preview canvas
              </div>
            </div>
          </section>

          <aside className="flex flex-col gap-3 xl:max-h-[calc(100dvh-2rem)] xl:overflow-y-auto xl:pr-1">
            <section className="rounded-[16px] border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[0.58rem] uppercase tracking-[0.26em] text-[#F4F7F6]/55">Items</p>
                <button
                  type="button"
                  onClick={() => createItem("text")}
                  className="text-[0.58rem] uppercase tracking-[0.2em] text-[#F4F7F6]/45 hover:text-[#00C2B3]"
                >
                  + New Item
                </button>
              </div>

              <div className="mt-2.5">
                <label className="block">
                  <span className="mb-1 block text-[0.55rem] uppercase tracking-[0.2em] text-[#F4F7F6]/45">Search</span>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search all items"
                    className="h-9 w-full rounded-[14px] border border-white/10 bg-black/20 px-3 text-[0.85rem] outline-none transition-colors focus:border-[#00C2B3]/50"
                  />
                </label>
              </div>

              <div className="mt-2.5 space-y-2">
                {listItems.length === 0 ? (
                  <p className="text-[0.68rem] leading-4 text-[#F4F7F6]/35">No items match the search.</p>
                ) : (
                  listItems.map((item) => {
                    const meta = getSagornaContentTypeMeta(item.type);
                    const selected = item.id === selectedId;
                    return (
                      <div
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => selectItem(item)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            selectItem(item);
                          }
                        }}
                        className={`w-full rounded-[14px] border p-2.5 text-left transition-colors ${
                          selected
                            ? "border-[#00C2B3]/55 bg-white/[0.06]"
                            : "border-white/10 bg-black/20 hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-[12px] border border-white/10 bg-white/[0.04]">
                            <Image src={meta.iconSrc} alt="" fill className="object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[0.8rem] text-[#F4F7F6]">{item.title || meta.label}</p>
                            <p className="mt-1 text-[0.55rem] uppercase tracking-[0.18em] text-[#F4F7F6]/45">
                              {meta.label} · {item.status}
                            </p>
                            <p className="mt-1 text-[0.54rem] text-[#F4F7F6]/35">
                              Created {formatSagornaDateTime(item.createdAt)} · Updated{" "}
                              {formatSagornaDateTime(item.updatedAt)}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (item.status === "archived") {
                                  const restored = restoreCmsItem(item, items);
                                  commitItems(upsertCmsItem(items, restored), restored.id);
                                  if (selectedId === item.id) {
                                    selectItem(restored);
                                  }
                                  setStatus("Restored");
                                } else {
                                  const archived = prepareCmsItem(
                                    {
                                      ...item,
                                      status: "archived",
                                      archivedAt: Date.now(),
                                    },
                                    items,
                                    { status: "archived", archivedAt: Date.now() },
                                  );
                                  commitItems(upsertCmsItem(items, archived), archived.id);
                                  if (selectedId === item.id) {
                                    selectItem(archived);
                                  }
                                  setStatus("Archived");
                                }
                              }}
                              className="text-[0.54rem] uppercase tracking-[0.18em] text-[#F4F7F6]/40 hover:text-[#00C2B3]"
                            >
                              {item.status === "archived" ? "Restore" : "Archive"}
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                const duplicated = duplicateCmsItem(item, items);
                                commitItems(upsertCmsItem(items, duplicated), duplicated.id);
                                selectItem(duplicated);
                                setStatus("Item duplicated");
                              }}
                              className="text-[0.54rem] uppercase tracking-[0.18em] text-[#F4F7F6]/40 hover:text-[#00C2B3]"
                            >
                              Duplicate
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDelete(item.id);
                              }}
                              className="text-[0.54rem] uppercase tracking-[0.18em] text-[#F4F7F6]/30 hover:text-[#F4F7F6]"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
