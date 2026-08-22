import { RiskLevel } from "./types";

const HIGH_RISK = /(deploy|restart\s+(server|service)|production|prod\b|database\s+(write|delete|drop)|drop\s+(database|table)|delete\s+(file|record)|แก้\s*env|\.env|shell\s+command|run\s+(shell|command)|รีสตาร์ต|ดีพลอย|ลบไฟล์|ลบข้อมูล|ฐานข้อมูล)/i;
const MEDIUM_RISK = /(broadcast|publish|send\s+(post|message)|change\s+config|edit\s+file|create\s+file|ส่งโพสต์|บรอดแคสต์|เปลี่ยน.*config|แก้ไฟล์|สร้างไฟล์)/i;

export function classifyIntent(text: string): { intent: string; risk: RiskLevel; summary: string } {
  const normalized = text.trim();
  if (HIGH_RISK.test(normalized)) return { intent: "system_action", risk: "high", summary: normalized.slice(0, 240) };
  if (MEDIUM_RISK.test(normalized)) return { intent: "state_changing_action", risk: "medium", summary: normalized.slice(0, 240) };
  if (/(สรุป|summari[sz]e)/i.test(normalized)) return { intent: "summarize", risk: "low", summary: "Summarize provided content" };
  if (/(แปล|translate)/i.test(normalized)) return { intent: "translate", risk: "low", summary: "Translate provided content" };
  if (/(โพสต์|content|คอนเทนต์|draft)/i.test(normalized)) return { intent: "draft_content", risk: "low", summary: "Draft content" };
  // เมนูความสามารถเพิ่มเติมตาม docs/vision-jimmy-brain.md — ภาษาไทยธรรมดาสั่งได้เลย
  // เช่น "สร้างภาพโปรโมตให้หน่อย", "เช็กสมาชิกกิจกรรมวันนี้"
  if (/((สร้าง|วาด|ทำ|ออกแบบ)\s*(ภาพ|รูป)|(gen(?:erate)?|make|draw|create)\s+(an?\s+)?image)/i.test(normalized)) {
    return { intent: "generate_image", risk: "low", summary: "Generate an image from a description" };
  }
  if (/(เช็กสมาชิก|ดูสมาชิก|สมาชิก|member)/i.test(normalized)) {
    return { intent: "member_check", risk: "low", summary: "Check member information" };
  }
  if (/(เช็กกิจกรรม|ดูกิจกรรม|กิจกรรม|activity)/i.test(normalized)) {
    return { intent: "activity_check", risk: "low", summary: "Check activity information" };
  }
  if (/(error|code|โค้ด|บั๊ก)/i.test(normalized)) return { intent: "explain_code", risk: "low", summary: "Analyze code or an error" };
  return { intent: "general_chat", risk: "low", summary: "General AI conversation" };
}