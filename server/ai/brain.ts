import { ConversationMemory } from "./memory";
import { generateProviderReply } from "./provider";
import { JimmyReviewer } from "./reviewer";
import { classifyIntent } from "./safety";
import { BrainInput, BrainResult, RuntimeAiConfig } from "./types";

export class JimmyBrain {
  constructor(
    private readonly memory: ConversationMemory,
    private readonly reviewer: JimmyReviewer,
  ) {}

  async respond(input: BrainInput, config: RuntimeAiConfig): Promise<BrainResult> {
    const classification = classifyIntent(input.text);
    if (classification.risk !== "low") {
      if (!input.isAdmin) {
        return {
          reply: "🔒 คำสั่งที่กระทบระบบใช้ได้เฉพาะ Telegram Admin ที่อยู่ใน allowlist เท่านั้นครับ",
          intent: classification.intent,
          risk: classification.risk,
          requiresApproval: false,
          provider: "offline",
          denied: true,
        };
      }
      const recommendation = this.reviewer.review(input, "", classification.intent, classification.risk, config.reviewerMode);
      return {
        reply: "คำสั่งนี้ต้องผ่านการยืนยันก่อน และจะทำงานใน Safe Preview Mode เท่านั้น",
        recommendation,
        intent: classification.intent,
        risk: classification.risk,
        requiresApproval: true,
        provider: "offline",
      };
    }

    const recent = this.memory.getRecent(input.chatId);
    const notes = this.memory.getNotes(input.chatId);
    const generated = await generateProviderReply({ text: input.text, recent, notes }, config);
    const recommendation = this.reviewer.review(input, generated.reply, classification.intent, classification.risk, config.reviewerMode);
    this.memory.addMessage(input.chatId, "user", input.text);
    this.memory.addMessage(input.chatId, "assistant", generated.reply);
    return {
      reply: generated.reply,
      recommendation,
      intent: classification.intent,
      risk: classification.risk,
      requiresApproval: false,
      provider: generated.provider,
    };
  }
}