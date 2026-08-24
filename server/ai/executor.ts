/**
 * Real tool execution behind approvals (docs/vision-jimmy-brain.md Phase 3).
 * หลังผู้ใช้กด [✅ ยืนยัน] intent จะถูกแปลงเป็น action จริงที่นี่ — ไม่มีการหลอกว่าทำแล้ว
 * ถ้า action ใดยังไม่มี backend ที่เชื่อมจริง จะตอบตรง ๆ ว่ายังไม่เปิดใช้งาน
 */
import { RiskLevel } from "./types";

export type RealToolKey = "send_broadcast" | "deploy" | "restart_server" | "unsupported";

export interface ToolExecutionContext {
  /** chat ids ที่เคยคุยกับบอท (จาก ConversationMemory) */
  listBroadcastTargets: () => string[];
  /** ส่งข้อความ broadcast ไปยัง chat เดียว */
  sendBroadcastMessage: (chatId: string, text: string) => Promise<void>;
  /** เรียก Render Deploy Hook (ถ้าตั้ง RENDER_DEPLOY_HOOK_URL ไว้) */
  triggerDeploy: () => Promise<{ ok: boolean; message: string }>;
  /** ตั้ง webhook ใหม่ด้วย URL ปัจจุบัน (self-heal) — ใช้แทน "restart" บนโหมด webhook */
  repairWebhook: () => Promise<{ ok: boolean; message: string }>;
}

export interface ToolExecutionResult {
  ok: boolean;
  message: string;
}

const BROADCAST_TRIGGER = /(broadcast|บรอดแคสต์|ประกาศ|ส่ง(โพสต์|ข้อความ)(ถึง(ทุกคน|ผู้ใช้|สมาชิก))?)/i;
const DEPLOY_TRIGGER = /(deploy|ดีพลอย|deploy production)/i;
const RESTART_TRIGGER = /(restart|รีสตาร์ต|รีสตาร์ท|reboot)/i;
const UNSUPPORTED_TRIGGER = /(database|ฐานข้อมูล|drop\s+(table|database)|ลบไฟล์|ลบข้อมูล|แก้\s*env|\.env\b|edit_env|edit_database|delete_file)/i;

/** แปลงข้อความที่ผ่านการยืนยันแล้ว เป็น tool จริงที่จะรัน */
export function resolveToolFromText(text: string): { tool: RealToolKey; risk: RiskLevel } {
  const normalized = text.trim();
  if (DEPLOY_TRIGGER.test(normalized)) return { tool: "deploy", risk: "high" };
  if (RESTART_TRIGGER.test(normalized)) return { tool: "restart_server", risk: "high" };
  if (UNSUPPORTED_TRIGGER.test(normalized)) return { tool: "unsupported", risk: "high" };
  if (BROADCAST_TRIGGER.test(normalized)) return { tool: "send_broadcast", risk: "medium" };
  return { tool: "unsupported", risk: "medium" };
}

/** ดึงเนื้อหาที่จะ broadcast ออกจากข้อความคำสั่ง เช่น "บรอดแคสต์: โปรโมชั่นวันนี้" → "โปรโมชั่นวันนี้" */
export function extractBroadcastPayload(text: string): string {
  const stripped = text
    .replace(BROADCAST_TRIGGER, " ")
    .replace(/^[\s:：,،-]+/, "")
    .trim();
  return stripped || text.trim();
}

export class ToolExecutor {
  constructor(private readonly context: ToolExecutionContext) {}

  async execute(intent: string, payload: string): Promise<ToolExecutionResult> {
    const { tool } = resolveToolFromText(payload || intent);
    switch (tool) {
      case "send_broadcast":
        return this.broadcast(extractBroadcastPayload(payload));
      case "deploy":
        return this.context.triggerDeploy();
      case "restart_server":
        return this.context.repairWebhook();
      default:
        return {
          ok: false,
          message: "⚠️ Action นี้ยังไม่เปิดใช้งานจริง\n\nปลอดภัยไว้ก่อน — ยังไม่มี backend สำหรับ Database/ENV/File action\nติดต่อแอดมินเพื่อทำด้วยตนเองครับ",
        };
    }
  }

  private async broadcast(text: string): Promise<ToolExecutionResult> {
    const targets = this.context.listBroadcastTargets().filter((chatId) => chatId && chatId !== "unknown");
    if (!targets.length) {
      return { ok: false, message: "📭 ยังไม่มีผู้ใช้ที่เคยคุยกับบอทเลย จึงไม่มีใครรับ broadcast" };
    }
    let sent = 0;
    let failed = 0;
    for (const chatId of targets) {
      try {
        await this.context.sendBroadcastMessage(chatId, `📢 Broadcast\n\n${text}`);
        sent += 1;
      } catch {
        failed += 1;
      }
    }
    return {
      ok: sent > 0,
      message: `📢 Broadcast สำเร็จ\n\nส่งแล้ว: ${sent}/${targets.length} แชต${failed ? `\nล้มเหลว: ${failed} แชต (บล็อกบอทหรือออกจากกลุ่ม)` : ""}\n\nข้อความ: "${text.slice(0, 200)}"`,
    };
  }
}
