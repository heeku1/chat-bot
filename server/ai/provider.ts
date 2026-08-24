import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { AiProviderName, RuntimeAiConfig } from "./types";

interface GenerateInput {
  text: string;
  intent?: string;
  recent: Array<{ role: "user" | "assistant"; content: string }>;
  notes: Array<{ content: string }>;
}

export async function generateProviderReply(input: GenerateInput, config: RuntimeAiConfig): Promise<{ reply: string; provider: AiProviderName }> {
  if (config.openaiApiKey?.trim()) {
    try {
      const client = new OpenAI({ apiKey: config.openaiApiKey.trim() });
      const response = await client.responses.create({
        model: "gpt-4.1-mini",
        instructions: buildSystemPrompt(config, input.notes),
        input: input.recent.slice(-12).map((message) => ({ role: message.role, content: message.content })).concat([
          { role: "user" as const, content: input.text },
        ]),
      });
      if (response.output_text?.trim()) return { reply: response.output_text.trim(), provider: "openai" };
    } catch (error: any) {
      console.error(`[ai] OpenAI request failed: ${safeError(error)}`);
    }
  }

  if (config.geminiApiKey?.trim()) {
    try {
      const client = new GoogleGenAI({ apiKey: config.geminiApiKey.trim() });
      const context = input.recent.slice(-12).map((message) => `${message.role}: ${message.content}`).join("\n");
      const response = await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `${context ? `${context}\n` : ""}user: ${input.text}`,
        config: { systemInstruction: buildSystemPrompt(config, input.notes) },
      });
      if (response.text?.trim()) return { reply: response.text.trim(), provider: "gemini" };
    } catch (error: any) {
      console.error(`[ai] Gemini request failed: ${safeError(error)}`);
    }
  }

  return {
    provider: "offline",
    reply: buildOfflineReply(input.intent),
  };
}

export interface GeneratedImage {
  bytes: Buffer;
  mime: string;
  provider: AiProviderName;
}

/**
 * สร้างภาพจริงจาก prompt — Gemini Imagen ก่อน แล้ว fallback เป็น OpenAI gpt-image-1
 * คืน null ถ้าไม่มี key หรือ provider ล้มเหลว (ผู้เรียกต้องมีข้อความ fallback ของตัวเอง)
 */
export async function generateProviderImage(prompt: string, config: RuntimeAiConfig): Promise<{ image: GeneratedImage | null; error?: string }> {
  const trimmedPrompt = prompt.trim().slice(0, 1000);
  if (!trimmedPrompt) return { image: null, error: "empty-prompt" };

  if (config.geminiApiKey?.trim()) {
    try {
      const client = new GoogleGenAI({ apiKey: config.geminiApiKey.trim() });
      const response = await client.models.generateImages({
        model: "imagen-3.0-generate-002",
        prompt: trimmedPrompt,
        config: { numberOfImages: 1, outputMimeType: "image/jpeg", aspectRatio: "1:1" },
      });
      const bytes = response.generatedImages?.[0]?.image?.imageBytes;
      if (bytes) return { image: { bytes: Buffer.from(bytes, "base64"), mime: "image/jpeg", provider: "gemini" } };
    } catch (error: any) {
      console.error(`[ai] Imagen request failed: ${safeError(error)}`);
    }
  }

  if (config.openaiApiKey?.trim()) {
    try {
      const client = new OpenAI({ apiKey: config.openaiApiKey.trim() });
      const response = await client.images.generate({ model: "gpt-image-1", prompt: trimmedPrompt, size: "1024x1024" });
      const b64 = response.data?.[0]?.b64_json;
      if (b64) return { image: { bytes: Buffer.from(b64, "base64"), mime: "image/png", provider: "openai" } };
    } catch (error: any) {
      console.error(`[ai] OpenAI image request failed: ${safeError(error)}`);
    }
  }

  return { image: null, error: config.geminiApiKey?.trim() || config.openaiApiKey?.trim() ? "provider-failed" : "no-provider" };
}

/** Offline mode: ตอบตาม intent เพื่อให้ผู้ใช้รู้ว่าคำสั่งถูกเข้าใจแล้ว (Safe Preview) */function buildOfflineReply(intent?: string): string {
  const header = "🤖 Jimmy Offline Mode\n\n";
  const footer = "\n\n(ยังไม่ได้เชื่อม AI Provider — ใส่ GEMINI_API_KEY หรือ OPENAI_API_KEY เพื่อเปิดโหมดเต็ม)";
  switch (intent) {
    case "generate_image":
      return `${header}รับโจทย์สร้างภาพแล้วครับ 🎨\nตอนนี้ยังไม่ได้เชื่อม AI Provider จึงยังไม่สร้างภาพจริงได้${footer}`;
    case "draft_content":
      return `${header}รับโจทย์เขียนคอนเทนต์/โพสต์แล้วครับ ✍️\nตอนนี้ยังไม่ได้เชื่อม AI Provider จึงยังร่างข้อความจริงไม่ได้${footer}`;
    case "explain_code":
      return `${header}รับโจทย์ช่วยดูโค้ดแล้วครับ 💻\nตอนนี้ยังไม่ได้เชื่อม AI Provider จึงวิเคราะห์ลึกไม่ได้${footer}`;
    case "summarize":
      return `${header}รับโจทย์สรุปข้อมูลแล้วครับ 📊\nตอนนี้ยังไม่ได้เชื่อม AI Provider จึงสรุปเนื้อหาจริงไม่ได้${footer}`;
    case "translate":
      return `${header}รับโจทย์แปลภาษาแล้วครับ\nตอนนี้ยังไม่ได้เชื่อม AI Provider จึงแปลจริงไม่ได้${footer}`;
    case "member_check":
      return `${header}รับคำสั่งเช็กสมาชิกแล้วครับ 👥\nฟีเจอร์นี้ต้องเชื่อมฐานข้อมูลสมาชิกก่อน (Safe Preview Mode)${footer}`;
    case "activity_check":
      return `${header}รับคำสั่งเช็กกิจกรรมแล้วครับ 🎁\nฟีเจอร์นี้ต้องเชื่อมฐานข้อมูลกิจกรรมก่อน (Safe Preview Mode)${footer}`;
    default:
      return `${header}รับคำสั่งแล้วครับ\nTelegram runtime และ command framework ยังทำงานอยู่${footer}`;
  }
}

function buildSystemPrompt(config: RuntimeAiConfig, notes: Array<{ content: string }>) {
  const memory = notes.length ? `\nข้อมูลที่ผู้ใช้ขอให้จำ:\n- ${notes.map((note) => note.content).join("\n- ")}` : "";
  return `${config.systemPrompt || "คุณคือ Jimmy ผู้ช่วย Telegram ภาษาไทย ตอบกระชับ สุภาพ และไม่อ้างว่าทำ action ที่ยังไม่ได้ทำ"}${memory}`;
}

function safeError(error: any) {
  const status = Number(error?.status || error?.response?.status || 0);
  return status ? `HTTP ${status}` : String(error?.name || "provider error");
}