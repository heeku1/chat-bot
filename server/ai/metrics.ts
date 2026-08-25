import fs from "fs";
import path from "path";

/**
 * MetricsStore — เก็บสถิติการใช้งานจริงจากข้อความ Telegram ที่ไหลเข้ามา
 * - KPI รายวัน (แชท/ตอบสำเร็จ/handover/เวลาตอบเฉลี่ย)
 * - บัคเก็ตรายชั่วโมง (24 จุด) และรายวัน (30 วัน)
 * - หัวข้อยอดฮิต (classifier คีย์เวิร์ดภาษาไทย)
 * - ฟีดกิจกรรมล่าสุด (mask chat id + ตัดข้อความสั้น ไม่เก็บข้อมูลลับ)
 * Persist แบบ atomic write เดียวกับ ConversationMemory (runtime-data/metrics.json)
 */

export type Sentiment = "positive" | "neutral" | "negative";

export interface ActivityItem {
  id: string;
  ts: string;
  chatRef: string;
  userName: string;
  text: string;
  intent: string;
  sentiment: Sentiment;
  handover: boolean;
  answered: boolean;
  responseMs: number | null;
}

interface BucketStat {
  conversations: number;
  answered: number;
  handover: number;
  responseMsTotal: number;
  responseCount: number;
}

interface MetricsData {
  days: Record<string, BucketStat>;
  hours: Record<string, Pick<BucketStat, "conversations" | "answered">>;
  topics: Record<string, number>;
  recent: ActivityItem[];
}

const EMPTY_DATA: MetricsData = { days: {}, hours: {}, topics: {}, recent: [] };
const SECRET_PATTERN = /(\d{6,}:[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9_-]{16,}|api[_ -]?key\s*[:=]|password\s*[:=]|-----BEGIN)/i;
const RECENT_CAP = 60;
const DAY_KEEP = 30;
const HOUR_KEEP = 48;

const TOPIC_RULES: Array<{ topic: string; pattern: RegExp }> = [
  { topic: "ร้องเรียน/ปัญหา", pattern: /ร้องเรียน|เคลม|แย่|ห่วย|โกง|ช้า(?:มาก|จัง)|ไม่ได้รับ|เสียหาย|ชำรุด|ปัญหา|บัค|bug|error|invalid|ยกเลิก/i },
  { topic: "สถานะพัสดุ/จัดส่ง", pattern: /พัสดุ|จัดส่ง|ส่งของ|ติดตาม|ได้รับของ|ขนส่ง|ems|kerry|flash|ล็อก/i },
  { topic: "สั่งซื้อ/ชำระเงิน", pattern: /สั่งซื้อ|สั่งของ|ออเดอร์|order|ชำระ|โอน|สลิป|ตะกร้า|จอง|ซื้อ|ล็อต/i },
  { topic: "ราคา & โปรโมชั่น", pattern: /ราคา|เท่าไหร่|กี่บาท|โปรโมชั่น|ส่วนลด|คูปอง|ลดกี่|ถูก|แพง|promo|sale|ฟรี/i },
  { topic: "สอบถามสินค้า/บริการ", pattern: /มี.*ไหม|สินค้า|บริการ|ไซซ์|สี|ใช้ยังไง|วิธี|สาขา|เวลา|เปิดกี่โมง/i },
];
const FALLBACK_TOPIC = "สอบถามทั่วไป";

const POSITIVE_PATTERN = /ขอบคุณ|สุดยอด|ดีมาก|ชอบ|ประทับใจ|เก่ง|น่ารัก|แนะนำเลย|👍|😊|❤|🥰|🎉|สนใจ|อยากได้|ยินดี|เร็วมาก/i;
const NEGATIVE_PATTERN = /ไม่ได้|ช้า|แย่|ห่วย|โกง|เคลม|ร้องเรียน|ผิด|พัง|เสีย|ปัญหา|ยกเลิก|ลบออก|😠|😡|❌|ซ้ำซาก|น่าผิดหวัง/i;

