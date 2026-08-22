/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Terminal, Copy, Check, Sparkles, AlertCircle, HelpCircle, ArrowRight, Shield, RefreshCw, BarChart2, Activity, Zap, TrendingUp } from "lucide-react";
import { parseBotCommand } from "../utils/commandParser";
import { ParsedCommand } from "../types";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function CommandParserPlayground() {
  const [commandInput, setCommandInput] = useState<string>('/ban @spammer 7d --reason="Spam links in group"');
  const [parsed, setParsed] = useState<ParsedCommand>(() => parseBotCommand('/ban @spammer 7d --reason="Spam links in group"'));
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [presetActive, setPresetActive] = useState<number>(0);

  // Command Usage Analytics State
  const [chartData, setChartData] = useState([
    { name: "อา.", admin: 240, ai: 450, info: 550, total: 1240 },
    { name: "จ.", admin: 380, ai: 620, info: 850, total: 1850 },
    { name: "อ.", admin: 450, ai: 950, info: 1000, total: 2400 },
    { name: "พ.", admin: 410, ai: 880, info: 810, total: 2100 },
    { name: "พฤ.", admin: 550, ai: 1200, info: 1200, total: 2950 },
    { name: "ศ.", admin: 680, ai: 1400, info: 1120, total: 3200 },
    { name: "ส.", admin: 580, ai: 1100, info: 1020, total: 2700 },
  ]);
  const [activeMetric, setActiveMetric] = useState<'total' | 'admin' | 'ai' | 'info'>('total');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const simulateRequest = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setChartData(prev => {
        const next = [...prev];
        const lastDayIdx = next.length - 1;
        const addAdmin = Math.floor(Math.random() * 15) + 5;
        const addAi = Math.floor(Math.random() * 35) + 15;
        const addInfo = Math.floor(Math.random() * 25) + 10;
        
        next[lastDayIdx] = {
          ...next[lastDayIdx],
          admin: next[lastDayIdx].admin + addAdmin,
          ai: next[lastDayIdx].ai + addAi,
          info: next[lastDayIdx].info + addInfo,
          total: next[lastDayIdx].total + addAdmin + addAi + addInfo
        };
        return next;
      });
      setIsSimulating(false);
    }, 300);
  };

  const presets = [
    {
      label: "Ban (พร้อมเหตุผลแบบครอบอัญประกาศ)",
      cmd: '/ban @spammer 7d --reason="Spam links in group"',
      desc: "ระบุตัวผู้รับกรรม คาบเวลา และเหตุผลแบบประโยคยาวที่มีเครื่องหมายคำพูดครอบ"
    },
    {
      label: "Mute (แก้ไขคำผิด + จัดตำแหน่งสลับที่)",
      cmd: '/mutte --reason="พูดหยาบคาย" 123456789 2h',
      desc: "พิมพ์คำสั่งผิดจาก mute เป็น mutte และระบุ ID ตัวเลขหลังแฟล็ก พร้อมทั้งใส่คาบเวลาลอยๆ"
    },
    {
      label: "Warn (แบบด่วนใส่แฟล็กบังคับ)",
      cmd: "/warn @troublemaker --force",
      desc: "เรียกใช้คำสั่งตักเตือน ส่งผลทันทีโดยผ่านขั้นตอนสวิตช์ --force แบบ Boolean"
    },
    {
      label: "Broadcast (บรอดแคสต์แนบมีเดีย)",
      cmd: '/broadcast --target=groups --media="promo-banner" "สวัสดีสมาชิกทุกท่าน เรามีข่าวดีสัปดาห์นี้!"',
      desc: "ส่งข่าวสารระบุกลุ่มเป้าหมาย มีเดีย และเนื้อหาข้อความยาวในส่วนท้าย"
    },
    {
      label: "Config Set (พารามิเตอร์ซ้อน)",
      cmd: "/config set antiSpam.blockLinks=true",
      desc: "คำสั่งระดับแอดมินสำหรับปรับแต่งโมดูลแบบ Key-Value ผ่านระดับพารามิเตอร์ย่อย"
    }
  ];

  useEffect(() => {
    setParsed(parseBotCommand(commandInput));
  }, [commandInput]);

  const handleCopyCode = () => {
    const code = `// ฟังก์ชันหลักในการแยกแยะพารามิเตอร์คำสั่งของ Jimmy_bot
export function parseBotCommand(inputString: string) {
  const trimmed = inputString.trim();
  if (!trimmed || !['/', '!'].includes(trimmed[0])) {
    throw new Error("Invalid command prefix");
  }

  // 1. แยก Token โดยรักษารูปแบบข้อความที่มี Quote ครอบอัญประกาศ
  const tokens = tokenizeCommandLine(trimmed);
  const commandPart = tokens[0].slice(1); // ลบ '/'
  
  // 2. รองรับรูปแบบ @bot_name (เช่น /ban@bot_jimmy)
  let commandName = commandPart;
  if (commandPart.includes("@")) {
    commandName = commandPart.split("@")[0];
  }

  // 3. ปรับปรุงคำสะกดผิดด้วย Fuzzy Logic
  const corrected = fuzzyCorrectCommand(commandName);
  if (corrected) commandName = corrected;

  // 4. วนลูปสแกน Flags และสกัดพารามิเตอร์
  const positionalArgs = [];
  const namedArgs = {};
  let target = null;

  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.startsWith("-")) {
      const keyVal = token.replace(/^-+/, "").split("=");
      if (keyVal[1]) {
        namedArgs[keyVal[0]] = keyVal[1];
      } else {
        namedArgs[keyVal[0]] = true; // Boolean flag
      }
    } else if (token.startsWith("@")) {
      target = { type: 'username', value: token };
    } else if (/^\\d{8,12}$/.test(token)) {
      target = { type: 'userid', value: token };
    } else {
      positionalArgs.push(token);
    }
  }

  return { commandName, target, positionalArgs, namedArgs };
}`;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="bg-[#111114] border border-white/5 rounded-2xl p-5 shadow-xl text-left space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="bg-amber-500/10 text-amber-400 p-2 rounded-xl border border-amber-500/15">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider">
              Sandbox วิเคราะห์คำสั่ง (Jimmy Command Parser Playground)
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              จำลองและวิเคราะห์โครงสร้างพารามิเตอร์ เพื่อกำจัดความคลุมเครือในคำสั่งบอทของคุณ
            </p>
          </div>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
          💡 เลือกทดสอบเทมเพลตคำสั่งต่างๆ
        </label>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCommandInput(preset.cmd);
                setPresetActive(idx);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                presetActive === idx
                  ? "bg-indigo-600/10 border-indigo-500/50 text-indigo-300"
                  : "bg-[#16161A] border-white/5 text-gray-400 hover:text-slate-200 hover:border-white/10"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-indigo-400 italic font-medium px-1">
          &gt;_ {presets[presetActive].desc}
        </p>
      </div>

      {/* Text Input Block */}
      <div className="space-y-2.5">
        <div className="flex justify-between items-center">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            ⌨️ พิมพ์คำสั่งสำหรับ Jimmy_bot เพื่อส่งไปวิเคราะห์
          </label>
          <span className="text-[10px] font-mono text-gray-500">
            ระบบทำงานแบบ Realtime Parsing
          </span>
        </div>
        <div className="relative">
          <input
            type="text"
            value={commandInput}
            onChange={(e) => {
              setCommandInput(e.target.value);
              setPresetActive(-1);
            }}
            placeholder="เช่น /ban @spammer 7d --reason='โพสต์สแปม'"
            className="w-full bg-black/40 border border-white/5 hover:border-white/10 focus:border-indigo-500 rounded-xl px-4 py-3.5 text-xs text-slate-100 font-mono focus:outline-none focus:bg-black/60 transition-all shadow-inner"
          />
          <button
            onClick={() => {
              setCommandInput("");
              setPresetActive(-1);
            }}
            className="absolute right-3.5 top-3.5 text-[10px] font-bold text-gray-500 hover:text-slate-200 transition-colors cursor-pointer"
          >
            ล้าง
          </button>
        </div>
      </div>

      {/* Parser Analysis Breakdown Layout */}
      {parsed.isValid ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Left: Interactive Parse Breakdown Flow (7 Cols) */}
          <div className="md:col-span-7 space-y-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              ผลลัพธ์การคลี่โครงสร้างคำสั่ง (Compiler Resolution Flow)
            </h4>

            {/* Steps Visualizer */}
            <div className="space-y-3">
              {/* 1. Command & Spelling Correction */}
              <div className="bg-[#16161A] border border-white/5 p-3 rounded-xl flex items-start gap-3">
                <div className="bg-indigo-500/10 text-indigo-400 p-1.5 rounded-lg text-xs font-bold font-mono">
                  01
                </div>
                <div className="text-xs flex-1">
                  <div className="font-bold text-slate-200">สกัดฟังก์ชันหลัก (Command Extraction)</div>
                  <div className="text-gray-400 mt-1 flex flex-wrap items-center gap-1.5 font-mono">
                    ตัวนำ: <span className="text-indigo-400 font-bold">"{parsed.prefix}"</span>
                    คำสั่ง: <span className="text-emerald-400 font-bold">"/{parsed.commandName}"</span>
                    {parsed.didFuzzyMatch && (
                      <span className="bg-amber-500/10 text-amber-400 px-1.5 py-0.2 rounded text-[10px] border border-amber-500/15">
                        แก้ไขอัตโนมัติจาก "_{parsed.originalCommandName}_" ด้วย Fuzzy Logics
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Target Identification */}
              <div className="bg-[#16161A] border border-white/5 p-3 rounded-xl flex items-start gap-3">
                <div className="bg-indigo-500/10 text-indigo-400 p-1.5 rounded-lg text-xs font-bold font-mono">
                  02
                </div>
                <div className="text-xs flex-1">
                  <div className="font-bold text-slate-200">ระบุเป้าหมายในการลงโทษ/คำสั่ง (Target Entity)</div>
                  <div className="text-gray-400 mt-1 font-mono">
                    {parsed.target ? (
                      <div className="flex items-center gap-1.5">
                        ประเภท: <span className="text-indigo-400 font-bold">{parsed.target.type === "username" ? "บัญชีผู้ใช้ (@)" : "ไอดีตัวเลข (UID)"}</span>
                        ค่าที่ได้: <span className="text-rose-400 font-extrabold">{parsed.target.value}</span>
                      </div>
                    ) : (
                      <span className="text-gray-500 italic">ไม่พบเป้าหมายจำเพาะในประโยคคำสั่ง (ใช้พารามิเตอร์ทั่วไป)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Flags and Named arguments */}
              <div className="bg-[#16161A] border border-white/5 p-3 rounded-xl flex items-start gap-3">
                <div className="bg-indigo-500/10 text-indigo-400 p-1.5 rounded-lg text-xs font-bold font-mono">
                  03
                </div>
                <div className="text-xs flex-1">
                  <div className="font-bold text-slate-200">คัดกรองธงข้อมูลจำเพาะ (Flags & Named Attributes)</div>
                  <div className="text-gray-400 mt-1.5 space-y-1 font-mono">
                    {Object.keys(parsed.namedArgs).length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {Object.entries(parsed.namedArgs).map(([key, val]) => (
                          <div key={key} className="bg-black/20 px-2 py-1 rounded-lg border border-white/5 flex justify-between items-center">
                            <span className="text-indigo-400 text-[11px]">--{key}</span>
                            <span className="text-amber-400 text-[11px] font-bold truncate max-w-[100px]">{val === true ? "true (Boolean)" : `"${val}"`}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-500 italic">ไม่พบแฟล็กที่ระบุ (--flags หรือ -f)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 4. Positional arguments */}
              <div className="bg-[#16161A] border border-white/5 p-3 rounded-xl flex items-start gap-3">
                <div className="bg-indigo-500/10 text-indigo-400 p-1.5 rounded-lg text-xs font-bold font-mono">
                  04
                </div>
                <div className="text-xs flex-1">
                  <div className="font-bold text-slate-200">อาร์กิวเมนต์แบบพิกัดลำดับ (Positional Arguments)</div>
                  <div className="text-gray-400 mt-1 font-mono">
                    {parsed.positionalArgs.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {parsed.positionalArgs.map((arg, idx) => (
                          <span key={idx} className="bg-black/30 border border-white/5 text-slate-300 text-[10px] px-2 py-0.5 rounded-md">
                            พิกัด [{idx}]: "{arg}"
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-500 italic">ไม่มีข้อมูลแบบจัดลำดับ</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Resolved Ambiguity & Executed Summary */}
            <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-2xl p-4 space-y-3">
              <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-indigo-400" />
                สรุปคำสั่งที่เตรียมส่งไปเรียกใช้งานจริง (Resolved Execution)
              </div>
              <div className="font-mono text-xs text-slate-200 bg-black/30 p-2.5 rounded-xl border border-white/5 flex items-center gap-2">
                <span className="text-indigo-400 font-extrabold">&gt;&gt;</span>
                <span>{parsed.executionSuggestion}</span>
              </div>

              {/* Warnings and Ambiguities resolving */}
              {parsed.ambiguities.length > 0 && (
                <div className="border-t border-indigo-500/10 pt-3 space-y-2">
                  <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                    พบความคลุมเครือที่บอทช่วยแก้ไขให้ (Ambiguity Resolved):
                  </div>
                  <ul className="list-disc pl-4 text-[10px] text-slate-300 space-y-1 leading-relaxed">
                    {parsed.ambiguities.map((amb, aIdx) => (
                      <li key={aIdx}>{amb}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Right: AST Visualizer / Compiler Output (5 Cols) */}
          <div className="md:col-span-5 flex flex-col space-y-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center justify-between">
              <span>ผลลัพธ์ในรูปแบบ JSON (AST Output)</span>
              <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/15">
                Compiler Ready
              </span>
            </h4>

            <div className="bg-black/50 border border-white/5 rounded-2xl p-4 font-mono text-[10px] text-slate-300 flex-1 overflow-x-auto min-h-[300px] shadow-inner relative flex flex-col justify-between">
              <pre className="leading-relaxed whitespace-pre-wrap select-all">
                {JSON.stringify(parsed, null, 2)}
              </pre>

              <div className="border-t border-white/5 pt-3 mt-4 flex items-center justify-between">
                <span className="text-[9px] text-gray-500">
                  ส่ง Object นี้เข้าสู่ฟังก์ชันประมวลผลคำสั่ง
                </span>
                <span className="text-[9px] font-bold text-indigo-400">
                  AST v1.0.0
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#16161A] border border-rose-500/20 p-5 rounded-2xl flex flex-col items-center justify-center text-center space-y-2 text-slate-400">
          <AlertCircle className="w-8 h-8 text-rose-500" />
          <p className="text-xs font-bold text-rose-400">ตรวจพบความผิดพลาดทางโครงสร้างคำสั่ง</p>
          <p className="text-[10px] text-gray-500 font-mono">{parsed.error}</p>
        </div>
      )}

      {/* 📊 Command Usage Analytics Chart & Dashboard */}
      <div className="bg-[#16161A] border border-white/5 rounded-2xl p-4 sm:p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-3">
          <div className="space-y-0.5">
            <h4 className="text-xs font-extrabold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-400" />
              แดชบอร์ดวิเคราะห์ปริมาณการใช้งานคำสั่ง (Command Usage Analytics)
            </h4>
            <p className="text-[11px] text-gray-400">
              วิเคราะห์ความหนาแน่นรายวันและจำแนกหมวดหมู่คำสั่งเพื่อประเมินประสิทธิภาพ
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            {/* Filter buttons */}
            <div className="bg-black/30 p-0.5 rounded-lg border border-white/5 flex gap-0.5 text-[10px] font-bold">
              <button
                onClick={() => setActiveMetric('total')}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer ${activeMetric === 'total' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}
              >
                ทั้งหมด
              </button>
              <button
                onClick={() => setActiveMetric('admin')}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer ${activeMetric === 'admin' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}
              >
                แอดมิน (/ban)
              </button>
              <button
                onClick={() => setActiveMetric('ai')}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer ${activeMetric === 'ai' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}
              >
                ปัญญาประดิษฐ์ AI
              </button>
              <button
                onClick={() => setActiveMetric('info')}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer ${activeMetric === 'info' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}
              >
                ข้อมูลทั่วไป
              </button>
            </div>

            {/* Simulation button */}
            <button
              onClick={simulateRequest}
              disabled={isSimulating}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer active:scale-95"
            >
              <Zap className={`w-3 h-3 ${isSimulating ? 'animate-bounce' : 'animate-pulse text-amber-300'}`} />
              <span>{isSimulating ? "กำลังยิงแชต..." : "จำลองส่งแชตด่วน (+1)"}</span>
            </button>
          </div>
        </div>

        {/* 3 Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-black/20 border border-white/5 rounded-xl p-3 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-semibold text-gray-500 block">ปริมาณคำสั่งสะสม (7 วันล่าสุด)</span>
              <span className="text-base font-extrabold text-indigo-400 font-mono">
                {chartData.reduce((acc, curr) => acc + curr.total, 0).toLocaleString()} ครั้ง
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/10">
              <Activity className="w-4 h-4 text-indigo-400 animate-pulse" />
            </div>
          </div>

          <div className="bg-black/20 border border-white/5 rounded-xl p-3 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-semibold text-gray-500 block">สัดส่วนการเรียกคุย AI Assistant</span>
              <span className="text-base font-extrabold text-emerald-400 font-mono">
                {Math.round((chartData.reduce((acc, curr) => acc + curr.ai, 0) / chartData.reduce((acc, curr) => acc + curr.total, 0)) * 100)}%
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/10">
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
          </div>

          <div className="bg-black/20 border border-white/5 rounded-xl p-3 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-semibold text-gray-500 block">อัตราตอบกลับสำเร็จ (Success Rate)</span>
              <span className="text-base font-extrabold text-amber-400 font-mono">
                99.85%
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/10">
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
          </div>
        </div>

        {/* Recharts Area Container */}
        <div className="w-full h-56 bg-black/40 border border-white/5 rounded-2xl p-2 sm:p-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={activeMetric === 'admin' ? '#EC4899' : activeMetric === 'ai' ? '#10B981' : activeMetric === 'info' ? '#F59E0B' : '#6366F1'} stopOpacity={0.4}/>
                  <stop offset="95%" stopColor={activeMetric === 'admin' ? '#EC4899' : activeMetric === 'ai' ? '#10B981' : activeMetric === 'info' ? '#F59E0B' : '#6366F1'} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2D2D35" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#64748B" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                stroke="#64748B" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#111114', 
                  borderColor: 'rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  fontSize: '11px',
                  color: '#F1F5F9'
                }} 
              />
              <Area 
                type="monotone" 
                dataKey={activeMetric} 
                stroke={activeMetric === 'admin' ? '#EC4899' : activeMetric === 'ai' ? '#10B981' : activeMetric === 'info' ? '#F59E0B' : '#6366F1'} 
                strokeWidth={2.5} 
                fillOpacity={1} 
                fill="url(#colorMetric)" 
                name={activeMetric === 'admin' ? "แอดมินกลุ่ม" : activeMetric === 'ai' ? "เรียกคุย AI" : activeMetric === 'info' ? "ข้อมูลทั่วไป" : "จำนวนคำสั่งรวม"}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Production Guide and Strategy */}
      <div className="bg-[#16161A] border border-white/5 rounded-2xl p-4.5 sm:p-5 space-y-4.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
          <div className="space-y-0.5">
            <h4 className="text-xs font-extrabold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              กลยุทธ์การประมวลผลคำสั่งสำหรับบอทโปรดักชัน (Implementation Strategy)
            </h4>
            <p className="text-[11px] text-gray-400">
              วิธีบริหารจัดการความสับสนซ้ำซ้อนของคำสั่งที่ป้อนโดยผู้ใช้ทั่วไปในกลุ่ม
            </p>
          </div>
          <button
            onClick={handleCopyCode}
            className="self-start sm:self-center bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-400 hover:text-indigo-300 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {copiedCode ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>คัดลอกสำเร็จ</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>คัดลอกโค้ดไปใช้</span>
              </>
            )}
          </button>
        </div>

        {/* 3 Core pillars of command parsing */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1.5 bg-black/25 p-3.5 rounded-xl border border-white/5">
            <div className="font-extrabold text-indigo-300 flex items-center gap-1">
              <span>1. การแยกแยะ Token</span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              การตัดด้วย <code className="font-mono bg-white/5 px-1 py-0.5 rounded text-[10px] text-pink-400">split(' ')</code> แบบปกติจะทำให้อัญประกาศแตกสลาย ดังนั้นต้องใช้ระบบ **Tokenizer State Machine** เพื่อสกัดข้อความภายในเครื่องหมายคำพูดคำคู่ให้อยู่ร่วมกันเป็น Token เดียว
            </p>
          </div>

          <div className="space-y-1.5 bg-black/25 p-3.5 rounded-xl border border-white/5">
            <div className="font-extrabold text-amber-300 flex items-center gap-1">
              <span>2. จัดการความกลับด้านลำดับ</span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              ผู้ใช้กลุ่มมักพิมพ์คำสั่งสลับที่กัน เช่น <code className="font-mono bg-white/5 px-1 py-0.5 rounded text-[10px] text-amber-400">/mute 1d @user</code> และ <code className="font-mono bg-white/5 px-1 py-0.5 rounded text-[10px] text-amber-400">/mute @user 1d</code> ระบบวิเคราะห์จึงไม่ควรยึดติดกับลำดับ Index แต่ใช้สแกน **Regex Pattern** ดึงข้อมูลผู้ใช้ คาบเวลา และแฟล็กแยกกันโดยเสรี
            </p>
          </div>

          <div className="space-y-1.5 bg-black/25 p-3.5 rounded-xl border border-white/5">
            <div className="font-extrabold text-emerald-300 flex items-center gap-1">
              <span>3. ออโตฟลักซ์และการเตือนสติ</span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              เมื่อมีพารามิเตอร์ขัดแย้งกัน ตัวแปรสุดท้ายจะถูกเลือกใช้เป็นข้อมูลทางการ, นำเสนอคำสั่งที่ถูกต้องผ่าน **Fuzzy Logic (Levenshtein Distance)** เสมอหากบอทพบคำสะกดผิดใกล้เคียงคำสั่งจริง และแจ้งเตือนความขัดแย้งในประโยคให้ผู้ใช้รู้อย่างสุภาพ
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
