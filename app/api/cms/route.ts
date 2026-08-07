import { NextResponse } from "next/server";
import { writeCmsItemsToDisk } from "@/lib/cms-store";
import { normalizeSagornaItems, type SagornaCollection } from "@/app/sagorna/sagorna-content";

type CmsSyncRequestBody = {
  items?: unknown;
};

export async function POST(request: Request) {
  let body: CmsSyncRequestBody;

  try {
    body = (await request.json()) as CmsSyncRequestBody;
  } catch {
    return NextResponse.json({ success: false, reason: "invalid-payload" }, { status: 400 });
  }

  if (!Array.isArray(body.items)) {
    return NextResponse.json({ success: false, reason: "invalid-payload" }, { status: 400 });
  }

  const items: SagornaCollection = normalizeSagornaItems(body.items);
  await writeCmsItemsToDisk(items);

  return NextResponse.json({ success: true }, { status: 200, headers: { "Cache-Control": "no-store" } });
}

export function GET() {
  return NextResponse.json({ success: false, reason: "method-not-allowed" }, { status: 405 });
}