function classifyTopic(text: string): string {
  for (const rule of TOPIC_RULES) {
    if (rule.pattern.test(text)) return rule.topic;
  }
  return FALLBACK_TOPIC;
}

function classifySentiment(text: string): Sentiment {
  if (NEGATIVE_PATTERN.test(text)) return "negative";
  if (POSITIVE_PATTERN.test(text)) return "positive";
  return "neutral";
}

function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function hourKey(d = new Date()) {
  return `${dayKey(d)}T${String(d.getHours()).padStart(2, "0")}`;
}

function maskChatId(chatId: string) {
  const id = String(chatId || "");
  if (id.length <= 4) return "****";
  return `…${id.slice(-4)}`;
}

function emptyBucket(): BucketStat {
  return { conversations: 0, answered: 0, handover: 0, responseMsTotal: 0, responseCount: 0 };
}

export class MetricsStore {
  private data: MetricsData = structuredClone(EMPTY_DATA);
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private listener: ((item: ActivityItem) => void) | null = null;
  private seq = 0;

  constructor(private readonly filePath = path.join(process.cwd(), "runtime-data", "metrics.json")) {
    this.load();
  }

  /** อัปเดตแบบ real-time ทุกครั้งที่มีข้อความใหม่ (ใช้กับ SSE) */
  onRecord(listener: (item: ActivityItem) => void) {
    this.listener = listener;
  }

  recordPrivateMessage(input: {
    chatId: string;
    userName: string;
    text: string;
    answered: boolean;
    responseMs: number | null;
  }) {
    const text = this.sanitizeText(input.text);
    const sentiment = classifySentiment(text);
    const intent = classifyTopic(text);
    const item: ActivityItem = {
      id: `${Date.now().toString(36)}-${(this.seq += 1)}`,
      ts: new Date().toISOString(),
      chatRef: maskChatId(input.chatId),
      userName: this.sanitizeName(input.userName),
      text,
      intent,
      sentiment,
      handover: sentiment === "negative",
      answered: input.answered,
      responseMs: input.responseMs,
    };

    const dKey = dayKey();
    const day = (this.data.days[dKey] ||= emptyBucket());
    day.conversations += 1;
    if (input.answered) day.answered += 1;
    if (item.handover) day.handover += 1;
    if (input.answered && input.responseMs && input.responseMs > 0) {
      day.responseMsTotal += input.responseMs;
      day.responseCount += 1;
    }

    const hKey = hourKey();
    const hour = (this.data.hours[hKey] ||= { conversations: 0, answered: 0 });
    hour.conversations += 1;
    if (input.answered) hour.answered += 1;

    this.data.topics[intent] = (this.data.topics[intent] || 0) + 1;

    this.data.recent = [item, ...this.data.recent].slice(0, RECENT_CAP);
    this.prune();
    this.scheduleSave();
    try {
      this.listener?.(item);
    } catch (error: any) {
      console.warn("[metrics] listener failed:", error.message);
    }
    return item;
  }

