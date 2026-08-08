import { NextResponse } from "next/server";
import { listPublishedCmsItems } from "@/lib/cms-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await listPublishedCmsItems();
    return NextResponse.json(
      { success: true, items },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=30, stale-while-revalidate=120",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Could not load Sagorna items.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
