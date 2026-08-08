import { supabase } from "@/lib/supabase-client";
import {
  generateExcerpt,
  normalizeSagornaItems,
  type SagornaCollection,
  type SagornaItem,
} from "@/app/sagorna/sagorna-content";

const CMS_TABLE = "cms_items";
const PUBLIC_SAGORNA_RPC = "list_public_sagorna_items";
type CmsSupabaseClient = typeof supabase;

type CmsItemRow = {
  id: string | number;
  slug?: string | null;
  type?: string | null;
  title?: string | null;
  excerpt?: string | null;
  content?: string | null;
  media_url?: string | null;
  mediaUrl?: string | null;
  thumbnail?: string | null;
  position?: { x?: unknown; y?: unknown } | null;
  status?: string | null;
  publish_mode?: string | null;
  publishMode?: string | null;
  publish_date?: string | number | null;
  publishDate?: string | number | null;
  publish_at?: string | null;
  publishAt?: string | null;
  instagram_enabled?: boolean | null;
  instagramEnabled?: boolean | null;
  series?: string | null;
  tags?: string[] | null;
  created_at?: string | number | null;
  createdAt?: string | number | null;
  updated_at?: string | number | null;
  updatedAt?: string | number | null;
  published_at?: string | number | null;
  publishedAt?: string | number | null;
  archived_at?: string | number | null;
  archivedAt?: string | number | null;
  item?: unknown;
  data?: unknown;
  payload?: unknown;
};

function toTime(value: string | number | null | undefined) {
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

function toIso(value: number | undefined) {
  return typeof value === "number" ? new Date(value).toISOString() : null;
}

function rowToItem(row: CmsItemRow) {
  const jsonSource = row.item ?? row.payload ?? row.data;
  if (jsonSource && typeof jsonSource === "object") {
    return normalizeSagornaItems([jsonSource])[0] ?? null;
  }

  if (typeof row.content === "string" && row.content.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(row.content) as unknown;
      const [item] = normalizeSagornaItems([parsed]);
      if (item) {
        return {
          ...item,
          id: String(row.id),
          slug: row.slug ?? item.slug,
          title: row.title ?? item.title,
          excerpt: row.excerpt ?? item.excerpt,
          status:
            row.status === "draft" || row.status === "scheduled" || row.status === "published" || row.status === "archived"
              ? row.status
              : item.status,
          createdAt: toTime(row.created_at ?? row.createdAt) ?? item.createdAt,
          updatedAt: toTime(row.updated_at ?? row.updatedAt) ?? item.updatedAt,
          publishedAt: toTime(row.published_at ?? row.publishedAt) ?? item.publishedAt,
        };
      }
    } catch {
      // Existing plain-text rows continue through the column mapper below.
    }
  }

  const item = normalizeSagornaItems([
    {
      id: String(row.id),
      slug: row.slug,
      type: row.type ?? "text",
      title: row.title,
      excerpt: row.excerpt,
      content: row.content,
      mediaUrl: row.media_url ?? row.mediaUrl,
      thumbnail: row.thumbnail,
      position: row.position ?? { x: 50, y: 50 },
      status: row.status,
      publishMode: row.publish_mode ?? row.publishMode,
      publishDate: toTime(row.publish_date ?? row.publishDate),
      publishAt: row.publish_at ?? row.publishAt,
      instagramEnabled: row.instagram_enabled ?? row.instagramEnabled,
      series: row.series,
      tags: row.tags,
      createdAt: toTime(row.created_at ?? row.createdAt),
      updatedAt: toTime(row.updated_at ?? row.updatedAt),
      publishedAt: toTime(row.published_at ?? row.publishedAt),
      archivedAt: toTime(row.archived_at ?? row.archivedAt),
    },
  ])[0];

  return item ?? null;
}

function itemToRow(item: SagornaItem) {
  const fullItem = {
    ...item,
    excerpt: item.excerpt.trim() || generateExcerpt(item.content),
  };

  const row: Record<string, unknown> = {
    slug: fullItem.slug,
    title: fullItem.title,
    excerpt: fullItem.excerpt,
    content: JSON.stringify(fullItem),
    status: fullItem.status,
    created_at: toIso(fullItem.createdAt),
    updated_at: toIso(fullItem.updatedAt),
    published_at: toIso(fullItem.publishedAt),
  };

  if (/^\d+$/.test(fullItem.id)) {
    row.id = fullItem.id;
  }

  return row;
}

function isPublishedForPublic(item: SagornaItem) {
  if (item.status === "published") {
    return true;
  }

  return item.status === "scheduled" && typeof item.publishDate === "number" && item.publishDate <= Date.now();
}