  getSummary() {
    const today = this.data.days[dayKey()] || emptyBucket();
    const yesterday = this.data.days[dayKey(new Date(Date.now() - 86_400_000))] || emptyBucket();

    const pct = (curr: number, prev: number) => (prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0);
    const rateOf = (b: BucketStat) => (b.conversations > 0 ? (b.answered / b.conversations) * 100 : 0);
    const avgOf = (b: BucketStat) => (b.responseCount > 0 ? b.responseMsTotal / b.responseCount / 1000 : 0);

    // 24 จุดรายชั่วโมงของ "วันนี้" (00:00–23:00)
    const now = new Date();
    const hourly = Array.from({ length: 24 }, (_, h) => {
      const key = `${dayKey(now)}T${String(h).padStart(2, "0")}`;
      const bucket = this.data.hours[key] || { conversations: 0, answered: 0 };
      return {
        label: `${String(h).padStart(2, "0")}:00`,
        conversations: bucket.conversations,
        answered: bucket.answered,
      };
    });

    // 14 วันล่าสุด
    const fmtDay = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short" });
    const daily = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      const bucket = this.data.days[dayKey(d)] || emptyBucket();
      return {
        label: fmtDay.format(d),
        conversations: bucket.conversations,
        answered: bucket.answered,
      };
    });

    const topics = Object.entries(this.data.topics)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(([topic, count]) => ({ topic, count }));

    return {
      generatedAt: new Date().toISOString(),
      kpis: {
        chatsToday: today.conversations,
        successRate: Math.round(rateOf(today) * 10) / 10,
        handover: today.handover,
        avgResponseSec: Math.round(avgOf(today) * 10) / 10,
      },
      deltas: {
        chatsPct: Math.round(pct(today.conversations, yesterday.conversations) * 10) / 10,
        successDelta: Math.round((rateOf(today) - rateOf(yesterday)) * 10) / 10,
        handoverPct: Math.round(pct(today.handover, yesterday.handover) * 10) / 10,
        responsePct: Math.round(pct(avgOf(today), avgOf(yesterday)) * 10) / 10,
      },
      hourly,
      daily,
      topics,
      totalMessages: Object.values(this.data.days).reduce((sum, b) => sum + b.conversations, 0),
    };
  }

  getActivitySince(sinceIso?: string) {
    if (!sinceIso) return this.data.recent.slice(0, 24);
    const since = Date.parse(sinceIso);
    if (Number.isNaN(since)) return this.data.recent.slice(0, 24);
    return this.data.recent.filter((item) => Date.parse(item.ts) > since);
  }

  private sanitizeText(raw: string) {
    const content = String(raw || "").replace(/\s+/g, " ").trim().slice(0, 160);
    if (SECRET_PATTERN.test(content)) return "[ข้อความถูกซ่อน (ตรวจพบข้อมูลลับ)]";
    return content || "(ข้อความแนบ/สติกเกอร์)";
  }

  private sanitizeName(raw: string) {
    const name = String(raw || "").trim().slice(0, 40);
    return name || "ลูกค้า";
  }

  private prune() {
    const dayKeys = Object.keys(this.data.days).sort();
    for (const key of dayKeys.slice(0, Math.max(0, dayKeys.length - DAY_KEEP))) delete this.data.days[key];
    const hourKeys = Object.keys(this.data.hours).sort();
    for (const key of hourKeys.slice(0, Math.max(0, hourKeys.length - HOUR_KEEP))) delete this.data.hours[key];
    const topicEntries = Object.entries(this.data.topics).sort((left, right) => right[1] - left[1]);
    if (topicEntries.length > 12) {
      this.data.topics = Object.fromEntries(topicEntries.slice(0, 12));
    }
  }

  private scheduleSave() {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.save();
    }, 2000);
  }

  private load() {
    try {
      if (!fs.existsSync(this.filePath)) return;
      const parsed = JSON.parse(fs.readFileSync(this.filePath, "utf8"));
      if (parsed && typeof parsed === "object" && parsed.days && typeof parsed.days === "object") {
        this.data = {
          days: parsed.days,
          hours: parsed.hours && typeof parsed.hours === "object" ? parsed.hours : {},
          topics: parsed.topics && typeof parsed.topics === "object" ? parsed.topics : {},
          recent: Array.isArray(parsed.recent) ? parsed.recent.slice(0, RECENT_CAP) : [],
        };
      }
    } catch (error: any) {
      console.warn(`[metrics] ignored corrupted metrics file: ${error.message}`);
      this.data = structuredClone(EMPTY_DATA);
    }
  }

  private save() {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      const temporaryPath = `${this.filePath}.tmp`;
      fs.writeFileSync(temporaryPath, JSON.stringify(this.data), "utf8");
      fs.renameSync(temporaryPath, this.filePath);
    } catch (error: any) {
      console.error(`[metrics] save failed: ${error.message}`);
    }
  }
}

export const metricsStore = new MetricsStore();
