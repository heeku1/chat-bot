import express from "express";
import path from "path";
import fs from "fs";
import os from "os";
import { AsyncLocalStorage } from "node:async_hooks";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { ApprovalStore } from "./server/ai/approvals";
import { JimmyBrain } from "./server/ai/brain";
import { ConversationMemory } from "./server/ai/memory";
import { metricsStore } from "./server/ai/metrics";
import { JimmyReviewer } from "./server/ai/reviewer";
import { ReviewerMode } from "./server/ai/types";
import { ToolExecutor } from "./server/ai/executor";
import { TelegramUpdateHandler } from "./server/telegram/handlers";
import { TelegramClient } from "./server/telegram/client";
import { TelegramPollingRuntime } from "./server/telegram/polling";
import { authenticate, clearSessionCookie, createApiGuard, createSession, getPrincipal, isAuthConfigured, revokeSession, sessionCookie } from "./server/auth/session";
import { assertSafePublicUrl, OutboundBlockedError, createRateLimiter, safeFetch, timingSafeTokenEqual } from "./server/security/outbound";
import { BotConfigRegistry, publishAtomically } from "./server/botRegistry";
import {
  ButtonAction,
  buildTelegramButtonPayload,
  compileButtonModel,
  migrateLegacyButtonIds,
  resolveButtonAction,
  resolveConfigAction
} from "./src/utils/buttonActions";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

const app = express();
const PORT = Number(process.env.PORT || 3000);
// เวอร์ชัน build — ใช้ยืนยันผ่าน /health ว่า deploy บน Render เป็นโค้ดล่าสุดหรือยัง
const APP_VERSION = "ops-live-data-1";
const BOT_TOKEN = (process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || "").trim();
const WEBHOOK_BASE_URL = (process.env.WEBHOOK_BASE_URL || process.env.RENDER_EXTERNAL_URL || "").replace(/\/$/, "");
// URL ของหน้าเว็บแอดมิน (ใช้ทำ deep-link ปุ่ม "เปิดหลังบ้าน" ในแชต)
const ADMIN_PANEL_URL = (process.env.ADMIN_PANEL_URL || WEBHOOK_BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, "");
const RENDER_DEPLOY_HOOK_URL = (process.env.RENDER_DEPLOY_HOOK_URL || "").trim();
const TELEGRAM_WEBHOOK_SECRET = (process.env.TELEGRAM_WEBHOOK_SECRET || "").trim();
const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || "").trim();
const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || "").trim();
const STATE_FILE = process.env.STATE_FILE || path.join(os.tmpdir(), "jimmy-bot-config.json");
const TELEGRAM_ADMIN_USER_IDS = new Set(
  (process.env.TELEGRAM_ADMIN_USER_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => /^\d+$/.test(value))
);

app.use(express.json({ limit: "10mb" }));

// Basic security headers สำหรับทุก response
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

// Brute-force guard สำหรับ login: 10 ครั้ง / 15 นาที ต่อ IP
const loginRateLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10 });

