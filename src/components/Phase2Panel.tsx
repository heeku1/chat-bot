import { useEffect, useState, type ReactNode } from "react";
import { Activity, Bot, BrainCircuit, Play, RefreshCw, ShieldAlert, Square, Trash2 } from "lucide-react";
import { BotConfig } from "../types";
import { ShellPage } from "./AdminLayout";

interface Phase2PanelProps {
  page: ShellPage;
  activeBot: BotConfig;
  isAdmin: boolean;
  onUpdateBot: (bot: BotConfig) => void;
}

interface RuntimeStatus {
  state: "stopped" | "starting" | "running" | "error";
  running: boolean;
  botUsername: string | null;
  lastUpdateAt: string | null;
  lastError: string | null;
  provider: string;
  reviewerMode: "off" | "normal" | "strict";
}

export default function Phase2Panel({ page, activeBot, isAdmin, onUpdateBot }: Phase2PanelProps) {
  if (page === "bots") return <RuntimePanel activeBot={activeBot} />;
  if (page === "memory") return <MemoryPanel isAdmin={isAdmin} />;
  if (page === "recommendations") return <RecommendationsPanel activeBot={activeBot} onUpdateBot={onUpdateBot} />;
  if (page === "approvals") return <ApprovalsPanel />;
  return null;
}

function RuntimePanel({ activeBot }: { activeBot: BotConfig }) {
  const [status, setStatus] = useState<RuntimeStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = async () => setStatus(await fetch("/api/telegram/runtime/status").then((response) => response.json()));

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, []);

  const setRunning = async (running: boolean) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/telegram/runtime/${running ? "start" : "stop"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(running ? {
          instanceId: activeBot.instanceId,
          token: activeBot.token,
          config: {
            ...activeBot,
            token: "",
            externalApis: {
              ...activeBot.externalApis,
              apiAuthToken: "",
              geminiApiKey: "",
              openaiApiKey: ""
            }
          },
          openaiApiKey: activeBot.externalApis?.openaiApiKey,
          geminiApiKey: activeBot.externalApis?.geminiApiKey,
          systemPrompt: activeBot.botSettings.aiPrompt,
          reviewerMode: activeBot.reviewerMode || "normal",
        } : {}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Runtime request failed");
      setStatus(data);
    } catch (requestError: any) {
      setError(requestError.message || "Runtime request failed");
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="phase2-panel mb-4">
      <PanelHeader icon={<Bot size={18} />} title="Telegram Bot Runtime" subtitle="Local long polling via getUpdates; no webhook is used while running." onRefresh={load} />
      <div className="phase2-stat-grid">
        <Stat label="Runtime" value={status?.state || "loading"} tone={status?.running ? "success" : status?.state === "error" ? "danger" : "muted"} />
        <Stat label="Bot" value={status?.botUsername ? `@${status.botUsername}` : "Not connected"} />
        <Stat label="AI Provider" value={status?.provider || "Offline"} />
        <Stat label="Last Update" value={formatDate(status?.lastUpdateAt)} />
      </div>
      {status?.lastError && <div className="alert alert-danger py-2 mx-3 mb-0 small">{status.lastError}</div>}
      {error && <div className="alert alert-danger py-2 mx-3 mb-0 small">{error}</div>}
      <div className="phase2-actions">
        <button className="btn btn-sm btn-success" disabled={busy || status?.running} onClick={() => void setRunning(true)}><Play size={15} /> Start polling</button>
        <button className="btn btn-sm btn-outline-danger" disabled={busy || !status?.running} onClick={() => void setRunning(false)}><Square size={14} /> Stop</button>
        <small>Secrets stay in the local server process and are never returned by status APIs.</small>
      </div>
    </section>
  );
}

