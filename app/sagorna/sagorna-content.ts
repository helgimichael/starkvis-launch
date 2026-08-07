import { sagornaContentTypes } from "./sagorna-assets";

export const supportedSagornaContentTypes = ["text", "video", "sound"] as const;
export type SupportedSagornaContentType = (typeof supportedSagornaContentTypes)[number];
export type SagornaContentType = string;
export type SagornaStatus = "draft" | "scheduled" | "published" | "archived";
export type SagornaPublishMode = "now" | "scheduled";

export type SagornaItem = {
  id: string;
  slug: string;
  type: SagornaContentType;
  title: string;
  excerpt: string;
  content: string;
  mediaUrl: string;
  thumbnail: string;
  position: {
    x: number;
    y: number;
  };
  status: SagornaStatus;
  publishMode: SagornaPublishMode;
  publishDate?: number;
  publishAt?: string;
  instagramEnabled: boolean;
  series?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  publishedAt?: number;
  archivedAt?: number;
};

export type SagornaCollection = SagornaItem[];

const FALLBACK_TYPE_META = sagornaContentTypes.text;

function toSupportedType(type: SagornaContentType) {
  return supportedSagornaContentTypes.includes(type as SupportedSagornaContentType)
    ? (type as SupportedSagornaContentType)
    : "text";
}

export function getSagornaContentTypeMeta(type: SagornaContentType) {
  return sagornaContentTypes[toSupportedType(type)] ?? FALLBACK_TYPE_META;
}

