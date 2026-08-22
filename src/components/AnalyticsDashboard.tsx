import { useState } from "react";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { 
  Activity, 
  TrendingUp, 
  Users, 
  MessageSquare, 
  ShieldAlert, 
  Sparkles, 
  RefreshCw, 
  Clock, 
  Terminal,
  MousePointer
} from "lucide-react";
import { BotConfig } from "../types";

interface AnalyticsDashboardProps {
  config: BotConfig;
}

export default function AnalyticsDashboard({ config }: AnalyticsDashboardProps) {
  const [trafficScale, setTrafficScale] = useState<'normal' | 'high' | 'peak'>('normal');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Dynamic values depending on selected traffic scale
  const multipliers = {
    normal: 1,
    high: 1.8,
    peak: 3.2
  };
  const mult = multipliers[trafficScale];

  // Helper to format large numbers
  const fNum = (n: number) => Math.round(n).toLocaleString("th-TH");

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
  };

  // 1. Command Frequency Data
  const commandData = [
    { name: "/start", count: 184 * mult, fill: "#6366f1" },
    { name: "/help", count: 125 * mult, fill: "#3b82f6" },
    { name: "/rules", count: 96 * mult, fill: "#10b981" },
    { name: "/info", count: 72 * mult, fill: "#f59e0b" },
    { name: "ข้อความทั่วไป", count: 320 * mult, fill: "#ec4899" },
    { name: "ปุ่มเมนูลัด", count: 215 * mult, fill: "#8b5cf6" },
  ];

  // 2. Interaction Patterns (24h trend)
  const hourlyPattern = [
    { hour: "00:00", messages: 12 * mult, botResponses: 11 * mult },
    { hour: "04:00", messages: 4 * mult, botResponses: 4 * mult },
    { hour: "08:00", messages: 45 * mult, botResponses: 42 * mult },
    { hour: "12:00", messages: 88 * mult, botResponses: 85 * mult },
    { hour: "16:00", messages: 110 * mult, botResponses: 104 * mult },
    { hour: "20:00", messages: 145 * mult, botResponses: 139 * mult },
    { hour: "23:00", messages: 40 * mult, botResponses: 38 * mult },
  ];

  // 3. User Demographics / Chat Types Proportion
  const chatTypeData = [
    { name: "แชตส่วนตัว (Direct Chat)", value: 45, color: "#6366f1" },
    { name: "ห้องแชตกลุ่ม (Group Chats)", value: 35, color: "#10b981" },
    { name: "แชนแนลประกาศ (Channels)", value: 20, color: "#f59e0b" },
  ];

  return (
    <div className="space-y-6 text-left animate-fadeIn">
      {/* Dashboard Control Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#16161A] border border-white/5 p-4 rounded-2xl">
        <div>
          <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
            แผงควบคุมสถิติวิเคราะห์ของบอท (Usage Analytics Dashboard)
          </h3>
          <p className="text-[11px] text-gray-400">จำลองการโต้ตอบ อัตราการเรียกคำสั่ง และพฤติกรรมผู้ใช้ของบอท: <span className="text-indigo-400 font-bold">{config.name || "My Custom Bot"}</span></p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Traffic Simulator Controller */}
          <div className="bg-black/40 p-1 rounded-xl border border-white/5 flex gap-1">
            {[
              { id: 'normal', label: 'ปกติ', color: 'text-gray-400' },
              { id: 'high', label: 'หนาแน่น', color: 'text-amber-400' },
              { id: 'peak', label: 'Peak Hour ⚡', color: 'text-rose-400' }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTrafficScale(t.id as any)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  trafficScale === t.id 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-gray-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleRefresh}
            className={`p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-gray-300 transition-all cursor-pointer ${isRefreshing ? 'animate-spin' : ''}`}
            title="รีเฟรชข้อมูลแดชบอร์ด"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metrics Grid Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-[#16161A] border border-white/5 p-4 rounded-2xl space-y-1 relative overflow-hidden group shadow-md shadow-black/20">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
            <Users className="w-12 h-12 text-indigo-400" />
          </div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">ผู้ใช้สะสมทั้งหมด (7 วัน)</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-slate-100 font-mono">
              {fNum(512 * mult)}
            </span>
            <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> +14.2%
            </span>
          </div>
          <p className="text-[10px] text-gray-500">บัญชีผู้ใช้จริงที่ไม่ซ้ำกัน</p>
        </div>

        {/* Metric 2 */}
        <div className="bg-[#16161A] border border-white/5 p-4 rounded-2xl space-y-1 relative overflow-hidden group shadow-md shadow-black/20">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
            <MessageSquare className="w-12 h-12 text-emerald-400" />
          </div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">ข้อความขาเข้าทั้งหมด</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-slate-100 font-mono">
              {fNum(1450 * mult)}
            </span>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
              98.4% สำเร็จ
            </span>
          </div>
          <p className="text-[10px] text-gray-500">คำสั่ง + ข้อความพิมพ์คุย</p>
        </div>

        {/* Metric 3 */}
        <div className="bg-[#16161A] border border-white/5 p-4 rounded-2xl space-y-1 relative overflow-hidden group shadow-md shadow-black/20">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
            <Sparkles className="w-12 h-12 text-amber-400" />
          </div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">ความหน่วงเฉลยตอบกลับ</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
              {fNum(config.botSettings.enableAiAssistant ? 850 : 220)} ms
            </span>
            <span className="text-[10px] font-bold text-slate-400 bg-white/5 px-1.5 py-0.5 rounded-md">
              {config.botSettings.enableAiAssistant ? "AI Engine" : "ตอบด่วน"}
            </span>
          </div>
          <p className="text-[10px] text-gray-500">ค่า Ping + เวลาประมวลผลเซิร์ฟเวอร์</p>
        </div>

        {/* Metric 4 */}
        <div className="bg-[#16161A] border border-white/5 p-4 rounded-2xl space-y-1 relative overflow-hidden group shadow-md shadow-black/20">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
            <ShieldAlert className="w-12 h-12 text-rose-500" />
          </div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">การแจ้งเตือนสแปมกลุ่ม</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-rose-400 font-mono">
              {fNum(48 * mult)}
            </span>
            <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded-md">
              -3.4% ลดลง
            </span>
          </div>
          <p className="text-[10px] text-gray-500">บล็อกข้อความและลิงก์ไม่ปลอดภัย</p>
        </div>
      </div>

      {/* Main Charts Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Col: Command Frequency (Bar Chart) - 7 Columns */}
        <div className="lg:col-span-7 bg-[#16161A] border border-white/5 p-5 rounded-2xl space-y-4 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-4 bg-indigo-500 rounded-sm" />
              <h4 className="text-xs font-bold text-slate-100">
                สถิติความถี่คำสั่งและประเภทข้อความที่พบบ่อย (Command & Trigger Frequency)
              </h4>
            </div>
            <span className="text-[10px] text-gray-500 font-semibold font-mono">จำนวนครั้ง (Hits)</span>
          </div>

          <div className="h-[280px] w-full font-sans text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={commandData} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.02)' }}
                  contentStyle={{ 
                    backgroundColor: '#111114', 
                    borderColor: '#27272a', 
                    borderRadius: '12px', 
                    fontSize: '11px',
                    color: '#f8fafc'
                  }}
                  labelStyle={{ fontWeight: 'bold', color: '#a1a1aa' }}
                />
                <Bar dataKey="count" name="จำนวนทริกเกอร์">
                  {commandData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Col: Demographics Proportion (Pie Chart) - 5 Columns */}
        <div className="lg:col-span-5 bg-[#16161A] border border-white/5 p-5 rounded-2xl space-y-4 shadow-md flex flex-col justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-4 bg-emerald-500 rounded-sm" />
            <h4 className="text-xs font-bold text-slate-100">
              อัตราส่วนการใช้งานแยกรายประเภทห้องแชต (Traffic Demographics)
            </h4>
          </div>

          <div className="flex-1 flex flex-col sm:flex-row items-center gap-4 py-2">
            <div className="w-full sm:w-1/2 h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chatTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={58}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chatTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: '#111114', 
                      borderColor: '#27272a', 
                      borderRadius: '12px', 
                      fontSize: '11px',
                      color: '#f8fafc'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex-1 space-y-3.5 w-full">
              {chatTypeData.map((item, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-300 font-semibold truncate">{item.name}</span>
                    <span className="text-slate-100 font-bold ml-auto">{item.value}%</span>
                  </div>
                  <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden border border-white/5">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${item.value}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="border-t border-white/5 pt-3 text-[10px] text-gray-500 flex items-center gap-1">
            <MousePointer className="w-3.5 h-3.5 text-gray-600" />
            <span>โฮเวอร์เมาส์เหนือแผนภูมิเพื่อวิเคราะห์ข้อมูลเชิงลึกเพิ่มเติม</span>
          </div>
        </div>

        {/* Bottom Full Row: Interactive Pattern 24h Trend (Line Chart) - 12 Columns */}
        <div className="lg:col-span-12 bg-[#16161A] border border-white/5 p-5 rounded-2xl space-y-4 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-4 bg-amber-500 rounded-sm" />
              <h4 className="text-xs font-bold text-slate-100">
                พฤติกรรมการโต้ตอบของบอทในช่วงเวลา 24 ชั่วโมง (Interaction Timelines)
              </h4>
            </div>
            <div className="flex items-center gap-4 text-[10px] text-gray-400">
              <span className="flex items-center gap-1.5 font-semibold">
                <span className="w-2.5 h-0.5 bg-[#6366f1] inline-block" /> ข้อความฝั่งผู้ใช้ (User Msg)
              </span>
              <span className="flex items-center gap-1.5 font-semibold">
                <span className="w-2.5 h-0.5 bg-[#10b981] inline-block" /> การตอบกลับของบอท (Bot Reply)
              </span>
            </div>
          </div>

          <div className="h-[240px] w-full font-sans text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hourlyPattern} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="hour" stroke="#71717a" tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: '#111114', 
                    borderColor: '#27272a', 
                    borderRadius: '12px', 
                    fontSize: '11px',
                    color: '#f8fafc'
                  }}
                  labelStyle={{ fontWeight: 'bold', color: '#a1a1aa' }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} className="hidden" />
                <Line 
                  type="monotone" 
                  dataKey="messages" 
                  name="ข้อความผู้ใช้" 
                  stroke="#6366f1" 
                  strokeWidth={2.5} 
                  dot={{ r: 3, strokeWidth: 1 }} 
                  activeDot={{ r: 5 }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="botResponses" 
                  name="การตอบกลับของบอท" 
                  stroke="#10b981" 
                  strokeWidth={2.5} 
                  dot={{ r: 3, strokeWidth: 1 }} 
                  activeDot={{ r: 5 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* New Row: Referral Marketing Growth (Last 7 Days) */}
        <div className="lg:col-span-12 bg-[#16161A] border border-white/5 p-5 rounded-2xl space-y-4 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-4 bg-emerald-500 rounded-sm" />
              <div>
                <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                  อัตราการเติบโตและการรับสมาชิกใหม่ผ่านแชร์ลิงก์ (Viral Referral Growth Over Time)
                  <span className="text-[10px] font-normal text-gray-500">(สัปดาห์ล่าสุด)</span>
                </h4>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-[10px] text-gray-400">
              <span className="flex items-center gap-1.5 font-semibold">
                <span className="w-2.5 h-2.5 bg-emerald-500/20 border border-emerald-400 rounded-sm inline-block" /> ยอดสมาชิกใหม่ (Sign-ups)
              </span>
              <span className="flex items-center gap-1.5 font-semibold">
                <span className="w-2.5 h-2.5 bg-indigo-500/20 border border-indigo-400 rounded-sm inline-block" /> แต้มสะสมที่ถูกแจก (Points Given)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 py-1">
            <div className="bg-black/20 p-3 rounded-xl border border-white/5 text-center">
              <div className="text-[10px] font-bold text-gray-500 uppercase">สมัครผ่านลิงก์สะสม</div>
              <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">{Math.round(164 * mult)} คน</div>
              <div className="text-[9px] text-gray-500 mt-0.5">เฉลี่ย {Math.round(23 * mult)} คน / วัน</div>
            </div>
            <div className="bg-black/20 p-3 rounded-xl border border-white/5 text-center">
              <div className="text-[10px] font-bold text-gray-500 uppercase">แต้มที่จ่ายให้ผู้แนะนำ</div>
              <div className="text-lg font-black text-indigo-400 font-mono mt-0.5">{Math.round(1640 * mult)} แต้ม</div>
              <div className="text-[9px] text-gray-500 mt-0.5">มูลค่า 10 แต้ม / การสมัคร</div>
            </div>
            <div className="bg-black/20 p-3 rounded-xl border border-white/5 text-center">
              <div className="text-[10px] font-bold text-gray-500 uppercase">อัตรา Conversion Rate</div>
              <div className="text-lg font-black text-slate-200 font-mono mt-0.5">64.8%</div>
              <div className="text-[9px] text-emerald-400 font-bold mt-0.5">▲ สูงกว่าค่าเฉลี่ยทั่วไป 12%</div>
            </div>
            <div className="bg-black/20 p-3 rounded-xl border border-white/5 text-center">
              <div className="text-[10px] font-bold text-gray-500 uppercase">สถิติแชร์แคมเปญฮิต</div>
              <div className="text-lg font-black text-amber-400 font-mono mt-0.5">/เช็คแต้ม</div>
              <div className="text-[9px] text-gray-500 mt-0.5">ทริกเกอร์บ่อยที่สุดในห้องกลุ่ม</div>
            </div>
          </div>

          <div className="h-[250px] w-full font-sans text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[
                { date: "02 ก.ค.", signups: Math.round(8 * mult), pointsAwarded: Math.round(80 * mult) },
                { date: "03 ก.ค.", signups: Math.round(15 * mult), pointsAwarded: Math.round(150 * mult) },
                { date: "04 ก.ค.", signups: Math.round(12 * mult), pointsAwarded: Math.round(120 * mult) },
                { date: "05 ก.ค.", signups: Math.round(24 * mult), pointsAwarded: Math.round(240 * mult) },
                { date: "06 ก.ค.", signups: Math.round(35 * mult), pointsAwarded: Math.round(350 * mult) },
                { date: "07 ก.ค.", signups: Math.round(28 * mult), pointsAwarded: Math.round(280 * mult) },
                { date: "08 ก.ค. (วันนี้)", signups: Math.round(42 * mult), pointsAwarded: Math.round(420 * mult) }
              ]} margin={{ top: 15, right: 10, left: -25, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorSignups" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="date" stroke="#71717a" tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: '#111114', 
                    borderColor: '#27272a', 
                    borderRadius: '12px', 
                    fontSize: '11px',
                    color: '#f8fafc'
                  }}
                  labelStyle={{ fontWeight: 'bold', color: '#a1a1aa' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="signups" 
                  name="ยอดผู้สมัครใหม่ผ่านลิงก์" 
                  stroke="#10b981" 
                  fillOpacity={1} 
                  fill="url(#colorSignups)" 
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="pointsAwarded" 
                  name="คะแนนสะสมที่แจกจ่าย (x10)" 
                  stroke="#6366f1" 
                  fillOpacity={1} 
                  fill="url(#colorPoints)" 
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
