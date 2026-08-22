import { randomUUID } from "crypto";
import { RiskLevel } from "./types";

export type ApprovalStatus = "pending" | "approved" | "cancelled" | "expired";

export interface PendingApproval {
  id: string;
  chatId: string;
  userId: string;
  intent: string;
  summary: string;
  risk: RiskLevel;
  createdAt: string;
  expiresAt: string;
  status: ApprovalStatus;
}

export class ApprovalStore {
  private readonly records = new Map<string, PendingApproval>();

  create(input: Pick<PendingApproval, "chatId" | "userId" | "intent" | "summary" | "risk">) {
    this.expireRecords();
    const createdAt = new Date();
    const record: PendingApproval = {
      ...input,
      id: randomUUID().replace(/-/g, "").slice(0, 12),
      createdAt: createdAt.toISOString(),
      expiresAt: new Date(createdAt.getTime() + 10 * 60 * 1000).toISOString(),
      status: "pending",
    };
    this.records.set(record.id, record);
    console.info(`[approval] created ${record.id} (${record.risk})`);
    return record;
  }

  resolve(id: string, chatId: string, userId: string, action: "approve" | "cancel") {
    this.expireRecords();
    const record = this.records.get(id);
    if (!record || record.status !== "pending") return null;
    if (record.chatId !== chatId || record.userId !== userId) {
      console.warn(`[approval] rejected mismatched callback for ${id}`);
      return null;
    }
    record.status = action === "approve" ? "approved" : "cancelled";
    console.info(`[approval] ${record.status} ${record.id}`);
    return record;
  }

  countPending(chatId?: string) {
    this.expireRecords();
    return [...this.records.values()].filter((record) => record.status === "pending" && (!chatId || record.chatId === chatId)).length;
  }

  getSafeSummary() {
    this.expireRecords();
    const records = [...this.records.values()];
    const count = (status: ApprovalStatus) => records.filter((record) => record.status === status).length;
    return {
      pending: count("pending"),
      approved: count("approved"),
      cancelled: count("cancelled"),
      expired: count("expired"),
      recent: records.slice(-20).reverse().map((record) => ({
        id: record.id,
        intent: record.intent,
        summary: record.summary,
        risk: record.risk,
        status: record.status,
        createdAt: record.createdAt,
        expiresAt: record.expiresAt,
      })),
    };
  }

  private expireRecords() {
    const now = Date.now();
    for (const record of this.records.values()) {
      if (record.status === "pending" && Date.parse(record.expiresAt) <= now) record.status = "expired";
    }
  }
}