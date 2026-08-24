import { randomUUID } from "crypto";
import { ApprovalStore } from "../ai/approvals";
import { ToolExecutor } from "../ai/executor";
import { JimmyBrain } from "../ai/brain";
import { ConversationMemory } from "../ai/memory";
import { generateProviderImage } from "../ai/provider";
import { SuggestionStore, buildThreeLineVersion } from "../ai/suggestions";
import { classifyIntent } from "../ai/safety";
import { RuntimeAiConfig } from "../ai/types";
import { inlineKeyboard, TelegramCallbackQuery, TelegramClient, TelegramMessage, TelegramUpdate } from "./client";
import { buildCapabilityMenu, CAPABILITY_MENU_TEXT, resolveCapability } from "./capabilities";
import { BotConfig } from "../../src/types";
import { buildTelegramButtonPayload, compileButtonModel, resolveButtonAction, resolveConfigAction } from "../../src/utils/buttonActions";

interface HandlerDependencies {
  memory: ConversationMemory;
  approvals: ApprovalStore;
  brain: JimmyBrain;
  adminUserIds: Set<string>;
  executor: ToolExecutor;
  getAdminUrl: () => string;
  getAiConfig: () => RuntimeAiConfig;
  getRuntimeSummary: () => { running: boolean; provider: string; reviewerMode: string };
}

export class TelegramUpdateHandler {
  private readonly forgetConfirmations = new Map<string, { chatId: string; userId: string; expiresAt: number }>();
  private readonly suggestions = new SuggestionStore();
  private readonly buttonMenuContexts = new Map<string, string>();
  private botConfig: BotConfig | null = null;

  constructor(private readonly dependencies: HandlerDependencies) {}

  setBotConfig(config: BotConfig) {
    this.botConfig = config;
  }

  async handle(client: TelegramClient, update: TelegramUpdate) {
    if (update.message) await this.handleMessage(client, update.message);
    else if (update.callback_query) await this.handleCallback(client, update.callback_query);
  }

