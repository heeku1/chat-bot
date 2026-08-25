import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BrainCircuit,
  ChevronRight,
  Clock3,
  Database,
  LayoutDashboard,
  MessagesSquare,
  Moon,
  Pause,
  Play,
  Power,
  Radio,
  RefreshCw,
  Send,
  ShieldAlert,
  Sun,
  Timer,
  UserCheck,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BotConfig } from "../types";

/* ============================================================
 * Single-Page Live Ops Dashboard
 * - Single screen (no page scroll on desktop, panels scroll internally)
 * - Dark / Light minimal theme (driven by the shell theme prop)
 * - KPI cards / Main chart + Top-5 topics / Live activity feed
 * - System status wired to real backend endpoints with graceful
 *   simulated fallback when the API is unreachable (local dev)
 * ============================================================ */

type Sentiment = "positive" | "neutral" | "negative";
type RangeMode = "hourly" | "daily";

interface VolumePoint {
  label: string;
  conversations: number;
  answered: number;
}

interface TopicCount {
  topic: string;
  count: number;
}

interface LiveMessage {
  id: number;
  user: string;
  text: string;
  intent: string;
  sentiment: Sentiment;
  at: Date;
  handover: boolean;
}

interface HealthInfo {
  mode?: string | null;
  version?: string | null;
  gitCommit?: string | null;
  hasBotToken?: boolean;
  hasWebhookSecret?: boolean;
  authEnabled?: boolean;
}

interface RuntimeInfo {
  running?: boolean;
  state?: string;
  botUsername?: string | null;
  lastError?: string | null;
  provider?: "OpenAI" | "Gemini" | "Offline";
  reviewerMode?: string;
}

interface MemoryInfo {
  enabled?: boolean;
  chatCount?: number;
  noteCount?: number;
}

interface SinglePageDashboardProps {
  config: BotConfig;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onSwitchToClassic: () => void;
}

/* ---------------- simulation helpers ---------------- */

const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const TOPIC_PRODUCT = "สอบถามสินค้า/บริการ";
const TOPIC_PRICE = "ราคา & โปรโมชั่น";
const TOPIC_ORDER = "สั่งซื้อ/ชำระเงิน";
const TOPIC_SHIPPING = "สถานะพัสดุ/จัดส่ง";
const TOPIC_COMPLAINT = "ร้องเรียน/ปัญหา";

function buildHourly(): VolumePoint[] {
  const base = [9, 5, 4, 3, 3, 5, 11, 21, 34, 49, 63, 75, 82, 78, 71, 77, 89, 97, 104, 95, 83, 64, 43, 21];
  return base.map((v, h) => {
    const conversations = Math.max(1, Math.round(v + rand(-4, 4)));
    return {
      label: `${String(h).padStart(2, "0")}:00`,
      conversations,
      answered: Math.round(conversations * rand(0.88, 0.97)),
    };
  });
}

function buildDaily(): VolumePoint[] {
  const fmt = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short" });
  const out: VolumePoint[] = [];
  let level = rand(420, 520);
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    level = clamp(level + rand(-45, 62), 260, 1100);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    const conversations = Math.round(level * (weekend ? rand(0.72, 0.9) : rand(0.92, 1.12)));
    out.push({
      label: fmt.format(d),
      conversations,
      answered: Math.round(conversations * rand(0.89, 0.96)),
    });
  }
  return out;
}

const INITIAL_TOPICS: TopicCount[] = [
  { topic: TOPIC_PRODUCT, count: 186 },
  { topic: TOPIC_PRICE, count: 143 },
  { topic: TOPIC_ORDER, count: 98 },
  { topic: TOPIC_SHIPPING, count: 74 },
  { topic: TOPIC_COMPLAINT, count: 42 },
];

