import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { AiProviderName, RuntimeAiConfig } from "./types";

interface GenerateInput {
  text: string;
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
    reply: "🤖 Jimmy Offline Mode\n\nรับคำสั่งแล้วครับ\nตอนนี้ยังไม่ได้เชื่อม AI Provider\nแต่ Telegram runtime และ command framework ยังทำงานอยู่",
  };
}

function buildSystemPrompt(config: RuntimeAiConfig, notes: Array<{ content: string }>) {
  const memory = notes.length ? `\nข้อมูลที่ผู้ใช้ขอให้จำ:\n- ${notes.map((note) => note.content).join("\n- ")}` : "";
  return `${config.systemPrompt || "คุณคือ Jimmy ผู้ช่วย Telegram ภาษาไทย ตอบกระชับ สุภาพ และไม่อ้างว่าทำ action ที่ยังไม่ได้ทำ"}${memory}`;
}

function safeError(error: any) {
  const status = Number(error?.status || error?.response?.status || 0);
  return status ? `HTTP ${status}` : String(error?.name || "provider error");
}