  private async handleMessage(client: TelegramClient, message: TelegramMessage) {
    if (!message.text?.trim() || message.from?.is_bot) return;
    const chatId = String(message.chat.id);
    const userId = String(message.from?.id || "unknown");
    const text = message.text.trim();
    const isAdmin = this.dependencies.adminUserIds.has(userId);
    const [rawCommand, ...argumentsList] = text.split(/\s+/);
    const command = rawCommand.toLowerCase().split("@")[0];
    const buttonPayload = this.botConfig ? buildTelegramButtonPayload(this.botConfig) : null;
    const buttonModel = buttonPayload?.model;

    // port จาก legacy pipeline: เคารพการตั้งค่าปิดการคุยส่วนตัว
    if (message.chat.type === "private" && this.botConfig?.privacySettings?.allowDirectMessages === false) {
      await client.sendMessage(chatId, "🔒 บอทนี้ปิดการคุยส่วนตัวไว้ครับ", buttonPayload?.replyMarkup);
      return;
    }

    if (command === "/start") {
      this.buttonMenuContexts.set(chatId, "root");
      const startAction = this.botConfig ? resolveConfigAction(this.botConfig, { kind: "command", value: command }) : null;
      await client.sendMessage(chatId, startAction?.reply || safeString(this.botConfig?.botSettings?.welcomeMessage) || "🤖 สวัสดีครับ ผมคือ Jimmy AI Assistant", buttonPayload?.replyMarkup);
      if (buttonPayload?.inlineMarkup) await client.sendMessage(chatId, "เมนูใต้ข้อความ:", buttonPayload.inlineMarkup);
      await this.sendCapabilityMenu(client, chatId);
      return;
    }
    if (command === "/menu") {
      await this.sendCapabilityMenu(client, chatId);
      return;
    }
    if (buttonModel && command.startsWith("/")) {
      const resolution = resolveButtonAction(buttonModel, { kind: "command", value: command });
      if (resolution.matched && resolution.reply) {
        await client.sendMessage(chatId, resolution.reply, buttonPayload?.replyMarkup);
        return;
      }
    }
    if (command === "/help") {
      await client.sendMessage(chatId, "คำสั่ง Jimmy\n/start เริ่มต้น\n/menu เมนู 9 ความสามารถ\n/status ดูสถานะ\n/memory ดูสิ่งที่จำ\n/remember <ข้อความ> บันทึกข้อมูล\n/forget ล้าง long-term memory (ต้องยืนยัน)\n\nพิมพ์ภาษาไทยธรรมดาก็สั่งได้ เช่น \"สร้างภาพโปรโมตให้หน่อย\"");
      return;
    }
    if (command === "/status") {
      const status = this.dependencies.getRuntimeSummary();
      await client.sendMessage(chatId, `🤖 Jimmy Status\n\nTelegram: ${status.running ? "Online" : "Stopped"}\nAI: ${status.provider}\nReviewer: ${capitalize(status.reviewerMode)}\nMemory: ${this.dependencies.memory.isEnabled() ? "On" : "Off"}\nPending Approvals: ${this.dependencies.approvals.countPending(chatId)}`);
      return;
    }
    if (command === "/memory") {
      const notes = this.dependencies.memory.getNotes(chatId);
      const body = notes.length ? notes.map((note, index) => `${index + 1}. ${note.content}`).join("\n") : "ยังไม่มี long-term memory สำหรับแชตนี้ครับ";
      await client.sendMessage(chatId, `🧠 Jimmy Memory\n\n${body}`);
      return;
    }
    if (command === "/remember") {
      const note = argumentsList.join(" ").trim();
      await this.remember(client, chatId, note);
      return;
    }
    if (command === "/forget") {
      const id = randomUUID().replace(/-/g, "").slice(0, 10);
      this.forgetConfirmations.set(id, { chatId, userId, expiresAt: Date.now() + 5 * 60 * 1000 });
      await client.sendMessage(chatId, "⚠️ ยืนยันลบ long-term memory ของแชตนี้หรือไม่?", inlineKeyboard([[
        { text: "✅ ยืนยันลบ", callback_data: `forget:${id}` },
        { text: "❌ ยกเลิก", callback_data: `keep:${id}` },
      ]]));
      return;
    }

    const naturalMemory = text.match(/^จำไว้ว่(?:า)?\s*(.+)$/i);
    if (naturalMemory) {
      await this.remember(client, chatId, naturalMemory[1]);
      return;
    }

    // port จาก legacy pipeline: คำสั่งที่ไม่รู้จักตอบเหมือนเดิม (ไม่ปล่อยให้ /xxx หลุดเข้า AI)
    if (command.startsWith("/")) {
      await client.sendMessage(chatId, "ยังไม่มีคำสั่งนี้ใน Live Config ครับ กรุณา publish จากหน้าเว็บอีกครั้ง", buttonPayload?.replyMarkup);
      return;
    }

    if (buttonModel && !command.startsWith("/")) {
      const resolution = resolveButtonAction(buttonModel, { kind: "message", value: text, context: this.buttonMenuContexts.get(chatId) || "root" });
      if (resolution.matched) {
        const targetPayload = resolution.route === "navigate" && resolution.target && this.botConfig
          ? buildTelegramButtonPayload(this.botConfig, resolution.target)
          : null;
        if (resolution.route === "navigate" && resolution.target) this.buttonMenuContexts.set(chatId, resolution.target);
        await client.sendMessage(chatId, resolution.reply || (resolution.route === "navigate" ? "เมนู:" : "รับคำสั่งแล้วครับ"), targetPayload?.replyMarkup || buttonPayload?.replyMarkup);
        if (targetPayload?.inlineMarkup) await client.sendMessage(chatId, "เมนูใต้ข้อความ:", targetPayload.inlineMarkup);
        return;
      }
    }

    // port จาก legacy pipeline: keyword auto-replies ยังทำงานเหมือนเดิม (substring match แบบเดิม)
    const autoReply = this.botConfig?.botSettings?.autoReplies?.find((item) => {
      const keyword = safeString(item.keyword).toLowerCase().trim();
      return keyword && text.toLowerCase().includes(keyword);
    });
    if (autoReply) {
      const reply = safeString(autoReply.reply) || "รับคำสั่งแล้วครับ";
      if (autoReply.imageUrl) await client.sendPhoto(chatId, autoReply.imageUrl, reply, buttonPayload?.replyMarkup);
      else await client.sendMessage(chatId, reply, buttonPayload?.replyMarkup);
      return;
    }

    // port จาก legacy pipeline: เมื่อเจ้าของบอทปิด AI Assistant ไม่ควรเรียก brain ตอบเอง
    if (this.botConfig?.botSettings?.enableAiAssistant === false) {
      await client.sendMessage(chatId, "ยังไม่มีคำตอบสำหรับข้อความนี้ครับ ลองตั้งค่า Keyword Reply หรือเปิด AI Assistant ในหน้า GUI ได้เลย", buttonPayload?.replyMarkup);
      return;
    }

    // เช็กสมาชิก/กิจกรรม: ถ้าเชื่อม data source ไว้แล้ว ดึงข้อมูลจริงจาก API
    // ถ้ายังไม่เชื่อม ตอบตรง ๆ ว่าต้องตั้งค่าก่อน (ไม่ปล่อยให้ AI เดาข้อมูล)
    const classification = classifyIntent(text);
    if (classification.intent === "member_check" || classification.intent === "activity_check") {
      const summary = await this.fetchDataSourceSummary(classification.intent);
      if (summary) {
        await client.sendMessage(chatId, summary, buttonPayload?.replyMarkup);
        return;
      }
      const label = classification.intent === "member_check" ? "สมาชิก" : "กิจกรรม";
      await client.sendMessage(chatId, `👥 ยังไม่ได้เชื่อมฐานข้อมูล${label}ครับ\n\nตั้งค่า URL ได้ที่หน้าเว็บแอดมิน → ตั้งค่าขั้นสูง → Data Sources\n(รองรับ API ที่คืนค่า JSON อ่านอย่างเดียว)`, buttonPayload?.replyMarkup);
      return;
    }

    const result = await this.dependencies.brain.respond({
      chatId,
      userId,
      text,
      username: message.from?.username,
      firstName: message.from?.first_name,
      isAdmin,
    }, this.dependencies.getAiConfig());

    if (result.requiresApproval) {
      const approval = this.dependencies.approvals.create({
        chatId,
        userId,
        intent: result.intent,
        summary: text.slice(0, 240),
        risk: result.risk,
        payload: text,
      });
      const recommendation = result.recommendation ? `\n\n💡 Jimmy แนะนำ\n${result.recommendation}` : "";
      await client.sendMessage(chatId, `⚠️ ต้องยืนยันก่อน\n\nคำสั่ง:\n${approval.summary}\n\nความเสี่ยง: ${approval.risk.toUpperCase()}\nกดยืนยันแล้วระบบจะทำงานจริง${recommendation}`, inlineKeyboard([[
        { text: "✅ ยืนยัน", callback_data: `approve:${approval.id}` },
        { text: "❌ ยกเลิก", callback_data: `cancel:${approval.id}` },
      ]]));
      return;
    }

    const recommendation = result.recommendation ? `\n\n💡 Jimmy แนะนำ\n${result.recommendation}` : "";

    // สร้างภาพจริง: ถ้า intent คือ generate_image ลองเรียก Imagen/gpt-image-1 ก่อน
    // สำเร็จ → ส่งรูปเลย / ล้มเหลว → ตอบข้อความตาม provider (offline guidance หรือแจ้ง error)
    if (result.intent === "generate_image") {
      const { image, error } = await generateProviderImage(text, this.dependencies.getAiConfig());
      if (image) {
        await client.sendPhotoBuffer(chatId, image.bytes, "jimmy-image.jpg", `🎨 ${text.slice(0, 300)}`, buttonPayload?.replyMarkup);
        return;
      }
      const reason = error === "no-provider"
        ? "ยังไม่ได้ใส่ GEMINI_API_KEY หรือ OPENAI_API_KEY"
        : "ผู้ให้บริการสร้างภาพตอบไม่สำเร็จ ลองใหม่อีกครั้งครับ";
      await client.sendMessage(chatId, `🎨 ยังสร้างภาพไม่สำเร็จครับ\n(${reason})`, buttonPayload?.replyMarkup);
      return;
    }

    if (result.recommendation && result.reply.length > 160) {
      // ย้อนแนะนำ: เสนอเวอร์ชันสั้น 3 บรรทัดให้เลือก [ใช้แบบแนะนำ]/[ใช้แบบเดิม]
      const suggestion = this.suggestions.create({
        chatId,
        userId,
        originalReply: result.reply,
        suggestedReply: buildThreeLineVersion(result.reply),
        reason: result.recommendation,
      });
      await client.sendMessage(chatId, `${result.reply}${recommendation}`, inlineKeyboard([[
        { text: "✨ ใช้แบบแนะนำ", callback_data: `suggest:${suggestion.id}:apply` },
        { text: "📄 ใช้แบบเดิม", callback_data: `suggest:${suggestion.id}:keep` },
      ]]));
      return;
    }
    await client.sendMessage(chatId, `${result.reply}${recommendation}`, buttonPayload?.replyMarkup);
  }

