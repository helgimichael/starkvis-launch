import { NextResponse } from "next/server";
import { listCmsItems, replaceCmsItems } from "@/lib/cms-repository";
import { createSupabaseRequestClient, supabase } from "@/lib/supabase-client";
import type { SagornaCollection } from "@/app/sagorna/sagorna-content";

type ReplaceCmsItemsBody = {
  nextItems?: unknown;
  previousItems?: unknown;
};

function jsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

async function requireAuthenticatedRequest(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }

  return {
    token,
    user: data.user,
  };
}

function isCmsCollection(value: unknown): value is SagornaCollection {
  return Array.isArray(value);
}

export async function GET(request: Request) {
  const authenticatedRequest = await requireAuthenticatedRequest(request);
  if (!authenticatedRequest) {
    return jsonResponse({ success: false, message: "Authentication required." }, 401);
  }

  try {
    const cmsClient = createSupabaseRequestClient(authenticatedRequest.token);
    const items = await listCmsItems(cmsClient);
    return jsonResponse({ success: true, items }, 200);
  } catch (error) {
    return jsonResponse({ success: false, message: error instanceof Error ? error.message : "Could not load CMS items." }, 500);
  }
}

export async function PUT(request: Request) {
  const authenticatedRequest = await requireAuthenticatedRequest(request);
  if (!authenticatedRequest) {
    return jsonResponse({ success: false, message: "Authentication required." }, 401);
  }

  let body: ReplaceCmsItemsBody;

  try {
    body = (await request.json()) as ReplaceCmsItemsBody;
  } catch {
    return jsonResponse({ success: false, message: "Invalid CMS request body." }, 400);
  }

  if (!isCmsCollection(body.nextItems) || !isCmsCollection(body.previousItems)) {
    return jsonResponse({ success: false, message: "Invalid CMS item collection." }, 400);
  }

  try {
    const cmsClient = createSupabaseRequestClient(authenticatedRequest.token);
    const items = await replaceCmsItems(body.nextItems, body.previousItems, cmsClient);
    return jsonResponse({ success: true, items }, 200);
  } catch (error) {
    return jsonResponse({ success: false, message: error instanceof Error ? error.message : "Could not save CMS items." }, 500);
  }
}