export function createSagornaId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `sagorna_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function generateExcerpt(content: string, maxLength = 160) {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean))];
}

export function normalizeSeries(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function createEmptySagornaItem(type: SagornaContentType = "text"): SagornaItem {
  const now = Date.now();
  return {
    id: "",
    slug: "",
    type,
    title: "",
    excerpt: "",
    content: "",
    mediaUrl: "",
    thumbnail: "",
    position: {
      x: 68,
      y: 42,
    },
    status: "draft",
    publishMode: "now",
    publishDate: undefined,
    publishAt: undefined,
    instagramEnabled: false,
    series: undefined,
    tags: [],
    createdAt: now,
    updatedAt: now,
    publishedAt: undefined,
    archivedAt: undefined,
  };
}

export function createUniqueSlug(items: SagornaCollection, source: string, excludeId?: string) {
  const base = slugify(source) || "item";
  const taken = new Set(
    items
      .filter((item) => item.id !== excludeId)
      .map((item) => item.slug)
      .filter(Boolean),
  );

  if (!taken.has(base)) {
    return base;
  }

  let index = 2;
  while (taken.has(`${base}-${index}`)) {
    index += 1;
  }

  return `${base}-${index}`;
}

function deriveTitle(type: SagornaContentType, content: string) {
  const trimmed = content.replace(/\s+/g, " ").trim();
  if (trimmed) {
    return trimmed.slice(0, 60);
  }

  return getSagornaContentTypeMeta(type).label;
}

function parseDateLike(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.getTime();
    }
  }

  return undefined;
}

export function isValidMediaReference(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }

  if (trimmed.startsWith("data:") || trimmed.startsWith("/")) {
    return true;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeItemDates(item: SagornaItem) {
  return {
    ...item,
    publishDate: item.status === "scheduled" ? item.publishDate : item.publishDate,
    publishedAt: item.publishedAt,
    archivedAt: item.archivedAt,
  };
}

function buildCanonicalItem(
  candidate: Partial<SagornaItem> & {
    body?: unknown;
    placement?: { x?: unknown; y?: unknown };
    publishState?: unknown;
    publishedAt?: unknown;
    archivedAt?: unknown;
    publishAt?: unknown;
    instagramSummary?: unknown;
  },
  existingItems: SagornaCollection,
  fallbackStatus: SagornaStatus = "draft",
) {
  const type = typeof candidate.type === "string" && candidate.type.trim() ? candidate.type : "";
  if (!type) {
    return null;
  }

  const content = typeof candidate.content === "string" ? candidate.content : typeof candidate.body === "string" ? candidate.body : "";
  const titleSeed =
    typeof candidate.title === "string" && candidate.title.trim()
      ? candidate.title.trim()
      : deriveTitle(type, content);
  const title = titleSeed || getSagornaContentTypeMeta(type).label;
  const slug = typeof candidate.slug === "string" && candidate.slug.trim()
    ? candidate.slug.trim()
    : createUniqueSlug(existingItems, title || type, typeof candidate.id === "string" ? candidate.id : undefined);
  const excerpt =
    typeof candidate.excerpt === "string" && candidate.excerpt.trim()
      ? candidate.excerpt.trim()
      : generateExcerpt(content);
  const mediaUrl = typeof candidate.mediaUrl === "string" ? candidate.mediaUrl : "";
  const thumbnail = typeof candidate.thumbnail === "string" ? candidate.thumbnail : "";
  const position = candidate.position;
  const createdAt = typeof candidate.createdAt === "number" ? candidate.createdAt : Date.now();
  const updatedAt = typeof candidate.updatedAt === "number" ? candidate.updatedAt : createdAt;
  const status =
    candidate.status === "draft" ||
    candidate.status === "scheduled" ||
    candidate.status === "published" ||
    candidate.status === "archived"
      ? candidate.status
      : candidate.publishState === "draft" ||
          candidate.publishState === "scheduled" ||
          candidate.publishState === "published" ||
          candidate.publishState === "archived"
        ? candidate.publishState
        : fallbackStatus;
  const publishMode =
    candidate.publishMode === "scheduled" || candidate.publishMode === "now"
      ? candidate.publishMode
      : status === "scheduled"
        ? "scheduled"
        : "now";
  const publishDate = parseDateLike(candidate.publishDate) ?? parseDateLike(candidate.publishAt);
  const publishAt =
    typeof candidate.publishAt === "string" && candidate.publishAt.trim()
      ? candidate.publishAt.trim()
      : typeof publishDate === "number"
        ? new Date(publishDate).toISOString()
        : undefined;
  const publishedAt = parseDateLike(candidate.publishedAt);
  const archivedAt = parseDateLike(candidate.archivedAt);
  const instagramEnabled =
    typeof candidate.instagramEnabled === "boolean"
      ? candidate.instagramEnabled
      : typeof candidate.instagramSummary === "boolean"
        ? candidate.instagramSummary
        : false;
  const series = normalizeSeries(candidate.series);
  const tags = normalizeTags(candidate.tags);

  if (!position || typeof position.x !== "number" || typeof position.y !== "number") {
    return null;
  }

  return normalizeItemDates({
    id: typeof candidate.id === "string" && candidate.id ? candidate.id : createSagornaId(),
    slug,
    type,
    title,
    excerpt,
    content,
    mediaUrl,
    thumbnail,
    position: {
      x: clampPercent(position.x),
      y: clampPercent(position.y),
    },
    status,
    publishMode,
    publishDate,
    publishAt,
    instagramEnabled,
    series,
    tags,
    createdAt,
    updatedAt,
    publishedAt,
    archivedAt,
  });
}

export function normalizeSagornaItem(entry: unknown, fallbackStatus: SagornaStatus = "draft") {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  return buildCanonicalItem(entry as Partial<SagornaItem>, [], fallbackStatus);
}

function ensureUniqueSlugs(items: SagornaCollection) {
  const seen = new Set<string>();

  return items.map((item) => {
    const baseSlug = slugify(item.slug || item.title || item.excerpt || item.type) || "item";
    let candidate = baseSlug;
    let index = 2;

    while (seen.has(candidate)) {
      candidate = `${baseSlug}-${index}`;
      index += 1;
    }

    seen.add(candidate);
    return {
      ...item,
      slug: candidate,
    };
  });
}

export function normalizeSagornaItems(entry: unknown, fallbackStatus: SagornaStatus = "draft") {
  if (Array.isArray(entry)) {
    const normalized = entry
      .map((item) => normalizeSagornaItem(item, fallbackStatus))
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((left, right) => left.createdAt - right.createdAt);
    return ensureUniqueSlugs(normalized);
  }

  if (!entry || typeof entry !== "object") {
    return [];
  }

  const candidate = entry as Record<string, unknown>;

  if (Array.isArray(candidate.items)) {
    return normalizeSagornaItems(candidate.items, fallbackStatus);
  }

  const groups: SagornaCollection = [];
  (["text", "video", "sound"] as const).forEach((type) => {
    const value = candidate[type];
    if (!Array.isArray(value)) {
      return;
    }

    value.forEach((item) => {
      const normalized = normalizeSagornaItem(item, fallbackStatus);
      if (normalized) {
        groups.push(normalized);
      }
    });
  });

  if (groups.length > 0) {
    return ensureUniqueSlugs(groups.sort((left, right) => left.createdAt - right.createdAt));
  }

  (["drafts", "scheduled", "published", "archived"] as SagornaStatus[]).forEach((status) => {
    const bucket = candidate[status];
    if (!bucket || typeof bucket !== "object") {
      return;
    }

    (["text", "video", "sound"] as const).forEach((type) => {
      const value = (bucket as Record<string, unknown>)[type];
      if (!Array.isArray(value)) {
        return;
      }

      value.forEach((item) => {
        const normalized = normalizeSagornaItem(item, status);
        if (normalized) {
          groups.push({
            ...normalized,
            status,
            publishMode: status === "scheduled" ? "scheduled" : "now",
          });
        }
      });
    });
  });

  return ensureUniqueSlugs(groups.sort((left, right) => left.createdAt - right.createdAt));
}

export function upsertCmsItem(items: SagornaCollection, item: SagornaItem) {
  const next = items.filter((current) => current.id !== item.id);
  next.push(item);
  return next.sort((left, right) => left.createdAt - right.createdAt);
}

export function deleteCmsItem(items: SagornaCollection, id: string) {
  return items.filter((item) => item.id !== id);
}

export function duplicateCmsItem(item: SagornaItem, existingItems: SagornaCollection) {
  const now = Date.now();
  const slugSource = `${item.title || item.type} copy`;

  return prepareCmsItem(
    {
      ...cloneForEditing(item),
      id: createSagornaId(),
      slug: createUniqueSlug(existingItems, slugSource),
      status: "draft",
      publishMode: "now",
      publishDate: undefined,
      publishedAt: undefined,
      archivedAt: undefined,
      createdAt: now,
      updatedAt: now,
    },
    existingItems,
    {
      status: "draft",
      publishMode: "now",
      publishDate: undefined,
      publishedAt: undefined,
      archivedAt: undefined,
    },
  );
}

export function setCmsItemPosition(items: SagornaCollection, id: string, x: number, y: number) {
  return items.map((item) =>
    item.id === id
      ? {
          ...item,
          position: {
            x: clampPercent(x),
            y: clampPercent(y),
          },
          updatedAt: Date.now(),
        }
      : item,
  );
}

export function cloneForEditing(item: SagornaItem) {
  return {
    ...item,
    position: {
      ...item.position,
    },
    tags: [...item.tags],
  };
}

export function getSagornaItemExcerpt(item: Pick<SagornaItem, "excerpt" | "content">) {
  return item.excerpt.trim() || generateExcerpt(item.content);
}

export function createNewSagornaItem(
  type: SagornaContentType = "text",
  existingItems: SagornaCollection = [],
  titleSeed?: string,
) {
  const now = Date.now();
  const title = (titleSeed?.trim() || getSagornaContentTypeMeta(type).label || "Untitled").trim();
  const slug = createUniqueSlug(existingItems, title);

  return {
    id: createSagornaId(),
    slug,
    type,
    title,
    excerpt: "",
    content: "",
    mediaUrl: "",
    thumbnail: "",
    position: {
      x: 68,
      y: 42,
    },
    status: "draft" as const,
    publishMode: "now" as const,
    publishDate: undefined,
    instagramEnabled: false,
    series: undefined,
    tags: [],
    createdAt: now,
    updatedAt: now,
    publishedAt: undefined,
    archivedAt: undefined,
  } satisfies SagornaItem;
}

export function prepareCmsItem(
  item: SagornaItem,
  existingItems: SagornaCollection,
  overrides: Partial<
    Pick<
      SagornaItem,
      "status" | "publishMode" | "publishDate" | "publishAt" | "instagramEnabled" | "publishedAt" | "archivedAt"
    >
  > = {},
) {
  const now = Date.now();
  const title = item.title.trim() || getSagornaContentTypeMeta(item.type).label;
  const content = item.content.trim();
  const excerpt = item.excerpt.trim() || generateExcerpt(content);

  return {
    ...item,
    id: item.id || createSagornaId(),
    slug: item.slug.trim() || createUniqueSlug(existingItems, title, item.id || undefined),
    title,
    excerpt,
    content,
    mediaUrl: item.mediaUrl.trim(),
    thumbnail: item.thumbnail.trim(),
    position: {
      x: clampPercent(item.position.x),
      y: clampPercent(item.position.y),
    },
    status: overrides.status ?? item.status,
    publishMode: overrides.publishMode ?? item.publishMode,
    publishDate: overrides.publishDate ?? item.publishDate,
    publishAt:
      overrides.publishAt ??
      (overrides.publishMode === "scheduled"
        ? new Date(overrides.publishDate ?? item.publishDate ?? Date.now()).toISOString()
        : item.publishAt),
    instagramEnabled: overrides.instagramEnabled ?? item.instagramEnabled,
    series: normalizeSeries(item.series),
    tags: normalizeTags(item.tags),
    createdAt: item.createdAt || now,
    updatedAt: now,
    publishedAt: overrides.publishedAt ?? item.publishedAt,
    archivedAt: overrides.archivedAt ?? item.archivedAt,
  } satisfies SagornaItem;
}

export function publishCmsItem(item: SagornaItem, existingItems: SagornaCollection) {
  const now = Date.now();
  return prepareCmsItem(item, existingItems, {
    status: "published",
    publishMode: "now",
    publishDate: undefined,
    publishAt: undefined,
    publishedAt: now,
    archivedAt: undefined,
  });
}

export function scheduleCmsItem(item: SagornaItem, existingItems: SagornaCollection, publishDate: number) {
  return prepareCmsItem(item, existingItems, {
    status: "scheduled",
    publishMode: "scheduled",
    publishDate,
    publishAt: new Date(publishDate).toISOString(),
    publishedAt: undefined,
    archivedAt: undefined,
  });
}

export function archiveCmsItem(item: SagornaItem, existingItems: SagornaCollection) {
  const now = Date.now();
  return prepareCmsItem(item, existingItems, {
    status: "archived",
    publishMode: item.publishMode,
    publishedAt: item.publishedAt,
    archivedAt: now,
  });
}

export function restoreCmsItem(item: SagornaItem, existingItems: SagornaCollection) {
  return prepareCmsItem(item, existingItems, {
    status: "draft",
    publishMode: "now",
    publishAt: undefined,
    archivedAt: undefined,
  });
}

export function validateSagornaItem(item: SagornaItem, existingItems: SagornaCollection) {
  const errors: string[] = [];
  const requiresFinalMedia = item.status === "scheduled" || item.status === "published";

  if (requiresFinalMedia && !item.title.trim()) {
    errors.push("Title required");
  }

  if (!item.type.trim()) {
    errors.push("Type required");
  }

  if (!item.status.trim()) {
    errors.push("Status required");
  }

  if (item.status === "scheduled" && typeof item.publishDate !== "number") {
    errors.push("PublishDate required when scheduled");
  }

  if (item.status === "scheduled" && typeof item.publishDate === "number" && item.publishDate <= Date.now()) {
    errors.push("PublishDate must be in the future");
  }

  if (requiresFinalMedia && (item.type === "video" || item.type === "sound") && !item.mediaUrl.trim()) {
    errors.push("Missing media for content type");
  }

  if (!isValidMediaReference(item.mediaUrl)) {
    errors.push("Broken media reference");
  }

  if (!isValidMediaReference(item.thumbnail)) {
    errors.push("Broken thumbnail reference");
  }

  const duplicateSlug = existingItems.find((candidate) => candidate.id !== item.id && candidate.slug === item.slug);
  if (!item.slug.trim() || duplicateSlug) {
    errors.push("Slug must be unique");
  }

  return errors;
}

export function parsePublishDate(date: string, time: string) {
  if (!date || !time) {
    return undefined;
  }

  const parsed = new Date(`${date}T${time}`);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.getTime();
}

export function formatSagornaDateTime(value?: string | number) {
  if (typeof value !== "string" && typeof value !== "number") {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function toDateTimeInputValue(value?: number) {
  if (!value) {
    return { date: "", time: "" };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { date: "", time: "" };
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`,
  };
}

export function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function findCmsItemBySlug(items: SagornaCollection, slug: string) {
  return items.find((item) => item.slug === slug) ?? null;
}