  private async handleCallback(client: TelegramClient, callback: TelegramCallbackQuery) {
    const chatId = String(callback.message?.chat.id || "");
    const userId = String(callback.from.id);
    const data = callback.data || "";
    if (!chatId || !data) {
      await client.answerCallbackQuery(callback.id, "Callback ไม่ถูกต้อง");
      return;
    }

    if (data.startsWith("cap:")) {
      await this.handleCapabilityCallback(client, callback, data.slice(4));
      return;
    }

    if (this.botConfig && data.startsWith("jimmy:")) {
      const resolution = resolveButtonAction(compileButtonModel(this.botConfig), { kind: "callback", value: data });
      if (!resolution.matched || !resolution.reply) {
        if (!resolution.matched || resolution.route !== "navigate") {
          await client.answerCallbackQuery(callback.id, "ปุ่มนี้หมดอายุหรือไม่พบ Action");
          return;
        }
      }
      await client.answerCallbackQuery(callback.id, "สำเร็จ");
      const targetPayload = resolution.route === "navigate" && resolution.target
        ? buildTelegramButtonPayload(this.botConfig, resolution.target)
        : null;
      if (resolution.route === "navigate" && resolution.target) this.buttonMenuContexts.set(chatId, resolution.target);
      await client.sendMessage(chatId, resolution.reply || "เมนู:", targetPayload?.replyMarkup || buildTelegramButtonPayload(this.botConfig).replyMarkup);
      if (targetPayload?.inlineMarkup) await client.sendMessage(chatId, "เมนูใต้ข้อความ:", targetPayload.inlineMarkup);
      return;
    }

    const [action, id, extra] = data.split(":", 3);
    if (!id || !/^[a-z0-9]{8,16}$/i.test(id)) {
      await client.answerCallbackQuery(callback.id, "Callback หมดอายุหรือไม่ถูกต้อง");
      return;
    }

    if (action === "suggest") {
      const choice = extra === "apply" ? "apply" : extra === "keep" ? "keep" : null;
      if (!choice) {
        await client.answerCallbackQuery(callback.id, "Callback ไม่ถูกต้อง");
        return;
      }
      const record = this.suggestions.resolve(id, chatId, userId, choice);
      if (!record) {
        await client.answerCallbackQuery(callback.id, "ข้อเสนอแนะหมดอายุหรือไม่มีสิทธิ์");
        return;
      }
      await client.answerCallbackQuery(callback.id, choice === "apply" ? "ใช้แบบแนะนำแล้ว" : "ใช้แบบเดิมแล้ว");
      await client.sendMessage(chatId, choice === "apply"
        ? `✨ ใช้เวอร์ชันที่ Jimmy แนะนำ\n\n${record.suggestedReply}`
        : "📄 ใช้แบบเดิมตามที่ได้รับไปแล้วครับ");
      return;
    }

    if (action === "approve" || action === "cancel") {
      const record = this.dependencies.approvals.resolve(id, chatId, userId, action);
      if (!record) {
        await client.answerCallbackQuery(callback.id, "รายการไม่พบ หมดอายุ หรือไม่มีสิทธิ์");
        return;
      }
      await client.answerCallbackQuery(callback.id, action === "approve" ? "ยืนยันแล้ว กำลังทำงาน" : "ยกเลิกแล้ว");
      if (action === "cancel") {
        await client.sendMessage(chatId, "❌ ยกเลิกคำสั่งแล้ว\nไม่มี action ใดถูกเรียกใช้");
        return;
      }
      // ผ่านการยืนยันแล้ว → รัน tool จริง (broadcast/deploy/webhook-repair)
      try {
        const outcome = await this.dependencies.executor.execute(record.intent, record.payload || record.summary);
        await client.sendMessage(chatId, outcome.message);
      } catch (err: any) {
        console.error("[executor] tool execution failed:", err?.message || err);
        await client.sendMessage(chatId, `❌ ทำงานไม่สำเร็จ: ${String(err?.message || err).slice(0, 200)}`);
      }
      return;
    }

    if (action === "forget" || action === "keep") {
      const confirmation = this.forgetConfirmations.get(id);
      this.forgetConfirmations.delete(id);
      if (!confirmation || confirmation.chatId !== chatId || confirmation.userId !== userId || confirmation.expiresAt < Date.now()) {
        await client.answerCallbackQuery(callback.id, "รายการหมดอายุหรือไม่มีสิทธิ์");
        return;
      }
      if (action === "forget") this.dependencies.memory.forget(chatId);
      await client.answerCallbackQuery(callback.id, action === "forget" ? "ลบแล้ว" : "เก็บไว้แล้ว");
      await client.sendMessage(chatId, action === "forget" ? "🧠 ล้าง long-term memory ของแชตนี้แล้วครับ" : "ยกเลิกแล้วครับ Memory ยังอยู่เหมือนเดิม");
      return;
    }

    await client.answerCallbackQuery(callback.id, "ไม่รองรับ callback นี้");
  }

