import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { Bot, Users, Megaphone, Plus, Trash2, HelpCircle, Shield, Sparkles, MessageSquare, ListFilter, Calendar, Terminal, Settings, Globe, ShieldAlert, Image, Wand2, Menu, RefreshCw, FileCode, CheckCircle2 } from "lucide-react";
import { BotConfig } from "../types";

interface ConfigFormProps {
  config: BotConfig;
  onChange: (config: BotConfig) => void;
  liveStatus?: { hasBotToken: boolean; lastPublishedAt: string | null };
}

type SectionBadgeType = "live" | "draft" | "needs_admin" | "needs_target" | "simulator" | "needs_key";

function getSectionBadge(
  section: string,
  config: BotConfig,
  liveStatus: { hasBotToken: boolean; lastPublishedAt: string | null } | undefined
): SectionBadgeType | null {
  if (!liveStatus) return null;
  const { lastPublishedAt } = liveStatus;
  const isPublished = Boolean(lastPublishedAt);
  switch (section) {
    case "general": return isPublished ? "live" : "draft";
    case "bot": return isPublished ? "live" : "draft";
    case "features": return isPublished ? "live" : "draft";
    case "group": return "needs_admin";
    case "channel": {
      const hasTarget = Boolean(config.channelSettings?.targetChannelId || config.channelSettings?.targetChannelUsername);
      return hasTarget ? (isPublished ? "live" : "draft") : "needs_target";
    }
    case "media": return "simulator";
    case "advanced": {
      const hasAiKey = Boolean(config.externalApis?.geminiApiKey || config.externalApis?.openaiApiKey);
      return hasAiKey ? (isPublished ? "live" : "draft") : "needs_key";
    }
    default: return null;
  }
}

const BADGE_STYLES: Record<SectionBadgeType, string> = {
  live: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  draft: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  needs_admin: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  needs_target: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  simulator: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  needs_key: "bg-purple-500/10 text-purple-400 border-purple-500/20"
};

const BADGE_LABELS: Record<SectionBadgeType, string> = {
  live: "LIVE",
  draft: "DRAFT",
  needs_admin: "NEEDS ADMIN",
  needs_target: "NEEDS TARGET",
  simulator: "SIMULATOR",
  needs_key: "NEEDS KEY"
};

const BADGE_TITLES: Record<SectionBadgeType, string> = {
  live: "พร้อมใช้งานจริงบน Telegram",
  draft: "บันทึกเป็นแบบร่าง ยังไม่ได้เผยแพร่",
  needs_admin: "ส่วนนี้ต้องเพิ่มบอทเป็นแอดมินในกลุ่มก่อน",
  needs_target: "ส่วนนี้ต้องตั้ง target channel ก่อน",
  simulator: "ใช้ได้เฉพาะในโหมด Simulator",
  needs_key: "ส่วนนี้ต้องใส่ API key ก่อน"
};