const SAMPLE_MESSAGES: Array<{ text: string; intent: string; sentiment: Sentiment; bucket: string }> = [
  { text: "มีเสื้อยืดสีดำไซซ์ L ไหมคะ", intent: "สอบถามสินค้า", sentiment: "neutral", bucket: TOPIC_PRODUCT },
  { text: "ร้านมีสาขาใกล้กรุงเทพไหมครับ", intent: "สอบถามสินค้า", sentiment: "neutral", bucket: TOPIC_PRODUCT },
  { text: "โปรโมชั่นเดือนนี้ลดกี่เปอร์เซ็นต์ครับ", intent: "ราคา/โปรฯ", sentiment: "positive", bucket: TOPIC_PRICE },
  { text: "ซื้อครบ 500 มีส่งฟรีไหมคะ", intent: "ราคา/โปรฯ", sentiment: "neutral", bucket: TOPIC_PRICE },
  { text: "โอนแล้วครับ รบกวนเช็กสลิปให้หน่อยครับ", intent: "ชำระเงิน", sentiment: "neutral", bucket: TOPIC_ORDER },
  { text: "อยากสั่งเป็นล็อตใหญ่ ติดต่อสายขายยังไงคะ", intent: "สั่งซื้อ", sentiment: "positive", bucket: TOPIC_ORDER },
  { text: "สั่งมา 3 วันแล้วยังไม่ได้รับของเลยค่ะ!", intent: "พัสดุ", sentiment: "negative", bucket: TOPIC_SHIPPING },
  { text: "ขอเลขติดตามพัสดุหน่อยครับ", intent: "พัสดุ", sentiment: "neutral", bucket: TOPIC_SHIPPING },
  { text: "แอดมินตอบช้ามาก รอเป็นชั่วโมงแล้วนะครับ", intent: "ร้องเรียน", sentiment: "negative", bucket: TOPIC_COMPLAINT },
  { text: "สินค้าที่ได้มีรอยชำรุด ขอเคลมค่ะ", intent: "ร้องเรียน", sentiment: "negative", bucket: TOPIC_COMPLAINT },
  { text: "ขอบคุณครับ บริการดีมาก 👍", intent: "คำชม", sentiment: "positive", bucket: TOPIC_PRODUCT },
  { text: "ใช้คูปองไม่ได้อ่ะค่ะ ขึ้น code invalid", intent: "ช่วยเหลือ", sentiment: "negative", bucket: TOPIC_COMPLAINT },
];

const USER_POOL = ["สมชาย ว.", "มะลิ ศ.", "Nattapong", "Ploy P.", "ธนกร ก.", "Kanya S.", "วิภา แก้ว", "Bank T.", "อรุณี ม."];

function seedFeed(): LiveMessage[] {
  const now = Date.now();
  return Array.from({ length: 8 }, (_, i) => {
    const s = pick(SAMPLE_MESSAGES);
    return {
      id: 100 - i,
      user: pick(USER_POOL),
      text: s.text,
      intent: s.intent,
      sentiment: s.sentiment,
      at: new Date(now - (i + 1) * rand(40_000, 160_000)),
      handover: s.sentiment === "negative" && Math.random() < 0.5,
    };
  });
}

/* ---------------- small building blocks ---------------- */