  /** เมนู 9 ความสามารถตาม docs/vision-jimmy-brain.md (shared กับ webhook path ผ่าน capabilities.ts) */
  private async sendCapabilityMenu(client: TelegramClient, chatId: string) {
    await client.sendMessage(chatId, CAPABILITY_MENU_TEXT, buildCapabilityMenu());
  }

  private async handleCapabilityCallback(client: TelegramClient, callback: TelegramCallbackQuery, capabilityId: string) {
    const chatId = String(callback.message?.chat.id || "");
    const userId = String(callback.from.id);
    if (!chatId) {
      await client.answerCallbackQuery(callback.id, "Callback ไม่ถูกต้อง");
      return;
    }
    const isAdmin = this.dependencies.adminUserIds.has(userId);
    if (capabilityId === "admin" && !isAdmin) {
      await client.answerCallbackQuery(callback.id, "🔒 เฉพาะ Telegram Admin เท่านั้น");
      return;
    }
    const resolved = resolveCapability(capabilityId, {
      isAdmin,
      runtimeSummary: this.dependencies.getRuntimeSummary(),
      pendingApprovals: this.dependencies.approvals.countPending(chatId),
    });
    if (!resolved) {
      await client.answerCallbackQuery(callback.id, "ไม่รองรับความสามารถนี้");
      return;
    }
    await client.answerCallbackQuery(callback.id, "สำเร็จ");
    await client.sendMessage(chatId, resolved.text, resolved.markup);
  }

