import { NextResponse } from "next/server";

type NotifyRequestBody = {
  email?: unknown;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_EMAILS_ENDPOINT = "https://api.resend.com/emails";
const NOTIFY_RECIPIENT = "hello@starkv.is";
const NOTIFY_SENDER = "STARKVIS <hello@starkv.is>";

type NotifyErrorReason = "empty-email" | "invalid-email" | "missing-resend-api-key" | "send-failed";

function notifyJson(body: { success: true; message: string } | { success: false; reason: NotifyErrorReason; message: string }, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function isValidEmail(email: string) {
  return EMAIL_REGEX.test(email);
}

export async function POST(request: Request) {
  let body: NotifyRequestBody;

  try {
    body = (await request.json()) as NotifyRequestBody;
  } catch {
    return notifyJson({ success: false, reason: "invalid-email", message: "Submit a valid email address." }, 400);
  }

  if (typeof body.email !== "string") {
    return notifyJson({ success: false, reason: "invalid-email", message: "Submit a valid email address." }, 400);
  }

  const email = body.email.trim().toLowerCase();
  if (!email) {
    return notifyJson({ success: false, reason: "empty-email", message: "Email address is required." }, 400);
  }

  if (!isValidEmail(email)) {
    return notifyJson({ success: false, reason: "invalid-email", message: "Submit a valid email address." }, 400);
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return notifyJson({ success: false, reason: "missing-resend-api-key", message: "Email delivery is not configured." }, 500);
  }

  const timestamp = new Date().toISOString();
  const text = [`Email: ${email}`, `Timestamp: ${timestamp}`, "Source: Landing Page Notify Form"].join("\n");

  try {
    const resendResponse = await fetch(RESEND_EMAILS_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "starkvis-launch-notify-form",
      },
      body: JSON.stringify({
        from: NOTIFY_SENDER,
        to: [NOTIFY_RECIPIENT],
        subject: "New STARKVIS Notify Signup",
        text,
        reply_to: email,
      }),
    });

    if (!resendResponse.ok) {
      return notifyJson({ success: false, reason: "send-failed", message: "Email delivery failed. Please try again." }, 502);
    }
  } catch {
    return notifyJson({ success: false, reason: "send-failed", message: "Email delivery failed. Please try again." }, 502);
  }

  return notifyJson({ success: true, message: "Notify signup delivered." }, 200);
}

export function GET() {
  return NextResponse.json(
    { success: false, reason: "method-not-allowed", message: "Use POST to submit the notify form." },
    { status: 405, headers: { "Cache-Control": "no-store", Allow: "POST" } },
  );
}