app.post("/api/auth/login", (req, res) => {
  const clientKey = req.ip || req.header("x-forwarded-for") || "unknown";
  if (!loginRateLimiter.allow(clientKey)) {
    return res.status(429).json({ ok: false, error: "พยายามเข้าสู่ระบบบ่อยเกินไป ลองอีกครั้งใน 15 นาที" });
  }
  const username = safeString(req.body?.username).trim();
  const password = safeString(req.body?.password);
  const principal = authenticate(username, password);
  if (!principal) return res.status(401).json({ ok: false, error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
  const secure = req.secure || req.header("x-forwarded-proto") === "https";
  res.setHeader("Set-Cookie", sessionCookie(createSession(principal), secure));
  return res.json({ ok: true, user: principal });
});

app.get("/api/auth/me", (req, res) => {
  const principal = getPrincipal(req);
  // authConfigured=false = migration mode (ยังไม่ตั้ง JIMMY_ADMIN_USERNAME/PASSWORD)
  // frontend ใช้ flag นี้เพื่อไม่ดันผู้ใช้ไว้ที่หน้า login แบบเข้าไม่ได้เลย
  if (!principal) return res.status(401).json({ ok: false, error: "Authentication required", authConfigured: isAuthConfigured() });
  return res.json({ ok: true, user: principal });
});

app.post("/api/auth/logout", (req, res) => {
  revokeSession(req);
  const secure = req.secure || req.header("x-forwarded-proto") === "https";
  res.setHeader("Set-Cookie", clearSessionCookie(secure));
  return res.json({ ok: true });
});

// Migration mode: ถ้ายังไม่ตั้ง JIMMY_ADMIN_USERNAME/PASSWORD ระบบยังเปิด API แบบเดิม
// พอตั้งค่าแล้ว ทุก /api/* (ยกเว้น auth) ต้องมี session cookie จึงจะเรียกได้
app.use("/api", createApiGuard({ enabled: isAuthConfigured() }));

type BotConfig = {
  instanceId?: string;
  name: string;
  token?: string;
  platform: "bot" | "group" | "channel" | "all";
  reviewerMode?: ReviewerMode;
  botSettings: {
    welcomeMessage: string;
    enableAiAssistant: boolean;
    aiPrompt: string;
    keyboards: Array<{ id?: string; text: string; response: string; action?: any; target?: string; context?: string }>;
    autoReplies: Array<{ keyword: string; reply: string; imageUrl?: string }>;
  };
  botCommands?: Array<{ id?: string; command: string; description: string; reply: string; action?: any; target?: string }>;
  botButtons?: {
    inlineButtons: Array<{ id?: string; text: string; type?: any; action?: any; target?: string; context?: string; url?: string; webAppUrl?: string; reply?: string }>;
    replyKeyboard: Array<{ id?: string; text: string; reply: string; action?: any; target?: string; context?: string }>;
  };
  botMenuButton?: { id?: string; type: "commands" | "web_app" | "default"; text: string; url: string };
  buttonActions?: ButtonAction[];
  inlineQuerySettings?: { enableInline: boolean; placeholder: string; results: Array<{ id: string; title: string; description: string; content: string }> };
  groupSettings: {
    welcomeNewMember: boolean;
    welcomeMessage: string;
    antiSpam: { blockLinks: boolean; blockSwearWords: boolean; warnLimit: number };
    rulesAnnouncement: string;
    rulesInterval: number;
    customCommands: Array<{ command: string; reply: string }>;
    keywordMonitoring?: {
      enable: boolean;
      keywords: string[];
      notificationType: "email" | "bot_message" | "both";
      adminEmail?: string;
      alertThreshold?: number;
    };
  };
  channelSettings: {
    autoSignature: boolean;
    autoSignatureText: string;
    enableFormatting: "HTML" | "MarkdownV2" | "None";
    targetChannelId?: string;
    targetChannelUsername?: string;
    scheduledPosts: Array<{ id: string; time: string; content: string; imageUrl?: string }>;
  };
  adminPermissions: {
    canDeleteMessages: boolean;
    canBanUsers: boolean;
    canPinMessages: boolean;
    canChangeGroupInfo: boolean;
  };
  privacySettings: {
    allowDirectMessages: boolean;
    groupPrivacyMode: boolean;
    showPublicStats: boolean;
    hideBotCreator: boolean;
  };
  externalApis?: {
    webhookUrl?: string;
    googleSheetsUrl?: string;
    customApiUrl?: string;
    apiAuthToken?: string;
    sendLeadsToApi?: boolean;
    geminiApiKey?: string;
    openaiApiKey?: string;
  };
  dataSources?: {
    membersApiUrl?: string;
    activityApiUrl?: string;
    apiToken?: string;
  };
  mediaLibrary?: Array<{ id: string; name: string; url: string; type: string }>;
  marketingSettings?: {
    enableMilestoneNotifications: boolean;
    milestones: Array<{ pointsThreshold: number; message: string }>;
    campaignName?: string;
    rewardPointsPerInvite?: number;
    challengeQuestion?: string;
    challengeAnswer?: string;
    challengeActive?: boolean;
  };
};

const DEFAULT_BOT_CONFIG: BotConfig = {
  name: "Jimmy_bot",
  token: "",
  platform: "all",
  reviewerMode: "normal",
  botSettings: {
    welcomeMessage: "สวัสดีครับ! Jimmy_bot พร้อมใช้งานจริงบน Telegram แล้วครับ 🤖✨\n\nพิมพ์ /help เพื่อดูเมนู หรือพิมพ์คำว่า ราคา / โปรโมชั่น / ติดต่อ เพื่อทดสอบตอบกลับอัตโนมัติ",
    enableAiAssistant: true,
    aiPrompt: "คุณคือ Jimmy_bot บอทบริการลูกค้า Telegram ตอบสั้น สุภาพ เป็นกันเอง และช่วยผู้ใช้ให้เข้าใจง่าย",
    keyboards: [
      { text: "📦 ดูบริการ", response: "ตอนนี้เรามีบริการตั้งค่าบอท Telegram, ระบบดูแลกลุ่ม, แชนแนลโพสต์อัตโนมัติ และ AI ตอบแชตครับ" },
      { text: "📞 ติดต่อแอดมิน", response: "ฝากรายละเอียดไว้ได้เลยครับ เดี๋ยวแอดมินติดต่อกลับครับ" }
    ],
    autoReplies: [
      { keyword: "ราคา", reply: "แพ็กเกจเริ่มต้นสามารถตั้งราคาได้ตามงานจริงครับ ถ้าต้องการให้พี่ช่วยประเมิน ให้ส่งจำนวนกลุ่ม/ฟีเจอร์ที่ต้องใช้มาได้เลย" },
      { keyword: "โปรโมชั่น", reply: "ตอนนี้มีโปรทดลองตั้งค่าบอทและเมนูพื้นฐานให้ใช้งานครับ 🎁" },
      { keyword: "ติดต่อ", reply: "ติดต่อแอดมินได้โดยส่งข้อความทิ้งไว้ในแชตนี้ได้เลยครับ" }
    ]
  },
  botCommands: [
    { command: "start", description: "เริ่มต้นใช้งานบอท", reply: "สวัสดีครับ ยินดีต้อนรับสู่ Jimmy_bot ครับ" },
    { command: "help", description: "ดูคำสั่งทั้งหมด", reply: "คำสั่งที่ใช้ได้: /start, /help, /rules และเมนูปุ่มด้านล่างครับ" }
  ],
  botButtons: {
    inlineButtons: [
      { text: "🌐 เปิดเว็บ Jimmy_bot", url: "https://bot-jimmy.onrender.com/" },
      { text: "📞 สอบถามแอดมิน", reply: "ต้องการติดต่อแอดมินเรื่องอะไรครับ พิมพ์รายละเอียดไว้ได้เลย" }
    ],
    replyKeyboard: [
      { text: "📦 ดูบริการ", reply: "บริการหลักคือบอท Telegram, ระบบดูแลกลุ่ม, แชนแนล และ AI ตอบกลับครับ" },
      { text: "📞 ติดต่อแอดมิน", reply: "ส่งรายละเอียดงานที่ต้องการไว้ได้เลยครับ" }
    ]
  },
  botMenuButton: { type: "commands", text: "เปิดเมนู", url: "https://bot-jimmy.onrender.com/" },
  groupSettings: {
    welcomeNewMember: true,
    welcomeMessage: "🎉 ยินดีต้อนรับคุณ {name} เข้าสู่กลุ่มครับ พิมพ์ /rules เพื่ออ่านกฎกลุ่มได้เลย",
    antiSpam: { blockLinks: true, blockSwearWords: true, warnLimit: 3 },
    rulesAnnouncement: "📢 กฎกลุ่ม: 1) ห้ามสแปม 2) ห้ามคำหยาบ 3) เคารพกันและกันครับ",
    rulesInterval: 0,
    customCommands: [{ command: "/rules", reply: "📢 กฎกลุ่ม: ห้ามสแปม ห้ามคำหยาบ และคุยกันด้วยความสุภาพครับ" }]
  },
  channelSettings: {
    autoSignature: true,
    autoSignatureText: "📢 โพสต์โดย Jimmy_bot",
    enableFormatting: "None",
    targetChannelId: "",
    targetChannelUsername: "",
    scheduledPosts: []
  },
  adminPermissions: {
    canDeleteMessages: true,
    canBanUsers: true,
    canPinMessages: true,
    canChangeGroupInfo: false
  },
  privacySettings: {
    allowDirectMessages: true,
    groupPrivacyMode: false,
    showPublicStats: true,
    hideBotCreator: false
  },
  externalApis: {
    webhookUrl: WEBHOOK_BASE_URL ? `${WEBHOOK_BASE_URL}/telegram/webhook` : "",
    googleSheetsUrl: "",
    customApiUrl: "",
    apiAuthToken: "",
    sendLeadsToApi: false
  },
  mediaLibrary: []
};

const DEFAULT_INSTANCE_ID = "bot_default";
const botRegistry = new BotConfigRegistry<BotConfig>();
const draftBotConfigs = new Map<string, BotConfig>();
const fallbackBotConfig = normalizeConfig({ ...DEFAULT_BOT_CONFIG, instanceId: DEFAULT_INSTANCE_ID });
draftBotConfigs.set(DEFAULT_INSTANCE_ID, fallbackBotConfig);
let lastDraftSyncAt: string | null = null;
let lastPublishedAt: string | null = null;
let lastPublishedConfigName: string | null = null;
let hasPublishedConfig = false;
const groupWarnings = new Map<string, number>();
const buttonMenuContexts = new Map<string, string>();
/** Keys stored as "YYYY-MM-DD:postId". Cleaned up daily to prevent unbounded growth. */
const sentScheduledPosts = new Set<string>();
const telegramBotContext = new AsyncLocalStorage<{ instanceId: string; token: string }>();

/** Returns true only for HTTPS URLs with public (non-private) hostnames to prevent SSRF. */
function isSafeExternalUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    // Block localhost and private IP ranges (IPv4 + common IPv6 loopback)
    if (host === "localhost" || host === "::1") return false;
    if (/^127\./.test(host)) return false;
    if (/^10\./.test(host)) return false;
    if (/^192\.168\./.test(host)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
    if (/^169\.254\./.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

function saveState() {
  try {
    const state = {
      draftBotConfigs: [...draftBotConfigs.entries()].map(([instanceId, config]) => ({ instanceId, config: stripTokenFromConfig(config) })),
      publishedBotConfigs: botRegistry.persistenceSnapshot().map((entry) => ({ ...entry, config: stripTokenFromConfig(entry.config) })),
      lastDraftSyncAt,
      lastPublishedAt,
      lastPublishedConfigName,
      hasPublishedConfig
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (err: any) {
    console.error("⚠️ saveState failed:", err.message);
  }
}

function loadState() {
  try {
    if (!fs.existsSync(STATE_FILE)) return;
    const raw = fs.readFileSync(STATE_FILE, "utf-8");
    const state = JSON.parse(raw);
    if (Array.isArray(state.draftBotConfigs)) {
      state.draftBotConfigs.forEach((entry: any) => draftBotConfigs.set(safeInstanceId(entry.instanceId), normalizeConfig(entry.config)));
    } else if (state.draftBotConfig) {
      draftBotConfigs.set(DEFAULT_INSTANCE_ID, normalizeConfig(state.draftBotConfig));
    }
    if (Array.isArray(state.publishedBotConfigs)) {
      state.publishedBotConfigs.forEach((entry: any) => {
        botRegistry.restorePublished(entry.instanceId, normalizeConfig(entry.config), entry.tokenHash, entry.publishedAt);
      });
      if (BOT_TOKEN) botRegistry.bindRuntimeToken(BOT_TOKEN);
    } else if (state.activeBotConfig && BOT_TOKEN) {
      botRegistry.commitPublished(DEFAULT_INSTANCE_ID, BOT_TOKEN, normalizeConfig(state.activeBotConfig), state.lastPublishedAt || new Date(0).toISOString());
    }
    if (state.lastDraftSyncAt) lastDraftSyncAt = state.lastDraftSyncAt;
    if (state.lastPublishedAt) lastPublishedAt = state.lastPublishedAt;
    if (state.lastPublishedConfigName) lastPublishedConfigName = state.lastPublishedConfigName;
    if (typeof state.hasPublishedConfig === "boolean") hasPublishedConfig = state.hasPublishedConfig;
    console.log("✅ State loaded from", STATE_FILE);
  } catch (err: any) {
    console.error("⚠️ loadState failed:", err.message);
  }
}

loadState();

function safeInstanceId(value: unknown): string {
  const normalized = safeString(value).trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  return normalized || DEFAULT_INSTANCE_ID;
}

function getActiveBotConfig(instanceId: unknown = DEFAULT_INSTANCE_ID): BotConfig {
  const id = safeInstanceId(instanceId);
  return botRegistry.resolve(id)?.config || (id === DEFAULT_INSTANCE_ID ? fallbackBotConfig : { ...fallbackBotConfig, instanceId: id });
}

function getDraftBotConfig(instanceId: unknown = DEFAULT_INSTANCE_ID): BotConfig {
  return draftBotConfigs.get(safeInstanceId(instanceId)) || getActiveBotConfig(instanceId);
}

function getRuntimeBotToken(instanceId: unknown = DEFAULT_INSTANCE_ID): string {
  const id = safeInstanceId(instanceId);
  return botRegistry.resolveToken(id) || (id === DEFAULT_INSTANCE_ID ? BOT_TOKEN : "");
}

/** Remove keyboard entries whose labels duplicate botButtons.replyKeyboard labels (publish preflight requirement). */
function dedupeKeyboardLabels(config: BotConfig): BotConfig {
  const replyLabels = new Set(
    (config.botButtons?.replyKeyboard || [])
      .map((button) => safeString(button.text).trim())
      .filter(Boolean)
  );
  if (!replyLabels.size) return config;
  return {
    ...config,
    botSettings: {
      ...config.botSettings,
      keyboards: config.botSettings.keyboards.filter((entry) => !replyLabels.has(safeString(entry.text).trim()))
    }
  };
}

/**
 * Self-healing for ephemeral hosts (e.g. Render free tier): if BOT_TOKEN is configured but the
 * registry is empty (state file lost on restart/redeploy), re-register the default instance so
 * autoSetWebhookOnBoot can point Telegram at the CURRENT public URL on every boot.
 */
function ensureDefaultBotRegistered() {
  if (!BOT_TOKEN || botRegistry.resolve(DEFAULT_INSTANCE_ID)) return;
  const config = normalizeConfig(dedupeKeyboardLabels({ ...getDraftBotConfig(DEFAULT_INSTANCE_ID), instanceId: DEFAULT_INSTANCE_ID }));
  botRegistry.commitPublished(DEFAULT_INSTANCE_ID, BOT_TOKEN, config, new Date().toISOString());
  draftBotConfigs.set(DEFAULT_INSTANCE_ID, config);
  hasPublishedConfig = true;
  console.log("♻️ Auto-registered default bot from BOT_TOKEN (registry was empty)");
}

const conversationMemory = new ConversationMemory();
const approvalStore = new ApprovalStore();
const jimmyReviewer = new JimmyReviewer();
const jimmyBrain = new JimmyBrain(conversationMemory, jimmyReviewer);
const toolExecutor = new ToolExecutor({
  listBroadcastTargets: () => conversationMemory.listChatIds(),
  sendBroadcastMessage: async (chatId, text) => {
    const token = telegramBotContext.getStore()?.token || BOT_TOKEN;
    if (!token) throw new Error("Missing BOT_TOKEN");
    await new TelegramClient(token).sendMessage(chatId, text);
  },
  triggerDeploy: async () => {
    if (!RENDER_DEPLOY_HOOK_URL) {
      return { ok: false, message: "⚠️ ยังไม่ได้ตั้ง RENDER_DEPLOY_HOOK_URL\n\nเอา URL จาก Render Dashboard → Deploy Hook มาใส่ใน Environment ก่อน แล้วค่อยสั่ง deploy ผมได้ครับ" };
    }
    try {
      const response = await fetch(RENDER_DEPLOY_HOOK_URL, { method: "POST" });
      return response.ok
        ? { ok: true, message: "🚀 สั่ง Deploy แล้วครับ\n\nRender กำลัง build เวอร์ชันใหม่ (ใช้เวลา ~5-10 นาที)\nตรวจสถานะได้ที่ /health → gitCommit" }
        : { ok: false, message: `❌ Deploy Hook ตอบ HTTP ${response.status} — ลองใหม่หรือ deploy เองผม Render Dashboard ครับ` };
    } catch (err: any) {
      return { ok: false, message: `❌ เรียก Deploy Hook ไม่สำเร็จ: ${err?.message || err}` };
    }
  },
  repairWebhook: async () => {
    const token = telegramBotContext.getStore()?.token || BOT_TOKEN;
    const instanceId = telegramBotContext.getStore()?.instanceId || DEFAULT_INSTANCE_ID;
    if (!token || !WEBHOOK_BASE_URL) {
      return { ok: false, message: "⚠️ Restart บนโหมด webhook ไม่จำเป็นต้องทำเอง\n\nแต่ยังตั้ง WEBHOOK_BASE_URL ไม่ครบ จึงซ่อม webhook อัตโนมัติไม่ได้ครับ" };
    }
    try {
      const payload: Record<string, any> = {
        url: `${WEBHOOK_BASE_URL}/telegram/webhook/${instanceId}`,
        allowed_updates: ["message", "callback_query", "inline_query"],
      };
      if (TELEGRAM_WEBHOOK_SECRET) payload.secret_token = TELEGRAM_WEBHOOK_SECRET;
      await telegramApi("setWebhook", payload, token);
      return { ok: true, message: `🔄 ซ่อม webhook สำเร็จ\n\nชี้กลับไปที่ ${payload.url} แล้ว\n(โหมด webhook ไม่ต้อง restart process — ข้อความเข้าปกติแล้วครับ)` };
    } catch (err: any) {
      return { ok: false, message: `❌ ซ่อม webhook ไม่สำเร็จ: ${err?.message || err}` };
    }
  },
});
let telegramRuntime: TelegramPollingRuntime;

const telegramUpdateHandler = new TelegramUpdateHandler({
  memory: conversationMemory,
  approvals: approvalStore,
  brain: jimmyBrain,
  adminUserIds: TELEGRAM_ADMIN_USER_IDS,
  executor: toolExecutor,
  getAdminUrl: () => ADMIN_PANEL_URL,
  getAiConfig: () => telegramRuntime?.getAiConfig() || {
    openaiApiKey: OPENAI_API_KEY,
    geminiApiKey: GEMINI_API_KEY,
    systemPrompt: getActiveBotConfig().botSettings.aiPrompt,
    reviewerMode: getActiveBotConfig().reviewerMode || "normal",
  },
  getRuntimeSummary: () => {
    const status = telegramRuntime?.getStatus();
    return {
      running: status?.running || false,
      provider: status?.provider || (OPENAI_API_KEY ? "OpenAI" : GEMINI_API_KEY ? "Gemini" : "Offline"),
      reviewerMode: status?.reviewerMode || getActiveBotConfig().reviewerMode || "normal",
    };
  },
});

telegramRuntime = new TelegramPollingRuntime((client, update) => telegramUpdateHandler.handle(client, update));
telegramRuntime.setAiConfig({
  openaiApiKey: OPENAI_API_KEY,
  geminiApiKey: GEMINI_API_KEY,
  systemPrompt: getActiveBotConfig().botSettings.aiPrompt,
  reviewerMode: getActiveBotConfig().reviewerMode || "normal",
});

function safeString(value: any, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function getTelegramBotToken(config?: Pick<BotConfig, "token">) {
  return safeString(config?.token).trim() || BOT_TOKEN;
}

function normalizeCommand(command: string) {
  return safeString(command).replace(/^\//, "").trim().toLowerCase();
}

function normalizeChannelUsername(username: string) {
  const clean = safeString(username).trim().replace(/^@+/, "");
  return clean ? `@${clean}` : "";
}

function stripTokenFromConfig(config: BotConfig): BotConfig {
  return {
    ...config,
    token: "",
    externalApis: {
      ...(config.externalApis || {}),
      apiAuthToken: "",
      geminiApiKey: "",
      openaiApiKey: ""
    },
    dataSources: {
      ...(config.dataSources || {}),
      apiToken: ""
    }
  };
}

function normalizeConfig(input: any): BotConfig {
  const base = DEFAULT_BOT_CONFIG;
  const next: BotConfig = {
    ...base,
    ...(typeof input === "object" && input ? input : {}),
    token: "",
    botSettings: {
      ...base.botSettings,
      ...((input && input.botSettings) || {}),
      keyboards: Array.isArray(input?.botSettings?.keyboards) ? input.botSettings.keyboards : base.botSettings.keyboards,
      autoReplies: Array.isArray(input?.botSettings?.autoReplies) ? input.botSettings.autoReplies : base.botSettings.autoReplies
    },
    botCommands: Array.isArray(input?.botCommands) ? input.botCommands : base.botCommands,
    dataSources: {
      membersApiUrl: safeString(input?.dataSources?.membersApiUrl).trim(),
      activityApiUrl: safeString(input?.dataSources?.activityApiUrl).trim(),
      apiToken: safeString(input?.dataSources?.apiToken).trim()
    },
    botButtons: {
      inlineButtons: Array.isArray(input?.botButtons?.inlineButtons) ? input.botButtons.inlineButtons : base.botButtons?.inlineButtons || [],
      replyKeyboard: Array.isArray(input?.botButtons?.replyKeyboard) ? input.botButtons.replyKeyboard : base.botButtons?.replyKeyboard || []
    },
    botMenuButton: {
      ...(base.botMenuButton || { type: "commands", text: "", url: "" }),
      ...((input && input.botMenuButton) || {})
    },
    groupSettings: {
      ...base.groupSettings,
      ...((input && input.groupSettings) || {}),
      antiSpam: { ...base.groupSettings.antiSpam, ...((input && input.groupSettings?.antiSpam) || {}) },
      customCommands: Array.isArray(input?.groupSettings?.customCommands) ? input.groupSettings.customCommands : base.groupSettings.customCommands
    },
    channelSettings: {
      ...base.channelSettings,
      ...((input && input.channelSettings) || {}),
      targetChannelId: safeString(input?.channelSettings?.targetChannelId, base.channelSettings.targetChannelId || ""),
      targetChannelUsername: safeString(input?.channelSettings?.targetChannelUsername, base.channelSettings.targetChannelUsername || ""),
      scheduledPosts: Array.isArray(input?.channelSettings?.scheduledPosts) ? input.channelSettings.scheduledPosts : base.channelSettings.scheduledPosts
    },
    adminPermissions: { ...base.adminPermissions, ...((input && input.adminPermissions) || {}) },
    privacySettings: { ...base.privacySettings, ...((input && input.privacySettings) || {}) },
    externalApis: { ...base.externalApis, ...((input && input.externalApis) || {}) }
  };
  return stripTokenFromConfig(migrateLegacyButtonIds(next as any) as BotConfig);
}

// Retained only to read historic state shapes; runtime/publish never route through this index-era model.
function buildLegacyKeyboardModel(config: BotConfig) {
  const inlineButtons = config.botButtons?.inlineButtons || [];
  const migratedReplyButtons: Array<{
    text: string;
    reply: string;
    source: "botButtons.inlineButtons.migratedReply";
  }> = [];
  const inlineKeyboardButtons: Array<
    | { text: string; type: "url"; url: string; telegramButton: { text: string; url: string } }
    | { text: string; type: "web_app"; webAppUrl: string; telegramButton: { text: string; web_app: { url: string } } }
  > = [];
  const warnings: Array<{
    type: "migrated_reply_inline_button";
    text: string;
    from: "Inline Button";
    to: "Reply Keyboard";
    reason: "Inline button without URL/WebApp was migrated to avoid Telegram UX confusion";
  }> = [];

  inlineButtons.forEach((button, index) => {
    const text = safeString(button.text).trim();
    const url = safeString(button.url).trim();
    const webAppUrl = safeString((button as any).webAppUrl || (button as any).web_app?.url).trim();
    const reply = safeString(button.reply).trim();

    if (!text) return;

    if (webAppUrl) {
      inlineKeyboardButtons.push({
        text,
        type: "web_app",
        webAppUrl,
        telegramButton: { text, web_app: { url: webAppUrl } }
      });
      return;
    }

    if (url) {
      inlineKeyboardButtons.push({
        text,
        type: "url",
        url,
        telegramButton: { text, url }
      });
      return;
    }

    if (reply) {
      migratedReplyButtons.push({
        text,
        reply,
        source: "botButtons.inlineButtons.migratedReply"
      });
      warnings.push({
        type: "migrated_reply_inline_button",
        text,
        from: "Inline Button",
        to: "Reply Keyboard",
        reason: "Inline button without URL/WebApp was migrated to avoid Telegram UX confusion"
      });
      return;
    }

    console.warn("Skipped inline button without URL/WebApp/reply", { index, text });
  });

  return {
    inlineKeyboardButtons,
    migratedReplyButtons,
    warnings
  };
}

function buildReplyKeyboard(config: BotConfig, _legacyModel = buildKeyboardModel(config)) {
  const payload = buildTelegramButtonPayload(config);
  return {
    buttons: payload.replyButtons.map((action) => ({
      id: action.id,
      text: action.label,
      reply: action.reply || "",
      target: action.target,
      source: action.source || "buttonActions"
    })),
    replyMarkup: payload.replyMarkup,
    warnings: payload.model.issues
  };
}

function buildKeyboardModel(config: BotConfig) {
  const payload = buildTelegramButtonPayload(config);
  return {
    inlineKeyboardButtons: payload.inlineButtons,
    migratedReplyButtons: [] as Array<never>,
    warnings: payload.model.issues
  };
}

function buildInlineKeyboard(config: BotConfig, _legacyModel = buildKeyboardModel(config)) {
  const payload = buildTelegramButtonPayload(config);
  return {
    buttons: payload.inlineButtons.map((action) => ({
      id: action.id,
      text: action.label,
      type: action.type,
      url: action.url,
      webAppUrl: action.webAppUrl,
      callbackData: action.callbackData,
      reply: action.reply
    })),
    replyMarkup: payload.inlineMarkup,
    warnings: payload.model.issues
  };
}

function buildCommands(config: BotConfig) {
  const rawCommands = Array.isArray(config.botCommands) ? config.botCommands : [];
  const mapped = rawCommands
    .map((cmd) => {
      const command = normalizeCommand(cmd.command);
      const description = safeString(cmd.description).trim();
      if (!/^[a-z0-9_]{1,32}$/.test(command) || !description) return null;
      return {
        command,
        description: description.slice(0, 256),
        reply: safeString(cmd.reply)
      };
    })
    .filter(Boolean) as Array<{ command: string; description: string; reply: string }>;

  return mapped.slice(0, 100);
}

function buildMenuButton(config: BotConfig) {
  const menu = config.botMenuButton;
  if (!menu) return { type: "commands" as const };

  if (menu.type === "default") return { type: "default" as const };
  if (menu.type === "commands") return { type: "commands" as const };

  const text = safeString(menu.text).trim();
  const url = safeString(menu.url).trim();
  if (!text || !url) return { type: "commands" as const };
  return {
    type: "web_app" as const,
    text,
    web_app: { url }
  };
}

function buildChannelFeatures(config: BotConfig) {
  const targetChannelId = safeString(config.channelSettings?.targetChannelId).trim();
  const targetChannelUsername = normalizeChannelUsername(config.channelSettings?.targetChannelUsername || "");
  const hasTarget = Boolean(targetChannelId || targetChannelUsername);
  return {
    targetChannelId,
    targetChannelUsername,
    scheduledPostsCount: config.channelSettings?.scheduledPosts?.length || 0,
    autoSignature: config.channelSettings?.autoSignature || false,
    status: hasTarget ? "connected" : "not_connected",
    reason: hasTarget ? "" : "ยังไม่ได้ตั้ง target channel"
  };
}

function buildLiveMap(config: BotConfig) {
  const keyboardModel = buildKeyboardModel(config);
  const actionModel = compileButtonModel(config);
  const commandEntries = buildCommands(config);
  const replyKeyboard = buildReplyKeyboard(config, keyboardModel);
  const inlineKeyboard = buildInlineKeyboard(config, keyboardModel);
  const channelFeatures = buildChannelFeatures(config);

  return {
    botName: safeString(config.name),
    commands: commandEntries.map((cmd) => ({
      command: `/${cmd.command}`,
      description: cmd.description
    })),
    replyKeyboardButtons: replyKeyboard.buttons.map((btn) => ({
      id: btn.id,
      text: btn.text,
      source: btn.source
    })),
    inlineButtons: inlineKeyboard.buttons.map((btn) => ({
      text: btn.text,
      id: btn.id,
      type: btn.type,
      callbackData: btn.callbackData,
      url: (btn as any).url || undefined,
      webAppUrl: (btn as any).webAppUrl || undefined
    })),
    warnings: actionModel.issues.filter((issue) => issue.level === "warning"),
    buttonIssues: actionModel.issues,
    buttonDebug: actionModel.debugRows,
    menuButton: buildMenuButton(config),
    groupFeatures: {
      welcomeNewMember: config.groupSettings.welcomeNewMember,
      antiSpam: config.groupSettings.antiSpam,
      customCommands: (config.groupSettings.customCommands || []).map((cmd) => ({
        command: `/${normalizeCommand(cmd.command)}`,
        reply: safeString(cmd.reply)
      }))
    },
    channelFeatures
  };
}

// --- Feature Parity ---
type FeatureStatus = "live" | "draft_only" | "simulator_only" | "needs_permission" | "needs_target" | "unsupported" | "not_configured";
type FeatureCategory = "profile" | "commands" | "reply_keyboard" | "inline_buttons" | "menu_button" | "private_chat" | "group" | "channel" | "inline_query" | "ai" | "simulator";

interface FeatureItem {
  key: string;
  label: string;
  category: FeatureCategory;
  configured: boolean;
  liveSupported: boolean;
  liveStatus: FeatureStatus;
  reason: string;
  requiredAction?: string;
}

interface PreflightResult {
  canPublish: boolean;
  blockers: Array<{ key: string; message: string }>;
  warnings: Array<{ key: string; message: string }>;
}

function buildFeatureMatrix(config: BotConfig): FeatureItem[] {
  const isPublished = Boolean(botRegistry.resolve(config.instanceId || DEFAULT_INSTANCE_ID));
  const keyboardModel = buildKeyboardModel(config);
  const actionModel = compileButtonModel(config);
  const replyKb = buildReplyKeyboard(config, keyboardModel);
  const inlineKb = buildInlineKeyboard(config, keyboardModel);
  const commands = buildCommands(config);
  const hasChannelTarget = Boolean(
    safeString(config.channelSettings?.targetChannelId).trim() ||
    safeString(config.channelSettings?.targetChannelUsername).trim()
  );
  const hasLiveAiKey = Boolean(
    GEMINI_API_KEY ||
    safeString(config.externalApis?.geminiApiKey).trim() ||
    safeString(config.externalApis?.openaiApiKey).trim()
  );
  const autoReplies = config.botSettings.autoReplies || [];
  const hasBase64Image = autoReplies.some((r) => /^data:/i.test(safeString(r.imageUrl)));
  const hasHttpsImage = autoReplies.some((r) => /^https?:\/\//i.test(safeString(r.imageUrl)));
  const mediaLibrary = config.mediaLibrary || [];
  const hasBase64Media = mediaLibrary.some((m) => /^data:/i.test(safeString(m.url)));

  const liveIfPublished = (configured: boolean): FeatureStatus => {
    if (!configured) return "not_configured";
    return isPublished ? "live" : "draft_only";
  };

  return [
    { key: "bot_name", label: "ชื่อบอท (setMyName)", category: "profile",
      configured: Boolean(config.name), liveSupported: true,
      liveStatus: liveIfPublished(Boolean(config.name)),
      reason: config.name ? (isPublished ? "Publish แล้ว ผ่าน setMyName" : "ตั้งค่าแล้ว รอ publish") : "ยังไม่ได้ตั้งชื่อบอท",
      requiredAction: !config.name ? "ตั้งชื่อบอทในหน้า ข้อมูลพื้นฐาน" : undefined },
    { key: "bot_description", label: "คำอธิบายบอท (setMyDescription)", category: "profile",
      configured: Boolean(safeString(config.botSettings.welcomeMessage || config.botSettings.aiPrompt).trim()),
      liveSupported: true,
      liveStatus: liveIfPublished(Boolean(safeString(config.botSettings.welcomeMessage || config.botSettings.aiPrompt).trim())),
      reason: isPublished ? "Publish แล้ว ผ่าน setMyDescription (512 chars)" : "จะ publish จาก welcomeMessage/aiPrompt" },
    { key: "slash_commands", label: "Slash Commands (setMyCommands)", category: "commands",
      configured: commands.length > 0, liveSupported: true,
      liveStatus: liveIfPublished(commands.length > 0),
      reason: commands.length > 0 ? `${commands.length} คำสั่ง${isPublished ? " (live)" : " (ยังไม่ publish)"}` : "ยังไม่มีคำสั่ง",
      requiredAction: commands.length === 0 ? "เพิ่มคำสั่งใน 4 ฟีเจอร์สุดเด็ด > Slash Commands" : undefined },
    { key: "reply_keyboard", label: "ปุ่มล่างแชต (ReplyKeyboardMarkup)", category: "reply_keyboard",
      configured: replyKb.buttons.length > 0, liveSupported: true,
      liveStatus: liveIfPublished(replyKb.buttons.length > 0),
      reason: replyKb.buttons.length > 0 ? `${replyKb.buttons.length} ปุ่ม${isPublished ? " (live)" : " (ยังไม่ publish)"}` : "ยังไม่มีปุ่มล่างแชต" },
    { key: "inline_buttons", label: "ปุ่ม Callback/URL/WebApp (InlineKeyboardMarkup)", category: "inline_buttons",
      configured: inlineKb.buttons.length > 0, liveSupported: true,
      liveStatus: liveIfPublished(inlineKb.buttons.length > 0),
      reason: inlineKb.buttons.length > 0 ? `${inlineKb.buttons.length} ปุ่ม Callback/URL/WebApp${isPublished ? " (live)" : " (ยังไม่ publish)"}` : "ไม่มีปุ่ม Inline" },
    { key: "inline_stable_actions", label: "Stable Inline Action IDs", category: "inline_buttons",
      configured: actionModel.inlineButtons.some((button) => button.type === "inline_callback"), liveSupported: true,
      liveStatus: actionModel.inlineButtons.some((button) => button.type === "inline_callback") ? liveIfPublished(true) : "not_configured",
      reason: "callback_data route ด้วย stable action ID และไม่ใช้ array index" },
    { key: "menu_button", label: "Bot Menu Button (setChatMenuButton)", category: "menu_button",
      configured: Boolean(config.botMenuButton), liveSupported: true,
      liveStatus: liveIfPublished(Boolean(config.botMenuButton)),
      reason: config.botMenuButton ? `type: ${config.botMenuButton.type}${isPublished ? " (live)" : " (ยังไม่ publish)"}` : "ใช้ค่า default" },
    { key: "welcome_message", label: "Welcome Message (/start)", category: "private_chat",
      configured: Boolean(safeString(config.botSettings.welcomeMessage).trim()), liveSupported: true,
      liveStatus: liveIfPublished(Boolean(safeString(config.botSettings.welcomeMessage).trim())),
      reason: "ส่งผ่าน webhook ทันทีที่รับ /start",
      requiredAction: !config.botSettings.welcomeMessage ? "ตั้ง Welcome Message ในหน้า แชตบอทส่วนตัว" : undefined },
    { key: "auto_replies", label: "Keyword Auto Replies", category: "private_chat",
      configured: autoReplies.length > 0, liveSupported: true,
      liveStatus: liveIfPublished(autoReplies.length > 0),
      reason: autoReplies.length > 0 ? `${autoReplies.length} keyword${isPublished ? " (live via webhook)" : " (ยังไม่ publish)"}` : "ยังไม่มี keyword replies" },
    { key: "auto_reply_image", label: "รูปภาพใน Auto Reply", category: "private_chat",
      configured: hasHttpsImage || hasBase64Image, liveSupported: hasHttpsImage,
      liveStatus: hasBase64Image && !hasHttpsImage ? "simulator_only" : hasHttpsImage ? liveIfPublished(true) : "not_configured",
      reason: hasBase64Image ? "รูป base64/data URL ใช้ได้เฉพาะ Simulator Telegram ต้องการ public https URL" : hasHttpsImage ? "รูป https URL ส่งผ่าน sendPhoto ได้จริง" : "ยังไม่มีรูปภาพแนบ",
      requiredAction: hasBase64Image ? "เปลี่ยน imageUrl เป็น public https URL" : undefined },
    { key: "group_welcome", label: "ต้อนรับสมาชิกใหม่ในกลุ่ม", category: "group",
      configured: config.groupSettings.welcomeNewMember, liveSupported: true,
      liveStatus: config.groupSettings.welcomeNewMember ? "needs_permission" : "not_configured",
      reason: "ต้องให้บอทเป็น Admin ในกลุ่มจึงจะรับ new_chat_members event ได้",
      requiredAction: config.groupSettings.welcomeNewMember ? "เพิ่มบอทเป็น Admin ในกลุ่ม Telegram" : undefined },
    { key: "group_antispam_delete", label: "Anti-spam ลบข้อความ", category: "group",
      configured: config.groupSettings.antiSpam.blockLinks || config.groupSettings.antiSpam.blockSwearWords, liveSupported: true,
      liveStatus: (config.groupSettings.antiSpam.blockLinks || config.groupSettings.antiSpam.blockSwearWords) ? (config.adminPermissions.canDeleteMessages ? liveIfPublished(true) : "needs_permission") : "not_configured",
      reason: config.adminPermissions.canDeleteMessages ? "canDeleteMessages เปิดอยู่" : "ต้องมีสิทธิ์ Delete Messages ในกลุ่ม",
      requiredAction: !config.adminPermissions.canDeleteMessages ? "เปิด canDeleteMessages ในหน้า ระบบผู้ดูแลกลุ่ม" : undefined },
    { key: "group_antispam_ban", label: "Anti-spam แบนสมาชิก", category: "group",
      configured: config.groupSettings.antiSpam.warnLimit > 0, liveSupported: true,
      liveStatus: config.groupSettings.antiSpam.warnLimit > 0 ? (config.adminPermissions.canBanUsers ? liveIfPublished(true) : "needs_permission") : "not_configured",
      reason: config.adminPermissions.canBanUsers ? `warnLimit: ${config.groupSettings.antiSpam.warnLimit}` : "ต้องมีสิทธิ์ Ban Users ในกลุ่ม",
      requiredAction: !config.adminPermissions.canBanUsers ? "เปิด canBanUsers ในหน้า ระบบผู้ดูแลกลุ่ม" : undefined },
    { key: "group_rules", label: "คำสั่ง /rules ในกลุ่ม", category: "group",
      configured: Boolean(config.groupSettings.rulesAnnouncement), liveSupported: true,
      liveStatus: "needs_permission",
      reason: "ใช้งานได้เมื่อบอทอยู่ในกลุ่มและรับ message events ได้",
      requiredAction: "เพิ่มบอทในกลุ่ม Telegram และตั้งค่า /rules" },
    { key: "channel_scheduled_posts", label: "Scheduled Posts แชนแนล", category: "channel",
      configured: (config.channelSettings.scheduledPosts || []).length > 0, liveSupported: true,
      liveStatus: !hasChannelTarget ? "needs_target" : liveIfPublished((config.channelSettings.scheduledPosts || []).length > 0),
      reason: hasChannelTarget ? `Target: ${safeString(config.channelSettings.targetChannelId || config.channelSettings.targetChannelUsername)}` : "ยังไม่ได้ตั้ง target channel",
      requiredAction: !hasChannelTarget ? "ตั้ง targetChannelId ในหน้า แชนแนลข่าวสาร" : undefined },
    { key: "channel_test_send", label: "ทดสอบส่งโพสต์แชนแนล", category: "channel",
      configured: hasChannelTarget, liveSupported: true,
      liveStatus: hasChannelTarget ? "live" : "needs_target",
      reason: hasChannelTarget ? "POST /api/telegram/send-channel-test พร้อมใช้งาน" : "ต้องตั้ง target channel ก่อน",
      requiredAction: !hasChannelTarget ? "ตั้ง targetChannelId ในหน้า แชนแนลข่าวสาร" : undefined },
    { key: "inline_query", label: "Inline Query (@bot search)", category: "inline_query",
      configured: Boolean(config.inlineQuerySettings?.enableInline), liveSupported: true,
      liveStatus: liveIfPublished(Boolean(config.inlineQuerySettings?.enableInline)),
      reason: config.inlineQuerySettings?.enableInline
        ? (isPublished ? "Inline Query ทำงานผ่าน webhook" : "เปิดใช้งานแล้ว รอ publish")
        : "Inline Query ยังไม่ได้เปิดใช้งาน",
      requiredAction: !config.inlineQuerySettings?.enableInline ? "เปิด Inline Mode ผ่าน @BotFather แล้วเปิด enableInline ในหน้าตั้งค่า" : undefined },
    { key: "ai_assistant", label: "AI Assistant (live)", category: "ai",
      configured: config.botSettings.enableAiAssistant, liveSupported: hasLiveAiKey,
      liveStatus: config.botSettings.enableAiAssistant ? (hasLiveAiKey ? liveIfPublished(true) : "simulator_only") : "not_configured",
      reason: config.botSettings.enableAiAssistant ? (hasLiveAiKey ? "มี API key สำหรับ AI จริง" : "ใช้ mockChat() เท่านั้น ต้องมี Gemini/OpenAI API key") : "AI assistant ปิดอยู่",
      requiredAction: !hasLiveAiKey && config.botSettings.enableAiAssistant ? "ตั้ง Gemini หรือ OpenAI API key ในหน้า ตั้งค่าขั้นสูง" : undefined },
    { key: "media_library", label: "คลังภาพ (Media Library)", category: "simulator",
      configured: mediaLibrary.length > 0, liveSupported: !hasBase64Media,
      liveStatus: !mediaLibrary.length ? "not_configured" : hasBase64Media ? "simulator_only" : liveIfPublished(true),
      reason: hasBase64Media ? "มีรูป base64: ใช้ได้เฉพาะ Simulator Telegram ต้องการ public https URL" : mediaLibrary.length > 0 ? "รูปใน media library ต้องเป็น public https URL" : "ไม่มีรูปในคลังภาพ",
      requiredAction: hasBase64Media ? "อัปโหลดรูปไปยัง hosting ภายนอกและใช้ URL แทน" : undefined },
    { key: "marketing_referral", label: "ระบบแนะนำเพื่อน & คะแนน", category: "simulator",
      configured: Boolean(config.marketingSettings), liveSupported: false,
      liveStatus: "simulator_only",
      reason: "ฟีเจอร์นี้ทำงานเฉพาะใน Frontend Simulator ยังไม่มี database/user tracking จริง",
      requiredAction: "ต้องเพิ่ม database backend เพื่อให้ referral system ทำงานจริง" },
    { key: "config_export_import", label: "Export/Import Config JSON", category: "simulator",
      configured: true, liveSupported: false,
      liveStatus: "simulator_only",
      reason: "ทำงานเฉพาะ Frontend เป็น localStorage operation ไม่ใช่ Telegram feature" }
  ];
}

function preflightCheck(config: BotConfig, hasToken = Boolean(BOT_TOKEN)): PreflightResult {
  const blockers: Array<{ key: string; message: string }> = [];
  const warnings: Array<{ key: string; message: string }> = [];

  if (!hasToken) {
    blockers.push({ key: "no_bot_token", message: "ยังไม่ได้ตั้ง BOT_TOKEN ใน Render Environment" });
  }

  const invalidCmds = (config.botCommands || []).filter((c) => {
    const cmd = normalizeCommand(c.command);
    return cmd && !/^[a-z0-9_]{1,32}$/.test(cmd);
  });
  if (invalidCmds.length > 0) {
    warnings.push({ key: "invalid_commands", message: `${invalidCmds.length} คำสั่งไม่ valid (ต้องเป็น a-z, 0-9, _ ความยาวไม่เกิน 32)` });
  }

  const actionModel = compileButtonModel(config);
  actionModel.issues.forEach((issue, index) => {
    const item = { key: `button_${issue.code}_${index}`, message: issue.message };
    if (issue.level === "error") blockers.push(item);
    else warnings.push(item);
  });

  const hasBase64AutoReply = (config.botSettings.autoReplies || []).some((r) => /^data:/i.test(safeString(r.imageUrl)));
  if (hasBase64AutoReply) {
    warnings.push({ key: "base64_image", message: "Auto Reply มีรูปภาพ base64 ที่ Telegram ส่งไม่ได้ ต้องใช้ public https URL" });
  }

  const hasChannelTarget = Boolean(
    safeString(config.channelSettings?.targetChannelId).trim() ||
    safeString(config.channelSettings?.targetChannelUsername).trim()
  );
  if ((config.channelSettings?.scheduledPosts || []).length > 0 && !hasChannelTarget) {
    warnings.push({ key: "channel_no_target", message: "มี Scheduled Posts แต่ยังไม่ได้ตั้ง Target Channel" });
  }

  if (config.groupSettings.welcomeNewMember || config.groupSettings.antiSpam.blockLinks || config.groupSettings.antiSpam.blockSwearWords) {
    warnings.push({ key: "group_needs_admin", message: "Group features ต้องการบอทเป็น Admin ในกลุ่ม Telegram ถึงจะทำงานได้" });
  }

  if (config.inlineQuerySettings?.enableInline) {
    warnings.push({ key: "inline_query_requires_botfather", message: "Inline Query เปิดอยู่ — ตรวจสอบให้แน่ใจว่าเปิด Inline Mode ผ่าน @BotFather แล้ว" });
  }

  if (config.botSettings.enableAiAssistant) {
    const hasLiveAiKey = Boolean(
      safeString(config.externalApis?.geminiApiKey).trim() ||
      safeString(config.externalApis?.openaiApiKey).trim()
    );
    if (!hasLiveAiKey) {
      warnings.push({ key: "ai_no_key", message: "AI Assistant เปิดอยู่ แต่ไม่มี Gemini/OpenAI API key จะใช้ mock reply เท่านั้น" });
    }
  }

  return { canPublish: blockers.length === 0, blockers, warnings };
}

function mockChat(message: string, config = getActiveBotConfig()) {
  const text = message.toLowerCase();
  if (text.includes("ราคา")) return "ข้อมูลราคาเริ่มต้นขึ้นกับจำนวนกลุ่มและฟีเจอร์ที่ใช้ครับ ส่งรายละเอียดมาได้เลย เดี๋ยวช่วยประเมินให้ครับ";
  if (text.includes("สวัสดี") || text.includes("hello") || text.includes("hi")) return `สวัสดีครับ ผมคือ ${config.name || "Jimmy_bot"} ยินดีให้บริการครับ`;
  if (text.includes("ช่วย") || text.includes("help")) return "พิมพ์ /help เพื่อดูคำสั่ง หรือกดปุ่มเมนูด้านล่างได้เลยครับ";
  return `รับข้อความแล้วครับ: "${message}"`;
}

function getGeminiKey(config?: BotConfig): string {
  return GEMINI_API_KEY || safeString(config?.externalApis?.geminiApiKey).trim();
}

async function geminiChat(message: string, systemPrompt: string, config?: BotConfig): Promise<string> {
  const key = getGeminiKey(config);
  if (!key) return mockChat(message, config);
  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: message,
      config: { systemInstruction: systemPrompt || undefined }
    });
    return response.text || mockChat(message, config);
  } catch (err: any) {
    console.error("Gemini chat error:", err.message);
    return mockChat(message, config);
  }
}

async function geminiGenerate(prompt: string, systemPrompt?: string): Promise<string> {
  const key = getGeminiKey();
  if (!key) return "";
  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      ...(systemPrompt ? { config: { systemInstruction: systemPrompt } } : {})
    });
    return response.text || "";
  } catch (err: any) {
    console.error("Gemini generate error:", err.message);
    return "";
  }
}

async function geminiGenerateAvatar(botName: string): Promise<string | null> {
  const key = getGeminiKey();
  if (!key) return null;
  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateImages({
      model: "imagen-3.0-generate-002",
      prompt: `Minimal cute robot avatar for a Telegram bot named "${botName}", flat icon, digital art, white background, 1:1 ratio`,
      config: { numberOfImages: 1, outputMimeType: "image/jpeg", aspectRatio: "1:1" }
    });
    const bytes = response.generatedImages?.[0]?.image?.imageBytes;
    if (bytes) return `data:image/jpeg;base64,${bytes}`;
    return null;
  } catch (err: any) {
    console.error("Gemini avatar error:", err.message);
    return null;
  }
}

async function telegramApi(method: string, payload?: Record<string, any>, tokenOverride?: string) {
  const token = safeString(tokenOverride).trim() || telegramBotContext.getStore()?.token || BOT_TOKEN;
  if (!token) {
    throw new Error("Missing BOT_TOKEN env on Render");
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    throw new Error(data.description || `Telegram API ${method} failed with HTTP ${response.status}`);
  }
  return data;
}

async function sendMessage(chatId: number | string, text: string, options: Record<string, any> = {}, tokenOverride?: string) {
  return telegramApi("sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    ...options
  }, tokenOverride);
}

async function sendPhotoOrText(chatId: number | string, text: string, imageUrl?: string, options: Record<string, any> = {}, tokenOverride?: string) {
  const isHttpImage = typeof imageUrl === "string" && /^https?:\/\//i.test(imageUrl);
  if (!isHttpImage) {
    if (typeof imageUrl === "string" && /^data:/i.test(imageUrl)) {
      console.info("Skipped sendPhoto because Telegram requires public image URL (https) instead of data URL");
    }
    return sendMessage(chatId, text, options, tokenOverride);
  }
  return telegramApi("sendPhoto", {
    chat_id: chatId,
    photo: imageUrl,
    caption: text,
    ...options
  }, tokenOverride);
}

async function telegramApiSafe(method: string, payload?: Record<string, any>, tokenOverride?: string) {
  try {
    const data = await telegramApi(method, payload, tokenOverride);
    return { ok: true as const, result: data.result ?? data };
  } catch (err: any) {
    return { ok: false as const, error: err.message || `Telegram API ${method} failed` };
  }
}

function findReplyKeyboardMatch(text: string, config: BotConfig, context = "root") {
  const resolution = resolveButtonAction(compileButtonModel(config), { kind: "message", value: text, context });
  return resolution.matched ? resolution : null;
}

function findAutoReply(text: string, config: BotConfig) {
  const lookup = text.toLowerCase();
  return (config.botSettings.autoReplies || []).find((item) => {
    const keyword = safeString(item.keyword).toLowerCase().trim();
    return keyword && lookup.includes(keyword);
  }) || null;
}

function findBotCommand(commandName: string, config: BotConfig) {
  const resolution = resolveConfigAction(config, { kind: "command", value: commandName });
  return resolution.matched ? resolution : null;
}

function findGroupCommand(commandName: string, config: BotConfig) {
  const commands = Array.isArray(config.groupSettings.customCommands) ? config.groupSettings.customCommands : [];
  return commands.find((cmd) => normalizeCommand(cmd.command) === commandName) || null;
}

function resolveChannelTarget(config: BotConfig) {
  const targetChannelId = safeString(config.channelSettings?.targetChannelId).trim();
  const targetChannelUsername = normalizeChannelUsername(config.channelSettings?.targetChannelUsername || "");
  if (targetChannelId) return targetChannelId;
  if (targetChannelUsername) return targetChannelUsername;
  return "";
}

function buildChannelPostText(config: BotConfig, postContent: string) {
  const content = safeString(postContent).trim();
  if (config.channelSettings.autoSignature && safeString(config.channelSettings.autoSignatureText).trim()) {
    return `${content}\n\n${safeString(config.channelSettings.autoSignatureText).trim()}`;
  }
  return content;
}

async function handleTelegramMessage(message: any, config: BotConfig, isPublished = true) {
  const chatId = message?.chat?.id;
  const chatType = message?.chat?.type || "private";
  const text = safeString(message?.text);
  const menuContextKey = `${config.instanceId || DEFAULT_INSTANCE_ID}:${chatId}`;
  if (!chatId) return;

  if (!isPublished) {
    await sendMessage(chatId, "ยังไม่ได้เผยแพร่ config ไป Telegram จริง กรุณากดเผยแพร่ในหน้าเว็บก่อนครับ");
    return;
  }

  if ((chatType === "group" || chatType === "supergroup") && Array.isArray(message?.new_chat_members) && config.groupSettings.welcomeNewMember) {
    for (const member of message.new_chat_members) {
      const name = [member.first_name, member.last_name].filter(Boolean).join(" ") || "สมาชิกใหม่";
      await sendMessage(chatId, config.groupSettings.welcomeMessage.replace("{name}", name));
    }
    return;
  }

  if (!text) return;

  // Lead forwarding moved to forwardLeadToExternalApi() in processTelegramWebhook
  // so it runs once for every message regardless of which pipeline handles the reply.

  if (chatType === "private" && config.privacySettings.allowDirectMessages === false) {
    await sendMessage(chatId, "🔒 บอทนี้ปิดการคุยส่วนตัวไว้ครับ");
    return;
  }

  const isGroup = chatType === "group" || chatType === "supergroup";
  const isCommand = text.trim().startsWith("/");

  if (isGroup && config.privacySettings.groupPrivacyMode && !isCommand) {
    return;
  }

  const replyKeyboard = buildReplyKeyboard(config);

  if (isGroup) {
    let violation = "";
    if (config.groupSettings.antiSpam.blockLinks && /(https?:\/\/|t\.me\/|www\.)/i.test(text)) {
      violation = "ห้ามโพสต์ลิงก์ภายนอกกลุ่มแชต";
    }
    const swearWords = ["ควย", "เย็ด", "เหี้ย", "สัส", "หน้าหี", "มึง", "กู"];
    if (!violation && config.groupSettings.antiSpam.blockSwearWords && swearWords.some((word) => text.includes(word))) {
      violation = "กรุณาใช้คำสุภาพในกลุ่มแชต";
    }

    if (violation) {
      const userId = message?.from?.id;
      const warningKey = `${chatId}:${userId}`;
      const nextWarning = (groupWarnings.get(warningKey) || 0) + 1;
      groupWarnings.set(warningKey, nextWarning);

      if (config.adminPermissions.canDeleteMessages) {
        telegramApi("deleteMessage", { chat_id: chatId, message_id: message.message_id }).catch((err) => {
          console.error("deleteMessage failed:", err.message);
        });
      }

      if (nextWarning >= config.groupSettings.antiSpam.warnLimit && config.adminPermissions.canBanUsers && userId) {
        await sendMessage(chatId, `⚠️ สมาชิกละเมิดกฎครบ ${nextWarning}/${config.groupSettings.antiSpam.warnLimit} ครั้ง ระบบจะนำออกจากกลุ่มครับ`);
        await telegramApi("banChatMember", { chat_id: chatId, user_id: userId }).catch((err) => {
          console.error("banChatMember failed:", err.message);
        });
        groupWarnings.set(warningKey, 0);
      } else {
        await sendMessage(chatId, `⚠️ ${violation}\nเตือนแล้ว ${nextWarning}/${config.groupSettings.antiSpam.warnLimit} ครั้งครับ`);
      }
      return;
    }

    // Keyword monitoring (fire-and-forget alert to group)
    const km = config.groupSettings.keywordMonitoring;
    if (km?.enable && Array.isArray(km.keywords) && km.keywords.length) {
      const lowerText = text.toLowerCase();
      const matchedKeyword = km.keywords.find((kw) => safeString(kw) && lowerText.includes(kw.toLowerCase()));
      if (matchedKeyword) {
        const senderName = [message?.from?.first_name, message?.from?.last_name].filter(Boolean).join(" ") || "ไม่ระบุชื่อ";
        const alertMsg = `🔔 Keyword Alert: พบคำว่า "${matchedKeyword}" จาก ${senderName}\nข้อความ: "${text.slice(0, 100)}"`;
        if (km.notificationType === "bot_message" || km.notificationType === "both") {
          sendMessage(chatId, alertMsg).catch(() => {});
        }
      }
    }
  }

  if (isCommand) {
    const commandName = normalizeCommand(text.trim().split(/\s+/)[0]);

    if (commandName === "start") {
      buttonMenuContexts.set(menuContextKey, "root");
      const startAction = resolveConfigAction(config, { kind: "command", value: "/start" });
      await sendMessage(chatId, startAction.reply || config.botSettings.welcomeMessage, { reply_markup: replyKeyboard.replyMarkup });
      const inlineKeyboard = buildInlineKeyboard(config);
      if (inlineKeyboard.replyMarkup) {
        await sendMessage(chatId, "เมนูใต้ข้อความ:", { reply_markup: inlineKeyboard.replyMarkup });
      }
      return;
    }

    const botCommand = findBotCommand(commandName, config);
    if (botCommand) {
      await sendMessage(chatId, safeString(botCommand.reply), { reply_markup: replyKeyboard.replyMarkup });
      return;
    }

    if (isGroup) {
      if (commandName === "rules") {
        const rulesCommand = findGroupCommand("rules", config);
        const rulesReply = safeString(rulesCommand?.reply || config.groupSettings.rulesAnnouncement || "ยังไม่ได้ตั้งค่ากฎกลุ่ม");
        await sendMessage(chatId, rulesReply);
        return;
      }

      const groupCommand = findGroupCommand(commandName, config);
      if (groupCommand) {
        await sendMessage(chatId, safeString(groupCommand.reply));
        return;
      }
    }

    await sendMessage(chatId, "ยังไม่มีคำสั่งนี้ใน Live Config ครับ กรุณา publish จากหน้าเว็บอีกครั้ง");
    return;
  }

  const keyboardMatch = findReplyKeyboardMatch(text, config, buttonMenuContexts.get(menuContextKey) || "root");
  if (keyboardMatch) {
    const targetPayload = keyboardMatch.route === "navigate" && keyboardMatch.target
      ? buildTelegramButtonPayload(config, keyboardMatch.target)
      : null;
    if (keyboardMatch.route === "navigate" && keyboardMatch.target) buttonMenuContexts.set(menuContextKey, keyboardMatch.target);
    await sendMessage(chatId, keyboardMatch.reply || "รับคำสั่งจากปุ่มแล้วครับ", { reply_markup: targetPayload?.replyMarkup || replyKeyboard.replyMarkup });
    if (targetPayload?.inlineMarkup) await sendMessage(chatId, "เมนูใต้ข้อความ:", { reply_markup: targetPayload.inlineMarkup });
    return;
  }

  const autoReply = findAutoReply(text, config);
  if (autoReply) {
    await sendPhotoOrText(chatId, safeString(autoReply.reply), autoReply.imageUrl, { reply_markup: replyKeyboard.replyMarkup });
    return;
  }

  if (config.botSettings.enableAiAssistant) {
    const aiReply = await geminiChat(text.trim(), safeString(config.botSettings.aiPrompt), config);
    await sendMessage(chatId, aiReply, { reply_markup: replyKeyboard.replyMarkup });
    return;
  }

  await sendMessage(chatId, "ยังไม่มีคำตอบสำหรับข้อความนี้ครับ ลองตั้งค่า Keyword Reply หรือเปิด AI Assistant ในหน้า GUI ได้เลย", {
    reply_markup: replyKeyboard.replyMarkup
  });
}

// handleTelegramCallback removed — ALL callback queries (private + group) are now
// handled by TelegramUpdateHandler.handleCallback via processTelegramWebhook.

async function handleInlineQuery(inlineQuery: any, config: BotConfig) {
  const queryId = inlineQuery?.id;
  const queryText = safeString(inlineQuery?.query).toLowerCase().trim();
  if (!queryId) return;

  const results = config.inlineQuerySettings?.results || [];
  const filtered = queryText
    ? results.filter((r) =>
        r.title.toLowerCase().includes(queryText) ||
        r.description.toLowerCase().includes(queryText) ||
        r.content.toLowerCase().includes(queryText)
      )
    : results;

  const answerResults = filtered.map((r) => ({
    type: "article",
    id: r.id,
    title: r.title,
    description: r.description,
    input_message_content: { message_text: r.content }
  }));

  const answered = await telegramApiSafe("answerInlineQuery", {
    inline_query_id: queryId,
    results: answerResults,
    cache_time: 30
  });
  if (!answered.ok) {
    console.error("answerInlineQuery failed:", answered.error);
  }
}

function generateMockSuggest(prompt: string): BotConfig {
  const base = normalizeConfig(DEFAULT_BOT_CONFIG);
  const lower = prompt.toLowerCase();
  if (lower.includes("กลุ่ม") || lower.includes("แอดมิน")) {
    return { ...base, name: "🛡️ Jimmy Bot ผู้ดูแลกลุ่ม", platform: "group" };
  }
  if (lower.includes("ขาย") || lower.includes("ร้าน") || lower.includes("สินค้า")) {
    return { ...base, name: "🛍️ Jimmy Bot ร้านค้า", platform: "all" };
  }
  return { ...base, name: "🤖 Jimmy Bot AI Assistant", platform: "all" };
}

app.get("/health", (_req, res) => {
  const token = getRuntimeBotToken(DEFAULT_INSTANCE_ID);
  res.json({
    ok: true,
    service: "bot_jimmy",
    mode: token ? "telegram-ready" : "missing-bot-token",
    port: PORT,
    webhookPath: "/telegram/webhook",
    hasBotToken: Boolean(token),
    hasWebhookSecret: Boolean(TELEGRAM_WEBHOOK_SECRET),
    authEnabled: isAuthConfigured(),
    // ใช้ยืนยันว่า deploy บน Render เป็น commit ล่าสุดหรือยัง (Render inject ให้อัตโนมัติ)
    version: APP_VERSION,
    gitCommit: process.env.RENDER_GIT_COMMIT || null
  });
});

app.get("/api/telegram/runtime/status", (_req, res) => {
  res.json({ ok: true, ...telegramRuntime.getStatus() });
});

app.post("/api/telegram/runtime/start", async (req, res) => {
  const instanceId = safeInstanceId(req.body?.instanceId);
  const runtimeConfig = req.body?.config ? normalizeConfig({ ...req.body.config, instanceId }) : getActiveBotConfig(instanceId);
  const token = safeString(req.body?.token).trim() || BOT_TOKEN;
  if (!token) return res.status(400).json({ ok: false, error: "ยังไม่ได้ตั้ง Telegram Bot Token" });
  const requestedMode = safeString(req.body?.reviewerMode, "normal") as ReviewerMode;
  const reviewerMode: ReviewerMode = ["off", "normal", "strict"].includes(requestedMode) ? requestedMode : "normal";
  try {
    telegramUpdateHandler.setBotConfig(runtimeConfig as any);
    const status = await telegramRuntime.start({
      token,
      openaiApiKey: safeString(req.body?.openaiApiKey).trim() || OPENAI_API_KEY,
      geminiApiKey: safeString(req.body?.geminiApiKey).trim() || GEMINI_API_KEY,
      systemPrompt: safeString(req.body?.systemPrompt, runtimeConfig.botSettings.aiPrompt),
      reviewerMode,
    });
    return res.json({ ok: true, ...status });
  } catch (error: any) {
    return res.status(400).json({ ok: false, error: safeString(error?.message, "เริ่ม Telegram runtime ไม่สำเร็จ") });
  }
});

app.post("/api/telegram/runtime/stop", async (_req, res) => {
  const status = await telegramRuntime.stop();
  res.json({ ok: true, ...status });
});

// Emergency kill switch — หยุด/เปิดบอทจริง ทั้งโหมด webhook (Render) และ polling
// stop  = หยุด polling runtime (ถ้ารันอยู่) + deleteWebhook เพื่อตัดข้อความเข้าทั้งหมด
// start = setWebhook กลับ (ใช้ WEBHOOK_BASE_URL หรือ RENDER_EXTERNAL_URL ที่ Render inject ให้)
app.post("/api/telegram/emergency", async (req, res) => {
  const action = safeString(req.body?.action) === "start" ? "start" : "stop";
  const instanceId = safeInstanceId(req.body?.instanceId);
  const token = getRuntimeBotToken(instanceId);
  if (!token) return res.status(400).json({ ok: false, error: "ยังไม่ได้ตั้ง BOT_TOKEN ใน Environment" });
  try {
    if (action === "stop") {
      if (telegramRuntime.getStatus().running) await telegramRuntime.stop();
      const result = await telegramApi("deleteWebhook", { drop_pending_updates: false }, token);
      return res.json({ ok: true, action, result });
    }
    const baseUrl = WEBHOOK_BASE_URL || process.env.RENDER_EXTERNAL_URL || "";
    let webhookResult: unknown = null;
    let webhookUrl: string | null = null;
    if (baseUrl) {
      webhookUrl = `${baseUrl.replace(/\/$/, "")}/telegram/webhook/${instanceId}`;
      const payload: Record<string, any> = {
        url: webhookUrl,
        allowed_updates: ["message", "callback_query", "inline_query"]
      };
      if (TELEGRAM_WEBHOOK_SECRET) payload.secret_token = TELEGRAM_WEBHOOK_SECRET;
      webhookResult = await telegramApi("setWebhook", payload, token);
    }
    return res.json({ ok: true, action, webhookUrl, webhookResult });
  } catch (err: any) {
    return res.status(500).json({ ok: false, action, error: err.message });
  }
});

app.get("/api/ai/memory/status", (_req, res) => {
  res.json({ ok: true, ...conversationMemory.getSafeStatus() });
});

app.post("/api/ai/memory/toggle", (req, res) => {
  conversationMemory.setEnabled(req.body?.enabled === true);
  res.json({ ok: true, ...conversationMemory.getSafeStatus() });
});

app.delete("/api/ai/memory", (req, res) => {
  if (req.header("x-jimmy-admin-user") !== "admin") {
    return res.status(403).json({ ok: false, error: "Admin access required" });
  }
  conversationMemory.clearAll();
  return res.json({ ok: true, ...conversationMemory.getSafeStatus() });
});

// ---------- Live Ops Dashboard metrics (ข้อมูลจริงจากข้อความ Telegram) ----------
app.get("/api/metrics/summary", (_req, res) => {
  res.json({ ok: true, ...metricsStore.getSummary() });
});

app.get("/api/metrics/activity", (req, res) => {
  const since = typeof req.query.since === "string" ? req.query.since : undefined;
  res.json({ ok: true, items: metricsStore.getActivitySince(since) });
});

// Server-Sent Events: push ข้อความใหม่ไปหน้า Dashboard แบบ real-time
const metricsSseClients = new Set<express.Response>();
metricsStore.onRecord((item) => {
  const payload = `event: activity\ndata: ${JSON.stringify(item)}\n\n`;
  for (const client of metricsSseClients) {
    try {
      client.write(payload);
    } catch {
      metricsSseClients.delete(client);
    }
  }
});

app.get("/api/metrics/stream", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write("retry: 5000\n\n");
  metricsSseClients.add(res);
  const heartbeat = setInterval(() => {
    try {
      res.write(": hb\n\n");
    } catch {
      /* noop */
    }
  }, 25000);
  req.on("close", () => {
    clearInterval(heartbeat);
    metricsSseClients.delete(res);
  });
});