  /** ดึงข้อมูลสมาชิก/กิจกรรมจริงจาก data source ที่ตั้งไว้ — คืน null ถ้ายังไม่ได้เชื่อมหรือ API ล้มเหลว */
  private async fetchDataSourceSummary(intent: string): Promise<string | null> {
    const sources = this.botConfig?.dataSources;
    if (!sources) return null;
    const url = (intent === "member_check" ? sources.membersApiUrl : sources.activityApiUrl)?.trim();
    if (!url || !/^https:\/\//i.test(url)) return null;
    const label = intent === "member_check" ? "สมาชิก" : "กิจกรรม";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const headers: Record<string, string> = { Accept: "application/json" };
      if (sources.apiToken?.trim()) headers.Authorization = `Bearer ${sources.apiToken.trim()}`;
      const response = await fetch(url, { headers, signal: controller.signal });
      if (!response.ok) {
        return `⚠️ API${label}ตอบ HTTP ${response.status} — ตรวจ URL/Token อีกครั้งครับ`;
      }
      const data = await response.json().catch(() => null);
      if (data === null) return `⚠️ API${label}ไม่ได้ส่ง JSON กลับมาครับ`;
      return formatDataSourceSummary(label, data);
    } catch (err: any) {
      console.error("[data-source] fetch failed:", err?.message || err);
      return `⚠️ เชื่อมต่อ API${label}ไม่สำเร็จ (${String(err?.name || err).slice(0, 60)})`;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async remember(client: TelegramClient, chatId: string, note: string) {
    if (!note) {
      await client.sendMessage(chatId, "กรุณาระบุข้อความ เช่น /remember ฉันชอบคอนเทนต์สั้น 3 บรรทัด");
      return;
    }
    const saved = this.dependencies.memory.remember(chatId, note);
    await client.sendMessage(chatId, saved ? `🧠 จำไว้แล้วครับ\n"${note.slice(0, 500)}"` : "ไม่สามารถบันทึกข้อความนี้ได้ กรุณาอย่าใส่ token, API key หรือ password ใน memory");
  }
}

function capitalize(value: string) {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}

function safeString(value: any, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

/** จัดรูปข้อมูล JSON จาก data source เป็นข้อความสรุปกระชับ (pure function เพื่อเทสต์ได้) */
export function formatDataSourceSummary(label: string, data: unknown): string {
  const header = `📊 สรุปข้อมูล${label} (จาก API จริง)\n`;
  if (Array.isArray(data)) {
    const rows = data.slice(0, 5).map((item, index) => `${index + 1}. ${describeRecord(item)}`);
    const more = data.length > 5 ? `\n...และอีก ${data.length - 5} รายการ` : "";
    return `${header}รวมทั้งหมด ${data.length} รายการ\n\n${rows.join("\n")}${more}`;
  }
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    const list = Array.isArray(record.data) ? record.data : Array.isArray(record.items) ? record.items : Array.isArray(record.members) ? record.members : null;
    if (list) return formatDataSourceSummary(label, list);
    const total = record.total ?? record.count ?? record.memberCount;
    if (total !== undefined) {
      return `${header}รวมทั้งหมด ${total} รายการ\n\n${describeRecord(record)}`;
    }
    return `${header}${JSON.stringify(record, null, 2).slice(0, 800)}`;
  }
  return `${header}${String(data).slice(0, 800)}`;
}

function describeRecord(item: unknown): string {
  if (item === null || item === undefined) return "-";
  if (typeof item !== "object") return String(item).slice(0, 80);
  const record = item as Record<string, unknown>;
  const name = record.name ?? record.title ?? record.username ?? record.id ?? record.key;
  const detail = record.status ?? record.points ?? record.joinedAt ?? record.date ?? record.value;
  const nameText = name === undefined ? "" : String(name).slice(0, 60);
  const detailText = detail === undefined || detail === name ? "" : ` — ${String(detail).slice(0, 60)}`;
  return `${nameText}${detailText}` || "-";
}
