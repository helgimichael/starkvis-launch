import { promises as fs } from "fs";
import path from "path";

export type NotifySubscriberRecord = {
  email: string;
  createdAt: string;
  source: "landing";
};

export type AppendSubscriberResult =
  | { ok: true }
  | { ok: false; reason: "invalid-email" | "already-subscribed" };

const SUBSCRIBERS_FILE = path.join(process.cwd(), "data", "notify", "subscribers.ndjson");
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let writeQueue: Promise<AppendSubscriberResult> = Promise.resolve({ ok: true });

function isValidEmail(email: string) {
  return EMAIL_REGEX.test(email);
}

async function ensureStorageDir() {
  await fs.mkdir(path.dirname(SUBSCRIBERS_FILE), { recursive: true });
}

async function readSubscriberLines() {
  try {
    const raw = await fs.readFile(SUBSCRIBERS_FILE, "utf8");
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && (error as { code?: string }).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

export async function appendSubscriber(emailInput: string): Promise<AppendSubscriberResult> {
  const email = emailInput.trim().toLowerCase();
  if (!email || !isValidEmail(email)) {
    return { ok: false as const, reason: "invalid-email" as const };
  }

  const task = async () => {
    await ensureStorageDir();
    const existingLines = await readSubscriberLines();
    const existingEmails = new Set(
      existingLines
        .map((line) => {
          try {
            const parsed = JSON.parse(line) as Partial<NotifySubscriberRecord>;
            return typeof parsed.email === "string" ? parsed.email.trim().toLowerCase() : "";
          } catch {
            return "";
          }
        })
        .filter(Boolean),
    );

    if (existingEmails.has(email)) {
      return { ok: false as const, reason: "already-subscribed" as const };
    }

    const record: NotifySubscriberRecord = {
      email,
      createdAt: new Date().toISOString(),
      source: "landing",
    };

    await fs.appendFile(SUBSCRIBERS_FILE, `${JSON.stringify(record)}\n`, "utf8");
    return { ok: true as const };
  };

  writeQueue = writeQueue.then(task, task);
  return writeQueue;
}