// ตัวช่วยทดสอบบนเครื่อง dev (ปิดอัตโนมัติเมื่อมี BOT_TOKEN จริง)
app.post("/api/metrics/test", (req, res) => {
  if (getRuntimeBotToken(DEFAULT_INSTANCE_ID)) {
    return res.status(403).json({ ok: false, error: "ปิดฟีเจอร์ทดสอบบนระบบที่มี BOT_TOKEN จริง" });
  }
  const item = metricsStore.recordPrivateMessage({
    chatId: safeString(req.body?.chatId, "test-chat"),
    userName: safeString(req.body?.userName, "Test User"),
    text: safeString(req.body?.text, "สวัสดีครับ"),
    answered: req.body?.answered !== false,
    responseMs: Number(req.body?.responseMs) || 1500,
  });
  res.json({ ok: true, item });
});

app.get("/api/ai/recommendations", (_req, res) => {
  const mode = telegramRuntime.getStatus().reviewerMode || getActiveBotConfig().reviewerMode || "normal";
  res.json({ ok: true, ...jimmyReviewer.getSafeSummary(mode) });
});

app.get("/api/approvals", (_req, res) => {
  res.json({ ok: true, ...approvalStore.getSafeSummary() });
});

app.post("/api/ai/runtime/test", async (req, res) => {
  const text = safeString(req.body?.text).trim();
  if (!text) return res.status(400).json({ ok: false, error: "กรุณาส่งข้อความ" });
  const status = telegramRuntime.getStatus();
  const result = await jimmyBrain.respond({
    chatId: safeString(req.body?.chatId, "local-smoke").slice(0, 80),
    userId: "local-dashboard",
    text,
    firstName: "Local User",
    isAdmin: req.body?.isAdmin === true,
  }, telegramRuntime.getAiConfig());
  res.json({ ok: true, runtimeRunning: status.running, ...result });
});

