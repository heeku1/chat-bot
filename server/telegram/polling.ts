import fs from "fs";
import path from "path";
import { RuntimeAiConfig } from "../ai/types";
import { TelegramApiError, TelegramClient, TelegramUpdate } from "./client";

export type RuntimeState = "stopped" | "starting" | "running" | "error";

export interface RuntimeStartConfig extends RuntimeAiConfig {
  token: string;
}

export interface RuntimeStatus {
  state: RuntimeState;
  running: boolean;
  botUsername: string | null;
  lastUpdateAt: string | null;
  lastError: string | null;
  provider: "OpenAI" | "Gemini" | "Offline";
  reviewerMode: RuntimeAiConfig["reviewerMode"];
}

export class TelegramPollingRuntime {
  private state: RuntimeState = "stopped";
  private botUsername: string | null = null;
  private lastUpdateAt: string | null = null;
  private lastError: string | null = null;
  private running = false;
  private loopPromise: Promise<void> | null = null;
  private abortController: AbortController | null = null;
  private offset = 0;
  private botId = "";
  private aiConfig: RuntimeAiConfig = { reviewerMode: "normal" };
  private readonly processedUpdates = new Set<number>();

  constructor(
    private readonly handleUpdate: (client: TelegramClient, update: TelegramUpdate) => Promise<void>,
    private readonly offsetFile = path.join(process.cwd(), "runtime-data", "telegram-offsets.json"),
  ) {}

  async start(config: RuntimeStartConfig) {
    if (this.running || this.state === "starting") throw new Error("Telegram polling is already active");
    this.state = "starting";
    this.lastError = null;
    this.aiConfig = {
      openaiApiKey: config.openaiApiKey?.trim(),
      geminiApiKey: config.geminiApiKey?.trim(),
      systemPrompt: config.systemPrompt,
      reviewerMode: config.reviewerMode,
    };
    const client = new TelegramClient(config.token.trim());
    try {
      const bot = await client.getMe();
      await client.deleteWebhook();
      this.botId = String(bot.id);
      this.botUsername = bot.username || null;
      this.offset = this.loadOffset(this.botId);
      this.running = true;
      this.state = "running";
      this.abortController = new AbortController();
      this.loopPromise = this.poll(client, this.abortController.signal);
      console.info(`[telegram] polling started for @${this.botUsername || "bot"}`);
      return this.getStatus();
    } catch (error) {
      this.running = false;
      this.state = "error";
      this.lastError = safeRuntimeError(error);
      console.error(`[telegram] start failed: ${this.lastError}`);
      throw new Error(this.lastError);
    }
  }

  async stop() {
    this.running = false;
    this.abortController?.abort();
    try {
      await this.loopPromise;
    } catch {}
    this.loopPromise = null;
    this.abortController = null;
    this.state = "stopped";
    this.lastError = null;
    console.info("[telegram] polling stopped");
    return this.getStatus();
  }

  getAiConfig() {
    return { ...this.aiConfig };
  }

  setAiConfig(config: RuntimeAiConfig) {
    if (this.running || this.state === "starting") return;
    this.aiConfig = { ...config };
  }

  getStatus(): RuntimeStatus {
    return {
      state: this.state,
      running: this.running,
      botUsername: this.botUsername,
      lastUpdateAt: this.lastUpdateAt,
      lastError: this.lastError,
      provider: this.aiConfig.openaiApiKey ? "OpenAI" : this.aiConfig.geminiApiKey ? "Gemini" : "Offline",
      reviewerMode: this.aiConfig.reviewerMode,
    };
  }

  private async poll(client: TelegramClient, signal: AbortSignal) {
    let backoffMs = 1000;
    while (this.running && !signal.aborted) {
      try {
        const updates = await client.getUpdates(this.offset, signal);
        for (const update of updates) {
          if (!Number.isSafeInteger(update.update_id) || this.processedUpdates.has(update.update_id)) continue;
          await this.handleUpdate(client, update);
          this.processedUpdates.add(update.update_id);
          if (this.processedUpdates.size > 500) this.processedUpdates.delete(this.processedUpdates.values().next().value!);
          this.offset = update.update_id + 1;
          this.saveOffset(this.botId, this.offset);
          this.lastUpdateAt = new Date().toISOString();
        }
        this.state = "running";
        this.lastError = null;
        backoffMs = 1000;
      } catch (error: any) {
        if (signal.aborted || !this.running || error?.name === "AbortError") break;
        this.state = "error";
        this.lastError = safeRuntimeError(error);
        console.error(`[telegram] polling error: ${this.lastError}`);
        if (error instanceof TelegramApiError && error.status === 401) {
          this.running = false;
          break;
        }
        const retryMs = error instanceof TelegramApiError && error.retryAfterSeconds
          ? error.retryAfterSeconds * 1000
          : backoffMs;
        await delay(retryMs, signal).catch(() => undefined);
        backoffMs = Math.min(backoffMs * 2, 30000);
      }
    }
  }

  private loadOffset(botId: string) {
    try {
      if (!fs.existsSync(this.offsetFile)) return 0;
      const data = JSON.parse(fs.readFileSync(this.offsetFile, "utf8"));
      return Number.isSafeInteger(data?.[botId]) ? data[botId] : 0;
    } catch (error: any) {
      console.warn(`[telegram] ignored corrupted offset file: ${error.message}`);
      return 0;
    }
  }

  private saveOffset(botId: string, offset: number) {
    try {
      fs.mkdirSync(path.dirname(this.offsetFile), { recursive: true });
      let data: Record<string, number> = {};
      if (fs.existsSync(this.offsetFile)) {
        try { data = JSON.parse(fs.readFileSync(this.offsetFile, "utf8")); } catch {}
      }
      data[botId] = offset;
      const temporaryPath = `${this.offsetFile}.tmp`;
      fs.writeFileSync(temporaryPath, JSON.stringify(data, null, 2), "utf8");
      fs.renameSync(temporaryPath, this.offsetFile);
    } catch (error: any) {
      console.error(`[telegram] offset save failed: ${error.message}`);
    }
  }
}

function safeRuntimeError(error: any) {
  if (error instanceof TelegramApiError) return `Telegram API ${error.errorCode || error.status}: ${error.message}`;
  return error?.name === "AbortError" ? "Polling stopped" : String(error?.message || "Network error").slice(0, 240);
}

function delay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
}