function Sparkline({ values, stroke }: { values: number[]; stroke: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${26 - ((v - min) / span) * 22}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="h-5 w-full opacity-80">
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DeltaBadge({ value, goodWhenDown }: { value: number; goodWhenDown?: boolean }) {
  const up = value >= 0;
  const good = goodWhenDown ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
        good ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
      }`}
    >
      <Icon size={11} />
      {up ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

const SENTIMENT_STYLE: Record<Sentiment, { dot: string; chip: string; label: string }> = {
  positive: { dot: "bg-emerald-400", chip: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", label: "บวก" },
  neutral: { dot: "bg-sky-400", chip: "bg-sky-500/10 text-sky-500 border-sky-500/20", label: "กลาง" },
  negative: { dot: "bg-rose-400", chip: "bg-rose-500/10 text-rose-500 border-rose-500/20", label: "ลบ" },
};

const TOPIC_COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#f59e0b", "#f43f5e"];

/* ---------------- main component ---------------- */

export default function SinglePageDashboard({ config, theme, onToggleTheme, onSwitchToClassic }: SinglePageDashboardProps) {
  /* ---- theme tokens ---- */
  const t =
    theme === "light"
      ? {
          card: "bg-white border-slate-200 shadow-sm",
          sub: "bg-slate-50 border-slate-200",
          text: "text-slate-800",
          muted: "text-slate-500",
          faint: "text-slate-400",
          chip: "bg-slate-100 text-slate-600 border-slate-200",
          hover: "hover:bg-slate-100",
          grid: "rgba(15,23,42,0.08)",
          tick: "#64748b",
          tooltipBg: "#ffffff",
          tooltipBorder: "#e2e8f0",
          tooltipText: "#0f172a",
        }
      : {
          card: "bg-[#15151B]/85 border-white/[0.07] backdrop-blur-sm",
          sub: "bg-white/[0.04] border-white/[0.06]",
          text: "text-slate-100",
          muted: "text-slate-400",
          faint: "text-slate-500",
          chip: "bg-white/[0.05] text-slate-300 border-white/10",
          hover: "hover:bg-white/[0.05]",
          grid: "rgba(255,255,255,0.07)",
          tick: "#94a3b8",
          tooltipBg: "#1b1b23",
          tooltipBorder: "rgba(255,255,255,0.12)",
          tooltipText: "#e2e8f0",
        };

  /* ---- simulated conversation data ---- */
  const [range, setRange] = useState<RangeMode>("hourly");
  const [series, setSeries] = useState<{ hourly: VolumePoint[]; daily: VolumePoint[] }>({
    hourly: buildHourly(),
    daily: buildDaily(),
  });
  const [topics, setTopics] = useState<TopicCount[]>(INITIAL_TOPICS);
  const [kpis, setKpis] = useState({ chatsToday: 342, successRate: 94.6, handover: 7, avgResponse: 2.4 });
  const [chatsSpark, setChatsSpark] = useState<number[]>(() =>
    Array.from({ length: 18 }, (_, i) => 300 + i * 2.4 + rand(-8, 8)),
  );
  const [feed, setFeed] = useState<LiveMessage[]>(seedFeed);
  const [paused, setPaused] = useState(false);
  const [now, setNow] = useState(() => new Date());

  /* ---- real system status ---- */
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [runtime, setRuntime] = useState<RuntimeInfo | null>(null);
  const [memory, setMemory] = useState<MemoryInfo | null>(null);
  const [backendOnline, setBackendOnline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /* ---- emergency switch ---- */
  const [emergencyOff, setEmergencyOff] = useState(false);
  const [switchBusy, setSwitchBusy] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "warn"; msg: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = useRef(1000);
  const kpisRef = useRef(kpis);
  useEffect(() => {
    kpisRef.current = kpis;
  }, [kpis]);

  const showToast = useCallback((kind: "ok" | "warn", msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ kind, msg });
    toastTimer.current = setTimeout(() => setToast(null), 5200);
  }, []);

  /* ---- clock ---- */
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  /* ---- live tick: feed + kpis + charts ---- */
  useEffect(() => {
    if (paused) return undefined;
    const iv = setInterval(() => {
      if (Math.random() < 0.74) {
        const s = pick(SAMPLE_MESSAGES);
        const handover = s.sentiment === "negative" && Math.random() < 0.55;
        const msg: LiveMessage = {
          id: (idRef.current += 1),
          user: pick(USER_POOL),
          text: s.text,
          intent: s.intent,
          sentiment: s.sentiment,
          at: new Date(),
          handover,
        };
        setFeed((f) => [msg, ...f].slice(0, 24));
        setTopics((ts) => ts.map((x) => (x.topic === s.bucket ? { ...x, count: x.count + 1 } : x)));
        const cur = kpisRef.current;
        const next = {
          chatsToday: cur.chatsToday + 1,
          successRate: clamp(cur.successRate + rand(-0.35, 0.42), 86, 99.4),
          handover: cur.handover + (handover ? 1 : Math.random() < 0.04 ? 1 : 0),
          avgResponse: clamp(cur.avgResponse + rand(-0.14, 0.17), 1.1, 4.8),
        };
        setKpis(next);
        setChatsSpark((h) => [...h.slice(-17), next.chatsToday]);
        setSeries((sr) => {
          const hour = new Date().getHours();
          const arr = sr.hourly.map((p, i) => (i === hour ? { ...p, conversations: p.conversations + 1 } : p));
          return { ...sr, hourly: arr };
        });
      }
    }, 2800);
    return () => clearInterval(iv);
  }, [paused]);

  /* ---- poll real backend status ---- */
  const loadSystem = useCallback(async () => {
    setRefreshing(true);
    const getJson = async (url: string) => {
      try {
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (!res.ok) return null;
        return (await res.json()) as Record<string, unknown>;
      } catch {
        return null;
      }
    };
    const [h, r, m] = await Promise.all([
      getJson("/health"),
      getJson("/api/telegram/runtime/status"),
      getJson("/api/ai/memory/status"),
    ]);
    setHealth(h as HealthInfo | null);
    setRuntime(r as RuntimeInfo | null);
    setMemory(m as MemoryInfo | null);
    setBackendOnline(Boolean(h || r || m));
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void loadSystem();
    const iv = setInterval(() => void loadSystem(), 15_000);
    return () => clearInterval(iv);
  }, [loadSystem]);

  /* ---- emergency kill switch ---- */
  const handleEmergencyToggle = async () => {
    const turningOff = !emergencyOff;
    if (turningOff && !window.confirm("ยืนยันหยุดการทำงานของบอททันที (Emergency Stop)?")) return;
    setSwitchBusy(true);
    try {
      const res = await fetch(turningOff ? "/api/telegram/runtime/stop" : "/api/telegram/runtime/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setEmergencyOff(turningOff);
      showToast("ok", turningOff ? "หยุดบอทชั่วคราวแล้ว (Emergency Stop)" : "เปิดบอทกลับมาทำงานแล้ว");
      void loadSystem();
    } catch (err) {
      // Backend unreachable (local dev) — still flip local state so UI is testable.
      setEmergencyOff(turningOff);
      showToast(
        "warn",
        `สั่งงานผ่าน API ไม่สำเร็จ (${err instanceof Error ? err.message : "unknown"}) — สลับสถานะฝั่งหน้าจอแล้ว`,
      );
    } finally {
      setSwitchBusy(false);
    }
  };

  /* ---- derived system tiles ---- */
  const providerName =
    runtime?.provider ?? (config.externalApis?.openaiApiKey ? "OpenAI" : config.externalApis?.geminiApiKey ? "Gemini" : "Offline");

  type TileState = "ok" | "warn" | "bad";
  const tileDot: Record<TileState, string> = {
    ok: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]",
    warn: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]",
    bad: "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]",
  };

  const botState: TileState = emergencyOff ? "bad" : runtime ? (runtime.running ? "ok" : "warn") : "ok";
  const botSub = emergencyOff
    ? "หยุดฉุกเฉิน — ผู้ใช้จะไม่ได้รับการตอบกลับ"
    : runtime
      ? runtime.running
        ? `กำลังทำงาน${runtime.botUsername ? ` • @${runtime.botUsername}` : ""}`
        : `Runtime ${runtime.state ?? "stopped"}`
      : `${config.name} (โหมดจำลอง)`;

  const aiState: TileState = providerName === "Offline" ? "warn" : "ok";
  const aiSub = providerName === "Offline" ? "ยังไม่ได้ตั้งค่า AI key" : `${providerName}${runtime?.reviewerMode ? ` • Reviewer: ${runtime.reviewerMode}` : ""}`;

  const apiState: TileState = health ? (health.mode === "telegram-ready" ? "ok" : "warn") : backendOnline ? "warn" : "warn";
  const apiSub = health
    ? health.mode === "telegram-ready"
      ? `Telegram API พร้อมใช้งาน${health.hasWebhookSecret ? " • Webhook secret ✓" : ""}`
      : `โหมด ${health.mode ?? "unknown"} — รอตั้งค่า token`
    : "ไม่ทราบสถานะ (backend offline)";

  const dbState: TileState = memory ? (memory.enabled ? "ok" : "warn") : "ok";
  const dbSub = memory
    ? memory.enabled
      ? `Conversation Memory • ${memory.chatCount ?? 0} แชท • ${memory.noteCount ?? 0} โน้ต`
      : "Memory ถูกปิดใช้งาน"
    : "ฐานข้อมูลในเครื่อง (โหมดจำลอง)";

  const systemTiles: Array<{ icon: typeof Radio; name: string; state: TileState; sub: string }> = [
    { icon: Send, name: "บอท Telegram", state: botState, sub: botSub },
    { icon: BrainCircuit, name: "AI Provider", state: aiState, sub: aiSub },
    { icon: Radio, name: "API / Webhook", state: apiState, sub: apiSub },
    { icon: Database, name: "Memory DB", state: dbState, sub: dbSub },
  ];

  const volumeData = range === "hourly" ? series.hourly : series.daily;
  const totalConversations = volumeData.reduce((sum, p) => sum + p.conversations, 0);
  const successRateStr = kpis.successRate.toFixed(1);

  return (
    <div className={`single-page-dash relative font-sans ${t.text}`}>
      {/* toast */}
      {toast && (
        <div
          className={`fixed right-5 top-20 z-[60] flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold shadow-xl ${
            toast.kind === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
              : "border-amber-500/30 bg-amber-500/10 text-amber-500"
          }`}
        >
          {toast.kind === "ok" ? "✓" : "⚠"} {toast.msg}
        </div>
      )}

      <div className="grid grid-cols-12 gap-3 lg:h-[calc(100dvh_-_14.75rem)] lg:min-h-[640px] lg:grid-rows-[auto_auto_minmax(0,1fr)_auto] lg:gap-4">
        {/* ================= header strip ================= */}
        <header className={`col-span-12 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-2.5 lg:flex-nowrap ${t.card}`}>
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
              <LayoutDashboard size={18} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold tracking-tight">Live Ops Dashboard</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  LIVE
                </span>
              </div>
              <p className={`truncate text-[11px] ${t.muted}`}>
                ภาพรวมทั้งหมดในหน้าเดียว • บอท: <span className="font-semibold">{config.name || "My Bot"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`hidden items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold sm:inline-flex ${t.chip}`}>
              <Clock3 size={13} />
              {now.toLocaleTimeString("th-TH", { hour12: false })}
            </span>
            <button
              type="button"
              onClick={() => void loadSystem()}
              title="รีเฟรชสถานะระบบ"
              className={`rounded-lg border p-2 transition ${t.chip} ${t.hover}`}
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            </button>
            <button
              type="button"
              onClick={onToggleTheme}
              title="สลับธีมมืด/สว่าง"
              className={`rounded-lg border p-2 transition ${t.chip} ${t.hover}`}
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button
              type="button"
              onClick={onSwitchToClassic}
              className="inline-flex items-center gap-1 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-[11px] font-bold text-indigo-400 transition hover:bg-indigo-500/20"
            >
              Analytics เดิม
              <ChevronRight size={13} />
            </button>
          </div>
        </header>

        {/* ================= KPI cards ================= */}
        <section className="col-span-6 xl:col-span-3">
          <div className={`h-full rounded-2xl border p-3 ${t.card}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-[11px] font-semibold ${t.muted}`}>แชททั้งหมดวันนี้</p>
                <p className="mt-1 text-2xl font-extrabold tabular-nums tracking-tight">
                  {kpis.chatsToday.toLocaleString("th-TH")}
                </p>
              </div>
              <span className="rounded-lg bg-indigo-500/15 p-2 text-indigo-400">
                <MessagesSquare size={16} />
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <DeltaBadge value={12.4} />
              <span className={`text-[10px] ${t.faint}`}>vs เมื่อวาน</span>
            </div>
            <Sparkline values={chatsSpark} stroke="#818cf8" />
          </div>
        </section>

        <section className="col-span-6 xl:col-span-3">
          <div className={`h-full rounded-2xl border p-3 ${t.card}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-[11px] font-semibold ${t.muted}`}>อัตราตอบสำเร็จ</p>
                <p className="mt-1 text-2xl font-extrabold tabular-nums tracking-tight text-emerald-500">{successRateStr}%</p>
              </div>
              <span className="rounded-lg bg-emerald-500/15 p-2 text-emerald-400">
                <Activity size={16} />
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <DeltaBadge value={0.8} />
              <span className={`text-[10px] ${t.faint}`}>AI ตอบสำเร็จโดยไม่ Handover</span>
            </div>
            <Sparkline values={[92, 93, 92.5, 94, 93.5, 94.2, 94, 95, 94.5, 95.2, 95, 95.8, 95.5, 96, 95.8, 96.2, 96, kpis.successRate]} stroke="#34d399" />
          </div>
        </section>

        <section className="col-span-6 xl:col-span-3">
          <div className={`h-full rounded-2xl border p-3 ${t.card}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-[11px] font-semibold ${t.muted}`}>เคสส่งต่อคน (Handover)</p>
                <p className="mt-1 text-2xl font-extrabold tabular-nums tracking-tight text-amber-500">
                  {kpis.handover.toLocaleString("th-TH")}
                </p>
              </div>
              <span className="rounded-lg bg-amber-500/15 p-2 text-amber-400">
                <UserCheck size={16} />
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <DeltaBadge value={-2.1} goodWhenDown />
              <span className={`text-[10px] ${t.faint}`}>รอแอดมินตอบ {Math.max(1, Math.round(kpis.handover / 3))} เคส</span>
            </div>
            <Sparkline values={[6, 5, 7, 6, 8, 7, 6, 7, 6, 5, 6, 7, 6, 5, 6, 7, 6, kpis.handover]} stroke="#fbbf24" />
          </div>
        </section>

        <section className="col-span-6 xl:col-span-3">
          <div className={`h-full rounded-2xl border p-3 ${t.card}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-[11px] font-semibold ${t.muted}`}>เวลาตอบเฉลี่ย</p>
                <p className="mt-1 text-2xl font-extrabold tabular-nums tracking-tight text-sky-400">
                  {kpis.avgResponse.toFixed(1)}
                  <span className="ml-1 text-xs font-bold">วิ</span>
                </p>
              </div>
              <span className="rounded-lg bg-sky-500/15 p-2 text-sky-400">
                <Timer size={16} />
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <DeltaBadge value={-4.6} goodWhenDown />
              <span className={`text-[10px] ${t.faint}`}>เป้าหมาย ≤ 3.0 วิ</span>
            </div>
            <Sparkline values={[3.4, 3.2, 3.5, 3.1, 2.9, 3.0, 2.8, 2.7, 2.9, 2.6, 2.5, 2.7, 2.4, 2.6, 2.5, 2.4, 2.5, kpis.avgResponse]} stroke="#38bdf8" />
          </div>
        </section>

        {/* ================= main chart ================= */}
        <section className={`col-span-12 flex min-h-0 flex-col rounded-2xl border p-4 xl:col-span-8 ${t.card}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-extrabold">Conversation Volume</h3>
                <p className={`text-[10px] ${t.muted}`}>
                  รวม {totalConversations.toLocaleString("th-TH")} บทสนทนา{range === "hourly" ? "ในวันนี้" : "ใน 14 วันล่าสุด"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden items-center gap-1.5 text-[10px] font-semibold text-indigo-400 sm:flex">
                  <span className="h-1.5 w-4 rounded-full bg-indigo-400" /> Conversations
                </span>
                <span className="hidden items-center gap-1.5 text-[10px] font-semibold text-emerald-400 sm:flex">
                  <span className="h-1.5 w-4 rounded-full bg-emerald-400" /> Answered
                </span>
                <div className={`flex overflow-hidden rounded-lg border text-[10px] font-bold ${t.chip}`}>
                  {(["hourly", "daily"] as RangeMode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setRange(m)}
                      className={`px-2.5 py-1.5 transition ${
                        range === m ? "bg-indigo-500 text-white" : `${t.hover}`
                      }`}
                    >
                      {m === "hourly" ? "รายชั่วโมง" : "รายวัน"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-2 min-h-[150px] flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={volumeData} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
                  <defs>
                    <linearGradient id="gradConv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradAns" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={t.grid} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    minTickGap={28}
                    tick={{ fill: t.tick, fontSize: 10 }}
                  />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: t.tick, fontSize: 10 }} width={44} />
                  <Tooltip
                    contentStyle={{
                      background: t.tooltipBg,
                      border: `1px solid ${t.tooltipBorder}`,
                      borderRadius: 12,
                      fontSize: 12,
                      color: t.tooltipText,
                    }}
                    labelStyle={{ color: t.tooltipText, fontWeight: 700 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="conversations"
                    name="Conversations"
                    stroke="#818cf8"
                    strokeWidth={2}
                    fill="url(#gradConv)"
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="answered"
                    name="Answered"
                    stroke="#34d399"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    fill="url(#gradAns)"
                    activeDot={{ r: 3, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
        </section>

        {/* ================= right column: live activity + top topics ================= */}
        <section className="col-span-12 flex min-h-0 flex-col gap-2.5 xl:col-span-4">
          <div className={`flex min-h-0 flex-1 flex-col rounded-2xl border p-3 ${t.card}`}>
            <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessagesSquare size={15} className="text-indigo-400" />
              <h3 className="text-xs font-extrabold">Live Activity</h3>
              <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-400">
                {feed.length} ข้อความ
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              title={paused ? "เล่นต่อ" : "หยุดชั่วคราว"}
              className={`rounded-lg border p-1.5 transition ${t.chip} ${t.hover}`}
            >
              {paused ? <Play size={13} className="text-emerald-400" /> : <Pause size={13} className="text-amber-400" />}
            </button>
          </div>

            <div className="custom-scrollbar mt-2 min-h-[160px] flex-1 space-y-2 overflow-y-auto pr-1">
            {feed.map((msg, idx) => {
              const s = SENTIMENT_STYLE[msg.sentiment];
              const initials = msg.user.slice(0, 2).toUpperCase();
              return (
                <article key={msg.id} className={`${idx === 0 && !paused ? "feed-enter" : ""} rounded-xl border p-2.5 ${t.sub}`}>
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-extrabold text-white ${s.dot}`}
                    >
                      {initials}
                    </span>
                    <span className="truncate text-[11px] font-bold">{msg.user}</span>
                    <span className={`ml-auto shrink-0 text-[10px] tabular-nums ${t.faint}`}>
                      {msg.at.toLocaleTimeString("th-TH", { hour12: false })}
                    </span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-snug opacity-90">{msg.text}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className={`rounded-md border px-1.5 py-0.5 text-[9.5px] font-bold ${s.chip}`}>
                      ● {s.label}
                    </span>
                    <span className={`rounded-md border px-1.5 py-0.5 text-[9.5px] font-semibold ${t.chip}`}>
                      {msg.intent}
                    </span>
                    {msg.handover && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[9.5px] font-bold text-amber-500">
                        <ShieldAlert size={9} /> ส่งต่อแอดมิน
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
            <p className={`mt-1.5 shrink-0 text-center text-[9.5px] ${t.faint}`}>
              {paused ? "หยุดชั่วคราวอยู่ — กด ▶ เพื่อรับข้อความใหม่" : "อัปเดตแบบ Real-time ทุก ~3 วินาที"}
            </p>
          </div>

          {/* top 5 topics (compact) */}
          <div className={`flex h-[128px] shrink-0 flex-col rounded-2xl border p-3 ${t.card}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-extrabold">Top 5 หัวข้อยอดฮิต</h3>
              <span className={`text-[9px] ${t.faint}`}>อัปเดตตามข้อความเข้าใหม่</span>
            </div>
            <div className="mt-1 min-h-0 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topics} layout="vertical" margin={{ top: 0, right: 30, bottom: 0, left: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="topic"
                    width={116}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: t.tick, fontSize: 9 }}
                  />
                  <Tooltip
                    cursor={{ fill: theme === "light" ? "rgba(15,23,42,0.04)" : "rgba(255,255,255,0.04)" }}
                    contentStyle={{
                      background: t.tooltipBg,
                      border: `1px solid ${t.tooltipBorder}`,
                      borderRadius: 10,
                      fontSize: 11,
                      color: t.tooltipText,
                    }}
                  />
                  <Bar dataKey="count" name="จำนวนครั้ง" radius={[0, 5, 5, 0]} barSize={9}>
                    {topics.map((_, i) => (
                      <Cell key={i} fill={TOPIC_COLORS[i % TOPIC_COLORS.length]} />
                    ))}
                    <LabelList dataKey="count" position="right" style={{ fill: t.tick, fontSize: 8.5, fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* ================= system control & status ================= */}
        <footer className={`col-span-12 rounded-2xl border p-3 ${t.card}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldAlert size={15} className="text-rose-400" />
              <h3 className="text-xs font-extrabold">System Control &amp; Status</h3>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  backendOnline ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                }`}
              >
                {backendOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
                {backendOnline ? "Backend connected" : "Backend offline (simulated)"}
              </span>
            </div>
            {health?.version && (
              <span className={`text-[10px] font-mono ${t.faint}`}>
                v{String(health.version)}
                {health.gitCommit ? ` • ${String(health.gitCommit).slice(0, 7)}` : ""}
              </span>
            )}
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
            {systemTiles.map((tile) => {
              const Icon = tile.icon;
              return (
                <div key={tile.name} className={`rounded-xl border p-2.5 ${t.sub}`}>
                  <div className="flex items-center gap-2">
                    <Icon size={14} className={t.muted} />
                    <span className="text-[11px] font-bold">{tile.name}</span>
                    <span className={`ml-auto h-2 w-2 rounded-full ${tileDot[tile.state]}`} />
                  </div>
                  <p className={`mt-1 line-clamp-2 text-[10px] leading-snug ${t.muted}`}>{tile.sub}</p>
                </div>
              );
            })}

            {/* emergency kill switch */}
            <div
              className={`col-span-2 flex items-center gap-3 rounded-xl border p-3 md:col-span-4 xl:col-span-1 ${
                emergencyOff
                  ? "border-rose-500/40 bg-rose-500/10"
                  : "border-emerald-500/30 bg-emerald-500/[0.07]"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className={`text-[11px] font-extrabold ${emergencyOff ? "text-rose-400" : "text-emerald-400"}`}>
                  {emergencyOff ? "BOT STOPPED" : "BOT RUNNING"}
                </p>
                <p className={`truncate text-[9.5px] ${t.muted}`}>สวิตช์ฉุกเฉิน หยุด/เปิดบอททันที</p>
              </div>
              <button
                type="button"
                onClick={() => void handleEmergencyToggle()}
                disabled={switchBusy}
                title={emergencyOff ? "เปิดบอทกลับมา" : "หยุดบอทฉุกเฉิน"}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition active:scale-95 disabled:opacity-50 ${
                  emergencyOff
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                    : "border-rose-500/40 bg-rose-500/15 text-rose-400 hover:bg-rose-500/25"
                }`}
              >
                <Power size={18} />
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