app.get("/api/bot-config", (req, res) => {
  const instanceId = safeInstanceId(req.query.instanceId);
  const draftConfig = getDraftBotConfig(instanceId);
  const publishedConfig = getActiveBotConfig(instanceId);
  res.json({
    ok: true,
    instanceId,
    config: stripTokenFromConfig(draftConfig),
    draftConfig: stripTokenFromConfig(draftConfig),
    publishedConfig: stripTokenFromConfig(publishedConfig),
    lastDraftSyncAt,
    lastPublishedAt,
    lastPublishedConfigName
  });
});

app.post("/api/bot-config", (req, res) => {
  const instanceId = safeInstanceId(req.body?.instanceId || req.body?.config?.instanceId);
  const draftConfig = normalizeConfig({ ...(req.body?.config || req.body), instanceId });
  draftBotConfigs.set(instanceId, draftConfig);
  lastDraftSyncAt = new Date().toISOString();
  saveState();
  res.json({
    ok: true,
    message: "บันทึก draft config สำหรับ preview แล้ว",
    instanceId,
    config: stripTokenFromConfig(draftConfig),
    lastDraftSyncAt,
    lastPublishedAt,
    lastPublishedConfigName
  });
});

app.post("/api/telegram/publish-config", async (req, res) => {
  const instanceId = safeInstanceId(req.body?.instanceId || req.body?.config?.instanceId);
  const sourceConfig = req.body?.config ? req.body.config : getDraftBotConfig(instanceId);
  const publishedConfig = normalizeConfig({ ...sourceConfig, instanceId });
  const token = safeString(req.body?.token).trim() || getRuntimeBotToken(instanceId) || (instanceId === DEFAULT_INSTANCE_ID ? BOT_TOKEN : "");
  if (!token) {
    return res.status(400).json({ ok: false, error: "ยังไม่ได้ตั้ง BOT_TOKEN ใน Render Environment" });
  }
  const validation = preflightCheck(publishedConfig, true);
  if (!validation.canPublish) return res.status(400).json({ ok: false, ...validation });

  const commandPayload = buildCommands(publishedConfig).map((cmd) => ({
    command: cmd.command,
    description: cmd.description
  }));
  const menuButtonPayload = buildMenuButton(publishedConfig);
  const descriptionSource = safeString(publishedConfig.botSettings.welcomeMessage || publishedConfig.botSettings.aiPrompt).trim().slice(0, 512);

  const skipped = (reason: string) => ({ ok: true, skipped: true, reason });
  const toStepResult = (step: Awaited<ReturnType<typeof telegramApiSafe>>) =>
    step.ok ? { ok: true, result: step.result } : { ok: false, error: step.error };

  const setMyName = safeString(publishedConfig.name).trim()
    ? toStepResult(await telegramApiSafe("setMyName", { name: safeString(publishedConfig.name).trim() }, token))
    : skipped("ไม่มีชื่อบอทสำหรับเผยแพร่");
  const setMyDescription = descriptionSource
    ? toStepResult(await telegramApiSafe("setMyDescription", { description: descriptionSource }, token))
    : skipped("ไม่มีข้อความ description สำหรับเผยแพร่");
  const setMyCommands = commandPayload.length
    ? toStepResult(await telegramApiSafe("setMyCommands", { commands: commandPayload }, token))
    : skipped("ไม่มีคำสั่งใน botCommands");
  const setChatMenuButton = toStepResult(await telegramApiSafe("setChatMenuButton", { menu_button: menuButtonPayload }, token));
  const webhookPayload: Record<string, any> | null = WEBHOOK_BASE_URL ? {
    url: `${WEBHOOK_BASE_URL}/telegram/webhook/${instanceId}`,
    allowed_updates: ["message", "callback_query", "inline_query"],
    ...(TELEGRAM_WEBHOOK_SECRET ? { secret_token: TELEGRAM_WEBHOOK_SECRET } : {})
  } : null;
  const setWebhook = webhookPayload
    ? toStepResult(await telegramApiSafe("setWebhook", webhookPayload, token))
    : skipped("ไม่ได้ตั้ง WEBHOOK_BASE_URL");
  const webhookInfo = toStepResult(await telegramApiSafe("getWebhookInfo", undefined, token));

  const stepResults: Array<{ ok: boolean; error?: string; skipped?: boolean; reason?: string }> = [setMyName, setMyDescription, setMyCommands, setChatMenuButton, setWebhook, webhookInfo];
  const hasError = stepResults.some((step) => step.ok === false);
  const firstError = stepResults.find((step) => step.ok === false && step.error)?.error || null;

  if (hasError) {
    return res.status(502).json({
      ok: false,
      error: `Telegram API rejected the publish: ${firstError || "unknown error"}`,
      rolledBack: true,
      instanceId,
      telegram: { setMyName, setMyDescription, setMyCommands, setChatMenuButton, setWebhook, webhookInfo }
    });
  }

  const publishedAt = new Date().toISOString();
  await publishAtomically({ registry: botRegistry, instanceId, token, config: publishedConfig, publishedAt, publish: async () => {} });
  draftBotConfigs.set(instanceId, publishedConfig);
  hasPublishedConfig = botRegistry.entries().length > 0;
  lastPublishedAt = publishedAt;
  lastPublishedConfigName = safeString(publishedConfig.name) || "บอทไม่มีชื่อ";
  saveState();

  return res.status(200).json({
    ok: true,
    instanceId,
    publishedAt,
    publishedConfigName: lastPublishedConfigName,
    telegram: {
      setMyName,
      setMyDescription,
      setMyCommands,
      setChatMenuButton,
      setWebhook,
      webhookInfo
    },
    liveMap: buildLiveMap(publishedConfig),
    lastDraftSyncAt,
    lastPublishedAt,
    lastPublishedConfigName
  });
});

