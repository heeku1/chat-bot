import { ReactNode, useEffect, useState } from "react";
import {
  Activity,
  Bot,
  BotMessageSquare,
  Boxes,
  BrainCircuit,
  ChevronLeft,
  CircleUserRound,
  Code2,
  FileCode2,
  Gauge,
  Image,
  KeyRound,
  Lightbulb,
  ListChecks,
  LogOut,
  Menu,
  MessageCircle,
  MessagesSquare,
  Moon,
  Radio,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { UserAccount } from "../types";

export type ShellPage =
  | "dashboard"
  | "ai-chat"
  | "memory"
  | "recommendations"
  | "content-studio"
  | "image-studio"
  | "code-helper"
  | "bots"
  | "conversations"
  | "groups"
  | "channels"
  | "broadcast"
  | "command-parser"
  | "tool-manager"
  | "api-connections"
  | "approvals"
  | "activity-logs"
  | "users"
  | "bot-configuration"
  | "ai-models"
  | "api-keys"
  | "telegram-settings"
  | "deploy-guide";

type NavItem = {
  id: ShellPage;
  label: string;
  icon: typeof Gauge;
  adminOnly?: boolean;
};

const navigation: Array<{ label: string; items: NavItem[] }> = [
  { label: "MAIN", items: [{ id: "dashboard", label: "Dashboard", icon: Gauge }] },
  {
    label: "AI ASSISTANT",
    items: [
      { id: "ai-chat", label: "AI Chat", icon: BotMessageSquare },
      { id: "memory", label: "Memory", icon: BrainCircuit },
      { id: "recommendations", label: "Recommendations", icon: Lightbulb },
    ],
  },
  {
    label: "CREATE",
    items: [
      { id: "content-studio", label: "Content Studio", icon: FileCode2 },
      { id: "image-studio", label: "Image Studio", icon: Image },
      { id: "code-helper", label: "Code Helper", icon: Code2 },
    ],
  },
  {
    label: "TELEGRAM",
    items: [
      { id: "bots", label: "Bots", icon: Bot },
      { id: "conversations", label: "Conversations", icon: MessageCircle },
      { id: "groups", label: "Groups", icon: Users },
      { id: "channels", label: "Channels", icon: Radio },
      { id: "broadcast", label: "Broadcast", icon: Send },
    ],
  },
  {
    label: "TOOLS",
    items: [
      { id: "command-parser", label: "Command Parser", icon: Wrench },
      { id: "tool-manager", label: "Tool Manager", icon: Boxes },
      { id: "api-connections", label: "API Connections", icon: SlidersHorizontal },
    ],
  },
  {
    label: "CONTROL",
    items: [
      { id: "approvals", label: "Approvals", icon: ListChecks },
      { id: "activity-logs", label: "Activity Logs", icon: Activity },
      { id: "users", label: "Users", icon: Users, adminOnly: true },
    ],
  },
  {
    label: "SETTINGS",
    items: [
      { id: "bot-configuration", label: "Bot Configuration", icon: Settings },
      { id: "ai-models", label: "AI Models", icon: BrainCircuit },
      { id: "api-keys", label: "API Keys", icon: KeyRound },
      { id: "telegram-settings", label: "Telegram Settings", icon: SlidersHorizontal },
      { id: "deploy-guide", label: "Deploy Guide", icon: FileCode2 },
    ],
  },
];

const pageTitles = Object.fromEntries(
  navigation.flatMap((section) => section.items.map((item) => [item.id, item.label])),
) as Record<ShellPage, string>;

interface AdminLayoutProps {
  activePage: ShellPage;
  children: ReactNode;
  currentUser: UserAccount;
  theme: "dark" | "light";
  aiReady: boolean;
  telegramReady: boolean;
  onNavigate: (page: ShellPage) => void;
  onToggleTheme: () => void;
  onLogout: () => void;
}

export default function AdminLayout({
  activePage,
  children,
  currentUser,
  theme,
  aiReady,
  telegramReady,
  onNavigate,
  onToggleTheme,
  onLogout,
}: AdminLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.bsTheme = theme;
  }, [theme]);

  const navigate = (page: ShellPage) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  return (
    <div
      className={`app-wrapper jimmy-admin-shell ${theme} ${sidebarCollapsed ? "sidebar-collapse" : ""} ${mobileOpen ? "sidebar-open" : ""}`}
      data-bs-theme={theme}
    >
      <header className="app-header navbar navbar-expand jimmy-header">
        <div className="container-fluid">
          <button
            className="btn btn-sm btn-outline-secondary shell-icon-button"
            type="button"
            onClick={() => {
              if (window.matchMedia("(max-width: 991.98px)").matches) setMobileOpen((open) => !open);
              else setSidebarCollapsed((collapsed) => !collapsed);
            }}
            aria-label="Toggle sidebar"
            title="Toggle sidebar"
          >
            <Menu size={18} />
          </button>

          <div className="shell-brand-title">
            <strong>Jimmy_bot</strong>
            <span className="badge text-bg-secondary">AI &amp; Command Suite</span>
          </div>

          <div className="shell-header-actions ms-auto">
            <StatusPill label="AI" ready={aiReady} />
            <StatusPill label="Telegram" ready={telegramReady} />
            <button className="btn btn-sm btn-outline-secondary shell-icon-button" onClick={onToggleTheme} title="Toggle theme">
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <div className="shell-user">
              <CircleUserRound size={18} />
              <span>{currentUser.name}</span>
            </div>
            <button className="btn btn-sm btn-outline-danger shell-icon-button" onClick={onLogout} title="Logout">
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </header>

      <aside className="app-sidebar shadow jimmy-sidebar" data-bs-theme="dark">
        <div className="sidebar-brand">
          <button className="brand-link border-0 bg-transparent" onClick={() => navigate("dashboard")}>
            <span className="brand-mark">JB</span>
            <span className="brand-text fw-semibold">Jimmy_bot</span>
          </button>
          <button className="sidebar-mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close sidebar">
            <X size={18} />
          </button>
        </div>

        <div className="sidebar-wrapper custom-scrollbar">
          <nav className="mt-2">
            <ul className="nav sidebar-menu flex-column" role="menu">
              {navigation.map((section) => {
                const items = section.items.filter((item) => !item.adminOnly || currentUser.role === "admin");
                if (!items.length) return null;
                return (
                  <li className="nav-section" key={section.label}>
                    <span className="nav-header">{section.label}</span>
                    {items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          type="button"
                          className={`nav-link ${activePage === item.id ? "active" : ""}`}
                          key={item.id}
                          onClick={() => navigate(item.id)}
                          title={sidebarCollapsed ? item.label : undefined}
                        >
                          <Icon className="nav-icon" size={17} />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>

      {mobileOpen && <button className="sidebar-backdrop" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}

      <main className="app-main">
        <div className="app-content-header">
          <div className="container-fluid">
            <div className="shell-page-heading">
              <div>
                <p className="shell-eyebrow">Jimmy_bot Control Center</p>
                <h1>{pageTitles[activePage]}</h1>
              </div>
              <span className="shell-breadcrumb">Dashboard <ChevronLeft size={13} /> {pageTitles[activePage]}</span>
            </div>
          </div>
        </div>
        <div className="app-content">
          <div className="container-fluid">{children}</div>
        </div>
      </main>

      <footer className="app-footer">
        <span>Jimmy_bot Suite</span>
        <span className="float-end d-none d-sm-inline">AdminLTE 4 application shell</span>
      </footer>
    </div>
  );
}

function StatusPill({ label, ready }: { label: string; ready: boolean }) {
  return (
    <span className={`shell-status ${ready ? "is-ready" : "is-pending"}`}>
      <span className="shell-status-dot" />
      {label}
    </span>
  );
}

interface DashboardHomeProps {
  botCount: number;
  telegramReady: boolean;
  aiReady: boolean;
  children: ReactNode;
}

export function DashboardHome({ botCount, telegramReady, aiReady, children }: DashboardHomeProps) {
  const cards = [
    { label: "Bots", value: String(botCount), detail: "Saved bots for this account", icon: Bot, state: "actual" },
    { label: "Telegram Status", value: telegramReady ? "Ready" : "Setup needed", detail: "Based on current configuration", icon: Send, state: "actual" },
    { label: "AI Status", value: aiReady ? "Configured" : "Setup needed", detail: "Based on current configuration", icon: BrainCircuit, state: "actual" },
    { label: "Commands Today", value: "Not connected", detail: "UI placeholder - no live metrics API", icon: Activity, state: "placeholder" },
  ];

  return (
    <div className="dashboard-home">
      <div className="row g-3 mb-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div className="col-12 col-sm-6 col-xl-3" key={card.label}>
              <section className="shell-summary-card">
                <div>
                  <span className="summary-label">{card.label}</span>
                  <strong>{card.value}</strong>
                  <small>{card.detail}</small>
                </div>
                <span className={`summary-icon ${card.state}`}><Icon size={20} /></span>
              </section>
            </div>
          );
        })}
      </div>
      <section className="shell-content-panel">
        <div className="shell-panel-heading">
          <div>
            <h2>Workspace Analytics</h2>
            <p>Simulator data from the existing analytics component, not production telemetry.</p>
          </div>
          <span className="badge text-bg-secondary">SIMULATED</span>
        </div>
        {children}
      </section>
    </div>
  );
}

export function ShellPlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <section className="shell-placeholder">
      <span className="placeholder-icon"><ShieldCheck size={25} /></span>
      <div>
        <span className="badge text-bg-secondary">UI PLACEHOLDER</span>
        <h2>{title}</h2>
        <p>{description}</p>
        <small>No API, agent, memory service, or production data was added in this migration.</small>
      </div>
    </section>
  );
}