export default function ConfigForm({ config, onChange, liveStatus }: ConfigFormProps) {
  const [activeSection, setActiveSection] = useState<'general' | 'bot' | 'features' | 'group' | 'channel' | 'media' | 'advanced'>('general');
  const [avatarPrompt, setAvatarPrompt] = useState("");
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: "" });

  const [tokenChecking, setTokenChecking] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: "" });

  useEffect(() => {
    const token = config.token.trim();
    if (!token) {
      setTokenStatus({ type: null, message: "" });
      return;
    }

    const timer = window.setTimeout(() => {
      void handleValidateToken();
    }, 800);

    return () => window.clearTimeout(timer);
  }, [config.token]);

  const handleValidateToken = async () => {
    if (!config.token.trim()) {
      setTokenStatus({ type: 'error', message: "กรุณากรอกรหัส Bot Token ก่อนทำการตรวจสอบครับ" });
      return;
    }
    setTokenChecking(true);
    setTokenStatus({ type: null, message: "" });
    try {
      const response = await fetch(`https://api.telegram.org/bot${config.token.trim()}/getMe`);
      const data = await response.json();
      if (data.ok) {
        setTokenStatus({
          type: 'success',
          message: `🟢 เชื่อมต่อสำเร็จ! บอทชื่อ: "${data.result.first_name}" (@${data.result.username})`
        });
        // Auto fill bot name if default or empty
        if (!config.name || config.name === "My Custom Bot" || config.name === "Jimmy Bot") {
          onChange({ ...config, name: data.result.first_name });
        }
      } else {
        setTokenStatus({
          type: 'error',
          message: `❌ เชื่อมต่อล้มเหลว: ${data.description || "รหัสโทเค็นไม่ถูกต้อง"}`
        });
      }
    } catch (err: any) {
      setTokenStatus({
        type: 'error',
        message: "❌ เกิดปัญหาในการเชื่อมต่อ (อาจมีปัญหากับเครือข่ายอินเทอร์เน็ตของคุณ หรือโทเค็นหมดอายุ)"
      });
    } finally {
      setTokenChecking(false);
    }
  };

  const [newMediaName, setNewMediaName] = useState("");
  const [newMediaUrl, setNewMediaUrl] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleMediaFileUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("กรุณาอัปโหลดไฟล์รูปภาพเท่านั้นครับ (PNG, JPG, GIF, WebP)");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const mediaList = config.mediaLibrary || [];
      const updatedMedia = [
        ...mediaList,
        {
          id: `media-${Date.now()}`,
          name: file.name.split('.').slice(0, -1).join('.') || "รูปภาพอัปโหลด",
          url: base64,
          type: file.type
        }
      ];
      onChange({ ...config, mediaLibrary: updatedMedia });
    };
    reader.readAsDataURL(file);
  };

  const handleAddMediaByUrl = (e: FormEvent) => {
    e.preventDefault();
    if (!newMediaUrl.trim()) return;
    const mediaList = config.mediaLibrary || [];
    const updatedMedia = [
      ...mediaList,
      {
        id: `media-${Date.now()}`,
        name: newMediaName.trim() || "รูปภาพจาก URL ภายนอก",
        url: newMediaUrl.trim(),
        type: "image/jpeg"
      }
    ];
    onChange({ ...config, mediaLibrary: updatedMedia });
    setNewMediaName("");
    setNewMediaUrl("");
  };

  const handleDeleteMedia = (id: string) => {
    const mediaList = config.mediaLibrary || [];
    const updatedMedia = mediaList.filter(m => m.id !== id);
    onChange({ ...config, mediaLibrary: updatedMedia });
  };

  const handleExportJson = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${(config.name || 'bot_config').trim().replace(/\s+/g, '_')}_backup.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setImportStatus({ type: 'success', message: "ส่งออกไฟล์สำรองข้อมูล JSON เรียบร้อยแล้ว!" });
      setTimeout(() => setImportStatus({ type: null, message: "" }), 4000);
    } catch (err) {
      console.error(err);
      setImportStatus({ type: 'error', message: "ไม่สามารถส่งออกข้อมูลได้" });
    }
  };

  const handleImportJson = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        
        // Simple structural validation
        if (typeof parsed !== 'object' || parsed === null) {
          throw new Error("โครงสร้างไฟล์ JSON ไม่ถูกต้อง");
        }
        if (!parsed.name || !parsed.botSettings || !parsed.groupSettings) {
          throw new Error("โครงสร้างการตั้งค่าไม่สมบูรณ์ (ขาดฟิลด์หลัก)");
        }

        // Apply imported config
        onChange(parsed);
        setImportStatus({ type: 'success', message: "นำเข้าการตั้งค่าสำเร็จ! อัปเดตข้อมูลบอทในหน้าต่างจำลองแล้ว" });
        setTimeout(() => setImportStatus({ type: null, message: "" }), 4000);
      } catch (err: any) {
        setImportStatus({ type: 'error', message: `นำเข้าไม่สำเร็จ: ${err.message || "รูปแบบไฟล์ไม่ถูกต้อง"}` });
        setTimeout(() => setImportStatus({ type: null, message: "" }), 5000);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const generateAvatar = async () => {
    if (!avatarPrompt.trim()) {
      setAvatarError("กรุณากรอกคำอธิบายรูปภาพก่อนครับ");
      return;
    }
    setAvatarLoading(true);
    setAvatarError("");
    try {
      const response = await fetch("/api/ai/generate-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: avatarPrompt,
          geminiApiKey: config.externalApis?.geminiApiKey,
          openaiApiKey: config.externalApis?.openaiApiKey
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการสร้างรูปภาพ");
      }
      onChange({ ...config, avatarUrl: data.imageUrl });
    } catch (err: any) {
      console.error(err);
      setAvatarError(err.message || "ล้มเหลวในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setAvatarLoading(false);
    }
  };

  // General Update Helper
  const updateGeneral = (fields: Partial<BotConfig>) => {
    onChange({ ...config, ...fields });
  };

  // Bot Settings Update Helper
  const updateBotSettings = (fields: Partial<BotConfig['botSettings']>) => {
    onChange({
      ...config,
      botSettings: { ...config.botSettings, ...fields }
    });
  };

  // Admin Permissions Update Helper
  const updateAdminPermissions = (fields: Partial<BotConfig['adminPermissions']>) => {
    onChange({
      ...config,
      adminPermissions: { ...config.adminPermissions, ...fields }
    });
  };

  // Privacy Settings Update Helper
  const updatePrivacySettings = (fields: Partial<BotConfig['privacySettings']>) => {
    onChange({
      ...config,
      privacySettings: { ...config.privacySettings, ...fields }
    });
  };

  // External APIs Update Helper
  const updateExternalApis = (fields: Partial<BotConfig['externalApis']>) => {
    onChange({
      ...config,
      externalApis: { ...config.externalApis, ...fields }
    });
  };

  // Group Settings Update Helper
  const updateGroupSettings = (fields: Partial<BotConfig['groupSettings']>) => {
    onChange({
      ...config,
      groupSettings: { ...config.groupSettings, ...fields }
    });
  };

  // Channel Settings Update Helper
  const updateChannelSettings = (fields: Partial<BotConfig['channelSettings']>) => {
    onChange({
      ...config,
      channelSettings: { ...config.channelSettings, ...fields }
    });
  };

  // Keyboards add/remove
  const addKeyboard = () => {
    const updated = [...config.botSettings.keyboards, { text: "เมนูใหม่", response: "ข้อความตอบกลับของเมนู" }];
    updateBotSettings({ keyboards: updated });
  };

  const removeKeyboard = (index: number) => {
    const updated = config.botSettings.keyboards.filter((_, idx) => idx !== index);
    updateBotSettings({ keyboards: updated });
  };

  const updateKeyboard = (index: number, fields: { text?: string; response?: string }) => {
    const updated = config.botSettings.keyboards.map((kb, idx) => {
      if (idx === index) {
        return { ...kb, ...fields };
      }
      return kb;
    });
    updateBotSettings({ keyboards: updated });
  };

  // Auto replies add/remove
  const addAutoReply = () => {
    const updated = [...config.botSettings.autoReplies, { keyword: "ราคา", reply: "ราคาเริ่มต้นเพียง 500 บาทครับ!" }];
    updateBotSettings({ autoReplies: updated });
  };

  const removeAutoReply = (index: number) => {
    const updated = config.botSettings.autoReplies.filter((_, idx) => idx !== index);
    updateBotSettings({ autoReplies: updated });
  };

  const updateAutoReply = (index: number, fields: { keyword?: string; reply?: string; imageUrl?: string }) => {
    const updated = config.botSettings.autoReplies.map((reply, idx) => {
      if (idx === index) {
        return { ...reply, ...fields };
      }
      return reply;
    });
    updateBotSettings({ autoReplies: updated });
  };

  // Custom commands add/remove
  const addCustomCommand = () => {
    const updated = [...config.groupSettings.customCommands, { command: "rules", reply: "กฎของกลุ่มแชต: 1. ห้ามแชร์ลิงก์ลามกอนาจาร 2. ห้ามสแปมข้อความ" }];
    updateGroupSettings({ customCommands: updated });
  };

  const removeCustomCommand = (index: number) => {
    const updated = config.groupSettings.customCommands.filter((_, idx) => idx !== index);
    updateGroupSettings({ customCommands: updated });
  };

  const updateCustomCommand = (index: number, fields: { command?: string; reply?: string }) => {
    const updated = config.groupSettings.customCommands.map((cmd, idx) => {
      if (idx === index) {
        return { ...cmd, ...fields };
      }
      return cmd;
    });
    updateGroupSettings({ customCommands: updated });
  };

  // Scheduled posts add/remove
  const addScheduledPost = () => {
    const updated = [
      ...config.channelSettings.scheduledPosts,
      { id: `post-${Date.now()}`, time: "09:00", content: "📢 ประกาศข่าวสารใหม่สำหรับสมาชิกแชนแนลวันนี้!" }
    ];
    updateChannelSettings({ scheduledPosts: updated });
  };

  const removeScheduledPost = (id: string) => {
    const updated = config.channelSettings.scheduledPosts.filter(p => p.id !== id);
    updateChannelSettings({ scheduledPosts: updated });
  };

  const updateScheduledPost = (id: string, fields: { time?: string; content?: string; imageUrl?: string }) => {
    const updated = config.channelSettings.scheduledPosts.map(p => {
      if (p.id === id) {
        return { ...p, ...fields };
      }
      return p;
    });
    updateChannelSettings({ scheduledPosts: updated });
  };

  return (
    <div className="bg-[#16161A] border border-white/10 rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row h-full">
      {/* Sub tabs selector */}
      <div className="bg-[#111114] border-r border-white/5 p-4 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-x-visible md:w-[180px] shrink-0">
        <button
          type="button"
          onClick={() => setActiveSection('general')}
          className={`px-4 py-2.5 rounded-xl text-left text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${activeSection === 'general' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-slate-200 hover:bg-white/5'}`}
        >
          <Bot className="w-4 h-4" />
          <span className="flex-1">ข้อมูลพื้นฐาน</span>
          {(() => { const b = getSectionBadge('general', config, liveStatus); return b ? <span title={BADGE_TITLES[b]} className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${BADGE_STYLES[b]}`}>{BADGE_LABELS[b]}</span> : null; })()}
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('bot')}
          className={`px-4 py-2.5 rounded-xl text-left text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${activeSection === 'bot' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-slate-200 hover:bg-white/5'}`}
        >
          <MessageSquare className="w-4 h-4" />
          <span className="flex-1">แชตบอทส่วนตัว</span>
          {(() => { const b = getSectionBadge('bot', config, liveStatus); return b ? <span title={BADGE_TITLES[b]} className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${BADGE_STYLES[b]}`}>{BADGE_LABELS[b]}</span> : null; })()}
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('features')}
          className={`px-4 py-2.5 rounded-xl text-left text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${activeSection === 'features' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-slate-200 hover:bg-white/5'}`}
        >
          <Wand2 className="w-4 h-4 text-indigo-400 animate-pulse" />
          <span className="flex-1">4 ฟีเจอร์สุดเด็ด</span>
          {(() => { const b = getSectionBadge('features', config, liveStatus); return b ? <span title={BADGE_TITLES[b]} className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${BADGE_STYLES[b]}`}>{BADGE_LABELS[b]}</span> : null; })()}
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('group')}
          className={`px-4 py-2.5 rounded-xl text-left text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${activeSection === 'group' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-slate-200 hover:bg-white/5'}`}
        >
          <Users className="w-4 h-4" />
          <span className="flex-1">ระบบผู้ดูแลกลุ่ม</span>
          {(() => { const b = getSectionBadge('group', config, liveStatus); return b ? <span title={BADGE_TITLES[b]} className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${BADGE_STYLES[b]}`}>{BADGE_LABELS[b]}</span> : null; })()}
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('channel')}
          className={`px-4 py-2.5 rounded-xl text-left text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${activeSection === 'channel' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-slate-200 hover:bg-white/5'}`}
        >
          <Megaphone className="w-4 h-4" />
          <span className="flex-1">แชนแนลข่าวสาร</span>
          {(() => { const b = getSectionBadge('channel', config, liveStatus); return b ? <span title={BADGE_TITLES[b]} className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${BADGE_STYLES[b]}`}>{BADGE_LABELS[b]}</span> : null; })()}
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('media')}
          className={`px-4 py-2.5 rounded-xl text-left text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${activeSection === 'media' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-slate-200 hover:bg-white/5'}`}
        >
          <Image className="w-4 h-4" />
          <span className="flex-1">คลังภาพและมีเดีย</span>
          {(() => { const b = getSectionBadge('media', config, liveStatus); return b ? <span title={BADGE_TITLES[b]} className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${BADGE_STYLES[b]}`}>{BADGE_LABELS[b]}</span> : null; })()}
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('advanced')}
          className={`px-4 py-2.5 rounded-xl text-left text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${activeSection === 'advanced' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-slate-200 hover:bg-white/5'}`}
        >
          <Settings className="w-4 h-4" />
          <span className="flex-1">ตั้งค่าขั้นสูง & API</span>
          {(() => { const b = getSectionBadge('advanced', config, liveStatus); return b ? <span title={BADGE_TITLES[b]} className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${BADGE_STYLES[b]}`}>{BADGE_LABELS[b]}</span> : null; })()}
        </button>
      </div>

      {/* Inputs panel */}
      <div className="flex-1 p-6 overflow-y-auto max-h-[600px] custom-scrollbar">
        {/* Section 1: General Settings */}
        {activeSection === 'general' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-bold text-slate-200 mb-1">ข้อมูลพื้นฐานของบอท</h3>
              <p className="text-[11px] text-gray-400">ตั้งชื่อและระบุรหัส Token เพื่อสร้างบอทของคุณ</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5 flex items-center gap-1">
                  ชื่อของบอท (Bot Name)
                  <HelpCircle className="w-3 h-3 text-gray-500" title="ชื่อที่แสดงของบอทของคุณในแอพ Telegram" />
                </label>
                <input
                  type="text"
                  className="w-full bg-black/40 border border-white/5 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none transition-all animate-none"
                  placeholder="เช่น บอทร้านค้าบริการอัจฉริยะ"
                  value={config.name}
                  onChange={(e) => updateGeneral({ name: e.target.value })}
                />
              </div>

              {/* AI Avatar Generator Section */}
              <div className="bg-[#111114] border border-white/5 rounded-2xl p-4 space-y-4">
                <label className="block text-xs font-bold text-gray-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                  เครื่องมือ AI สร้างรูปโปรไฟล์บอท (Imagen AI Avatar Generator)
                </label>
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-black/50 border border-white/10 flex items-center justify-center shrink-0">
                    {config.avatarUrl ? (
                      <img
                        src={config.avatarUrl}
                        alt="Bot Avatar"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Bot className="w-10 h-10 text-gray-600" />
                    )}
                    {avatarLoading && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                        <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-2 w-full">
                    <input
                      type="text"
                      className="w-full bg-black/40 border border-white/5 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                      placeholder="อธิบายธีมรูปภาพที่ต้องการ (เช่น บอทแมวนักบริการ สไตล์ 3D เวกเตอร์ น่ารักๆ)"
                      value={avatarPrompt}
                      onChange={(e) => setAvatarPrompt(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={avatarLoading}
                        onClick={generateAvatar}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {avatarLoading ? "กำลังสร้างรูปภาพ..." : "สร้างด้วย AI"}
                      </button>
                      {config.name && (
                        <button
                          type="button"
                          disabled={avatarLoading}
                          onClick={() => setAvatarPrompt(`โลโก้บอทอัจฉริยะล้ำยุค สไตล์เวกเตอร์คลาสสิค ธีม: ${config.name}`)}
                          className="bg-white/5 hover:bg-white/10 border border-white/5 text-gray-300 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                        >
                          ใช้ชื่อบอท
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {avatarError && <p className="text-[10px] text-rose-400">⚠️ {avatarError}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5 flex items-center justify-between">
                  <span>รหัส Bot Token (จาก @BotFather)</span>
                  {tokenStatus.type && (
                    <span className={`text-[10px] font-bold ${tokenStatus.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {tokenStatus.type === 'success' ? "เชื่อมต่อถูกต้อง" : "เกิดข้อผิดพลาด"}
                    </span>
                  )}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 bg-black/40 border border-white/5 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-indigo-400 font-mono focus:outline-none transition-all"
                    placeholder="เช่น 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                    value={config.token}
                    onChange={(e) => {
                      updateGeneral({ token: e.target.value });
                      if (tokenStatus.type) setTokenStatus({ type: null, message: "" });
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleValidateToken}
                    disabled={tokenChecking || !config.token.trim()}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    {tokenChecking ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>กำลังเช็ค...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>ตรวจสอบ Token</span>
                      </>
                    )}
                  </button>
                </div>
                {tokenStatus.message && (
                  <p className={`text-[10px] mt-1.5 font-semibold px-2.5 py-1.5 rounded-lg ${tokenStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                    {tokenStatus.message}
                  </p>
                )}
                <p className="text-[10px] text-gray-500 mt-1">ดูขั้นตอนการรับรหัสโทเค็นได้ที่แท็บ "คู่มือแนะนำ" ทางขวาได้ตลอดเวลา</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5">
                  เลือกพื้นที่การทำงานของบอท (Target Platform)
                </label>
                <select
                  className="w-full bg-black/40 border border-white/5 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none transition-all"
                  value={config.platform}
                  onChange={(e) => updateGeneral({ platform: e.target.value as any })}
                >
                  <option value="bot" className="bg-[#16161A] text-slate-200">บอทแชตเดี่ยว (Direct Chat เท่านั้น)</option>
                  <option value="group" className="bg-[#16161A] text-slate-200">บอทสำหรับกลุ่มแชต (Group Moderation เท่านั้น)</option>
                  <option value="channel" className="bg-[#16161A] text-slate-200">บอทส่งข่าวแชนแนล (Channel Broadcaster เท่านั้น)</option>
                  <option value="all" className="bg-[#16161A] text-slate-200">บอทเอนกประสงค์ (รองรับทั้งหมด)</option>
                </select>
              </div>

              {/* Export/Import JSON Config Card */}
              <div className="border border-white/10 bg-[#111114] rounded-2xl p-4 space-y-4 shadow-md">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 border-b border-white/5 pb-1.5">
                  <FileCode className="w-4 h-4 text-indigo-400" />
                  ระบบสำรองและโคลนข้อมูล (Backup & Restore Config JSON)
                </div>

                <p className="text-[11px] text-gray-400 leading-relaxed">
                  คุณสามารถดาวน์โหลดไฟล์ตั้งค่าบอทปัจจุบันเก็บเป็นไฟล์สำรองข้อมูล (Backup) หรือแชร์ไฟล์ JSON นี้ให้กับผู้อื่นเพื่อเปิดใช้บอทที่มีสไตล์และการตั้งค่าเดียวกันได้อย่างสะดวกรวดเร็ว
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Export Button */}
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="w-full bg-[#1A1A22] hover:bg-slate-800 text-slate-200 border border-white/10 rounded-xl py-3 px-4 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow"
                  >
                    <Terminal className="w-4 h-4 text-indigo-400" />
                    ดาวน์โหลดการตั้งค่า (Export JSON)
                  </button>

                  {/* Import Button */}
                  <div className="relative">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportJson}
                      id="import-config-file-general"
                      className="hidden"
                    />
                    <label
                      htmlFor="import-config-file-general"
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 px-4 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20"
                    >
                      <Plus className="w-4 h-4 text-white" />
                      นำเข้าไฟล์ตั้งค่า (Import JSON)
                    </label>
                  </div>
                </div>

                {importStatus.type && (
                  <div className={`p-3 rounded-xl text-center text-xs font-semibold flex items-center justify-center gap-1.5 ${
                    importStatus.type === 'success' 
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                      : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                  }`}>
                    {importStatus.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{importStatus.message}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Bot Settings (Direct Chat) */}
        {activeSection === 'bot' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-200 mb-1">ตั้งค่าบอทแชตส่วนตัว</h3>
              <p className="text-[11px] text-gray-400">กำหนดปุ่มด่วน คำตอบรับอัตโนมัติ และระบบ AI ช่วยตอบสำหรับห้องแชตส่วนตัว</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5">
                  ข้อความเริ่มต้นต้อนรับ (Welcome Message)
                </label>
                <textarea
                  className="w-full h-20 bg-black/40 border border-white/5 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none transition-all resize-none"
                  placeholder="เช่น สวัสดีครับ ยินดีต้อนรับสู่ร้านค้าอัจฉริยะของเรา!"
                  value={config.botSettings.welcomeMessage}
                  onChange={(e) => updateBotSettings({ welcomeMessage: e.target.value })}
                />
              </div>

              {/* AI Assistant Sub-Card */}
              <div className="bg-[#111114] border border-white/5 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-xs">
                    <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                    เปิดระบบผู้ช่วยตอบแชตอัตโนมัติด้วย AI
                  </div>
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                    checked={config.botSettings.enableAiAssistant}
                    onChange={(e) => updateBotSettings({ enableAiAssistant: e.target.checked })}
                  />
                </div>
                {config.botSettings.enableAiAssistant && (
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-indigo-300">
                      คำสั่งกำหนดขอบเขตและบุคลิกของ AI (AI Prompt)
                    </label>
                    <textarea
                      className="w-full h-24 bg-black/40 border border-white/5 focus:border-indigo-500 rounded-xl px-3 py-2 text-[11px] text-slate-200 focus:outline-none transition-all resize-none"
                      placeholder="เช่น คุณคือบอทแอดมินชื่อ 'มั่งคั่ง' คอยให้ข้อมูลราคาที่ถูกต้องและแนะนำแพ็กเกจแบบเป็นกันเอง..."
                      value={config.botSettings.aiPrompt}
                      onChange={(e) => updateBotSettings({ aiPrompt: e.target.value })}
                    />
                  </div>
                )}
              </div>

              {/* Dynamic Keyboard Setup */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1">
                    <ListFilter className="w-4 h-4 text-gray-500" />
                    ปุ่มคีย์บอร์ดลัดด่วน (Menu Keyboard Layout)
                  </label>
                  <button
                    type="button"
                    onClick={addKeyboard}
                    className="bg-indigo-500/10 hover:bg-indigo-500 hover:text-white border border-indigo-500/20 text-indigo-400 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    เพิ่มปุ่มด่วน
                  </button>
                </div>
                
                <div className="space-y-2.5">
                  {config.botSettings.keyboards.map((kb, idx) => (
                    <div key={idx} className="flex gap-2 bg-[#111114] p-2.5 rounded-xl border border-white/5 items-start animate-none">
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-semibold focus:outline-none focus:border-indigo-500"
                          placeholder="ชื่อบนปุ่ม (เช่น สอบถามโปรโมชั่น)"
                          value={kb.text}
                          onChange={(e) => updateKeyboard(idx, { text: e.target.value })}
                        />
                        <input
                          type="text"
                          className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-gray-400 focus:outline-none focus:border-indigo-500"
                          placeholder="คำตอบรับจากบอทเมื่อคลิกปุ่มนี้"
                          value={kb.response}
                          onChange={(e) => updateKeyboard(idx, { response: e.target.value })}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeKeyboard(idx)}
                        className="text-rose-400 hover:text-rose-300 p-1.5 rounded hover:bg-rose-500/10 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Keyword Auto Replies Setup */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1">
                    <MessageSquare className="w-4 h-4 text-gray-500" />
                    ระบบคำสำคัญช่วยตอบอัตโนมัติ (Keyword Replies)
                  </label>
                  <button
                    type="button"
                    onClick={addAutoReply}
                    className="bg-indigo-500/10 hover:bg-indigo-500 hover:text-white border border-indigo-500/20 text-indigo-400 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    เพิ่มคำสำคัญ
                  </button>
                </div>

                <div className="space-y-2.5">
                  {config.botSettings.autoReplies.map((reply, idx) => (
                    <div key={idx} className="flex gap-2 bg-[#111114] p-2.5 rounded-xl border border-white/5 items-start animate-none">
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                          placeholder="คำสำคัญตรวจหา (เช่น ราคา, ติดต่อ)"
                          value={reply.keyword}
                          onChange={(e) => updateAutoReply(idx, { keyword: e.target.value })}
                        />
                        <textarea
                          className="w-full h-14 bg-black/40 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-gray-400 focus:outline-none focus:border-indigo-500 resize-none"
                          placeholder="ข้อความที่บอทตอบกลับทันทีเมื่อเจอคำสำคัญ"
                          value={reply.reply}
                          onChange={(e) => updateAutoReply(idx, { reply: e.target.value })}
                        />

                        {/* Image Selector for Auto Reply */}
                        <div className="space-y-1.5 pt-1.5 border-t border-white/5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400">แนบรูปภาพตอบกลับ:</span>
                            <select
                              className="bg-black/40 border border-white/5 rounded px-2 py-1 text-[10px] text-slate-300 focus:outline-none"
                              value={reply.imageUrl || ""}
                              onChange={(e) => updateAutoReply(idx, { imageUrl: e.target.value || undefined })}
                            >
                              <option value="">-- ไม่แนบรูปภาพ --</option>
                              {(config.mediaLibrary || []).map((media) => (
                                <option key={media.id} value={media.url}>
                                  {media.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          {reply.imageUrl && (
                            <div className="relative w-28 h-16 rounded-lg overflow-hidden border border-white/10 group">
                              <img
                                src={reply.imageUrl}
                                alt="Attached preview"
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                              <button
                                type="button"
                                onClick={() => updateAutoReply(idx, { imageUrl: undefined })}
                                className="absolute inset-0 bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-rose-400 font-bold cursor-pointer"
                              >
                                ลบรูปแนบ
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAutoReply(idx)}
                        className="text-rose-400 hover:text-rose-300 p-1.5 rounded hover:bg-rose-500/10 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 2.5: Telegram 4 Core Features */}
        {activeSection === 'features' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-200 mb-1">🎛️ ตั้งค่า Telegram Native Features (source of truth)</h3>
              <p className="text-[11px] text-gray-400">แยกชัดเจน: Slash Commands (setMyCommands), Reply Keyboard, Inline Buttons และ Bot Menu Button (setChatMenuButton)</p>
            </div>

            {/* 1. APIBot commands */}
            <div className="bg-[#111114] border border-white/5 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-500/10 p-1 rounded-lg text-indigo-400 font-mono text-xs font-bold w-6 h-6 flex items-center justify-center">/</div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">1. Slash Commands (setMyCommands)</h4>
                    <p className="text-[10px] text-gray-500">พิมพ์คำสั่งลัดขึ้นรูป "/" ในแอปพลิเคชัน Telegram</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const updated = [...(config.botCommands || []), { command: "new_command", description: "รายละเอียดคำสั่ง", reply: "ข้อความตอบกลับของคำสั่งนี้" }];
                    updateGeneral({ botCommands: updated });
                  }}
                  className="bg-indigo-500/10 hover:bg-indigo-500 hover:text-white border border-indigo-500/20 text-indigo-400 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  เพิ่มคำสั่งลัด
                </button>
              </div>

              <div className="space-y-3">
                {(config.botCommands || []).map((cmd, idx) => (
                  <div key={idx} className="bg-black/20 p-3 rounded-xl border border-white/5 space-y-2 relative animate-none">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = (config.botCommands || []).filter((_, i) => i !== idx);
                        updateGeneral({ botCommands: updated });
                      }}
                      className="absolute right-3 top-3 text-rose-400 hover:text-rose-300 p-1.5 rounded hover:bg-rose-500/10 cursor-pointer transition-colors"
                      title="ลบคำสั่ง"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pr-8">
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-xs text-gray-500 font-mono">/</span>
                        <input
                          type="text"
                          className="w-full bg-black/40 border border-white/5 rounded-lg pl-5 pr-2 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                          placeholder="เช่น start"
                          value={cmd.command}
                          onChange={(e) => {
                            const updated = [...(config.botCommands || [])];
                            updated[idx] = { ...cmd, command: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') };
                            updateGeneral({ botCommands: updated });
                          }}
                        />
                      </div>
                      <input
                        type="text"
                        className="w-full bg-black/40 border border-white/5 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                        placeholder="คำอธิบาย (เช่น ตรวจสอบโปรโมชั่น)"
                        value={cmd.description}
                        onChange={(e) => {
                          const updated = [...(config.botCommands || [])];
                          updated[idx] = { ...cmd, description: e.target.value };
                          updateGeneral({ botCommands: updated });
                        }}
                      />
                    </div>
                    <textarea
                      className="w-full h-12 bg-black/40 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-gray-400 focus:outline-none focus:border-indigo-500 resize-none"
                      placeholder="ข้อความที่บอทจะตอบกลับทันทีเมื่อเรียกใช้คำสั่งนี้..."
                      value={cmd.reply}
                      onChange={(e) => {
                        const updated = [...(config.botCommands || [])];
                        updated[idx] = { ...cmd, reply: e.target.value };
                        updateGeneral({ botCommands: updated });
                      }}
                    />
                  </div>
                ))}
                {(config.botCommands || []).length === 0 && (
                  <p className="text-[10px] text-gray-500 text-center py-2">ยังไม่มีการตั้งค่าคำสั่งลัด พิมพ์เพิ่มปุ่มลัดด้านบนได้เลย</p>
                )}
              </div>
            </div>

            {/* 2. Bot buttons (Inline and Reply Keyboard) */}
            <div className="bg-[#111114] border border-white/5 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-500/10 p-1.5 rounded-lg text-indigo-400">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">2. Bot Buttons: ปุ่มล่างแชต vs ปุ่มใต้ข้อความ</h4>
                    <p className="text-[10px] text-gray-500">ปุ่มล่างแชต (Reply Keyboard) ใช้กับปุ่มที่กดแล้วบอทตอบข้อความ • ปุ่มใต้ข้อความ (Inline) ใช้เฉพาะ URL/WebApp</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Inline Keyboard Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
                      🔗 ปุ่มใต้ข้อความ (Inline URL/WebApp Buttons)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const current = config.botButtons || { inlineButtons: [], replyKeyboard: [] };
                        const updated = {
                          ...current,
                          inlineButtons: [...(current.inlineButtons || []), { text: "ปุ่มเว็บลิงก์ใหม่", url: "https://ai.studio/build" }]
                        };
                        updateGeneral({ botButtons: updated });
                      }}
                      className="bg-indigo-500/10 hover:bg-indigo-500 hover:text-white border border-indigo-500/20 text-indigo-400 text-[10px] font-bold px-2 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      เพิ่มปุ่ม Inline
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {(config.botButtons?.inlineButtons || []).map((btn, idx) => {
                      const inlineMode = btn.webAppUrl ? "web_app" : btn.url ? "url" : "migrated_reply";
                      return (
                        <div key={idx} className="bg-black/20 p-3 rounded-xl border border-white/5 flex gap-2 items-start relative animate-none">
                          <div className="flex-1 space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                className="bg-black/40 border border-white/5 rounded-lg px-2 py-1 text-xs font-semibold text-slate-200 focus:outline-none"
                                placeholder="ชื่อบนปุ่ม (เช่น ไปหน้าหลัก)"
                                value={btn.text}
                                onChange={(e) => {
                                  const current = config.botButtons || { inlineButtons: [], replyKeyboard: [] };
                                  const updatedInline = [...(current.inlineButtons || [])];
                                  updatedInline[idx] = { ...btn, text: e.target.value };
                                  updateGeneral({ botButtons: { ...current, inlineButtons: updatedInline } });
                                }}
                              />
                              <select
                                className="bg-black/40 border border-white/5 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none"
                                value={inlineMode}
                                onChange={(e) => {
                                  const current = config.botButtons || { inlineButtons: [], replyKeyboard: [] };
                                  const updatedInline = [...(current.inlineButtons || [])];
                                  if (e.target.value === "url") {
                                    updatedInline[idx] = { text: btn.text, url: btn.url || "https://ai.studio/build" };
                                  } else if (e.target.value === "web_app") {
                                    updatedInline[idx] = { text: btn.text, webAppUrl: btn.webAppUrl || btn.url || "https://ai.studio/build" };
                                  } else {
                                    updatedInline[idx] = { text: btn.text, reply: btn.reply || "คำตอบรับอัตโนมัติจากปุ่มนี้" };
                                  }
                                  updateGeneral({ botButtons: { ...current, inlineButtons: updatedInline } });
                                }}
                              >
                                <option value="url">เปิดเว็บลิงก์ (URL)</option>
                                <option value="web_app">เปิด Mini App (WebApp)</option>
                                <option value="migrated_reply">ย้ายเป็นปุ่มล่างแชต (Reply Keyboard)</option>
                              </select>
                            </div>

                            {inlineMode === "url" ? (
                              <input
                                type="text"
                                className="w-full bg-black/40 border border-white/5 rounded-lg px-2 py-1 text-xs text-indigo-400 font-mono focus:outline-none"
                                placeholder="ลิงก์ URL ปลายทาง (เช่น https://example.com)"
                                value={btn.url || ""}
                                onChange={(e) => {
                                  const current = config.botButtons || { inlineButtons: [], replyKeyboard: [] };
                                  const updatedInline = [...(current.inlineButtons || [])];
                                  updatedInline[idx] = { ...btn, url: e.target.value, webAppUrl: undefined };
                                  updateGeneral({ botButtons: { ...current, inlineButtons: updatedInline } });
                                }}
                              />
                            ) : inlineMode === "web_app" ? (
                              <input
                                type="text"
                                className="w-full bg-black/40 border border-white/5 rounded-lg px-2 py-1 text-xs text-indigo-400 font-mono focus:outline-none"
                                placeholder="WebApp URL (เช่น https://example.com/app)"
                                value={btn.webAppUrl || ""}
                                onChange={(e) => {
                                  const current = config.botButtons || { inlineButtons: [], replyKeyboard: [] };
                                  const updatedInline = [...(current.inlineButtons || [])];
                                  updatedInline[idx] = { ...btn, webAppUrl: e.target.value, url: undefined };
                                  updateGeneral({ botButtons: { ...current, inlineButtons: updatedInline } });
                                }}
                              />
                            ) : (
                              <div className="space-y-2">
                                <p className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1.5">
                                  ปุ่มนี้ไม่มีลิงก์ ระบบจะย้ายไปเป็นปุ่มล่างแชตเมื่อเผยแพร่จริง เพื่อไม่ให้ผู้ใช้สับสน
                                </p>
                                <input
                                  type="text"
                                  className="w-full bg-black/40 border border-white/5 rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none"
                                  placeholder="ข้อความที่บอทตอบกลับเมื่อกดปุ่มล่างแชต"
                                  value={btn.reply || ""}
                                  onChange={(e) => {
                                    const current = config.botButtons || { inlineButtons: [], replyKeyboard: [] };
                                    const updatedInline = [...(current.inlineButtons || [])];
                                    updatedInline[idx] = { ...btn, reply: e.target.value, url: undefined, webAppUrl: undefined };
                                    updateGeneral({ botButtons: { ...current, inlineButtons: updatedInline } });
                                  }}
                                />
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const current = config.botButtons || { inlineButtons: [], replyKeyboard: [] };
                              const updatedInline = (current.inlineButtons || []).filter((_, i) => i !== idx);
                              updateGeneral({ botButtons: { ...current, inlineButtons: updatedInline } });
                            }}
                            className="text-rose-400 hover:text-rose-300 p-1.5 rounded hover:bg-rose-500/10 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                    {(config.botButtons?.inlineButtons || []).length === 0 && (
                      <p className="text-[10px] text-gray-500 text-center py-1">ยังไม่มีปุ่มแชตแบบฝังใต้ข้อความ</p>
                    )}
                  </div>
                </div>

                {/* Reply Keyboard Section */}
                <div className="space-y-3 pt-3 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
                      ⌨️ ปุ่มล่างแชต (Reply Keyboard Buttons)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const current = config.botButtons || { inlineButtons: [], replyKeyboard: [] };
                        const updated = {
                          ...current,
                          replyKeyboard: [...(current.replyKeyboard || []), { text: "ปุ่มแผงด่วนใหม่", reply: "ข้อความที่จะถูกพิมพ์ตอบเมื่อแตะปุ่มนี้" }]
                        };
                        updateGeneral({ botButtons: updated });
                      }}
                      className="bg-indigo-500/10 hover:bg-indigo-500 hover:text-white border border-indigo-500/20 text-indigo-400 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      เพิ่มปุ่มคีย์บอร์ด
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {(config.botButtons?.replyKeyboard || []).map((btn, idx) => (
                      <div key={idx} className="bg-black/20 p-3 rounded-xl border border-white/5 flex gap-2 items-start relative animate-none">
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            className="bg-black/40 border border-white/5 rounded-lg px-2 py-1 text-xs font-semibold text-slate-200 focus:outline-none w-full"
                            placeholder="ชื่อบนปุ่ม (เช่น 📦 เมนูสินค้า)"
                            value={btn.text}
                            onChange={(e) => {
                              const current = config.botButtons || { inlineButtons: [], replyKeyboard: [] };
                              const updatedReply = [...(current.replyKeyboard || [])];
                              updatedReply[idx] = { ...btn, text: e.target.value };
                              updateGeneral({ botButtons: { ...current, replyKeyboard: updatedReply } });
                            }}
                          />
                          <input
                            type="text"
                            className="w-full bg-black/40 border border-white/5 rounded-lg px-2 py-1 text-xs text-gray-400 focus:outline-none"
                            placeholder="ข้อความโต้ตอบที่ผู้ใช้ส่งกลับมา"
                            value={btn.reply}
                            onChange={(e) => {
                              const current = config.botButtons || { inlineButtons: [], replyKeyboard: [] };
                              const updatedReply = [...(current.replyKeyboard || [])];
                              updatedReply[idx] = { ...btn, reply: e.target.value };
                              updateGeneral({ botButtons: { ...current, replyKeyboard: updatedReply } });
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const current = config.botButtons || { inlineButtons: [], replyKeyboard: [] };
                            const updatedReply = (current.replyKeyboard || []).filter((_, i) => i !== idx);
                            updateGeneral({ botButtons: { ...current, replyKeyboard: updatedReply } });
                          }}
                          className="text-rose-400 hover:text-rose-300 p-1.5 rounded hover:bg-rose-500/10 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {(config.botButtons?.replyKeyboard || []).length === 0 && (
                      <p className="text-[10px] text-gray-500 text-center py-1">ยังไม่มีปุ่มเมนูแผงคีย์บอร์ดด้านล่าง</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Bot menu button */}
            <div className="bg-[#111114] border border-white/5 rounded-2xl p-4 space-y-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <div className="bg-indigo-500/10 p-1.5 rounded-lg text-indigo-400">
                  <Menu className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">3. Bot Menu Button (setChatMenuButton)</h4>
                  <p className="text-[10px] text-gray-500">กำหนดปุ่มเมนูด้านซ้ายของช่องป้อนข้อความแชตอย่างอิสระ</p>
                </div>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 mb-1">ประเภทของปุ่มเมนู (Menu Button Type)</label>
                  <select
                    className="w-full bg-black/40 border border-white/5 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                    value={config.botMenuButton?.type || "commands"}
                    onChange={(e) => {
                      const updated = {
                        type: e.target.value as any,
                        text: config.botMenuButton?.text || "🌐 เปิดเว็บไซต์บอท",
                        url: config.botMenuButton?.url || "https://ai.studio/build"
                      };
                      updateGeneral({ botMenuButton: updated });
                    }}
                  >
                    <option value="commands">แสดงเมนูรายการคำสั่ง (Commands Menu)</option>
                    <option value="web_app">เปิดเว็บแอปพลิเคชัน (Telegram Web App/Website URL)</option>
                    <option value="default">ค่าเริ่มต้นทั่วไป (Default Client Setting)</option>
                  </select>
                </div>

                {config.botMenuButton?.type === "web_app" && (
                  <div className="space-y-2.5 p-3 bg-black/20 rounded-xl border border-white/5 animate-none">
                    <div>
                      <label className="block text-[10px] font-bold text-indigo-300 mb-1">ข้อความบนปุ่มเมนู (Button Label)</label>
                      <input
                        type="text"
                        className="w-full bg-black/40 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        placeholder="เช่น 🌐 เปิดเว็บบิลด์แอป"
                        value={config.botMenuButton?.text || ""}
                        onChange={(e) => {
                          const updated = { ...(config.botMenuButton || { type: "web_app", text: "", url: "" }), text: e.target.value };
                          updateGeneral({ botMenuButton: updated });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-indigo-300 mb-1">ที่อยู่เว็บไซต์ / Web App URL</label>
                      <input
                        type="text"
                        className="w-full bg-black/40 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-indigo-400 font-mono focus:outline-none focus:border-indigo-500"
                        placeholder="เช่น https://example.com/shop"
                        value={config.botMenuButton?.url || ""}
                        onChange={(e) => {
                          const updated = { ...(config.botMenuButton || { type: "web_app", text: "", url: "" }), url: e.target.value };
                          updateGeneral({ botMenuButton: updated });
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Inline queries */}
            <div className="bg-[#111114] border border-white/5 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-500/10 p-1.5 rounded-lg text-indigo-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">4. Inline Queries (ฟังก์ชันค้นหาด่วนแบบ Inline)</h4>
                    <p className="text-[10px] text-gray-500">พิมพ์ @ชื่อบอท ตามด้วยข้อความในห้องแชตใดๆ เพื่อค้นหาด่วนแล้วส่งผลลัพธ์ทันที</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  checked={config.inlineQuerySettings?.enableInline ?? true}
                  onChange={(e) => {
                    const current = config.inlineQuerySettings || { enableInline: true, placeholder: "", results: [] };
                    updateGeneral({ inlineQuerySettings: { ...current, enableInline: e.target.checked } });
                  }}
                />
              </div>

              {config.inlineQuerySettings?.enableInline && (
                <div className="space-y-4 animate-none">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 mb-1">คำอธิบายแถบค้นหา (Search Placeholder)</label>
                    <input
                      type="text"
                      className="w-full bg-black/40 border border-white/5 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                      placeholder="เช่น พิมพ์คำเพื่อค้นหาคูปองหรือพิกัด..."
                      value={config.inlineQuerySettings?.placeholder || ""}
                      onChange={(e) => {
                        const current = config.inlineQuerySettings || { enableInline: true, placeholder: "", results: [] };
                        updateGeneral({ inlineQuerySettings: { ...current, placeholder: e.target.value } });
                      }}
                    />
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-indigo-300">รายการผลการค้นหาแบบสืบค้นด่วน (Search Results)</span>
                      <button
                        type="button"
                        onClick={() => {
                          const current = config.inlineQuerySettings || { enableInline: true, placeholder: "", results: [] };
                          const updatedResults = [...(current.results || []), { id: `inline-${Date.now()}`, title: "หัวข้อผลลัพธ์ด่วน", description: "รายละเอียดสั้นๆ ของรายการนี้", content: "ข้อความหลักที่จะถูกส่งแชตเมื่อเลือกข้อนี้" }];
                          updateGeneral({ inlineQuerySettings: { ...current, results: updatedResults } });
                        }}
                        className="bg-indigo-500/10 hover:bg-indigo-500 hover:text-white border border-indigo-500/20 text-indigo-400 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        เพิ่มผลลัพธ์ด่วน
                      </button>
                    </div>

                    <div className="space-y-2">
                      {(config.inlineQuerySettings?.results || []).map((resItem, idx) => (
                        <div key={resItem.id} className="bg-black/20 p-3 rounded-xl border border-white/5 space-y-2 relative animate-none">
                          <button
                            type="button"
                            onClick={() => {
                              const current = config.inlineQuerySettings || { enableInline: true, placeholder: "", results: [] };
                              const updatedResults = current.results.filter(r => r.id !== resItem.id);
                              updateGeneral({ inlineQuerySettings: { ...current, results: updatedResults } });
                            }}
                            className="absolute right-2.5 top-2.5 text-rose-400 hover:text-rose-300 p-1.5 rounded hover:bg-rose-500/10 cursor-pointer transition-colors"
                            title="ลบผลลัพธ์"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pr-8">
                            <input
                              type="text"
                              className="bg-black/40 border border-white/5 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-200"
                              placeholder="หัวข้อผลลัพธ์ (เช่น คูปองพิเศษลด 50%)"
                              value={resItem.title}
                              onChange={(e) => {
                                const current = config.inlineQuerySettings || { enableInline: true, placeholder: "", results: [] };
                                const updatedResults = [...current.results];
                                updatedResults[idx] = { ...resItem, title: e.target.value };
                                updateGeneral({ inlineQuerySettings: { ...current, results: updatedResults } });
                              }}
                            />
                            <input
                              type="text"
                              className="bg-black/40 border border-white/5 rounded-lg px-2.5 py-1 text-xs text-slate-400"
                              placeholder="คำอธิบายผลลัพธ์สั้นๆ ใต้หัวข้อ"
                              value={resItem.description}
                              onChange={(e) => {
                                const current = config.inlineQuerySettings || { enableInline: true, placeholder: "", results: [] };
                                const updatedResults = [...current.results];
                                updatedResults[idx] = { ...resItem, description: e.target.value };
                                updateGeneral({ inlineQuerySettings: { ...current, results: updatedResults } });
                              }}
                            />
                          </div>
                          <textarea
                            className="w-full h-12 bg-black/40 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-gray-400 focus:outline-none resize-none"
                            placeholder="ข้อความจริงที่จะส่งแชตทันทีเมื่อแตะเลือกข้อนี้..."
                            value={resItem.content}
                            onChange={(e) => {
                              const current = config.inlineQuerySettings || { enableInline: true, placeholder: "", results: [] };
                              const updatedResults = [...current.results];
                              updatedResults[idx] = { ...resItem, content: e.target.value };
                              updateGeneral({ inlineQuerySettings: { ...current, results: updatedResults } });
                            }}
                          />
                        </div>
                      ))}
                      {(config.inlineQuerySettings?.results || []).length === 0 && (
                        <p className="text-[10px] text-gray-500 text-center py-1">ยังไม่มีการตั้งค่าผลลัพธ์การค้นหา Inline</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section 3: Group Settings */}
        {activeSection === 'group' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-200 mb-1">ระบบดูแลความสงบเรียบร้อยในกลุ่ม</h3>
              <p className="text-[11px] text-gray-400">ควบคุมกฎระเบียบของกลุ่ม ต้อนรับสมาชิกใหม่ บล็อกลิงก์สแปม และคำหยาบคาย</p>
            </div>

            <div className="space-y-5">
              {/* Member Welcome Subcard */}
              <div className="bg-[#111114] border border-white/5 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">ส่งข้อความต้อนรับสมาชิกใหม่เข้ากลุ่มอัตโนมัติ</span>
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                    checked={config.groupSettings.welcomeNewMember}
                    onChange={(e) => updateGroupSettings({ welcomeNewMember: e.target.checked })}
                  />
                </div>
                {config.groupSettings.welcomeNewMember && (
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 mb-1">ข้อความต้อนรับสมาชิกลุ่ม (ใช้คีย์ {`{name}`} แทนชื่อจริงได้)</label>
                    <textarea
                      className="w-full h-16 bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      placeholder="เช่น ยินดีต้อนรับคุณ {name} เข้าสู่กลุ่มประชาคมของเราอย่างเป็นทางการ!"
                      value={config.groupSettings.welcomeMessage}
                      onChange={(e) => updateGroupSettings({ welcomeMessage: e.target.value })}
                    />
                  </div>
                )}
              </div>

              {/* Anti-Spam Options Card */}
              <div className="border border-white/10 bg-[#111114] rounded-2xl p-4 space-y-3.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 border-b border-white/5 pb-1.5">
                  <Shield className="w-4 h-4 text-indigo-400" />
                  ตัวกรองความปลอดภัยและการควบคุมสแปมกลุ่ม (Anti-Spam Filter)
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300">บล็อกและลบข้อความสแปมลิงก์ (Block External Links)</span>
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                    checked={config.groupSettings.antiSpam.blockLinks}
                    onChange={(e) => updateGroupSettings({
                      antiSpam: { ...config.groupSettings.antiSpam, blockLinks: e.target.checked }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300">บล็อกลบคำหยาบ / สบถไม่เหมาะสม (Block Swear Words)</span>
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                    checked={config.groupSettings.antiSpam.blockSwearWords}
                    onChange={(e) => updateGroupSettings({
                      antiSpam: { ...config.groupSettings.antiSpam, blockSwearWords: e.target.checked }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300">จำนวนการแจ้งเตือนเตือนสูงสุดก่อนเตะ/แบน</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="w-16 bg-black/40 border border-white/5 rounded-lg px-2 py-1 text-center text-xs font-semibold text-slate-200"
                    value={config.groupSettings.antiSpam.warnLimit}
                    onChange={(e) => updateGroupSettings({
                      antiSpam: { ...config.groupSettings.antiSpam, warnLimit: parseInt(e.target.value) || 3 }
                    })}
                  />
                </div>
              </div>

              {/* AI Auto-Translation Card */}
              <div className="border border-white/10 bg-[#111114] rounded-2xl p-4 space-y-3.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 border-b border-white/5 pb-1.5">
                  <Globe className="w-4 h-4 text-indigo-400" />
                  ระบบแปลภาษาอัจฉริยะในกลุ่ม (AI Auto-Translation)
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs text-slate-300 block">เปิดใช้งานการแปลภาษาอัตโนมัติ</span>
                    <span className="text-[10px] text-gray-400 block">บอทจะช่วยตรวจจับและแปลเป็นภาษาเป้าหมายอัตโนมัติเมื่อเพื่อนต่างชาติแชตเข้ามา</span>
                  </div>
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                    checked={config.groupSettings.autoTranslation?.enable ?? false}
                    onChange={(e) => updateGroupSettings({
                      autoTranslation: {
                        enable: e.target.checked,
                        targetLanguage: config.groupSettings.autoTranslation?.targetLanguage || "ภาษาไทย"
                      }
                    })}
                  />
                </div>

                {(config.groupSettings.autoTranslation?.enable) && (
                  <div className="space-y-2 pt-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">ภาษาเป้าหมายที่ต้องการแปลเป็น (Target Language)</label>
                    <select
                      className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                      value={config.groupSettings.autoTranslation?.targetLanguage || "ภาษาไทย"}
                      onChange={(e) => updateGroupSettings({
                        autoTranslation: {
                          enable: true,
                          targetLanguage: e.target.value
                        }
                      })}
                    >
                      <option value="ภาษาไทย" className="bg-[#16161A] text-slate-200">ภาษาไทย (Thai)</option>
                      <option value="English" className="bg-[#16161A] text-slate-200">English (อังกฤษ)</option>
                      <option value="日本語" className="bg-[#16161A] text-slate-200">日本語 (Japanese)</option>
                      <option value="中文" className="bg-[#16161A] text-slate-200">中文 (Chinese)</option>
                      <option value="한국어" className="bg-[#16161A] text-slate-200">한국어 (Korean)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Keyword Monitoring Config */}
              <div className="bg-[#111114] p-4 rounded-2xl border border-white/5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wide">
                      <Sparkles className="w-4 h-4 text-amber-400" /> ระบบดักจับคำสำคัญในกลุ่ม (Keyword Monitoring)
                    </span>
                    <p className="text-[10px] text-gray-400">แจ้งเตือนแอดมินทันทีเมื่อมีสมาชิกพิมพ์คำระบุไว้บ่อยครั้งในกลุ่ม</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={config.groupSettings.keywordMonitoring?.enable || false}
                      onChange={(e) => updateGroupSettings({
                        keywordMonitoring: {
                          ...(config.groupSettings.keywordMonitoring || {
                            enable: false,
                            keywords: ["help", "bad service", "error", "scammed"],
                            notificationType: "both",
                            adminEmail: "admin@example.com",
                            alertThreshold: 2
                          }),
                          enable: e.target.checked
                        }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {config.groupSettings.keywordMonitoring?.enable && (
                  <div className="space-y-4 pt-1 animate-none">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        คำสำคัญที่ต้องการเฝ้าระวัง (คั่นด้วยเครื่องหมายจุลภาค ,):
                      </label>
                      <input
                        type="text"
                        className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                        placeholder="เช่น help, bad service, error, scammed"
                        value={config.groupSettings.keywordMonitoring?.keywords?.join(", ") || ""}
                        onChange={(e) => {
                          const list = e.target.value.split(",").map(k => k.trim()).filter(k => k.length > 0);
                          updateGroupSettings({
                            keywordMonitoring: {
                              ...(config.groupSettings.keywordMonitoring || {
                                enable: true,
                                keywords: [],
                                notificationType: "both",
                                adminEmail: "admin@example.com",
                                alertThreshold: 2
                              }),
                              keywords: list
                            }
                          });
                        }}
                      />
                      <span className="text-[9px] text-gray-500 block">
                        พิมพ์คำ เช่น "help, โกง, บริการแย่" เพื่อให้ระบบส่งสัญญาณแจ้งเตือนแอดมิน
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">ช่องทางการส่งแจ้งเตือน:</label>
                        <select
                          className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                          value={config.groupSettings.keywordMonitoring?.notificationType || "both"}
                          onChange={(e) => updateGroupSettings({
                            keywordMonitoring: {
                              ...(config.groupSettings.keywordMonitoring || {
                                enable: true,
                                keywords: [],
                                notificationType: "both",
                                adminEmail: "admin@example.com",
                                alertThreshold: 2
                              }),
                              notificationType: e.target.value as 'email' | 'bot_message' | 'both'
                            }
                          })}
                        >
                          <option value="bot_message" className="bg-[#16161A] text-slate-200">ส่งข้อความพิเศษในกลุ่ม (Bot Chat Alert)</option>
                          <option value="email" className="bg-[#16161A] text-slate-200">ส่งอีเมลแจ้งเตือนแอดมิน (Email Notification)</option>
                          <option value="both" className="bg-[#16161A] text-slate-200">ส่งทั้งคู่ (Both Channels)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">ความถี่/เกณฑ์แจ้งเตือน (ครั้ง):</label>
                        <div className="flex gap-2 items-center">
                          <input
                            type="range"
                            min="1"
                            max="10"
                            className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            value={config.groupSettings.keywordMonitoring?.alertThreshold || 2}
                            onChange={(e) => updateGroupSettings({
                              keywordMonitoring: {
                                ...(config.groupSettings.keywordMonitoring || {
                                  enable: true,
                                  keywords: [],
                                  notificationType: "both",
                                  adminEmail: "admin@example.com",
                                  alertThreshold: 2
                                }),
                                alertThreshold: parseInt(e.target.value) || 2
                              }
                            })}
                          />
                          <span className="text-xs font-black text-indigo-400 font-mono w-8 text-center">
                            {config.groupSettings.keywordMonitoring?.alertThreshold || 2} ครั้ง
                          </span>
                        </div>
                      </div>
                    </div>

                    {((config.groupSettings.keywordMonitoring?.notificationType === "email" || config.groupSettings.keywordMonitoring?.notificationType === "both")) && (
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">อีเมลแอดมินสำหรับส่งแจ้งเตือน:</label>
                        <input
                          type="email"
                          className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                          placeholder="เช่น admin@example.com"
                          value={config.groupSettings.keywordMonitoring?.adminEmail || ""}
                          onChange={(e) => updateGroupSettings({
                            keywordMonitoring: {
                              ...(config.groupSettings.keywordMonitoring || {
                                enable: true,
                                keywords: [],
                                notificationType: "both",
                                adminEmail: "admin@example.com",
                                alertThreshold: 2
                              }),
                              adminEmail: e.target.value
                            }
                          })}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Rules Announcement Interval */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-200">ประกาศกฎระเบียบกลุ่มสม่ำเสมออัตโนมัติ (ชั่วโมง)</label>
                <div className="flex gap-3 items-center">
                  <input
                    type="number"
                    min="0"
                    max="48"
                    className="w-20 bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-center text-xs font-bold text-slate-200 focus:outline-none focus:border-indigo-500"
                    value={config.groupSettings.rulesInterval}
                    onChange={(e) => updateGroupSettings({ rulesInterval: parseInt(e.target.value) || 0 })}
                  />
                  <span className="text-xs text-gray-500">ชั่วโมง (ตั้งค่าเป็น 0 เพื่อปิดระบบส่งสม่ำเสมอ)</span>
                </div>
                {config.groupSettings.rulesInterval > 0 && (
                  <textarea
                    className="w-full h-16 bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-xs text-slate-200 mt-2 focus:outline-none focus:border-indigo-500"
                    placeholder="เช่น ระเบียบกลุ่ม: 1.ห้ามสร้างความปั่นป่วน..."
                    value={config.groupSettings.rulesAnnouncement}
                    onChange={(e) => updateGroupSettings({ rulesAnnouncement: e.target.value })}
                  />
                )}
              </div>

              {/* Group Custom Commands Setup */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1">
                    <Terminal className="w-4 h-4 text-gray-500" />
                    คำสั่งแอดมินกลุ่มแชต (Slash Custom Commands)
                  </label>
                  <button
                    type="button"
                    onClick={addCustomCommand}
                    className="bg-indigo-500/10 hover:bg-indigo-500 hover:text-white border border-indigo-500/20 text-indigo-400 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    เพิ่มคำสั่ง
                  </button>
                </div>

                <div className="space-y-2.5">
                  {config.groupSettings.customCommands.map((cmd, idx) => (
                    <div key={idx} className="flex gap-2 bg-[#111114] p-2.5 rounded-xl border border-white/5 items-start animate-none">
                      <div className="flex-1 space-y-2">
                        <div className="relative">
                          <span className="absolute left-3.5 top-1.5 text-xs text-gray-500 font-mono">/</span>
                          <input
                            type="text"
                            className="w-full bg-black/40 border border-white/5 rounded-lg pl-6 pr-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                            placeholder="เช่น help, rules"
                            value={cmd.command.startsWith("/") ? cmd.command.slice(1) : cmd.command}
                            onChange={(e) => updateCustomCommand(idx, { command: e.target.value })}
                          />
                        </div>
                        <textarea
                          className="w-full h-14 bg-black/40 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-gray-400 focus:outline-none focus:border-indigo-500 resize-none"
                          placeholder="ข้อความที่บอทจะตอบกลับคำสั่งสแลชนี้"
                          value={cmd.reply}
                          onChange={(e) => updateCustomCommand(idx, { reply: e.target.value })}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCustomCommand(idx)}
                        className="text-rose-400 hover:text-rose-300 p-1.5 rounded hover:bg-rose-500/10 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 4: Channel Settings */}
        {activeSection === 'channel' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-200 mb-1">บรอดแคสต์กระจายข่าวส่งแชนแนล</h3>
              <p className="text-[11px] text-gray-400">ควบคุมรูปแบบการแสดงผล ลายเซ็นเครดิตอัตโนมัติ และแผนเวลาโพสต์ล่วงหน้า</p>
            </div>

            <div className="space-y-5">
              <div className="bg-[#111114] border border-white/5 rounded-2xl p-4 space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">เชื่อมต่อช่องเป้าหมายสำหรับฟีเจอร์ Channel เท่านั้น</h4>
                  <p className="text-[10px] text-gray-500 mt-1">ต้องตั้งค่าอย่างน้อย 1 ช่อง ก่อนทดสอบส่งโพสต์จริงจาก backend endpoint</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 mb-1">Target Channel ID</label>
                    <input
                      type="text"
                      className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      placeholder="เช่น -1001234567890"
                      value={config.channelSettings.targetChannelId || ""}
                      onChange={(e) => updateChannelSettings({ targetChannelId: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 mb-1">Target Channel Username</label>
                    <input
                      type="text"
                      className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      placeholder="เช่น @jimmy_channel"
                      value={config.channelSettings.targetChannelUsername || ""}
                      onChange={(e) => updateChannelSettings({ targetChannelUsername: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5">
                  เลือกรูปแบบข้อความ (Formatting Mode)
                </label>
                <select
                  className="w-full bg-black/40 border border-white/5 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none"
                  value={config.channelSettings.enableFormatting}
                  onChange={(e) => updateChannelSettings({ enableFormatting: e.target.value as any })}
                >
                  <option value="None" className="bg-[#16161A] text-slate-200">ข้อความธรรมดา (Plain Text)</option>
                  <option value="HTML" className="bg-[#16161A] text-slate-200">จัดแต่งด้วยโค้ด HTML (รองรับ &lt;b&gt;, &lt;i&gt;)</option>
                  <option value="MarkdownV2" className="bg-[#16161A] text-slate-200">จัดแต่งด้วยสไตล์ MarkdownV2</option>
                </select>
              </div>

              {/* Auto Signature Section */}
              <div className="bg-[#111114] border border-white/5 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">ต่อท้ายข้อความด้วยลายเซ็นอัตโนมัติ (Signature)</span>
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                    checked={config.channelSettings.autoSignature}
                    onChange={(e) => updateChannelSettings({ autoSignature: e.target.checked })}
                  />
                </div>
                {config.channelSettings.autoSignature && (
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 mb-1">ลายเซ็นต่อท้ายข้อความ</label>
                    <textarea
                      className="w-full h-14 bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      placeholder="เช่น 🔔 สมัครสมาชิกข่าวช่องเรา: @my_channel_username"
                      value={config.channelSettings.autoSignatureText}
                      onChange={(e) => updateChannelSettings({ autoSignatureText: e.target.value })}
                    />
                  </div>
                )}
              </div>

              {/* Scheduled Posts Setup */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    ตารางส่งโพสต์ล่วงหน้าอัตโนมัติ (Scheduled Posts)
                  </label>
                  <button
                    type="button"
                    onClick={addScheduledPost}
                    className="bg-indigo-500/10 hover:bg-indigo-500 hover:text-white border border-indigo-500/20 text-indigo-400 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    เพิ่มกำหนดโพสต์
                  </button>
                </div>

                <div className="space-y-2.5">
                  {!(config.channelSettings.targetChannelId || config.channelSettings.targetChannelUsername) && (
                    <p className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-2">
                      ยังไม่ได้ตั้ง target channel: scheduled posts จะยังไม่สามารถทดสอบส่งจริงได้
                    </p>
                  )}
                  {config.channelSettings.scheduledPosts.map((post) => (
                    <div key={post.id} className="flex gap-2 bg-[#111114] p-2.5 rounded-xl border border-white/5 items-start animate-none">
                      <div className="flex-1 space-y-2.5">
                        <div className="flex gap-2 items-center">
                          <span className="text-[10px] font-bold text-gray-400">ระบุเวลาส่งโพสต์:</span>
                          <input
                            type="time"
                            className="bg-black/40 border border-white/5 rounded px-2 py-0.5 text-xs font-bold text-indigo-400 focus:outline-none"
                            value={post.time}
                            onChange={(e) => updateScheduledPost(post.id, { time: e.target.value })}
                          />
                        </div>
                        <textarea
                          className="w-full h-16 bg-black/40 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 resize-none"
                          placeholder="เนื้อหาข่าวสารที่ต้องการส่งโพสต์..."
                          value={post.content}
                          onChange={(e) => updateScheduledPost(post.id, { content: e.target.value })}
                        />

                        {/* Media Selector for Scheduled Post */}
                        <div className="space-y-1.5 pt-1.5 border-t border-white/5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400">แนบรูปภาพโพสต์:</span>
                            <select
                              className="bg-black/40 border border-white/5 rounded px-2 py-1 text-[10px] text-slate-300 focus:outline-none"
                              value={post.imageUrl || ""}
                              onChange={(e) => updateScheduledPost(post.id, { imageUrl: e.target.value || undefined })}
                            >
                              <option value="">-- ไม่แนบรูปภาพ --</option>
                              {(config.mediaLibrary || []).map((media) => (
                                <option key={media.id} value={media.url}>
                                  {media.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          {post.imageUrl && (
                            <div className="relative w-28 h-16 rounded-lg overflow-hidden border border-white/10 group">
                              <img
                                src={post.imageUrl}
                                alt="Attached preview"
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                              <button
                                type="button"
                                onClick={() => updateScheduledPost(post.id, { imageUrl: undefined })}
                                className="absolute inset-0 bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-rose-400 font-bold cursor-pointer"
                              >
                                ลบรูปแนบ
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeScheduledPost(post.id)}
                        className="text-rose-400 hover:text-rose-300 p-1.5 rounded hover:bg-rose-500/10 cursor-pointer transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 4.5: Media Library Settings */}
        {activeSection === 'media' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-200 mb-1 flex items-center gap-2">
                <Image className="w-4 h-4 text-indigo-400" />
                คลังเก็บและจัดการไฟล์สื่อ (Media Library Manager)
              </h3>
              <p className="text-[11px] text-gray-400">
                อัปโหลดรูปภาพโปรโมชั่น, คูปอง หรือใบปลิว เพื่อใช้ในการตอบกลับอัตโนมัติ (Keyword Auto-Replies) หรือโพสต์ตามกำหนดเวลา (Scheduled Posts)
              </p>
            </div>

            {/* Upload Area / Add Image by URL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Drag & Drop File Upload */}
              <div
                onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleMediaFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                className={`border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center text-center transition-all cursor-pointer min-h-[160px] ${
                  dragActive
                    ? "border-indigo-500 bg-indigo-600/5 text-indigo-300"
                    : "border-white/10 hover:border-indigo-500/50 bg-[#111114]"
                }`}
              >
                <div className="bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-500/10 mb-2.5">
                  <Image className="w-5 h-5 text-indigo-400" />
                </div>
                <span className="text-xs font-bold text-slate-300">ลากรูปภาพมาวางที่นี่เพื่ออัปโหลด</span>
                <span className="text-[10px] text-gray-500 mt-1 mb-3">รองรับ PNG, JPG, JPEG, GIF และ WebP</span>
                
                <label className="bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer">
                  เลือกรูปจากโฟลเดอร์...
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleMediaFileUpload(e.target.files[0]);
                      }
                    }}
                  />
                </label>
              </div>

              {/* Add by Online URL Form */}
              <form onSubmit={handleAddMediaByUrl} className="bg-[#111114] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <span className="text-xs font-bold text-indigo-400 block border-b border-white/5 pb-1.5">
                    🔗 นำเข้าด้วยลิงก์รูปภาพภายนอก (Add Image via Web Link)
                  </span>
                  
                  <div>
                    <label className="block text-[10px] text-gray-400 font-bold mb-1 uppercase tracking-wider">ชื่อไฟล์/ป้ายกำกับรูปภาพ (Label Name)</label>
                    <input
                      type="text"
                      className="w-full bg-black/40 border border-white/5 focus:border-indigo-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                      placeholder="เช่น แบนเนอร์เปิดตัวสินค้า"
                      value={newMediaName}
                      onChange={(e) => setNewMediaName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-400 font-bold mb-1 uppercase tracking-wider">ลิงก์ URL ของรูปภาพ (Direct Image URL)</label>
                    <input
                      type="url"
                      required
                      className="w-full bg-black/40 border border-white/5 focus:border-indigo-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none"
                      placeholder="เช่น https://images.unsplash.com/..."
                      value={newMediaUrl}
                      onChange={(e) => setNewMediaUrl(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!newMediaUrl.trim()}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white disabled:bg-gray-900 disabled:text-gray-600 text-xs font-bold px-4 py-2 rounded-xl transition-all w-full mt-4 cursor-pointer"
                >
                  เชื่อมโยงและบันทึกภาพเข้าคลัง
                </button>
              </form>
            </div>

            {/* Media Items List Grid */}
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                <span className="text-xs font-bold text-slate-200">
                  รายการสื่อทั้งหมดในคลัง ({ (config.mediaLibrary || []).length } รูปภาพ)
                </span>
                <span className="text-[10px] text-gray-500 font-semibold bg-white/5 px-2 py-0.5 rounded-md">
                  ข้อมูลรูปภาพจะถูกเซฟอัตโนมัติลงในโปรไฟล์บอทจำลองตัวนี้
                </span>
              </div>

              {!(config.mediaLibrary) || config.mediaLibrary.length === 0 ? (
                <div className="text-center py-8 bg-[#111114] rounded-2xl border border-white/5">
                  <Image className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">ยังไม่มีไฟล์รูปภาพในคลังสื่อของคุณในขณะนี้</p>
                  <p className="text-[10px] text-gray-500 mt-1">อัปโหลดรูปภาพแรกของคุณด้านบนเพื่อเริ่มนำไปใช้ประกอบการทำงานของบอท</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {config.mediaLibrary.map((media) => (
                    <div key={media.id} className="bg-[#111114] border border-white/5 rounded-2xl overflow-hidden flex flex-col group hover:border-white/15 transition-all">
                      {/* Image Preview Container */}
                      <div className="relative aspect-video bg-black/50 overflow-hidden border-b border-white/5">
                        <img
                          src={media.url}
                          alt={media.name}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[9px] font-bold text-indigo-400 border border-indigo-500/20">
                          {media.type.split('/')[1]?.toUpperCase() || "IMAGE"}
                        </div>
                      </div>

                      {/* Info & Actions */}
                      <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-bold text-slate-300 truncate" title={media.name}>
                            {media.name}
                          </h4>
                          <p className="text-[9px] text-gray-500 truncate font-mono">
                            {media.url.startsWith("data:") ? "ไฟล์ Base64 ภายในเครื่อง" : media.url}
                          </p>
                        </div>

                        <div className="flex gap-1.5 pt-1.5 border-t border-white/5">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(media.url);
                              setCopiedId(media.id);
                              setTimeout(() => setCopiedId(null), 2000);
                            }}
                            className="flex-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 text-[10px] font-bold py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <span>{copiedId === media.id ? "คัดลอกแล้ว! ✅" : "คัดลอกลิงก์ 🔗"}</span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleDeleteMedia(media.id)}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded-lg transition-all cursor-pointer"
                            title="ลบออกจากคลังมีเดีย"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section 5: Advanced Settings & APIs */}
        {activeSection === 'advanced' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-200 mb-1">การตั้งค่าขั้นสูง & การเชื่อมต่อ API ภายนอก</h3>
              <p className="text-[11px] text-gray-400">ปรับแต่งสิทธิ์ผู้ดูแลระบบ ความเป็นส่วนตัว และตั้งค่า API Webhooks สำหรับส่งข้อมูล</p>
            </div>

            {/* Sub-Card 1: Admin Permissions */}
            <div className="bg-[#111114] border border-white/5 rounded-2xl p-4 space-y-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 border-b border-white/5 pb-2">
                <ShieldAlert className="w-4 h-4 text-indigo-400" />
                สิทธิ์ของผู้ดูแลระบบบอท (Admin Permissions Setup)
              </div>
              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-slate-300">อนุญาตให้บอทลบข้อความสแปม / คำหยาบ (can_delete_messages)</span>
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                    checked={config.adminPermissions?.canDeleteMessages ?? true}
                    onChange={(e) => updateAdminPermissions({ canDeleteMessages: e.target.checked })}
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-slate-300">อนุญาตให้บอทเตะ / แบนผู้ใช้ที่ทำผิดกฎ (can_restrict_members)</span>
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                    checked={config.adminPermissions?.canBanUsers ?? true}
                    onChange={(e) => updateAdminPermissions({ canBanUsers: e.target.checked })}
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-slate-300">อนุญาตให้บอทปักหมุดข้อความประชาสัมพันธ์ (can_pin_messages)</span>
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                    checked={config.adminPermissions?.canPinMessages ?? true}
                    onChange={(e) => updateAdminPermissions({ canPinMessages: e.target.checked })}
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-slate-300">อนุญาตให้แก้ไขข้อมูลชื่อและคำอธิบายกลุ่ม (can_change_info)</span>
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                    checked={config.adminPermissions?.canChangeGroupInfo ?? false}
                    onChange={(e) => updateAdminPermissions({ canChangeGroupInfo: e.target.checked })}
                  />
                </label>
              </div>
            </div>

            {/* Sub-Card 2: Privacy Settings */}
            <div className="bg-[#111114] border border-white/5 rounded-2xl p-4 space-y-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 border-b border-white/5 pb-2">
                <HelpCircle className="w-4 h-4 text-indigo-400" />
                ความปลอดภัยและความเป็นส่วนตัว (Privacy Settings)
              </div>
              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-slate-300">อนุญาตให้ทักข้อความหาบอทส่วนตัว (Direct Message)</span>
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                    checked={config.privacySettings?.allowDirectMessages ?? true}
                    onChange={(e) => updatePrivacySettings({ allowDirectMessages: e.target.checked })}
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-slate-300">
                    โหมดความเป็นส่วนตัวของกลุ่ม (Group Privacy Mode)
                    <p className="text-[10px] text-gray-500 font-normal mt-0.5">เปิด: อ่านเฉพาะคำสั่ง / | ปิด: อ่านทุกข้อความเพื่อตรวจสแปม</p>
                  </span>
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                    checked={config.privacySettings?.groupPrivacyMode ?? false}
                    onChange={(e) => updatePrivacySettings({ groupPrivacyMode: e.target.checked })}
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-slate-300">แสดงข้อมูลสถิติการใช้งานบอทแบบสาธารณะ</span>
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                    checked={config.privacySettings?.showPublicStats ?? true}
                    onChange={(e) => updatePrivacySettings({ showPublicStats: e.target.checked })}
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-slate-300">ซ่อนข้อมูลบัญชีผู้สร้างบอท (Hide Bot Creator)</span>
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                    checked={config.privacySettings?.hideBotCreator ?? false}
                    onChange={(e) => updatePrivacySettings({ hideBotCreator: e.target.checked })}
                  />
                </label>
              </div>
            </div>

            {/* Sub-Card 3: External API Integrations */}
            <div className="bg-[#111114] border border-white/5 rounded-2xl p-4 space-y-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 border-b border-white/5 pb-2">
                <Globe className="w-4 h-4 text-indigo-400" />
                เชื่อมต่อระบบ API และฐานข้อมูลภายนอก (External Integrations)
              </div>

              {/* API Keys (Gemini & OpenAI) Section */}
              <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-3.5 space-y-3">
                <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  สิทธิ์การเข้าใช้งาน AI (Gemini / OpenAI API Keys)
                </div>
                <p className="text-[10px] text-gray-400">
                  ระบุ API Key ของคุณเพื่อเปิดใช้งานฟีเจอร์ AI แบบเต็มระบบในหน้าจำลอง เช่น การพูดคุย, การแนะนำคำสั่ง, หรือสร้างภาพโปรไฟล์บอท 
                  <span className="text-amber-400/80 font-semibold block mt-1">💡 หากไม่ได้ใส่คีย์ ระบบจะสลับเข้าสู่ "โหมดจำลองออฟไลน์" โดยอัตโนมัติ เพื่อให้ทดลองใช้ได้ทันทีโดยไม่ต้องตั้งค่า!</span>
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
                      <span>Gemini API Key</span>
                      {config.externalApis?.geminiApiKey ? (
                        <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded-full">เปิดใช้ระบบจริง</span>
                      ) : (
                        <span className="text-[9px] text-slate-400 bg-slate-500/10 px-1.5 py-0.5 rounded-full">ใช้โหมดออฟไลน์</span>
                      )}
                    </label>
                    <input
                      type="password"
                      className="w-full bg-black/40 border border-white/5 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none transition-all"
                      placeholder="AI Studio API Key (AI_...)"
                      value={config.externalApis?.geminiApiKey ?? ""}
                      onChange={(e) => updateExternalApis({ geminiApiKey: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
                      <span>OpenAI API Key</span>
                      {config.externalApis?.openaiApiKey ? (
                        <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded-full">เปิดใช้ระบบจริง</span>
                      ) : (
                        <span className="text-[9px] text-slate-400 bg-slate-500/10 px-1.5 py-0.5 rounded-full">ใช้โหมดออฟไลน์</span>
                      )}
                    </label>
                    <input
                      type="password"
                      className="w-full bg-black/40 border border-white/5 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none transition-all"
                      placeholder="OpenAI API Key (sk-...)"
                      value={config.externalApis?.openaiApiKey ?? ""}
                      onChange={(e) => updateExternalApis({ openaiApiKey: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">ส่งข้อมูลสลิป / ข้อมูลลูกค้าเข้าสู่อีเมลหรือ API ทันที</span>
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                    checked={config.externalApis?.sendLeadsToApi ?? true}
                    onChange={(e) => updateExternalApis({ sendLeadsToApi: e.target.checked })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">
                    รหัส API Auth Token (Bearer Token สำหรับความปลอดภัย)
                  </label>
                  <input
                    type="text"
                    className="w-full bg-black/40 border border-white/5 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-mono focus:outline-none transition-all"
                    placeholder="เช่น tlg_secret_token_12345xyz"
                    value={config.externalApis?.apiAuthToken ?? ""}
                    onChange={(e) => updateExternalApis({ apiAuthToken: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">
                    ลิงก์ Webhook รองรับข้อมูลเหตุการณ์บอท (Telegram Webhook URL)
                  </label>
                  <input
                    type="text"
                    className="w-full bg-black/40 border border-white/5 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-mono focus:outline-none transition-all"
                    placeholder="เช่น https://api.yourdomain.com/telegram-webhook"
                    value={config.externalApis?.webhookUrl ?? ""}
                    onChange={(e) => updateExternalApis({ webhookUrl: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">
                    ลิงก์ Google Sheets Webhook (บันทึกข้อมูลลีด/รายชื่ออัตโนมัติ)
                  </label>
                  <input
                    type="text"
                    className="w-full bg-black/40 border border-white/5 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-mono focus:outline-none transition-all"
                    placeholder="เช่น https://docs.google.com/spreadsheets/d/.../edit"
                    value={config.externalApis?.googleSheetsUrl ?? ""}
                    onChange={(e) => updateExternalApis({ googleSheetsUrl: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">
                    ลิงก์ API คอนเนคเตอร์ภายนอกดึงรายการสินค้าหรือโปรโมชัน (Custom GET API)
                  </label>
                  <input
                    type="text"
                    className="w-full bg-black/40 border border-white/5 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-mono focus:outline-none transition-all"
                    placeholder="เช่น https://api.yourdomain.com/products/active"
                    value={config.externalApis?.customApiUrl ?? ""}
                    onChange={(e) => updateExternalApis({ customApiUrl: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
