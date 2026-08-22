import { useState } from "react";
import { Check, Copy, Bot, Users, Megaphone, Terminal, FileCode, Play, PlusCircle, Calculator, TrendingUp, Cpu, Sparkles, Database } from "lucide-react";
import { BotConfig } from "../types";
import { generateNodeJsCode, generatePythonCode } from "../utils/codeGenerator";

interface DeployGuideProps {
  config: BotConfig;
}

export default function DeployGuide({ config }: DeployGuideProps) {
  const [lang, setLang] = useState<'node' | 'python'>('node');
  const [copied, setCopied] = useState(false);

  // Cost Calculator States
  const [mau, setMau] = useState<number>(1500);
  const [msgPerDay, setMsgPerDay] = useState<number>(8);
  const [aiPercent, setAiPercent] = useState<number>(15);
  const [hostingType, setHostingType] = useState<'free' | 'vps' | 'serverless'>('vps');

  const nodeCode = generateNodeJsCode(config);
  const pythonCode = generatePythonCode(config);
  const currentCode = lang === 'node' ? nodeCode : pythonCode;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Hosting & API Cost Calculations
  const totalMonthlyMsgs = mau * msgPerDay * 30;
  const aiMsgs = Math.round(totalMonthlyMsgs * (aiPercent / 100));
  const nonAiMsgs = totalMonthlyMsgs - aiMsgs;

  // AI Cost: Gemini Flash / GPT-4o-mini averages around $0.00015 per conversation query (approx 1000 input tokens + 300 output tokens)
  const aiUnitCost = 0.00015; 
  const aiCostUsd = aiMsgs * aiUnitCost;

  // Compute Cost
  let computeCostUsd = 0;
  if (hostingType === 'vps') {
    // Standard basic Linux VPS starting at $4 to $6 based on MAU
    computeCostUsd = mau > 10000 ? 12 : mau > 3000 ? 6 : 4;
  } else if (hostingType === 'serverless') {
    // Pay-per-use Serverless like Cloud Run / AWS Lambda
    // $0.00001 per regular message handler invocation, plus base free-tier credit
    const serverlessCalculated = (totalMonthlyMsgs * 0.00001);
    computeCostUsd = serverlessCalculated > 2 ? serverlessCalculated : 0; // standard free tier matches small usage
  } else {
    // Free Hosting tier
    computeCostUsd = 0;
  }

  // Database / Network storage cost
  // standard SQLite/local file is free, Firestore has free tier of 50k reads/writes per day
  const dbCostUsd = totalMonthlyMsgs > 150000 ? Math.min(20, (totalMonthlyMsgs - 150000) * 0.00006) : 0;

  const totalCostUsd = computeCostUsd + aiCostUsd + dbCostUsd;
  const totalCostThb = Math.round(totalCostUsd * 35); // 35 THB/USD exchange rate

  return (
    <div className="space-y-6">
      {/* 🚀 Dynamic Hosting Cost Calculator */}
      <div className="bg-[#16161A] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        
        <h3 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2 border-b border-white/5 pb-2.5">
          <Calculator className="w-4 h-4 text-indigo-400" />
          ระบบคำนวณต้นทุนการรันบอทรายเดือน (Estimated Monthly Hosting Cost)
        </h3>
        <p className="text-[11px] text-gray-400 mb-5 leading-relaxed">
          จำลองต้นทุนการประมวลผลและการใช้งาน AI จริงตามปริมาณการใช้งานของลูกค้า เพื่อประเมินค่าใช้จ่ายในการเปิดตัวบอทจริง (Hosting, Databases, APIs)
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls */}
          <div className="lg:col-span-7 space-y-4">
            {/* Control 1: MAU */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-300">จำนวนผู้ใช้งานเฉลี่ยรายเดือน (MAU)</span>
                <span className="text-indigo-400 font-bold font-mono bg-indigo-500/10 px-2 py-0.5 rounded">
                  {mau.toLocaleString()} คน
                </span>
              </div>
              <input 
                type="range" 
                min="100" 
                max="50000" 
                step="100"
                value={mau} 
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setMau(val);
                  if (val > 2000 && hostingType === 'free') {
                    setHostingType('vps'); // Auto switch because free tiers can't support >2000 users reliably
                  }
                }}
                className="w-full h-1 bg-black/40 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[9px] text-gray-500">
                <span>100 คน (กลุ่มเล็ก)</span>
                <span>50,000 คน (กลุ่มใหญ่มาก)</span>
              </div>
            </div>

            {/* Control 2: Message per day */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-300">ความถี่ในการแชต/ถามคำถามเฉลี่ย</span>
                <span className="text-indigo-400 font-bold font-mono bg-indigo-500/10 px-2 py-0.5 rounded">
                  {msgPerDay} ข้อความ / คน / วัน
                </span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="50" 
                step="1"
                value={msgPerDay} 
                onChange={(e) => setMsgPerDay(Number(e.target.value))}
                className="w-full h-1 bg-black/40 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[9px] text-gray-500">
                <span>1 ครั้ง (ประปราย)</span>
                <span>50 ครั้ง (บอทแชตหนักหน่วง)</span>
              </div>
            </div>

            {/* Control 3: AI Percentage */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-300">อัตราส่วนการเรียกใช้ฟีเจอร์ AI (Gemini/OpenAI)</span>
                <span className="text-indigo-400 font-bold font-mono bg-indigo-500/10 px-2 py-0.5 rounded">
                  {aiPercent}% ของข้อความทั้งหมด
                </span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                step="5"
                value={aiPercent} 
                onChange={(e) => setAiPercent(Number(e.target.value))}
                className="w-full h-1 bg-black/40 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[9px] text-gray-500">
                <span>0% (รันคำสั่งแมนนวลอย่างเดียว)</span>
                <span>100% (แชตบอทคุย AI ทุกคำตอบ)</span>
              </div>
            </div>

            {/* Control 4: Hosting Environment */}
            <div className="space-y-1.5 pt-1">
              <span className="block text-xs font-bold text-slate-300">ประเภทเครื่องเซิร์ฟเวอร์รันบอท (Hosting Infrastructure)</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (mau <= 2500) {
                      setHostingType('free');
                    }
                  }}
                  className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between h-20 ${
                    hostingType === 'free' 
                      ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' 
                      : mau > 2500 
                        ? 'opacity-40 cursor-not-allowed bg-black/10 border-white/5 text-gray-500' 
                        : 'bg-black/30 border-white/5 text-slate-400 hover:border-white/10'
                  }`}
                  disabled={mau > 2500}
                >
                  <span className="text-[10px] font-extrabold block">Free Cloud Hosting</span>
                  <span className="text-[8px] text-gray-400 leading-tight">Render Free / Koyeb / Fly.io (มีจำกัด RAM & Sleep)</span>
                  <span className="text-[10px] font-bold mt-auto text-emerald-400">$0.00 / ด.</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHostingType('vps')}
                  className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between h-20 ${
                    hostingType === 'vps' 
                      ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' 
                      : 'bg-black/30 border-white/5 text-slate-400 hover:border-white/10'
                  }`}
                >
                  <span className="text-[10px] font-extrabold block">Dedicated VPS Linux</span>
                  <span className="text-[8px] text-gray-400 leading-tight">DigitalOcean, Vultr, Hetzner (ทำงานตลอดเวลา 24 ชม.)</span>
                  <span className="text-[10px] font-bold mt-auto text-indigo-400">${mau > 10000 ? '12.00' : mau > 3000 ? '6.00' : '4.00'} / ด.</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHostingType('serverless')}
                  className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between h-20 ${
                    hostingType === 'serverless' 
                      ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' 
                      : 'bg-black/30 border-white/5 text-slate-400 hover:border-white/10'
                  }`}
                >
                  <span className="text-[10px] font-extrabold block">Cloud Serverless</span>
                  <span className="text-[8px] text-gray-400 leading-tight">Google Cloud Run, AWS Lambda (จ่ายตามทราฟฟิกจริง)</span>
                  <span className="text-[10px] font-bold mt-auto text-indigo-400">${Math.max(0, totalMonthlyMsgs * 0.00001).toFixed(2)} / ด.</span>
                </button>
              </div>
              {mau > 2500 && (
                <span className="text-[9px] text-amber-400 block font-semibold">
                  ⚠️ ผู้ใช้เกิน 2,500 คน ไม่เหมาะสมกับ Free Tier (อาจโดนตัดการทำงานหรือแรมเต็ม) แนะนำใช้ VPS หรือ Serverless ครับ
                </span>
              )}
            </div>
          </div>

          {/* Pricing Box Display */}
          <div className="lg:col-span-5 bg-black/40 border border-white/5 rounded-2xl p-4 flex flex-col justify-between space-y-4">
            <div>
              <span className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase block">ประมาณการค่าใช้จ่ายรายเดือน</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-extrabold text-slate-100 tracking-tight font-mono">
                  ฿{totalCostThb.toLocaleString()}
                </span>
                <span className="text-xs text-gray-400 font-semibold">บาท / เดือน</span>
              </div>
              <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                (~${totalCostUsd.toFixed(2)} USD) • ตราแลกเปลี่ยน 1 USD = 35 THB
              </div>
            </div>

            {/* Details Breakdown */}
            <div className="space-y-2 text-[10px] border-t border-white/5 pt-3">
              <div className="flex justify-between">
                <span className="text-gray-400 flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5 text-slate-500" />
                  ค่าโฮสติ้ง ({hostingType === 'free' ? 'Free Cloud' : hostingType === 'vps' ? 'VPS Linux' : 'Cloud Run'})
                </span>
                <span className="font-mono text-slate-200 font-bold">${computeCostUsd.toFixed(2)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400/80" />
                  ค่าประมวลผล AI ({aiMsgs.toLocaleString()} ข้อความ)
                </span>
                <span className="font-mono text-slate-200 font-bold">${aiCostUsd.toFixed(2)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-400 flex items-center gap-1">
                  <Database className="w-3.5 h-3.5 text-slate-500" />
                  ค่าส่งข้อความ & ฐานข้อมูล
                </span>
                <span className="font-mono text-slate-200 font-bold">${dbCostUsd.toFixed(2)}</span>
              </div>

              <div className="flex justify-between border-t border-white/5 pt-1.5 text-xs">
                <span className="font-bold text-slate-300">ปริมาณข้อความรวมทั้งหมด</span>
                <span className="font-mono text-indigo-400 font-bold">{(totalMonthlyMsgs).toLocaleString()} ครั้ง/เดือน</span>
              </div>
            </div>

            {/* Smart Advice Box */}
            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-2.5">
              <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 mb-0.5">
                <TrendingUp className="w-3.5 h-3.5" />
                คำแนะนำการเซฟคอสท์ (Cost Optimizer Tip):
              </div>
              <p className="text-[9px] text-gray-500 leading-relaxed">
                {aiPercent > 30 ? (
                  "💡 ตั้งค่าสัดส่วนการคุย AI ให้อยู่ในกลุ่มเฉพาะหรือใช้เฉพาะเวลาคีย์บอร์ดตอบปกติไม่พบคีย์เวิร์ด เพื่อลดปริมาณ Token ที่ส่งเข้า API และประหยัดค่าใช้จ่ายได้สูงสุดถึง 70%!"
                ) : hostingType === 'vps' && mau < 1500 ? (
                  "💡 ผู้ใช้ของคุณยังไม่หนาแน่นมาก สามารถปรับไปรันแบบ Serverless (Cloud Run) หรือใช้โฮสต์ Free Tier ของ Koyeb/Render ร่วมกับ SQLite เพื่อเซฟค่าโฮสติ้งเป็น 0 บาทต่อเดือนได้เลยครับ!"
                ) : (
                  "💡 โครงสร้างการใช้งานสมดุลและคุ้มค่ามาก แนะนำให้ใช้บอทคู่กับ Gemini 2.5 Flash ซึ่งเป็นรุ่นราคาถูกและตอบกลับด้วยความเร็วสูงเพื่อประสบการณ์ใช้งานที่คล่องตัวที่สุด!"
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Code Export Box */}
      <div className="bg-[#16161A] border border-white/10 rounded-2xl overflow-hidden shadow-lg flex flex-col">
        {/* Code Header Tab */}
        <div className="bg-[#111114] px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-200 font-semibold text-xs">
            <FileCode className="w-4 h-4 text-indigo-400" />
            <span>ซอร์สโค้ดบอทจำลอง (Bot Source Code)</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Language toggle selector */}
            <div className="bg-black/30 p-0.5 rounded-lg border border-white/5 flex gap-0.5">
              <button
                onClick={() => setLang('node')}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${lang === 'node' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Node.js (Telegraf)
              </button>
              <button
                onClick={() => setLang('python')}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${lang === 'python' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Python (telebot)
              </button>
            </div>

            <button
              onClick={handleCopy}
              className="bg-[#111114] hover:bg-white/5 border border-white/5 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">คัดลอกแล้ว!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-indigo-400" />
                  <span>คัดลอกโค้ด</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Code Content Container */}
        <div className="relative flex-1">
          <pre className="p-4 overflow-x-auto text-[11px] font-mono text-slate-300 bg-[#0A0A0B]/85 h-[280px] custom-scrollbar leading-relaxed">
            <code>{currentCode}</code>
          </pre>
        </div>
      </div>

      {/* Code-free Thai Deploy Instructions */}
      <div className="bg-[#16161A] border border-white/10 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2 border-b border-white/5 pb-2">
          <Terminal className="w-4 h-4 text-indigo-400" />
          คู่มือการสร้างและเปิดใช้งานบอทสำหรับมือใหม่ (ทีละขั้นตอน)
        </h3>

        <div className="space-y-6">
          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 font-extrabold w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0">
              1
            </div>
            <div className="space-y-1 flex-1">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-indigo-400" />
                คุยกับ @BotFather เพื่อสร้างบอทฟรี
              </h4>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                เข้าแอป Telegram แล้วค้นหาแชตไอดีพิมพ์ <strong className="text-indigo-400 font-semibold">@BotFather</strong> ซึ่งเป็นบัญชีทางการของ Telegram ในการควบคุมดูแลและสร้างบอทใหม่
              </p>
              <ul className="list-disc pl-4 text-[10px] text-gray-500 space-y-1 mt-1 leading-relaxed">
                <li>พิมพ์ส่งข้อความ <strong className="text-slate-300">/newbot</strong> เพื่อขอสร้างบอทใหม่</li>
                <li>ตั้งชื่อบอทของคุณ (เช่น <span className="italic text-gray-400">My Support Bot</span>)</li>
                <li>ตั้งชื่อยูสเซอร์เนมบอท โดยลงท้ายด้วยคำว่า <strong className="text-slate-300">_bot</strong> (เช่น <span className="italic text-gray-400">my_support_bot</span>)</li>
                <li>คุณจะได้รับข้อความต้อนรับพร้อมรหัสความปลอดภัยยาวๆ ที่เรียกว่า <strong className="text-indigo-400 font-semibold">HTTP API Token</strong> ให้คัดลอกรหัสนี้เก็บไว้</li>
              </ul>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 font-extrabold w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0">
              2
            </div>
            <div className="space-y-1 flex-1">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4 text-indigo-400" />
                เชิ่อมต่อ Token และปรับแต่ง
              </h4>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                นำรหัส Token ที่ได้จาก @BotFather ไปใส่ในช่อง <strong>"รหัส Bot Token"</strong> ในหัวข้อข้อมูลพื้นฐานของแอปนี้เพื่อเชื่อมระบบ
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 font-extrabold w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0">
              3
            </div>
            <div className="space-y-1 flex-1">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Play className="w-4 h-4 text-indigo-400" />
                วิธีรันบอททำงานบนเครื่องคอมพิวเตอร์ หรือบนคลาวด์ฟรี
              </h4>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                คุณสามารถนำโค้ดที่คัดลอกจากด้านบนไปรันใช้งานได้ฟรีตลอด 24 ชั่วโมง โดยมีตัวเลือกยอดนิยมสำหรับคนไม่รู้โค้ดดังนี้:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                <div className="bg-[#111114] p-3 rounded-xl border border-white/5">
                  <span className="text-[10px] font-bold text-slate-300 block mb-1">ตัวเลือก A: รันผ่านเว็บบนคลาวด์ Replit (แนะนำสำหรับคนไม่เขียนโค้ด)</span>
                  <p className="text-[9px] text-gray-500 leading-relaxed">
                    สมัครสมาชิกที่ <a href="https://replit.com" target="_blank" rel="noreferrer" className="text-indigo-400 underline hover:text-indigo-300">replit.com</a> ฟรี จากนั้นสร้างโปรเจกต์ (Repl) เลือกภาษา Node.js หรือ Python แล้ววางโค้ดที่คัดลอกจากเว็บนี้ลงในหน้าจอหลัก จากนั้นสร้างไฟล์ชื่อ <code className="bg-black/40 px-1 py-0.5 rounded text-rose-400 text-[8px] font-mono border border-white/5">.env</code> เพื่อกรอก Bot Token ของคุณ กดปุ่ม <span className="font-bold text-emerald-500">Run</span> บอทจะเริ่มทำงานทันที!
                  </p>
                </div>
                <div className="bg-[#111114] p-3 rounded-xl border border-white/5">
                  <span className="text-[10px] font-bold text-slate-300 block mb-1">ตัวเลือก B: รันผ่านคอมพิวเตอร์ตัวเอง (Local run)</span>
                  <p className="text-[9px] text-gray-500 leading-relaxed">
                    ติดตั้ง {lang === 'node' ? 'Node.js' : 'Python'} บนคอมพิวเตอร์ของคุณ จากนั้นนำโค้ดไปใส่ในไฟล์ {lang === 'node' ? 'index.js' : 'bot.py'} สร้างไฟล์ <code className="bg-black/40 px-1 py-0.5 rounded text-rose-400 text-[8px] font-mono border border-white/5">.env</code> บรรจุข้อมูล Token แล้วเปิด Terminal พิมพ์รันตามที่อธิบายไว้ในหัวโค้ด บอทจะทำหน้าที่ให้บริการจากคอมพิวเตอร์ของคุณทันที!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex gap-4">
            <div className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 font-extrabold w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0">
              4
            </div>
            <div className="space-y-1 flex-1">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-400" />
                การแต่งตั้งสิทธิ์และเพิ่มบอทลงกลุ่มหรือแชนแนล
              </h4>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                หากคุณต้องการนำบอทไปช่วยต้อนรับ คุมกลุ่ม หรือโพสต์แชนแนลข่าวสาร:
              </p>
              <ul className="list-disc pl-4 text-[10px] text-gray-500 space-y-1 leading-relaxed">
                <li>เปิดแชตกลุ่มหรือแชนแนลของคุณ</li>
                <li>ไปที่ตัวเลือกสมาชิก (Members) กดปุ่ม <strong className="text-slate-300">Add Member / Add Administrator</strong></li>
                <li>ค้นหาชื่อยูสเซอร์เนมบอทของคุณ และกดเพิ่มเข้ามาในฐานะผู้ดูแล (Administrator)</li>
                <li><strong>สำคัญมาก:</strong> บอทต้องการสิทธิ์ <strong className="text-indigo-400 font-semibold">Delete Messages</strong> (เพื่อลบลิงก์สแปม/คำหยาบ) และสิทธิ์ <strong className="text-indigo-400 font-semibold">Ban Users</strong> (เพื่อเตะคนออกจากกลุ่มเมื่อทำผิดกฎครบจำนวนครั้ง)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
