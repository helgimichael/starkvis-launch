import { NextResponse } from "next/server";
import { appendSubscriber, type AppendSubscriberResult } from "@/lib/notify-store";

type NotifyRequestBody = {
  email?: unknown;
};

export async function POST(request: Request) {
  let body: NotifyRequestBody;

  try {
    body = (await request.json()) as NotifyRequestBody;
  } catch {
    return NextResponse.json({ success: false, reason: "invalid-email" }, { status: 400 });
  }

  if (typeof body.email !== "string") {
    return NextResponse.json({ success: false, reason: "invalid-email" }, { status: 400 });
  }

  const result: AppendSubscriberResult = await appendSubscriber(body.email);
  if (!result.ok) {
    return NextResponse.json({ success: false, reason: result.reason }, { status: result.reason === "already-subscribed" ? 409 : 400 });
  }

  return NextResponse.json({ success: true }, { status: 200, headers: { "Cache-Control": "no-store" } });
}

export function GET() {
  return NextResponse.json({ success: false, reason: "method-not-allowed" }, { status: 405 });
}
