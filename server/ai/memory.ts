import fs from "fs";
import path from "path";

export type MemoryRole = "user" | "assistant";

interface RecentMessage {
  role: MemoryRole;
  content: string;
  timestamp: string;
}

interface ChatMemory {
  recent: RecentMessage[];
  notes: Array<{ content: string; timestamp: string }>;
  updatedAt: string;
}

interface MemoryData {
  enabled: boolean;
  chats: Record<string, ChatMemory>;
}

const EMPTY_DATA: MemoryData = { enabled: true, chats: {} };
const SECRET_PATTERN = /(\d{6,}:[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9_-]{16,}|api[_ -]?key\s*[:=]|password\s*[:=]|-----BEGIN)/i;

export class ConversationMemory {
  private data: MemoryData = structuredClone(EMPTY_DATA);

  constructor(private readonly filePath = path.join(process.cwd(), "runtime-data", "memory.json")) {
    this.load();
  }

  isEnabled() {
    return this.data.enabled;
  }

  setEnabled(enabled: boolean) {
    this.data.enabled = enabled;
    this.save();
  }

  getRecent(chatId: string) {
    return this.data.chats[chatId]?.recent.slice(-20) || [];
  }

  getNotes(chatId: string) {
    return this.data.chats[chatId]?.notes.slice(-20) || [];
  }

  addMessage(chatId: string, role: MemoryRole, rawContent: string) {
    if (!this.data.enabled) return;
    const content = this.sanitize(rawContent);
    if (!content) return;
    const chat = this.ensureChat(chatId);
    chat.recent.push({ role, content, timestamp: new Date().toISOString() });
    chat.recent = chat.recent.slice(-20);
    chat.updatedAt = new Date().toISOString();
    this.save();
  }

  remember(chatId: string, rawContent: string) {
    if (!this.data.enabled) return false;
    const content = this.sanitize(rawContent);
    if (!content) return false;
    const chat = this.ensureChat(chatId);
    chat.notes.push({ content, timestamp: new Date().toISOString() });
    chat.notes = chat.notes.slice(-20);
    chat.updatedAt = new Date().toISOString();
    this.save();
    return true;
  }

  forget(chatId: string) {
    const chat = this.ensureChat(chatId);
    chat.notes = [];
    chat.updatedAt = new Date().toISOString();
    this.save();
  }

  clearAll() {
    this.data.chats = {};
    this.save();
  }

  getSafeStatus() {
    const chats = Object.entries(this.data.chats);
    return {
      enabled: this.data.enabled,
      chatCount: chats.length,
      noteCount: chats.reduce((total, [, chat]) => total + chat.notes.length, 0),
      recentActivity: chats
        .sort((left, right) => right[1].updatedAt.localeCompare(left[1].updatedAt))
        .slice(0, 8)
        .map(([chatId, chat]) => ({
          chatRef: maskChatId(chatId),
          messages: chat.recent.length,
          notes: chat.notes.length,
          updatedAt: chat.updatedAt,
        })),
    };
  }

  private ensureChat(chatId: string): ChatMemory {
    if (!this.data.chats[chatId]) {
      this.data.chats[chatId] = { recent: [], notes: [], updatedAt: new Date().toISOString() };
    }
    return this.data.chats[chatId];
  }

  private sanitize(rawContent: string) {
    const content = String(rawContent || "").trim().slice(0, 1000);
    if (!content || SECRET_PATTERN.test(content)) {
      if (content) console.warn("[memory] rejected content that resembles a secret");
      return "";
    }
    return content;
  }

  private load() {
    try {
      if (!fs.existsSync(this.filePath)) return;
      const parsed = JSON.parse(fs.readFileSync(this.filePath, "utf8"));
      if (parsed && typeof parsed === "object" && parsed.chats && typeof parsed.chats === "object") {
        this.data = { enabled: parsed.enabled !== false, chats: parsed.chats };
      }
    } catch (error: any) {
      console.warn(`[memory] ignored corrupted memory file: ${error.message}`);
      this.data = structuredClone(EMPTY_DATA);
    }
  }

  private save() {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      const temporaryPath = `${this.filePath}.tmp`;
      fs.writeFileSync(temporaryPath, JSON.stringify(this.data, null, 2), "utf8");
      fs.renameSync(temporaryPath, this.filePath);
    } catch (error: any) {
      console.error(`[memory] save failed: ${error.message}`);
    }
  }
}

function maskChatId(chatId: string) {
  if (chatId.length <= 4) return "****";
  return `${chatId.slice(0, 2)}***${chatId.slice(-2)}`;
}