app.get("/api/telegram/live-config", async (req, res) => {
  const instanceId = safeInstanceId(req.query.instanceId);
  const activeConfig = getActiveBotConfig(instanceId);
  const draftConfig = getDraftBotConfig(instanceId);
  const token = getRuntimeBotToken(instanceId);
  const liveMap = buildLiveMap(activeConfig);
  const publishedEntry = botRegistry.resolve(instanceId);
  const basePayload = {
    ok: true,
    instanceId,
    draftConfig: stripTokenFromConfig(draftConfig),
    publishedConfig: stripTokenFromConfig(activeConfig),
    activeWebhookConfigSource: publishedEntry ? "published" : "not_published",
    activeConfig: stripTokenFromConfig(activeConfig),
    liveMap: {
      ...liveMap,
      welcomeMessage: safeString(activeConfig.botSettings.welcomeMessage),
      lastPublishedAt: publishedEntry?.publishedAt || null,
      hasPublishedConfig: Boolean(publishedEntry)
    }
  };

  if (!token) {
    return res.json({
      ...basePayload,
      telegramStatus: {
        hasBotToken: false,
        bot: null,
        webhookInfo: null
      }
    });
  }

  const bot = await telegramApiSafe("getMe", undefined, token);
  const webhookInfo = await telegramApiSafe("getWebhookInfo", undefined, token);

  return res.json({
    ...basePayload,
    telegramStatus: {
      hasBotToken: true,
      bot: bot.ok ? bot.result : { error: bot.error },
      webhookInfo: webhookInfo.ok ? webhookInfo.result : { error: webhookInfo.error }
    }
  });
});

