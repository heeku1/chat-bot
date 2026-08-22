import { X, Sparkles, Terminal, ShieldAlert, List, Heart, Calendar, Keyboard, MessageSquare, Info, Zap, Plus } from "lucide-react";
import { BotConfig } from "../types";
import { motion } from "motion/react";

interface TemplateDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: {
    id: string;
    category: string;
    title: string;
    subtitle: string;
    description: string;
    icon: string;
    color: string;
    config: BotConfig;
  } | null;
  onLoadTemplate: (config: BotConfig, title: string) => void;
  onImportAsNew: (config: BotConfig, title: string) => void;
  canAddMoreBots: boolean;
  botCount: number;
}

export default function TemplateDetailModal({
  isOpen,
  onClose,
  template,
  onLoadTemplate,
  onImportAsNew,
  canAddMoreBots,
  botCount,
}: TemplateDetailModalProps) {
  if (!isOpen || !template) return null;

  const { config } = template;
  const commands = config.botCommands || [];
  const autoReplies = config.botSettings?.autoReplies || [];
  const customGroupCommands = config.groupSettings?.customCommands || [];
  
  // Collect all buttons
  const replyButtons = config.botButtons?.replyKeyboard || [];
  const inlineButtons = config.botButtons?.inlineButtons || [];
  const menuButton = config.botMenuButton;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", duration: 0.4 }}
        className="relative w-full max-w-4xl max-h-[90vh] bg-[#111114] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-left"
      >
        {/* Top Header Grid Accent */}
        <div className={`h-1.5 bg-gradient-to-r ${template.color}`} />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-all cursor-pointer z-10 border border-white/5"
          title="ปิดหน้าต่าง"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-white/5 bg-[#141418] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex gap-4 items-start md:items-center">
            {/* Avatar / Icon */}
            <div className="relative shrink-0">
              <img
                src={config.avatarUrl || "https://picsum.photos/seed/bot/150/150"}
                alt={template.title}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-2xl object-cover border border-white/10 shadow-lg"
              />
              <span className="absolute -bottom-1 -right-1 text-xl bg-[#16161A] p-0.5 rounded-lg border border-white/5 leading-none">
                {template.icon}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-gradient-to-b ${template.color}`}>
                  {template.category}
                </span>
                <span className="text-xs text-gray-400 font-medium">✨ เทมเพลตพรีเมียม</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-100 tracking-tight mt-1">
                {template.title}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {template.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#0C0C0E]/50">
          
          {/* Summary Quote / General description */}
          <div className="bg-[#16161A]/80 border border-white/5 p-4 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-300">เกี่ยวกับเทมเพลตและวัตถุประสงค์</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {template.description}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Column: Personality & Prompt */}
            <div className="space-y-6">
              
              {/* Personality Section */}
              <div className="bg-[#16161A] border border-white/5 rounded-2xl p-4.5 space-y-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider">
                    🧠 บุคลิกภาพและระบบช่วยเหลือ AI (AI Personality & Prompt)
                  </h4>
                </div>

                {/* AI Prompt Box */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-400">คำสั่งเบื้องหลังระบบ AI (systemInstruction):</span>
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded font-bold uppercase">AI Active</span>
                  </div>
                  <div className="bg-black/30 border border-white/5 p-3 rounded-xl text-xs text-slate-300 leading-relaxed italic font-sans min-h-[90px] relative">
                    <span className="absolute top-1 left-2 text-3xl text-white/5 font-serif pointer-events-none">“</span>
                    {config.botSettings?.aiPrompt || "ไม่มีการกำหนดคำสั่งเบื้องหลัง"}
                  </div>
                </div>

                {/* Welcome Message Box */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-gray-400">ข้อความต้อนรับส่วนตัว (Welcome Message / Direct Message):</span>
                  <div className="bg-[#0D0D11] border border-white/5 p-3 rounded-xl space-y-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      <span className="text-[10px] font-bold text-slate-400">เมื่อผู้ใช้กดปุ่ม Start บอทจะตอบกลับ:</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line font-sans">
                      {config.botSettings?.welcomeMessage}
                    </p>
                  </div>
                </div>
              </div>

              {/* Auto Replies List */}
              <div className="bg-[#16161A] border border-white/5 rounded-2xl p-4.5 space-y-3.5">
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider">
                      💬 ระบบตอบกลับคำคีย์เวิร์ดด่วนอัตโนมัติ (Auto Replies)
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/10">
                    {autoReplies.length} คำคีย์เวิร์ด
                  </span>
                </div>

                {autoReplies.length > 0 ? (
                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1.5 custom-scrollbar">
                    {autoReplies.map((ar, idx) => (
                      <div key={idx} className="bg-black/20 hover:bg-black/30 border border-white/5 p-2.5 rounded-xl flex flex-col gap-1.5 transition-all">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-300 flex items-center gap-1">
                            🔑 พิมพ์ตรวจจับคำว่า: <span className="text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.2 rounded font-bold">"{ar.keyword}"</span>
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed italic font-sans pl-1 border-l-2 border-indigo-500/30">
                          {ar.reply}
                        </p>
                        {ar.imageUrl && (
                          <div className="text-[9px] text-indigo-400/80 font-bold flex items-center gap-1 mt-0.5 bg-indigo-950/20 px-2 py-1 rounded border border-indigo-500/10 self-start">
                            🖼️ บอทจะส่งพร้อมรูปภาพประกอบด้วย
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic py-2">ไม่มีข้อมูลข้อความตอบกลับอัตโนมัติ</p>
                )}
              </div>
            </div>

            {/* Right Column: Commands & Buttons Structure */}
            <div className="space-y-6">
              
              {/* Commands List Section */}
              <div className="bg-[#16161A] border border-white/5 rounded-2xl p-4.5 space-y-3.5">
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-indigo-400" />
                    <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider">
                      ⚡ โครงสร้างชุดคำสั่งทำงาน (Commands Structure)
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/10">
                    {commands.length} คำสั่งลัด
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1.5 custom-scrollbar">
                  {commands.map((cmd, idx) => (
                    <div key={idx} className="bg-black/20 border border-white/5 rounded-xl p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-indigo-300">
                          /{cmd.command}
                        </span>
                        <span className="text-[10px] text-gray-500">คำสั่งตอบกลับตรง</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                        💡 <span className="font-bold text-slate-300">คำอธิบาย:</span> {cmd.description}
                      </p>
                      <div className="bg-[#0B0B0D] p-2 rounded-lg text-[11px] text-slate-300 whitespace-pre-line leading-relaxed font-sans border-l-2 border-indigo-500 pl-2.5">
                        {cmd.reply}
                      </div>
                    </div>
                  ))}

                  {/* Custom Group Commands (if any) */}
                  {customGroupCommands.length > 0 && (
                    <div className="pt-2 border-t border-white/5 space-y-2">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">🗣️ คำสั่งพิเศษเฉพาะในกลุ่มแชต (Group Commands)</span>
                      {customGroupCommands.map((cmd, idx) => (
                        <div key={idx} className="bg-[#1F1B16]/30 border border-amber-500/10 rounded-xl p-3 space-y-1">
                          <span className="font-mono text-xs font-bold text-amber-300 block">
                            {cmd.command}
                          </span>
                          <div className="bg-[#0B0B0D] p-2 rounded-lg text-[11px] text-slate-300 whitespace-pre-line leading-relaxed font-sans border-l-2 border-amber-500 pl-2.5">
                            {cmd.reply}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Keyboard Layout Section */}
              <div className="bg-[#16161A] border border-white/5 rounded-2xl p-4.5 space-y-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
                  <Keyboard className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider">
                    ⌨️ การตั้งค่าปุ่มกดและคีย์บอร์ด (Keyboards & Buttons Preview)
                  </h4>
                </div>

                {/* Reply Keyboard Layout Preview */}
                {replyButtons.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-gray-400">แผงปุ่มกดคีย์บอร์ดหลักด้านล่างแชต (Reply Keyboard Layout):</span>
                    <div className="bg-[#0D0D11] border border-white/5 p-3 rounded-xl">
                      <div className="grid grid-cols-2 gap-2">
                        {replyButtons.map((btn, idx) => (
                          <div key={idx} className="bg-[#1C1C24] hover:bg-[#22222E] border border-white/10 rounded-lg p-2 text-center text-xs font-bold text-slate-200 shadow-sm cursor-help truncate" title={`บอทจะตอบกลับ: ${btn.reply}`}>
                            {btn.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Inline Buttons Preview */}
                {inlineButtons.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-gray-400">แผงปุ่มกดลอยแนบใต้ข้อความ (Inline Message Buttons):</span>
                    <div className="bg-[#0D0D11] border border-white/5 p-3 rounded-xl space-y-1.5">
                      {inlineButtons.map((btn, idx) => (
                        <div key={idx} className="bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 rounded-lg p-2 flex items-center justify-between text-xs text-indigo-300 font-bold transition-all px-3">
                          <span className="truncate">{btn.text}</span>
                          <span className="text-[9px] font-normal font-mono text-gray-500 shrink-0">
                            {btn.url ? "🔗 ลิงก์นอก" : "💬 โต้ตอบแชต"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Menu Button Preview */}
                {menuButton && menuButton.type !== "default" && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-gray-400">ปุ่มคีย์ลัดพิเศษข้างช่องแชต (Bot Menu Button):</span>
                    <div className="bg-[#0D0D11] border border-white/5 p-2.5 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span className="font-bold text-slate-200 font-mono">[{menuButton.type === "web_app" ? "WEB APP" : "COMMAND"}]</span>
                        <span className="text-gray-400">{menuButton.text || "เปิดบริการด่วน"}</span>
                      </div>
                      {menuButton.url && (
                        <span className="text-[9px] font-mono text-gray-500 truncate max-w-[150px]">
                          {menuButton.url}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Group and Security Stats */}
                <div className="bg-black/30 border border-white/5 p-3 rounded-xl text-[10px] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> ระบบแอนตี้สแปมกลุ่ม (Anti-Spam Filter):
                    </span>
                    <span className={config.groupSettings?.antiSpam?.blockLinks ? "text-emerald-400 font-bold" : "text-gray-500"}>
                      {config.groupSettings?.antiSpam?.blockLinks ? "เปิดใช้งานระบบ 🔒" : "ปิดใช้งาน"}
                    </span>
                  </div>
                  {config.externalApis?.sendLeadsToApi && (
                    <div className="flex items-center justify-between border-t border-white/5 pt-2">
                      <span className="text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-cyan-400" /> ประสานงาน API ภายนอก (API Sync Leads):
                      </span>
                      <span className="text-cyan-400 font-bold">เปิดเชื่อมต่อ Google Sheet & Webhook ✅</span>
                    </div>
                  )}
                  {config.channelSettings?.scheduledPosts && config.channelSettings.scheduledPosts.length > 0 && (
                    <div className="flex items-center justify-between border-t border-white/5 pt-2">
                      <span className="text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" /> โพสต์กำหนดเวลาล่วงหน้า (Scheduled Posts):
                      </span>
                      <span className="text-amber-400 font-bold">
                        {config.channelSettings.scheduledPosts.length} โพสต์/วัน ⏰
                      </span>
                    </div>
                  )}
                </div>

              </div>

            </div>

          </div>

        </div>

        {/* Modal Footer (Action Panel) */}
        <div className="p-6 border-t border-white/5 bg-[#141418] flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="text-left">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block">จำนวนบอทของคุณ</span>
            <span className="text-xs text-slate-300 font-bold">
              ปัจจุบันมีบอท <span className="text-indigo-400 font-mono font-black">{botCount}</span> / 10 ตัว
            </span>
          </div>

          <div className="sm:ml-auto flex gap-2.5 w-full sm:w-auto">
            {/* Cancel/Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold px-4 py-3 rounded-2xl border border-white/5 transition-all cursor-pointer"
            >
              ยกเลิก
            </button>

            {/* Load and overwrite */}
            <button
              type="button"
              onClick={() => {
                onLoadTemplate(config, template.title);
                onClose();
              }}
              className="flex-1 sm:flex-initial bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4.5 py-3 rounded-2xl transition-all border border-indigo-500/20 shadow-md shadow-indigo-600/15 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Zap className="w-4 h-4 shrink-0" />
              <span>โหลดแทนบอทนี้</span>
            </button>

            {/* Import as new */}
            <button
              type="button"
              disabled={!canAddMoreBots}
              onClick={() => {
                onImportAsNew(config, template.title);
                onClose();
              }}
              className="flex-1 sm:flex-initial bg-slate-800 hover:bg-slate-700 disabled:bg-gray-950 disabled:text-gray-600 disabled:border-transparent text-slate-200 hover:text-white text-xs font-bold px-4.5 py-3 rounded-2xl transition-all border border-white/5 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>เพิ่มเป็นบอทใหม่</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
