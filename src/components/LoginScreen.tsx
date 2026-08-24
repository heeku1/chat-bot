import { useState, FormEvent } from "react";
import { UserAccount } from "../types";
import { Lock, User, Sparkles, Terminal, Activity, ShieldAlert, CheckCircle2, ChevronDown, ChevronUp, AlertCircle, Sun, Moon, HelpCircle } from "lucide-react";

interface LoginScreenProps {
  theme: "dark" | "light";
  toggleTheme: () => void;
  users: UserAccount[];
  onLoginSuccess: (user: UserAccount) => void;
}

export default function LoginScreen({ theme, toggleTheme, users, onLoginSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showDoc, setShowDoc] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const showDemoCredentials = false;

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError("❌ กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.user) {
        setError(data?.error || "❌ เข้าสู่ระบบไม่สำเร็จ");
        return;
      }
      onLoginSuccess({
        username: data.user.username,
        name: data.user.name,
        role: data.user.role,
        isActive: true,
        botLimit: data.user.role === "admin" ? 10 : 1,
        createdAt: new Date().toISOString(),
      });
    } catch {
      setError("❌ ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = (user: UserAccount) => {
    if (!user.isActive) {
      setError(`🔒 บัญชี "${user.name}" ถูกระงับการใช้งานชั่วคราวในระดับระบบ ไม่สามารถเข้าใช้ได้จนกว่าจะกดเปิดใช้งานในแผงแอดมิน`);
      return;
    }
    setUsername(user.username);
    setPassword(user.password || "");
    setError(null);
  };

  return (
    <div className={`min-h-screen font-sans flex flex-col justify-between transition-colors duration-300 ${
      theme === "light" ? "bg-[#F8FAFC] text-slate-800" : "bg-[#0A0A0B] text-slate-100"
    }`}>
      {/* Top Header Row */}
      <header className={`border-b px-6 py-4 flex items-center justify-between ${
        theme === "light" ? "bg-white border-slate-200" : "bg-[#0B0B0D]/80 border-white/5"
      }`}>
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-2 rounded-xl font-bold text-sm tracking-wide">
            JB
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">Jimmy_bot Membership System</h1>
            <p className="text-[10px] text-gray-400 font-medium">ระบบสมาชิกแชตบอทจำลองอัจฉริยะ</p>
          </div>
        </div>

        <button
          onClick={toggleTheme}
          className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1 text-xs font-bold px-3 ${
            theme === "light" ? "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200" : "bg-white/5 border-white/5 text-indigo-400 hover:bg-white/10"
          }`}
        >
          {theme === "light" ? (
            <>
              <Moon className="w-4 h-4 text-slate-600" />
              <span>โหมดมืด (Dark)</span>
            </>
          ) : (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span>โหมดสว่าง (Light)</span>
            </>
          )}
        </button>
      </header>

      {/* Main Grid: Login & Documentation */}
      <main className="max-w-6xl w-full mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start flex-grow">
        {/* Left Side: Documentation & Explanation */}
        <div className="lg:col-span-7 space-y-6">
          <div className={`border rounded-2xl p-5 sm:p-6 shadow-sm ${
            theme === "light" ? "bg-white border-slate-200" : "bg-[#111114] border-white/5"
          }`}>
            <h2 className="text-base font-extrabold text-indigo-500 mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              อธิบายการทำงานแบบไม่ใส่ API Key (Offline Sandbox)
            </h2>
            <p className="text-xs text-gray-400 leading-relaxed mb-4">
              หากไม่ได้ระบุ <strong>Gemini / OpenAI API Key</strong> ระบบจะปรับปรุงการทำงานเข้าสู่ <strong>"โหมดจำลองสถานการณ์ภายในถิ่นออฟไลน์" (Simulated Offline Mode)</strong> โดยอัตโนมัติ เพื่อให้ผู้ใช้สามารถทดลองและประเมินภาพการตอบกลับของบอทได้ทันที มีฟีเจอร์ที่พร้อมทำงานดังนี้:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div className={`p-3.5 rounded-xl border transition-all ${
                theme === "light" ? "bg-slate-50 border-slate-200" : "bg-[#16161A] border-white/5"
              }`}>
                <div className="font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>แป้นคีย์บอร์ดและปุ่มเมนู</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  ปุ่มเมนูแบบ Custom Keyboards และปุ่มแชร์ Inline Buttons ตอบสนองต่อการคลิกและส่งคำจำลองกลับได้ครบถ้วน
                </p>
              </div>

              <div className={`p-3.5 rounded-xl border transition-all ${
                theme === "light" ? "bg-slate-50 border-slate-200" : "bg-[#16161A] border-white/5"
              }`}>
                <div className="font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>ดักจับคำตอบอัตโนมัติ</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  จับคำสำคัญ (Keywords) เช่น "ราคา", "โปรโมชั่น" เพื่อตอบกลับเป็นแชตข้อความพร้อมรูปภาพได้เสมือนเชื่อมฐานข้อมูล
                </p>
              </div>

              <div className={`p-3.5 rounded-xl border transition-all ${
                theme === "light" ? "bg-slate-50 border-slate-200" : "bg-[#16161A] border-white/5"
              }`}>
                <div className="font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>เครื่องมือตรวจวิเคราะห์กลุ่ม</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  ตัวแปลวิเคราะห์คำสั่ง (Parser) คัดกรอง /ban, ตรวจลิงก์, ตรวจคำหยาบ (Anti-Spam) ทำงานแบบเรียลไทม์พร้อมป้อนข้อมูลลงกราฟ Recharts
                </p>
              </div>

              <div className={`p-3.5 rounded-xl border transition-all ${
                theme === "light" ? "bg-slate-50 border-slate-200" : "bg-[#16161A] border-white/5"
              }`}>
                <div className="font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>AI Chat Smart Fallback</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  เมื่อเปิดคุย AI Assistant ระบบจะใช้โปรแกรมถาม-ตอบจำลองที่สอดคล้องกับพฤติกรรมบอท พร้อมสุ่มโปรไฟล์สวยๆ จาก Unsplash มาเป็นรูปอวตารบอท
                </p>
              </div>
            </div>

            <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-3.5 mt-4 text-[11px] text-indigo-400 flex items-start gap-2">
              <Activity className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <strong>💡 ข้อดีของระบบจำลอง:</strong> คุณจะได้เห็นสถิติ ปริมาณข้อความ คำสั่ง และจำลองความคุ้นเคยก่อนเปิดรันโค้ดจริง (Deploy) บนเซิร์ฟเวอร์ Node.js หรือ Python โดยไม่ต้องเสียค่าบริการ API ในขั้นตอนพัฒนานี้
              </div>
            </div>
          </div>

          {/* Quick Demo Credentials: development-only escape hatch */}
          {showDemoCredentials && <div className={`border rounded-2xl p-5 sm:p-6 shadow-sm ${
            theme === "light" ? "bg-white border-slate-200" : "bg-[#111114] border-white/5"
          }`}>
            <h3 className="text-xs font-extrabold uppercase text-gray-400 tracking-wider mb-3 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-gray-500" />
              บัญชีทดสอบในระบบจำลอง (Quick-Click Login Demo)
            </h3>
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              คลิกเลือกบัญชีจำลองด้านล่างเพื่อสลับสิทธิ์การใช้งาน และทดสอบระบบจัดการบอท + ควบคุมจำนวนโควตาบอท (Bot Limits) หรือสิทธิ์เปิด/ปิดการเข้าถึงได้ทันที
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {users.map((u) => (
                <button
                  key={u.username}
                  onClick={() => handleQuickLogin(u)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer hover:-translate-y-0.5 flex flex-col justify-between gap-1.5 group ${
                    u.role === "admin"
                      ? "border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10"
                      : u.isActive
                        ? "border-white/5 bg-black/20 hover:bg-black/30"
                        : "border-rose-500/10 bg-rose-500/5 opacity-60 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">
                      {u.name}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      u.role === "admin"
                        ? "bg-indigo-500/20 text-indigo-300"
                        : u.isActive
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-rose-500/10 text-rose-400"
                    }`}>
                      {u.role === "admin" ? "Master Admin" : u.isActive ? "ใช้งานได้" : "โดนปิดบัญชี"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between w-full text-[10px] text-gray-500 font-mono pt-1 border-t border-white/5">
                    <span>ID: {u.username} | Pass: {u.password}</span>
                    <span className="text-indigo-400 font-bold">จำกัดบอท: {u.botLimit} ตัว</span>
                  </div>
                </button>
              ))}
            </div>
          </div>}
        </div>

        {/* Right Side: Secure Login Form */}
        <div className="lg:col-span-5">
          <div className={`border rounded-3xl p-6 sm:p-8 shadow-xl ${
            theme === "light" ? "bg-white border-slate-200 shadow-slate-100" : "bg-[#111114] border-white/5 shadow-black/50"
          }`}>
            <div className="text-center mb-6 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/20">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-lg font-bold text-slate-100">ระบบเข้าสู่ใช้งาน</h2>
              <p className="text-xs text-gray-400">กรุณากรอกรหัสผ่านที่ได้รับจากผู้ดูแลระบบสูงสุดเพื่อเริ่มตั้งค่าบอท</p>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 mb-5 text-xs text-rose-400 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed font-semibold">{error}</div>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">ชื่อผู้ใช้งาน (Username / ID)</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    required
                    className={`w-full border rounded-xl pl-9 pr-4 py-2.5 text-xs focus:outline-none transition-all font-semibold ${
                      theme === "light" 
                        ? "bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500" 
                        : "bg-black/40 border-white/5 text-slate-100 focus:border-indigo-500"
                    }`}
                    placeholder="ใส่ชื่อผู้ใช้ เช่น admin หรือ staff1"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-300">รหัสผ่าน (Password)</label>
                  <span className="text-[10px] text-gray-500 hover:text-indigo-400 cursor-pointer transition-colors font-medium">ลืมรหัสผ่าน?</span>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="password"
                    required
                    className={`w-full border rounded-xl pl-9 pr-4 py-2.5 text-xs focus:outline-none transition-all font-mono ${
                      theme === "light" 
                        ? "bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500" 
                        : "bg-black/40 border-white/5 text-slate-100 focus:border-indigo-500"
                    }`}
                    placeholder="ใส่รหัสผ่าน 8 หลัก"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
              >
                <Lock className="w-4 h-4 inline-block mr-2" />
                {isSubmitting ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}
              </button>
            </form>

            <div className="mt-6 border-t border-white/5 pt-4 text-center">
              <p className="text-[10px] text-gray-500">
                การเข้าสู่ระบบจะใช้ session ที่ปลอดภัยบนเซิร์ฟเวอร์
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={`border-t py-4 text-center text-[10px] text-gray-500 ${
        theme === "light" ? "bg-white border-slate-200" : "bg-[#111114] border-white/5"
      }`}>
        <p>© 2026 Jimmy_bot Suite. ขับเคลื่อนด้วยโมเดลจำลองระดับสูงและวิเคราะห์ความปลอดภัยเสมือนจริง</p>
      </footer>
    </div>
  );
}