app.post("/api/telegram/send-channel-test", async (req, res) => {
  const instanceId = safeInstanceId(req.body?.instanceId);
  const activeConfig = getActiveBotConfig(instanceId);
  const token = getRuntimeBotToken(instanceId);
  if (!token) {
    return res.status(400).json({ ok: false, error: "ยังไม่ได้ตั้ง BOT_TOKEN ใน Render Environment" });
  }

  const targetChannel = resolveChannelTarget(activeConfig);
  if (!targetChannel) {
    return res.status(400).json({ ok: false, error: "ยังไม่ได้ตั้ง target channel" });
  }

  const firstPost = activeConfig.channelSettings.scheduledPosts?.[0];
  if (!firstPost) {
    return res.status(400).json({ ok: false, error: "ยังไม่มี scheduled post สำหรับทดสอบ" });
  }

  try {
    const messageText = buildChannelPostText(activeConfig, firstPost.content);
    const sendResult = await sendPhotoOrText(targetChannel, messageText, firstPost.imageUrl, {}, token);
    return res.json({
      ok: true,
      targetChannel,
      postId: firstPost.id,
      result: sendResult.result ?? sendResult
    });
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      targetChannel,
      error: err.message || "ส่ง channel test ไม่สำเร็จ"
    });
  }
});

