import { randomUUID } from "crypto";

export type SuggestionChoice = "apply" | "keep";

export interface PendingSuggestion {
  id: string;
  chatId: string;
  userId: string;
  originalReply: string;
  suggestedReply: string;
  reason: string;
  createdAt: string;
  expiresAt: string;
  status: "pending" | "applied" | "kept" | "expired";
}

const SUGGESTION_TTL_MS = 10 * 60 * 1000;

/**
 * Compresses a long Telegram reply into a short 3-line version.
 * Deterministic (no AI call needed) so the [ใช้แบบแนะนำ] button works even offline.
 */
export function buildThreeLineVersion(reply: string): string {
  const normalized = reply.replace(/\r/g, "").trim();
  if (!normalized) return "";

  const paragraphs = normalized.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  if (paragraphs.length >= 3) return paragraphs.slice(0, 3).join("\n");

  const words = normalized.split(/\s+/);
  const perLine = Math.max(1, Math.ceil(words.length / 3));
  const lines: string[] = [];
  for (let index = 0; index < words.length && lines.length < 3; index += perLine) {
    lines.push(`• ${words.slice(index, index + perLine).join(" ")}`);
  }
  let output = lines.join("\n");
  if (words.length > perLine * 3) output += "\n…";
  return output;
}

/** In-memory store of pending [ใช้แบบแนะนำ]/[ใช้แบบเดิม] choices, mirroring ApprovalStore semantics. */
export class SuggestionStore {
  private readonly records = new Map<string, PendingSuggestion>();

  create(input: Pick<PendingSuggestion, "chatId" | "userId" | "originalReply" | "suggestedReply" | "reason">) {
    this.expireRecords();
    const createdAt = new Date();
    const record: PendingSuggestion = {
      ...input,
      id: randomUUID().replace(/-/g, "").slice(0, 12),
      createdAt: createdAt.toISOString(),
      expiresAt: new Date(createdAt.getTime() + SUGGESTION_TTL_MS).toISOString(),
      status: "pending",
    };
    this.records.set(record.id, record);
    return record;
  }

  resolve(id: string, chatId: string, userId: string, choice: SuggestionChoice) {
    this.expireRecords();
    const record = this.records.get(id);
    if (!record || record.status !== "pending") return null;
    if (record.chatId !== chatId || record.userId !== userId) {
      console.warn(`[suggestion] rejected mismatched callback for ${id}`);
      return null;
    }
    record.status = choice === "apply" ? "applied" : "kept";
    return record;
  }

  countPending(chatId?: string) {
    this.expireRecords();
    return [...this.records.values()].filter((record) => record.status === "pending" && (!chatId || record.chatId === chatId)).length;
  }

  private expireRecords() {
    const now = Date.now();
    for (const record of this.records.values()) {
      if (record.status === "pending" && Date.parse(record.expiresAt) <= now) record.status = "expired";
    }
  }
}
