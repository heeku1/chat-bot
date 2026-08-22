export type RiskLevel = "low" | "medium" | "high";
export type ReviewerMode = "off" | "normal" | "strict";
export type AiProviderName = "openai" | "gemini" | "offline";

export interface BrainInput {
  chatId: string;
  userId: string;
  text: string;
  username?: string;
  firstName?: string;
  isAdmin: boolean;
}

export interface BrainResult {
  reply: string;
  recommendation?: string;
  intent: string;
  risk: RiskLevel;
  requiresApproval: boolean;
  provider: AiProviderName;
  denied?: boolean;
}

export interface RuntimeAiConfig {
  openaiApiKey?: string;
  geminiApiKey?: string;
  systemPrompt?: string;
  reviewerMode: ReviewerMode;
}

export interface JimmyTool {
  name: string;
  description: string;
  risk: RiskLevel;
  requiresApproval: boolean;
}

/** ระดับ 1 — ปลอดภัย: ทำได้ทันทีไม่ต้องยืนยัน */
export const SAFE_TOOLS: JimmyTool[] = [
  { name: "draft_content", description: "Draft content without publishing it", risk: "low", requiresApproval: false },
  { name: "explain_code", description: "Explain code without changing files", risk: "low", requiresApproval: false },
  { name: "summarize_text", description: "Summarize user-provided text", risk: "low", requiresApproval: false },
  { name: "generate_image", description: "Generate an image asset (no system impact)", risk: "low", requiresApproval: false },
  { name: "translate_text", description: "Translate user-provided text", risk: "low", requiresApproval: false },
  { name: "check_members", description: "อ่านและสรุปข้อมูลสมาชิก (read-only)", risk: "low", requiresApproval: false },
  { name: "check_activity", description: "อ่านและสรุปข้อมูลกิจกรรม (read-only)", risk: "low", requiresApproval: false },
];

/**
 * ระดับ 2 — กระทบระบบ/ข้อมูล: ต้องผ่านการยืนยัน ([✅ ยืนยัน]/[❌ ยกเลิก]) ทุกครั้ง
 * ตาม docs/vision-jimmy-brain.md เพื่อป้องกัน AI เข้าใจผิดแล้วแก้ Production เอง
 */
export const RESTRICTED_TOOLS: JimmyTool[] = [
  { name: "edit_database", description: "แก้ไขฐานข้อมูล (Database write/delete)", risk: "high", requiresApproval: true },
  { name: "deploy", description: "Deploy แอปพลิเคชันขึ้น production", risk: "high", requiresApproval: true },
  { name: "restart_server", description: "Restart server/service", risk: "high", requiresApproval: true },
  { name: "delete_file", description: "ลบไฟล์หรือ record", risk: "high", requiresApproval: true },
  { name: "edit_env", description: "แก้ไข ENV / environment variables", risk: "high", requiresApproval: true },
  { name: "send_broadcast", description: "ส่ง Broadcast ถึงผู้ใช้จำนวนมาก", risk: "medium", requiresApproval: true },
];

export const ALL_TOOLS: JimmyTool[] = [...SAFE_TOOLS, ...RESTRICTED_TOOLS];

export function findToolByName(name: string): JimmyTool | undefined {
  return ALL_TOOLS.find((tool) => tool.name === name);
}