app.get("/api/telegram/feature-matrix", (req, res) => {
  const instanceId = safeInstanceId(req.query.instanceId);
  const matrix = buildFeatureMatrix(getActiveBotConfig(instanceId));
  const summary = {
    total: matrix.length,
    live: matrix.filter((f) => f.liveStatus === "live").length,
    draft_only: matrix.filter((f) => f.liveStatus === "draft_only").length,
    simulator_only: matrix.filter((f) => f.liveStatus === "simulator_only").length,
    needs_permission: matrix.filter((f) => f.liveStatus === "needs_permission").length,
    needs_target: matrix.filter((f) => f.liveStatus === "needs_target").length,
    unsupported: matrix.filter((f) => f.liveStatus === "unsupported").length,
    not_configured: matrix.filter((f) => f.liveStatus === "not_configured").length
  };
  return res.json({ ok: true, hasPublishedConfig, lastPublishedAt, summary, features: matrix });
});

app.get("/api/telegram/parity-report", async (req, res) => {
  const instanceId = safeInstanceId(req.query.instanceId);
  const activeConfig = getActiveBotConfig(instanceId);
  const token = getRuntimeBotToken(instanceId);
  const matrix = buildFeatureMatrix(activeConfig);
  if (!token) {
    return res.json({
      ok: true, hasPublishedConfig, lastPublishedAt,
      telegramLive: null,
      parityIssues: [{ key: "no_bot_token", severity: "blocker", message: "ยังไม่ได้ตั้ง BOT_TOKEN — ไม่สามารถเปรียบเทียบกับ Telegram จริงได้" }],
      features: matrix
    });
  }
  const [bot, webhookInfo, myCommands, menuButton] = await Promise.all([
    telegramApiSafe("getMe", undefined, token),
    telegramApiSafe("getWebhookInfo", undefined, token),
    telegramApiSafe("getMyCommands", undefined, token),
    telegramApiSafe("getChatMenuButton", undefined, token)
  ]);
  const parityIssues: Array<{ key: string; severity: string; message: string }> = [];
  if (!webhookInfo.ok || !(webhookInfo.result as any)?.url) {
    parityIssues.push({ key: "no_webhook", severity: "blocker", message: "Webhook ยังไม่ได้ตั้งค่าใน Telegram — บอทจะไม่รับข้อความ" });
  }
  if (!hasPublishedConfig) {
    parityIssues.push({ key: "not_published", severity: "warning", message: "ยังไม่เคยกด Publish — webhook handler ใช้ default config" });
  }
  return res.json({
    ok: true, hasPublishedConfig, lastPublishedAt,
    telegramLive: {
      bot: bot.ok ? bot.result : { error: bot.error },
      webhookInfo: webhookInfo.ok ? webhookInfo.result : { error: webhookInfo.error },
      myCommands: myCommands.ok ? myCommands.result : { error: myCommands.error },
      menuButton: menuButton.ok ? menuButton.result : { error: menuButton.error }
    },
    parityIssues,
    features: matrix
  });
});

app.post("/api/telegram/preflight-publish", (req, res) => {
  const instanceId = safeInstanceId(req.body?.instanceId || req.body?.config?.instanceId);
  const sourceConfig = req.body?.config ? req.body.config : getDraftBotConfig(instanceId);
  const config = normalizeConfig({ ...sourceConfig, instanceId });
  const hasToken = Boolean(safeString(req.body?.token).trim() || getRuntimeBotToken(instanceId) || (instanceId === DEFAULT_INSTANCE_ID && BOT_TOKEN));
  const result = preflightCheck(config, hasToken);
  const actionModel = compileButtonModel(config);
  return res.json({ ok: true, ...result, instanceId, buttonDebug: actionModel.debugRows, buttonIssues: actionModel.issues, lastDraftSyncAt, lastPublishedAt });
});

app.post("/api/ai/suggest", async (req, res) => {
  const prompt = safeString(req.body?.prompt);
  if (!prompt) return res.status(400).json({ error: "โปรดระบุรายละเอียดของบอทที่คุณต้องการสร้าง" });

  const key = getGeminiKey();
  if (!key) return res.json(generateMockSuggest(prompt));

  const systemPrompt = `คุณเป็น AI ผู้เชี่ยวชาญด้าน Telegram Bot สำหรับธุรกิจไทย\nตอบเฉพาะ JSON object ไม่มีข้อความอื่น รูปแบบ:\n{"name":"ชื่อบอท","platform":"all","aiPrompt":"system prompt สำหรับบอท","welcomeMessage":"ข้อความต้อนรับ","keyboards":[{"text":"ปุ่ม1","response":"คำตอบ1"},{"text":"ปุ่ม2","response":"คำตอบ2"}],"botCommands":[{"command":"start","description":"เริ่มต้น","reply":"คำตอบ start"}]}`;

  try {
    const aiResponse = await geminiGenerate(prompt, systemPrompt);
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.json(generateMockSuggest(prompt));
    const parsed = JSON.parse(jsonMatch[0]);
    const suggested = normalizeConfig({
      ...DEFAULT_BOT_CONFIG,
      name: safeString(parsed.name) || DEFAULT_BOT_CONFIG.name,
      platform: ["bot", "group", "channel", "all"].includes(parsed.platform) ? parsed.platform : DEFAULT_BOT_CONFIG.platform,
      botSettings: {
        ...DEFAULT_BOT_CONFIG.botSettings,
        aiPrompt: safeString(parsed.aiPrompt) || DEFAULT_BOT_CONFIG.botSettings.aiPrompt,
        welcomeMessage: safeString(parsed.welcomeMessage) || DEFAULT_BOT_CONFIG.botSettings.welcomeMessage,
        keyboards: Array.isArray(parsed.keyboards) ? parsed.keyboards : DEFAULT_BOT_CONFIG.botSettings.keyboards
      },
      botCommands: Array.isArray(parsed.botCommands) ? parsed.botCommands : DEFAULT_BOT_CONFIG.botCommands
    });
    return res.json(suggested);
  } catch (err: any) {
    console.error("Gemini suggest error:", err.message);
    return res.json(generateMockSuggest(prompt));
  }
});

app.post("/api/ai/generate-caption", async (req, res) => {
  const campaignName = safeString(req.body?.campaignName, "แคมเปญ Jimmy_bot");
  const rewardPoints = Number(req.body?.rewardPoints || 10);
  const inviteLink = safeString(req.body?.inviteLink, "https://t.me/jimmy_bot");
  const fallbackCaption = `🔥 ${campaignName}\n\nชวนเพื่อนมาใช้งาน Jimmy_bot รับคะแนนสะสม +${rewardPoints} แต้มต่อคน พร้อมปลดล็อกของรางวัลและฟีเจอร์พิเศษ\n\nสมัคร/เข้าร่วมได้ที่: ${inviteLink}\n\n#JimmyBot #TelegramBot #บอทอัจฉริยะ`;

  const key = getGeminiKey();
  if (!key) return res.json({ caption: fallbackCaption });

  try {
    const prompt = `เขียนแคปชั่นโปรโมทแคมเปญ Telegram Bot ชื่อ "${campaignName}"\nรับคะแนน +${rewardPoints} แต้มต่อการชวนเพื่อน 1 คน\nลิงก์: ${inviteLink}\nให้เขียนเป็นภาษาไทย สั้น กระชับ น่าสนใจ มีอีโมจิ ความยาวไม่เกิน 300 ตัวอักษร`;
    const caption = await geminiGenerate(prompt);
    return res.json({ caption: caption || fallbackCaption });
  } catch {
    return res.json({ caption: fallbackCaption });
  }
});

app.post("/api/ai/analyze-group-chat", async (req, res) => {
  const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const fallback = {
    summary: `วิเคราะห์ข้อความทั้งหมด ${messages.length} รายการ: ภาพรวมเป็นการใช้งานจำลองเพื่อดูแนวโน้มบทสนทนาและ keyword สำคัญ`,
    sentiment: { positive: 70, neutral: 20, negative: 10, label: "เชิงบวก" },
    rating: 4.3,
    topics: [{ topic: "การใช้งานบอทและเมนู", count: Math.max(messages.length, 1), sentiment: "positive" }],
    actionItems: ["ทดสอบ /start ใน Telegram จริง", "ตั้ง webhook ให้เรียบร้อย", "เพิ่มบอทเป็นแอดมินกลุ่มถ้าจะใช้ระบบลบสแปม"]
  };

  const key = getGeminiKey();
  if (!key || messages.length === 0) return res.json(fallback);

  const msgSample = messages.slice(0, 20).map((m: any) =>
    `${safeString(m.senderName || m.sender)}: ${safeString(m.text || m.content)}`
  ).join("\n");

  const systemPrompt = `คุณเป็นผู้วิเคราะห์ข้อความกลุ่ม Telegram ตอบเฉพาะ JSON ไม่มีข้อความอื่น\nรูปแบบ: {"summary":"สรุป","sentiment":{"positive":0,"neutral":0,"negative":0,"label":"เชิงบวก/กลาง/ลบ"},"rating":0.0,"topics":[{"topic":"หัวข้อ","count":1,"sentiment":"positive"}],"actionItems":["แนะนำ1","แนะนำ2"]}`;

  try {
    const aiReply = await geminiGenerate(`วิเคราะห์บทสนทนา Telegram กลุ่ม จำนวน ${messages.length} ข้อความ:\n${msgSample}`, systemPrompt);
    const match = aiReply.match(/\{[\s\S]*\}/);
    if (!match) return res.json(fallback);
    const parsed = JSON.parse(match[0]);
    return res.json({ ...fallback, ...parsed });
  } catch {
    return res.json(fallback);
  }
});

app.post("/api/ai/translate", async (req, res) => {
  const text = safeString(req.body?.text);
  if (!text) return res.status(400).json({ error: "โปรดระบุข้อความที่ต้องการแปล" });

  const hasEnglish = /[a-zA-Z]/.test(text);
  const fallback = {
    detectedLanguage: hasEnglish ? "ภาษาอังกฤษ (English)" : "ภาษาไทย (Thai)",
    needsTranslation: hasEnglish,
    translatedText: hasEnglish ? "สวัสดีครับ ยินดีต้อนรับสู่ระบบบอทของเรา" : ""
  };

  const key = getGeminiKey();
  if (!key) return res.json(fallback);

  const systemPrompt = `คุณเป็นนักแปลภาษา ตอบเฉพาะ JSON ไม่มีข้อความอื่น\nรูปแบบ: {"detectedLanguage":"ชื่อภาษา","needsTranslation":true,"translatedText":"ข้อความที่แปลแล้ว"}\nถ้าภาษาไทยให้แปลเป็นอังกฤษ ถ้าภาษาอื่นให้แปลเป็นไทย ถ้าไม่ต้องแปลให้ translatedText เป็น ""`;

  try {
    const aiReply = await geminiGenerate(`ตรวจสอบภาษาและแปล: "${text}"`, systemPrompt);
    const match = aiReply.match(/\{[\s\S]*\}/);
    if (!match) return res.json(fallback);
    const parsed = JSON.parse(match[0]);
    return res.json({ ...fallback, ...parsed });
  } catch {
    return res.json(fallback);
  }
});