function resolvePublicItem(item: SagornaItem) {
  const published = isPublishedForPublic(item);
  return {
    ...item,
    excerpt: item.excerpt.trim() || generateExcerpt(item.content),
    status: published ? ("published" as const) : item.status,
  };
}

function sortByCreatedAt(left: SagornaItem, right: SagornaItem) {
  return left.createdAt - right.createdAt;
}

export async function listCmsItems(cmsClient: CmsSupabaseClient = supabase): Promise<SagornaCollection> {
  const { data, error } = await cmsClient.from(CMS_TABLE).select("*").order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Could not load CMS items: ${error.message}`);
  }

  return normalizeSagornaItems((data ?? []).map((row) => rowToItem(row as CmsItemRow)).filter(Boolean)).sort(sortByCreatedAt);
}

export async function listPublishedCmsItems() {
  const { data, error } = await supabase.rpc(PUBLIC_SAGORNA_RPC);

  if (error) {
    throw new Error(`Could not load published CMS items: ${error.message}`);
  }

  return normalizeSagornaItems(((data ?? []) as unknown[]).map((row) => rowToItem(row as CmsItemRow)).filter(Boolean))
    .map(resolvePublicItem)
    .filter(isPublishedForPublic)
    .sort(sortByCreatedAt);
}

export async function listArchivedCmsItems() {
  return (await listCmsItems()).filter((item) => item.status === "archived").sort(sortByCreatedAt);
}

export async function getPublishedCmsItemBySlug(slug: string) {
  return (await listPublishedCmsItems()).find((item) => item.slug === slug) ?? null;
}

export async function getCmsItemBySlug(slug: string, cmsClient: CmsSupabaseClient = supabase) {
  const { data, error } = await cmsClient.from(CMS_TABLE).select("*").eq("slug", slug).maybeSingle();

  if (error) {
    throw new Error(`Could not load CMS item: ${error.message}`);
  }

  return data ? rowToItem(data as CmsItemRow) : null;
}

export async function upsertCmsItemRecord(item: SagornaItem, cmsClient: CmsSupabaseClient = supabase) {
  const [normalized] = normalizeSagornaItems([item]);
  if (!normalized) {
    throw new Error("Could not save CMS item: invalid item");
  }

  const row = itemToRow(normalized);
  const query = /^\d+$/.test(normalized.id)
    ? cmsClient.from(CMS_TABLE).upsert(row, { onConflict: "id" })
    : cmsClient.from(CMS_TABLE).insert(row);
  const { data, error } = await query.select("*").single();

  if (error) {
    throw new Error(`Could not save CMS item: ${error.message}`);
  }

  const saved = rowToItem(data as CmsItemRow);
  if (!saved) {
    throw new Error("Could not save CMS item: invalid response");
  }

  return saved;
}

export async function deleteCmsItemRecord(id: string, cmsClient: CmsSupabaseClient = supabase) {
  const { error } = await cmsClient.from(CMS_TABLE).delete().eq("id", id);

  if (error) {
    throw new Error(`Could not delete CMS item: ${error.message}`);
  }
}

export async function replaceCmsItems(
  nextItems: SagornaCollection,
  previousItems: SagornaCollection,
  cmsClient: CmsSupabaseClient = supabase,
) {
  const normalized = normalizeSagornaItems(nextItems);
  const nextIds = new Set(normalized.map((item) => item.id));
  const removedIds = previousItems.map((item) => item.id).filter((id) => !nextIds.has(id));

  if (removedIds.length > 0) {
    const { error } = await cmsClient.from(CMS_TABLE).delete().in("id", removedIds);
    if (error) {
      throw new Error(`Could not delete CMS item: ${error.message}`);
    }
  }

  if (normalized.length === 0) {
    return [];
  }

  const existingRows = normalized.filter((item) => /^\d+$/.test(item.id)).map(itemToRow);
  const newRows = normalized.filter((item) => !/^\d+$/.test(item.id)).map(itemToRow);
  const savedRows: unknown[] = [];

  if (existingRows.length > 0) {
    const { data, error } = await cmsClient.from(CMS_TABLE).upsert(existingRows, { onConflict: "id" }).select("*");

    if (error) {
      throw new Error(`Could not save CMS items: ${error.message}`);
    }

    savedRows.push(...(data ?? []));
  }

  if (newRows.length > 0) {
    const { data, error } = await cmsClient.from(CMS_TABLE).insert(newRows).select("*");

    if (error) {
      throw new Error(`Could not save CMS items: ${error.message}`);
    }

    savedRows.push(...(data ?? []));
  }

  return normalizeSagornaItems(savedRows.map((row) => rowToItem(row as CmsItemRow)).filter(Boolean)).sort(sortByCreatedAt);
}
