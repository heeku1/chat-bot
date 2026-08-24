import { inlineKeyboard } from "./client";

/**
 * เมนู 9 ความสามารถตาม docs/vision-jimmy-brain.md
 * ใช้ร่วมกันทั้ง webhook path และ polling path เพื่อไม่ให้ behavior ต่างกัน
 */
export const CAPABILITY_MENU_TEXT = "🎛️ เมนูความสามารถของ Jimmy\nเลือกได้เลย หรือพิมพ์ภาษาไทยธรรมดาก็สั่งได้";

export function buildCapabilityMenu() {
  return inlineKeyboard([
    [
      { text: "💬 คุยกับ AI", callback_data: "cap:chat" },
      { text: "🎨 สร้างภาพ", callback_data: "cap:image" },
    ],
    [
      { text: "✍️ เขียนคอนเทนต์", callback_data: "cap:content" },
      { text: "💻 ช่วยเขียนโค้ด", callback_data: "cap:code" },
    ],
    [
      { text: "📢 สร้างโพสต์", callback_data: "cap:post" },
      { text: "📊 สรุปข้อมูล", callback_data: "cap:summarize" },
    ],
    [
      { text: "👥 เช็กสมาชิก", callback_data: "cap:members" },
      { text: "🎁 เช็กกิจกรรม", callback_data: "cap:activity" },
    ],
    [{ text: "⚙️ เปิดหลังบ้าน", callback_data: "cap:admin" }],
  ]);
}

const CAPABILITY_PROMPTS: Record<string, string> = {
  chat: "💬 พิมพ์คำถามหรือหัวข้อที่อยากคุยได้เลยครับ",
  image: "🎨 บอกรายละเอียดภาพที่ต้องการได้เลยครับ\nเช่น \"สร้างภาพโปรโมตกาแฟ สไตล์มินิมอล\"",
  content: "✍️ บอกหัวข้อ/โจทย์คอนเทนต์ได้เลยครับ\nเช่น \"เขียนคอนเทนต์แนะนำร้านกาแฟใหม่\"",
  code: "💻 ส่งโค้ดหรือ error message มาได้เลยครับ ผมช่วยหาสาเหตุให้",
  post: "📢 บอกหัวข้อโพสต์ที่ต้องการได้เลยครับ เช่น \"สร้างโพสต์โปรโมชั่นสงกรานต์\"",
  summarize: "📊 ส่งข้อความ/ข้อมูลที่ต้องการสรุปมาได้เลยครับ",
  members: "👥 ผมจะสรุปข้อมูลสมาชิกให้ครับ\n(ฟีเจอร์นี้ต้องเชื่อมฐานข้อมูลสมาชิกก่อน — Safe Preview Mode)",
  activity: "🎁 ผมจะสรุปข้อมูลกิจกรรมให้ครับ\n(ฟีเจอร์นี้ต้องเชื่อมฐานข้อมูลกิจกรรมก่อน — Safe Preview Mode)",
};

export interface CapabilityContext {
  isAdmin: boolean;
  runtimeSummary: { running: boolean; provider: string; reviewerMode: string };
  pendingApprovals: number;
  /** URL หน้าเว็บแอดมิน — ถ้ามีจะแถมปุ่ม deep-link "เปิดหลังบ้าน" */
  adminUrl?: string;
}

export interface ResolvedCapability {
  text: string;
  markup?: Record<string, unknown>;
}

/** คืนข้อความ+ปุ่มที่ต้องส่ง หรือ null ถ้าไม่รองรับ/ไม่มีสิทธิ์ */
export function resolveCapability(capabilityId: string, context: CapabilityContext): ResolvedCapability | null {
  if (capabilityId === "admin") {
    if (!context.isAdmin) return null;
    const status = context.runtimeSummary;
    const markup = context.adminUrl
      ? inlineKeyboard([[{ text: "🌐 เปิดหลังบ้าน (Web Admin)", url: context.adminUrl }]])
      : undefined;
    return {
      text: `⚙️ หลังบ้าน (Admin)\n\nTelegram: ${status.running ? "Online" : "Stopped"}\nAI Provider: ${status.provider}\nReviewer: ${capitalize(status.reviewerMode)}\nPending Approvals: ${context.pendingApprovals}\n\nกดปุ่มด้านล่างเพื่อเปิดหน้าเว็บแอดมินได้เลย`,
      markup,
    };
  }
  const prompt = CAPABILITY_PROMPTS[capabilityId];
  return prompt ? { text: prompt } : null;
}

function capitalize(value: string) {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}