app.post("/api/ai/chat", async (req, res) => {
  const message = safeString(req.body?.message);
  if (!message) return res.status(400).json({ error: "กรุณาส่งข้อความ" });
  const instanceId = safeInstanceId(req.body?.instanceId || req.body?.config?.instanceId);
  const config = req.body?.config ? normalizeConfig({ ...req.body.config, instanceId }) : getActiveBotConfig(instanceId);
  const trimmedMessage = message.trim();

  if (trimmedMessage.startsWith("/")) {
    const commandName = normalizeCommand(trimmedMessage.split(/\s+/)[0]);
    const command = findBotCommand(commandName, config);
    if (command) return res.json({ reply: safeString(command.reply), route: command.route, actionId: command.action?.id });
    return res.json({ reply: "ยังไม่มีคำสั่งนี้ใน Live Config ครับ กรุณา publish จากหน้าเว็บอีกครั้ง" });
  }

  const keyboardMatch = findReplyKeyboardMatch(trimmedMessage, config);
  if (keyboardMatch) return res.json({ reply: safeString(keyboardMatch.reply), route: keyboardMatch.route, actionId: keyboardMatch.action?.id });

  const keywordMatch = findAutoReply(trimmedMessage, config);
  if (keywordMatch) return res.json({ reply: safeString(keywordMatch.reply) });

  if (config.botSettings.enableAiAssistant) {
    const aiReply = await geminiChat(trimmedMessage, safeString(config.botSettings.aiPrompt), config);
    return res.json({ reply: aiReply });
  }

  return res.json({ reply: "ยังไม่มีคำตอบสำหรับข้อความนี้ครับ ลองตั้งค่า Keyword Reply หรือเปิด AI Assistant ในหน้า GUI ได้เลย" });
});

app.post("/api/ai/generate-avatar", async (req, res) => {
  const botName = safeString(req.body?.name || getActiveBotConfig(req.body?.instanceId).name || "Jimmy Bot");
  const fallbackUrl = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&h=300&q=80";
  const imageUrl = await geminiGenerateAvatar(botName);
  res.json({ imageUrl: imageUrl || fallbackUrl });
});

app.post("/api/webhook-health", async (req, res) => {
  const webhookUrl = safeString(req.body?.webhookUrl);
  const apiAuthToken = safeString(req.body?.apiAuthToken);
  if (!webhookUrl) return res.status(400).json({ error: "โปรดระบุ Webhook URL ที่ต้องการทดสอบ" });

  try {
    await assertSafePublicUrl(webhookUrl);
  } catch (err: any) {
    const reason = err instanceof OutboundBlockedError ? err.message : "Invalid URL";
    return res.json({ ok: false, status: 0, statusText: "Blocked", latencyMs: 0, error: reason, suggestion: "ใช้เฉพาะ URL HTTPS สาธารณะเท่านั้น" });
  }

  const headers: Record<string, string> = { "Content-Type": "application/json", "User-Agent": "TelegramBotWebhookProbe/1.0" };
  if (apiAuthToken) {
    headers.Authorization = `Bearer ${apiAuthToken}`;
    headers["X-Api-Key"] = apiAuthToken;
  }

  const startedAt = Date.now();

  try {
    const response = await safeFetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ update_id: 12345678, message: { message_id: 999, chat: { id: 7777777, type: "private" }, date: Math.floor(Date.now() / 1000), text: "/start" } }),
      timeoutMs: 6000,
      maxBytes: 256 * 1024,
    });
    res.json({ ok: response.ok, status: response.status, statusText: response.statusText, latencyMs: Date.now() - startedAt, error: response.ok ? null : `HTTP ${response.status}`, suggestion: response.ok ? "Webhook ตอบรับได้แล้ว" : "ตรวจสอบ path และ log ฝั่ง server" });
  } catch (err: any) {
    const reason = err instanceof OutboundBlockedError ? err.message : err.message || "เชื่อมต่อไม่สำเร็จ";
    res.json({ ok: false, status: 0, statusText: err.name || "Network Error", latencyMs: Date.now() - startedAt, error: reason, suggestion: "ตรวจสอบว่า server online และ URL ถูกต้อง" });
  }
});

app.get("/api/telegram/status", async (req, res) => {
  const instanceId = safeInstanceId(req.query.instanceId);
  const token = getRuntimeBotToken(instanceId);
  if (!token) {
    return res.json({ ok: false, hasBotToken: false, error: "ยังไม่ได้ตั้ง BOT_TOKEN ใน Render Environment" });
  }

  try {
    const [me, webhookInfo] = await Promise.all([
      telegramApi("getMe", undefined, token),
      telegramApi("getWebhookInfo", undefined, token)
    ]);
    res.json({ ok: true, hasBotToken: true, bot: me.result, webhookInfo: webhookInfo.result });
  } catch (err: any) {
    res.status(500).json({ ok: false, hasBotToken: true, error: err.message });
  }
});

app.post("/api/telegram/set-webhook", async (req, res) => {
  const instanceId = safeInstanceId(req.body?.instanceId);
  const token = safeString(req.body?.token).trim() || getRuntimeBotToken(instanceId);
  if (!token) {
    return res.status(400).json({ ok: false, error: "ยังไม่ได้ตั้ง BOT_TOKEN ใน Render Environment" });
  }

  const baseUrl = safeString(req.body?.baseUrl, WEBHOOK_BASE_URL).replace(/\/$/, "");
  if (!baseUrl) {
    return res.status(400).json({ ok: false, error: "กรุณาตั้ง WEBHOOK_BASE_URL=https://bot-jimmy.onrender.com ใน Render หรือส่ง baseUrl มากับ request" });
  }

  const webhookUrl = `${baseUrl}/telegram/webhook/${instanceId}`;
  try {
    const payload: Record<string, any> = {
      url: webhookUrl,
      allowed_updates: ["message", "callback_query", "inline_query"]
    };
    if (TELEGRAM_WEBHOOK_SECRET) payload.secret_token = TELEGRAM_WEBHOOK_SECRET;
    const result = await telegramApi("setWebhook", payload, token);
    res.json({ ok: true, webhookUrl, result });
  } catch (err: any) {
    res.status(500).json({ ok: false, webhookUrl, error: err.message });
  }
});

function hasValidWebhookSecret(req: express.Request): boolean {
  if (!TELEGRAM_WEBHOOK_SECRET) return true;
  return timingSafeTokenEqual(safeString(req.header("x-telegram-bot-api-secret-token")), TELEGRAM_WEBHOOK_SECRET);
}

/**
 * Forward lead to external API (fire-and-forget, HTTPS only to prevent SSRF).
 * Lives in the webhook path so it runs for BOTH pipelines (legacy group handler
 * and the new TelegramUpdateHandler used for private chats/callbacks).
 */
function forwardLeadToExternalApi(message: any, config: BotConfig) {
  if (!config.externalApis?.sendLeadsToApi) return;
  const apiUrl = safeString(config.externalApis.customApiUrl).trim();
  const apiToken = safeString(config.externalApis.apiAuthToken).trim();
  if (!isSafeExternalUrl(apiUrl)) return;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiToken) {
    headers.Authorization = "Bearer " + apiToken;
    headers["X-Api-Key"] = apiToken;
  }
  // Send only minimal, non-sensitive user fields
  const from = message?.from;
  const chatId = message?.chat?.id;
  const chatType = message?.chat?.type || "private";
  const text = safeString(message?.text);
  // apiUrl is validated by isSafeExternalUrl (HTTPS + no private IPs) above
  fetch(apiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      chat_id: chatId,
      chat_type: chatType,
      message: text,
      from: from ? { id: from.id, is_bot: from.is_bot, language_code: from.language_code } : undefined,
      timestamp: new Date().toISOString()
    })
  }).catch((err: any) => console.error("Lead forwarding failed:", err.message));
}

async function processTelegramWebhook(instanceId: string, update: any): Promise<void> {
  const entry = botRegistry.resolve(instanceId);
  const token = getRuntimeBotToken(instanceId);
  if (!entry || !token) throw new Error(`No published runtime for bot instance ${instanceId}`);
  await telegramBotContext.run({ instanceId, token }, async () => {
    const message = update?.message;
    const isPrivateChat = message?.chat?.type === "private";

    // Lead forwarding runs before routing so both pipelines keep the same behavior
    if (message && safeString(message.text).trim()) forwardLeadToExternalApi(message, entry.config);

    // New pipeline: private-chat messages + ALL callback queries go through TelegramUpdateHandler
    // so AI brain / approvals / suggestions / 9-capability menu behave identically on webhook & polling.
    if ((message && isPrivateChat) || update?.callback_query) {
      telegramUpdateHandler.setBotConfig(entry.config as any);
      const client = new TelegramClient(token);
      if (message && isPrivateChat && safeString(message.text).trim()) {
        // บันทึกสถิติจริงให้ Live Ops Dashboard (KPI/กราฟ/ฟีด)
        const startedAt = Date.now();
        const metricInput = {
          chatId: safeString(message.chat?.id),
          userName: safeString(message.from?.first_name, safeString(message.from?.username, "ลูกค้า")),
          text: safeString(message.text),
          answered: true,
          responseMs: Date.now() - startedAt,
        };
        try {
          await telegramUpdateHandler.handle(client, update as any);
          metricsStore.recordPrivateMessage(metricInput);
        } catch (error) {
          metricsStore.recordPrivateMessage({ ...metricInput, answered: false, responseMs: null });
          throw error;
        }
        return;
      }
      await telegramUpdateHandler.handle(client, update as any);
      return;
    }

    // Legacy pipeline: groups (welcome/anti-spam//rules/keyword monitoring) + inline queries
    if (message) await handleTelegramMessage(message, entry.config, true);
    if (update?.inline_query) await handleInlineQuery(update.inline_query, entry.config);
  });
}

app.post("/telegram/webhook/:instanceId", async (req, res) => {
  const instanceId = safeInstanceId(req.params.instanceId);
  if (!hasValidWebhookSecret(req)) return res.status(403).json({ ok: false, error: "Invalid Telegram webhook secret" });
  if (!botRegistry.resolve(instanceId) || !getRuntimeBotToken(instanceId)) {
    return res.status(404).json({ ok: false, error: "Unknown bot instance" });
  }
  res.status(200).json({ ok: true });
  processTelegramWebhook(instanceId, req.body).catch((err: any) => {
    console.error("Telegram webhook handler failed", { instanceId, error: err.message || String(err) });
  });
});

app.post("/telegram/webhook", async (req, res) => {
  if (TELEGRAM_WEBHOOK_SECRET && !timingSafeTokenEqual(safeString(req.header("x-telegram-bot-api-secret-token")), TELEGRAM_WEBHOOK_SECRET)) {
    return res.status(403).json({ ok: false, error: "Invalid Telegram webhook secret" });
  }

  const entries = botRegistry.entries();
  if (entries.length !== 1) return res.status(409).json({ ok: false, error: "Legacy webhook path is ambiguous; use the bot instance webhook URL" });
  const instanceId = entries[0].instanceId;
  res.status(200).json({ ok: true });
  processTelegramWebhook(instanceId, req.body).catch((err: any) => {
    console.error("Telegram webhook handler failed", { instanceId, error: err.message || String(err) });
  });
});

async function autoSetWebhookOnBoot() {
  if (!WEBHOOK_BASE_URL) return;
  for (const entry of botRegistry.entries()) {
    const token = getRuntimeBotToken(entry.instanceId);
    if (!token) continue;
    if (!WEBHOOK_BASE_URL) {
      console.log(`ℹ️ WEBHOOK_BASE_URL not set — skip auto webhook for ${entry.instanceId}`);
      continue;
    }
    try {
    const payload: Record<string, any> = {
      url: `${WEBHOOK_BASE_URL}/telegram/webhook/${entry.instanceId}`,
      allowed_updates: ["message", "callback_query", "inline_query"]
    };
    if (TELEGRAM_WEBHOOK_SECRET) payload.secret_token = TELEGRAM_WEBHOOK_SECRET;
    await telegramApi("setWebhook", payload, token);
    console.log(`✅ Telegram webhook set to ${payload.url}`);
    } catch (err: any) {
      console.error("⚠️ Auto set Telegram webhook failed:", entry.instanceId, err.message || err);
    }
  }
}

const startServer = async () => {
  ensureDefaultBotRegistered();
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    autoSetWebhookOnBoot();
  });

  // Scheduled posts scheduler — runs every 30 seconds to avoid missing a minute boundary
  setInterval(async () => {
    for (const entry of botRegistry.entries()) {
    const config = entry.config;
    const token = getRuntimeBotToken(entry.instanceId);
    if (!token) continue;
    const posts = config.channelSettings?.scheduledPosts || [];
    if (!posts.length) return;
    const target = resolveChannelTarget(config);
    if (!target) return;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const dateStr = now.toISOString().slice(0, 10);

    // Clean up entries from previous days to prevent unbounded Set growth
    // Keys are stored as "YYYY-MM-DD:postId", so check that they start with today's date
    for (const key of sentScheduledPosts) {
      if (!key.startsWith(dateStr)) sentScheduledPosts.delete(key);
    }

    for (const post of posts) {
      if (post.time !== timeStr) continue;
      const key = `${dateStr}:${post.id}`;
      if (sentScheduledPosts.has(key)) continue;
      sentScheduledPosts.add(key);
      try {
        const messageText = buildChannelPostText(config, post.content);
        await sendPhotoOrText(target, messageText, post.imageUrl, {}, token);
        console.log("✅ Scheduled post sent:", post.id, "at", timeStr);
      } catch (err: any) {
        console.error("❌ Scheduled post failed:", post.id, err.message);
        // Remove so the next 30-second tick can retry (within the same minute)
        sentScheduledPosts.delete(key);
      }
    }
    }
  }, 30_000);
};

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