function MemoryPanel({ isAdmin }: { isAdmin: boolean }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const load = async () => setData(await fetch("/api/ai/memory/status").then((response) => response.json()));
  useEffect(() => { void load(); }, []);

  const toggle = async () => {
    const response = await fetch("/api/ai/memory/toggle", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !data?.enabled }) });
    setData(await response.json());
  };
  const clear = async () => {
    if (!window.confirm("Clear all local Jimmy conversation memory?")) return;
    const response = await fetch("/api/ai/memory", { method: "DELETE", headers: { "X-Jimmy-Admin-User": "admin" } });
    const result = await response.json();
    if (!response.ok) setError(result.error || "Clear failed"); else setData(result);
  };

  return (
    <section className="phase2-panel">
      <PanelHeader icon={<BrainCircuit size={18} />} title="Conversation Memory" subtitle="Bounded server-side memory separated by Telegram chat." onRefresh={load} />
      <div className="phase2-stat-grid">
        <Stat label="Memory" value={data?.enabled ? "On" : "Off"} tone={data?.enabled ? "success" : "muted"} />
        <Stat label="Chats" value={String(data?.chatCount ?? 0)} />
        <Stat label="Long-term Notes" value={String(data?.noteCount ?? 0)} />
      </div>
      <div className="phase2-actions">
        <button className="btn btn-sm btn-outline-primary" onClick={() => void toggle()}>{data?.enabled ? "Turn off" : "Turn on"}</button>
        {isAdmin && <button className="btn btn-sm btn-outline-danger" onClick={() => void clear()}><Trash2 size={14} /> Clear all</button>}
      </div>
      {error && <div className="alert alert-danger py-2 mx-3 small">{error}</div>}
      <DataTable columns={["Chat", "Messages", "Notes", "Updated"]} rows={(data?.recentActivity || []).map((item: any) => [item.chatRef, item.messages, item.notes, formatDate(item.updatedAt)])} empty="No memory activity yet." />
    </section>
  );
}

function RecommendationsPanel({ activeBot, onUpdateBot }: { activeBot: BotConfig; onUpdateBot: (bot: BotConfig) => void }) {
  const [data, setData] = useState<any>(null);
  const load = async () => setData(await fetch("/api/ai/recommendations").then((response) => response.json()));
  useEffect(() => { void load(); }, []);
  const mode = activeBot.reviewerMode || "normal";
  return (
    <section className="phase2-panel">
      <PanelHeader icon={<Activity size={18} />} title="Reviewer & Recommendations" subtitle="Advice is added only when it improves safety or usefulness." onRefresh={load} />
      <div className="phase2-mode-row">
        <label htmlFor="reviewer-mode">Reviewer mode</label>
        <select id="reviewer-mode" className="form-select form-select-sm" value={mode} onChange={(event) => onUpdateBot({ ...activeBot, reviewerMode: event.target.value as BotConfig["reviewerMode"] })}>
          <option value="off">Off</option><option value="normal">Normal</option><option value="strict">Strict</option>
        </select>
        <small>Restart polling to apply a changed mode to the active runtime.</small>
      </div>
      <DataTable columns={["Risk", "Intent", "Recommendation", "Time"]} rows={(data?.recommendations || []).map((item: any) => [item.risk.toUpperCase(), item.intent, item.recommendation, formatDate(item.createdAt)])} empty="No recommendations generated yet." />
    </section>
  );
}

function ApprovalsPanel() {
  const [data, setData] = useState<any>(null);
  const load = async () => setData(await fetch("/api/approvals").then((response) => response.json()));
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 5000); return () => window.clearInterval(timer); }, []);
  return (
    <section className="phase2-panel">
      <PanelHeader icon={<ShieldAlert size={18} />} title="Approval Framework" subtitle="All high-risk actions remain Safe Preview only in Phase 2." onRefresh={load} />
      <div className="phase2-stat-grid"><Stat label="Pending" value={String(data?.pending ?? 0)} tone="warning" /><Stat label="Approved" value={String(data?.approved ?? 0)} tone="success" /><Stat label="Cancelled" value={String(data?.cancelled ?? 0)} /><Stat label="Expired" value={String(data?.expired ?? 0)} /></div>
      <DataTable columns={["Risk", "Intent", "Summary", "Status"]} rows={(data?.recent || []).map((item: any) => [item.risk.toUpperCase(), item.intent, item.summary, item.status])} empty="No approval requests yet." />
    </section>
  );
}

function PanelHeader({ icon, title, subtitle, onRefresh }: { icon: ReactNode; title: string; subtitle: string; onRefresh: () => void | Promise<void> }) {
  return <header className="phase2-panel-header"><span>{icon}</span><div><h2>{title}</h2><p>{subtitle}</p></div><button className="btn btn-sm btn-outline-secondary ms-auto" onClick={() => void onRefresh()} title="Refresh"><RefreshCw size={14} /></button></header>;
}

function Stat({ label, value, tone = "muted" }: { label: string; value: string; tone?: string }) {
  return <div className={`phase2-stat is-${tone}`}><span>{label}</span><strong>{value}</strong></div>;
}

function DataTable({ columns, rows, empty }: { columns: string[]; rows: ReactNode[][]; empty: string }) {
  return <div className="table-responsive phase2-table"><table className="table table-sm align-middle mb-0"><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, index) => <td key={index}>{cell}</td>)}</tr>) : <tr><td colSpan={columns.length} className="text-secondary text-center py-4">{empty}</td></tr>}</tbody></table></div>;
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "Never";
}
