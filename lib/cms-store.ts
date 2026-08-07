import { promises as fs } from "fs";
import path from "path";
import {
  generateExcerpt,
  normalizeSagornaItems,
  type SagornaCollection,
  type SagornaItem,
} from "@/app/sagorna/sagorna-content";

const CMS_FILE = path.join(process.cwd(), "data", "cms", "items.json");

async function ensureStorageDir() {
  await fs.mkdir(path.dirname(CMS_FILE), { recursive: true });
}

async function readRawCmsItems() {
  try {
    const raw = await fs.readFile(CMS_FILE, "utf8");
    return JSON.parse(raw) as unknown;
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && (error as { code?: string }).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

function isPublishedForSeo(item: SagornaItem) {
  if (item.status === "published") {
    return true;
  }

  if (item.status === "scheduled" && typeof item.publishDate === "number") {
    return item.publishDate <= Date.now();
  }

  return false;
}

function resolveSeoItem(item: SagornaItem) {
  const published = isPublishedForSeo(item);
  return {
    ...item,
    excerpt: item.excerpt.trim() || generateExcerpt(item.content),
    status: published ? ("published" as const) : item.status,
  };
}

export async function readCmsItemsFromDisk(): Promise<SagornaCollection> {
  const raw = await readRawCmsItems();
  return normalizeSagornaItems(raw).sort((left, right) => left.createdAt - right.createdAt);
}

export async function readPublishedCmsItemsFromDisk() {
  return (await readCmsItemsFromDisk())
    .map(resolveSeoItem)
    .filter(isPublishedForSeo)
    .sort((left, right) => left.createdAt - right.createdAt);
}

export async function readCmsItemBySlugFromDisk(slug: string) {
  return (await readCmsItemsFromDisk()).find((item) => item.slug === slug) ?? null;
}

export async function writeCmsItemsToDisk(items: SagornaCollection) {
  await ensureStorageDir();
  const next = normalizeSagornaItems(items).sort((left, right) => left.createdAt - right.createdAt);
  await fs.writeFile(CMS_FILE, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

