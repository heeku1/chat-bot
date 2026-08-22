import { useState } from "react";
import { Sparkles, Loader2, ArrowRight } from "lucide-react";
import { BotConfig } from "../types";

interface AiCopilotProps {
  activeBot?: BotConfig;
  onSuggest: (config: BotConfig) => void;
}

export default function AiCopilot({ activeBot, onSuggest }: AiCopilotProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const samplePrompts = [
    {
      title: "🛍️ บอทร้านค้าออนไลน์",
      desc: "ดูสินค้า, ราคา, วิธีสั่งซื้อ, และบอทตอบคำถามลูกค้าอัตโนมัติ"
    },
    {
      title: "🛡️ บอทดูแลกลุ่มชุมชน",
      desc: "ต้อนรับสมาชิกใหม่, ห้ามสแปมลิงก์, ห้ามพูดหยาบคาย และแจ้งเตือนกฎระเบียบกลุ่ม"
    },
    {
      title: "📢 บอทแชนแนลอัปเดตข่าว",
      desc: "โพสต์ข่าวอสังหาฯ/คริปโต พร้อมลายเซ็นและวางแผนโพสต์ล่วงหน้าอัตโนมัติ"
    }
  ];

  const handleGenerate = async (customPrompt: string) => {
    if (!customPrompt.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: customPrompt,
          geminiApiKey: activeBot?.externalApis?.geminiApiKey,
          openaiApiKey: activeBot?.externalApis?.openaiApiKey
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error || "ระบบ AI ขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง");
      }

      const data = await response.json();
      onSuggest(data);
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาดในการเรียกใช้ AI");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative mb-6">
      {/* Background glow overlay */}
      <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-20"></div>
      
      <div className="relative bg-[#16161A] border border-white/10 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-indigo-600/20 text-indigo-400 p-2 rounded-xl border border-indigo-500/30">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              AI ช่วยออกแบบบอทอัจฉริยะ (AI Copilot)
            </h2>
            <p className="text-xs text-gray-400">พิมพ์อธิบายความต้องการของคุณในภาษาไทย แล้ว AI จะออกแบบและตั้งค่าทุกเมนูให้ทันที!</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <textarea
              className="w-full h-24 pl-4 pr-12 py-3 bg-black/40 border border-white/5 rounded-xl focus:outline-none focus:border-indigo-500 text-sm text-slate-200 placeholder-gray-500 resize-none transition-all"
              placeholder="ตัวอย่าง: สร้างบอทสำหรับแชตร้านเสื้อผ้าแฟชั่น มีเมนูหลักคือ ดูคอลเลกชันใหม่, ราคาและโปรโมชั่น, วิธีชำระเงิน และมีระบบ AI ตอบคำถามลูกค้า..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
            />
            <button
              onClick={() => handleGenerate(prompt)}
              disabled={loading || !prompt.trim()}
              className="absolute bottom-3 right-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white p-2.5 rounded-xl shadow-md transition-all flex items-center justify-center cursor-pointer"
              title="กดส่งให้ AI ช่วยออกแบบ"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </button>
          </div>

          {error && (
            <div className="text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-2 rounded-lg flex items-center gap-1">
              ⚠️ {error}
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-gray-400 mb-2">💡 ไอเดียตั้งต้นด่วน (กดเพื่อคลิกใช้ทันที):</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {samplePrompts.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setPrompt(p.title + " " + p.desc);
                    handleGenerate(p.title + " " + p.desc);
                  }}
                  disabled={loading}
                  className="text-left bg-[#111114] hover:bg-white/5 border border-white/5 hover:border-white/10 rounded-xl p-3 shadow-sm transition-all cursor-pointer"
                >
                  <h4 className="text-xs font-bold text-slate-200 mb-0.5">{p.title}</h4>
                  <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

}
