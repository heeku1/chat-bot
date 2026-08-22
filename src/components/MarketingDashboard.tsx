import React, { useState } from "react";
import { UserAccount, BotConfig } from "../types";
import { 
  Gift, Users, Link as LinkIcon, Copy, Share2, Award, Trophy, 
  Settings, AlertCircle, Check, Sparkles, Send, Zap, Plus, 
  RefreshCw, Eye, MessageSquare, Flame, CheckCircle2, QrCode, Download,
  TrendingUp, BarChart2, Smile, Star, Frown, AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";

interface MarketingDashboardProps {
  theme: "dark" | "light";
  currentUser: UserAccount | null;
  users: UserAccount[];
  onUpdateUsers: (updatedUsers: UserAccount[]) => void;
  activeBot: BotConfig;
  onUpdateBotConfig: (updatedConfig: BotConfig) => void;
  onAddSystemNotification?: (message: string, type?: "success" | "info" | "warning") => void;
}

export default function MarketingDashboard({
  theme,
  currentUser,
  users,
  onUpdateUsers,
  activeBot,
  onUpdateBotConfig,
  onAddSystemNotification,
}: MarketingDashboardProps) {
  // Stats
  const userPoints = currentUser?.points || 0;
  const userReferrals = currentUser?.referralsCount || 0;
  const referralCode = currentUser?.referralCode || currentUser?.username || "user";
  const botUsername = activeBot.name ? activeBot.name.replace(/\s+/g, "_") + "Bot" : "Jimmy_bot";
  const uniqueLink = `https://t.me/${botUsername}?start=ref_${referralCode}`;

  // Local state for copy feedback
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  
  // Customize referral code state
  const [newCode, setNewCode] = useState(referralCode);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeSuccess, setCodeSuccess] = useState<string | null>(null);

  // Simulation form state
  const [simName, setSimName] = useState("");
  const [simUsername, setSimUsername] = useState("");
  const [simEmail, setSimEmail] = useState("");
  const [simulationLogs, setSimulationLogs] = useState<Array<{ id: string; text: string; time: string }>>([]);

  // States for sharing tools
  const [qrDownloading, setQrDownloading] = useState(false);
  const [progressCardDownloading, setProgressCardDownloading] = useState(false);

  // States for AI Social Media Caption Generator
  const [sharePlatform, setSharePlatform] = useState<'facebook' | 'instagram' | 'twitter'>('facebook');
  const [shareTone, setShareTone] = useState<'exciting' | 'professional' | 'trendy' | 'friendly'>('friendly');
  const [generatedCaption, setGeneratedCaption] = useState<string>("");
  const [isGeneratingCaption, setIsGeneratingCaption] = useState<boolean>(false);
  const [captionCopied, setCaptionCopied] = useState<boolean>(false);

  // States for AI Summary Dashboard
  const [analysisResult, setAnalysisResult] = useState<any>({
    summary: "ระบบวิเคราะห์ข้อความล่าสุดเรียบร้อยแล้ว มีกระแสการพูดคุยคึกคักเชิงบวกเกี่ยวกับการเก็บสะสมแต้มและการตอบภารกิจเฉลยบอทเพื่อเคลมคะแนนแคมเปญใหม่",
    sentiment: {
      positive: 75,
      neutral: 15,
      negative: 10,
      label: "เชิงบวกยอดเยี่ยม (Highly Positive)"
    },
    rating: 4.6,
    topics: [
      { topic: "ระบบสะสมคะแนนจากการแนะนำกลุ่มเพื่อน", count: 12, sentiment: "positive" },
      { topic: "พิมพ์คำสั่ง /checkpoints ตรวจเช็กพรีวิวคะแนน", count: 8, sentiment: "positive" },
      { topic: "คำถามเฉลยคำตอบในควิซกิจกรรมกลุ่ม", count: 4, sentiment: "neutral" },
      { topic: "ความต้องการเสนอแลกของรางวัลพรีเมียมขนาดใหญ่ขึ้น", count: 3, sentiment: "negative" }
    ],
    actionItems: [
      "แอดมินควรจัดทำภาพกราฟิกสรุปขั้นตอนพิมพ์คำถามและเฉลยสั้นๆ",
      "ขยายระยะเวลากิจกรรมเพื่อรักษากระแสกระตุ้นสมาชิกในกลุ่ม",
      "จัดแคมเปญย่อยเพิ่มเติมสำหรับผู้สะสมครบ 100 แต้มเพื่อเคลมโบนัสชิ้นพิเศษ"
    ]
  });
  const [sentimentTrend, setSentimentTrend] = useState<Array<{
    time: string;
    positive: number;
    neutral: number;
    negative: number;
  }>>([
    { time: "10:00", positive: 68, neutral: 20, negative: 12 },
    { time: "11:00", positive: 70, neutral: 18, negative: 12 },
    { time: "12:00", positive: 72, neutral: 18, negative: 10 },
    { time: "13:00", positive: 75, neutral: 15, negative: 10 },
    { time: "14:00", positive: 74, neutral: 16, negative: 10 },
    { time: "15:00", positive: 75, neutral: 15, negative: 10 }
  ]);
  const [isAnalyzingChat, setIsAnalyzingChat] = useState<boolean>(false);
  const [showAnalyzedChatLogs, setShowAnalyzedChatLogs] = useState<boolean>(false);

  // Seeded & Dynamic Referral activity log
  const [referralActivityLogs, setReferralActivityLogs] = useState<Array<{
    id: string;
    username: string;
    name: string;
    pointsAdded: number;
    timestamp: string;
    status: "success" | "pending";
  }>>([
    {
      id: "seed-log-1",
      username: "kitti_chai",
      name: "กิตติชัย ไกรศิลป์",
      pointsAdded: 10,
      timestamp: "2 ชั่วโมงที่แล้ว",
      status: "success"
    },
    {
      id: "seed-log-2",
      username: "nisa_rich",
      name: "ณิชาภัทร อนันต์",
      pointsAdded: 10,
      timestamp: "1 วันที่แล้ว",
      status: "success"
    },
    {
      id: "seed-log-3",
      username: "surasit_v",
      name: "สุรสิทธิ์ วิบูลย์",
      pointsAdded: 10,
      timestamp: "3 วันที่แล้ว",
      status: "success"
    }
  ]);

  // Milestone Notification Settings in Bot Config
  const defaultMilestones = [
    { pointsThreshold: 10, message: "🎉 ยินดีด้วยครับ! คุณสะสมแต้มแชร์ครบ 10 คะแนนแล้ว รับสิทธิ์เปิดฟีเจอร์ AI พรีเมียมทดลองฟรี 3 วัน!" },
    { pointsThreshold: 50, message: "🎁 เยี่ยมยอดมากครับ! คุณสะสมแต้มแชร์ครบ 50 คะแนนแล้ว รับคูปองส่วนลดซื้อเซ็ตบอทดูแลกลุ่ม 20% ทันที!" },
    { pointsThreshold: 100, message: "👑 ระดับตำนานตัวจริง! คุณแชร์สะสมแต้มครบ 100 คะแนน รับสิทธิ์สร้างบอทเพิ่มฟรี +2 ตัวถาวรทันที!" }
  ];

  const currentMilestones = activeBot.marketingSettings?.milestones || defaultMilestones;
  const milestonesEnabled = activeBot.marketingSettings?.enableMilestoneNotifications !== false;

  const [milestones, setMilestones] = useState(currentMilestones);
  const [enableMilestones, setEnableMilestones] = useState(milestonesEnabled);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Viral Campaign Builder states
  const [campaignName, setCampaignName] = useState(activeBot.marketingSettings?.campaignName || "สงกรานต์แชร์สนั่นรับโบนัส");
  const [rewardPoints, setRewardPoints] = useState(activeBot.marketingSettings?.rewardPointsPerInvite || 10);
  const [challengeQuestion, setChallengeQuestion] = useState(activeBot.marketingSettings?.challengeQuestion || "JIMMY BOT เปิดให้บริการครั้งแรกในปี ค.ศ. ใด?");
  const [challengeAnswer, setChallengeAnswer] = useState(activeBot.marketingSettings?.challengeAnswer || "2024");
  const [challengeActive, setChallengeActive] = useState(activeBot.marketingSettings?.challengeActive ?? true);

  // Synchronize with activeBot configuration updates
  React.useEffect(() => {
    if (activeBot.marketingSettings) {
      if (activeBot.marketingSettings.campaignName) {
        setCampaignName(activeBot.marketingSettings.campaignName);
      }
      if (activeBot.marketingSettings.rewardPointsPerInvite !== undefined) {
        setRewardPoints(activeBot.marketingSettings.rewardPointsPerInvite);
      }
      if (activeBot.marketingSettings.challengeQuestion) {
        setChallengeQuestion(activeBot.marketingSettings.challengeQuestion);
      }
      if (activeBot.marketingSettings.challengeAnswer) {
        setChallengeAnswer(activeBot.marketingSettings.challengeAnswer);
      }
      if (activeBot.marketingSettings.challengeActive !== undefined) {
        setChallengeActive(activeBot.marketingSettings.challengeActive);
      }
      if (activeBot.marketingSettings.milestones) {
        setMilestones(activeBot.marketingSettings.milestones);
      }
      if (activeBot.marketingSettings.enableMilestoneNotifications !== undefined) {
        setEnableMilestones(activeBot.marketingSettings.enableMilestoneNotifications);
      }
    }
  }, [activeBot]);

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(uniqueLink)}`;

  // Sorting users to get Leaderboard
  const sortedLeaderboard = [...users]
    .map(u => ({
      ...u,
      points: u.points || 0,
      referralsCount: u.referralsCount || 0
    }))
    .sort((a, b) => b.points - a.points);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(uniqueLink);
    setCopied(true);
    if (onAddSystemNotification) {
      onAddSystemNotification("📋 คัดลอกลิงก์แนะนำบอกต่อสำเร็จแล้ว! ส่งต่อเพื่อรับแต้มได้เลย", "success");
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQRCode = async () => {
    setQrDownloading(true);
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `referral_qr_${referralCode}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      if (onAddSystemNotification) {
        onAddSystemNotification("📥 ดาวน์โหลดรูปภาพ QR Code สำหรับสแกนสำเร็จแล้ว!", "success");
      }
    } catch (error) {
      console.error("Failed to download QR code", error);
      // Fallback
      window.open(qrCodeUrl, "_blank");
    } finally {
      setQrDownloading(false);
    }
  };

  // Dynamic Progress Card Image Creator using HTML5 Canvas API
  const handleDownloadProgressCard = () => {
    setProgressCardDownloading(true);
    
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setProgressCardDownloading(false);
      return;
    }

    // 1. Background Gradient
    const grad = ctx.createLinearGradient(0, 0, 800, 600);
    grad.addColorStop(0, "#0a0b10");
    grad.addColorStop(0.5, "#141324");
    grad.addColorStop(1, "#181028");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 600);

    // Grid details for a technical / cyberpunk aesthetic
    ctx.strokeStyle = "rgba(99, 102, 241, 0.07)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 800; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 600);
      ctx.stroke();
    }
    for (let i = 0; i < 600; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(800, i);
      ctx.stroke();
    }

    // Border Frame
    ctx.strokeStyle = "#6366f1";
    ctx.lineWidth = 4;
    ctx.strokeRect(15, 15, 770, 570);
    
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(22, 22, 756, 556);

    // 2. Render Header
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 26px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(activeBot.name ? `${activeBot.name.toUpperCase()} REWARDS` : "TELEGRAM BOT VIRAL ENGINE", 400, 65);

    ctx.fillStyle = "#10b981";
    ctx.font = "bold 11px monospace";
    ctx.fillText("OFFICIAL REFERRED CAMPAIGN PARTNER", 400, 90);

    // 3. Partner Card Information Area (Solid glass box)
    ctx.fillStyle = "rgba(10, 10, 15, 0.65)";
    ctx.fillRect(50, 130, 420, 220);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.strokeRect(50, 130, 420, 220);

    ctx.textAlign = "left";
    ctx.fillStyle = "#a5b4fc";
    ctx.font = "bold 11px monospace";
    ctx.fillText("CAMPAIGN PARTNER DETAILS", 75, 160);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText(currentUser?.name || "สมาชิกร่วมแชร์", 75, 195);

    ctx.fillStyle = "#71717a";
    ctx.font = "13px monospace";
    ctx.fillText(`ID: @${currentUser?.username || "user"}`, 75, 220);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 13px monospace";
    ctx.fillText(`REFERRAL CODE: ${referralCode}`, 75, 255);

    // Divider
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.beginPath();
    ctx.moveTo(75, 275);
    ctx.lineTo(445, 275);
    ctx.stroke();

    // Stats
    ctx.fillStyle = "#a1a1aa";
    ctx.font = "9px sans-serif";
    ctx.fillText("EARNED POINTS", 75, 300);
    ctx.fillText("TOTAL INVITES", 275, 300);

    ctx.fillStyle = "#f59e0b";
    ctx.font = "bold 20px monospace";
    ctx.fillText(`${userPoints} PTS`, 75, 325);

    ctx.fillStyle = "#10b981";
    ctx.font = "bold 20px monospace";
    ctx.fillText(`${userReferrals} REFS`, 275, 325);

    // 4. Milestone Progress bar
    ctx.fillStyle = "rgba(5, 5, 10, 0.4)";
    ctx.fillRect(50, 380, 700, 130);
    ctx.strokeRect(50, 380, 700, 130);

    ctx.textAlign = "left";
    ctx.fillStyle = "#e4e4e7";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText("MILESTONE COMPLETION PROGRESS", 75, 415);

    const barX = 75;
    const barY = 430;
    const barW = 650;
    const barH = 10;

    // Track Background
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW, barH, 5);
      ctx.fill();
    } else {
      ctx.fillRect(barX, barY, barW, barH);
    }

    // Fill
    const fillPercent = Math.min(100, (userPoints / 100) * 100);
    const fillW = (fillPercent / 100) * barW;
    if (fillW > 0) {
      const barGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
      barGrad.addColorStop(0, "#6366f1");
      barGrad.addColorStop(1, "#10b981");
      ctx.fillStyle = barGrad;
      
      if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(barX, barY, fillW, barH, 5);
        ctx.fill();
      } else {
        ctx.fillRect(barX, barY, fillW, barH);
      }
    }

    // Milestones details
    const pointsSteps = [10, 50, 100];
    const pointLabels = ["10 PTS: AI Premium", "50 PTS: 20% Discount", "100 PTS: Legendary"];
    
    pointsSteps.forEach((step, idx) => {
      const stepX = barX + (step / 100) * barW;
      const reached = userPoints >= step;
      
      ctx.fillStyle = reached ? "#10b981" : "#3f3f46";
      ctx.beginPath();
      ctx.arc(stepX, barY + 5, reached ? 6 : 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.textAlign = "center";
      ctx.fillStyle = reached ? "#f4f4f5" : "#71717a";
      ctx.font = "bold 9px sans-serif";
      ctx.fillText(pointLabels[idx], stepX, barY + 28);

      ctx.fillStyle = reached ? "#10b981" : "#71717a";
      ctx.font = reached ? "bold 10px monospace" : "9px monospace";
      ctx.fillText(reached ? "✓ ACTIVE" : `${step} PTS`, stepX, barY - 10);
    });

    // 5. Drawing footer
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.font = "9px monospace";
    ctx.fillText(`CAMPAIGN LINK: ${uniqueLink}`, 400, 542);
    ctx.fillStyle = "#10b981";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("Scan QR code, start your chat, and build passive growth with our bots!", 400, 562);

    // 6. Draw QR code with CORS handling
    const qrImg = new Image();
    qrImg.crossOrigin = "anonymous";
    qrImg.onload = () => {
      ctx.fillStyle = "#ffffff";
      if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(520, 130, 230, 220, 12);
        ctx.fill();
      } else {
        ctx.fillRect(520, 130, 230, 220);
      }
      ctx.drawImage(qrImg, 535, 140, 200, 200);

      // Trigger standard browser download
      const dataUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = dataUrl;
      downloadLink.download = `referral_progress_${referralCode}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      setProgressCardDownloading(false);
      if (onAddSystemNotification) {
        onAddSystemNotification("🎨 ดาวน์โหลดบัตรความคืบหน้าสะสมแต้มสำเร็จแล้ว! พร้อมนำไปแชร์เป็นสตอรี่หรือโพสต์เรียกรุ่นพี่เพื่อนๆ", "success");
      }
    };
    qrImg.onerror = () => {
      // Fallback: draw placeholder if network error or CORS issue
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(520, 130, 230, 220);
      ctx.fillStyle = "#000000";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("QR CODE IMAGE", 635, 230);
      ctx.font = "9px monospace";
      ctx.fillText("api.qrserver.com offline", 635, 250);

      const dataUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = dataUrl;
      downloadLink.download = `referral_progress_${referralCode}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      setProgressCardDownloading(false);
    };

    qrImg.src = qrCodeUrl;
  };

  const handleSaveCode = () => {
    setCodeError(null);
    setCodeSuccess(null);
    const cleanCode = newCode.trim().replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();

    if (!cleanCode) {
      setCodeError("❌ รหัสแนะนำต้องประกอบด้วยตัวอักษรและตัวเลขเท่านั้น");
      return;
    }

    if (cleanCode.length < 3 || cleanCode.length > 15) {
      setCodeError("❌ รหัสแนะนำต้องมีความยาวระหว่าง 3-15 ตัวอักษร");
      return;
    }

    // Check uniqueness (excluding current user)
    const exists = users.some(u => u.username !== currentUser?.username && u.referralCode?.toLowerCase() === cleanCode);
    if (exists) {
      setCodeError("⚠️ ขออภัย รหัสแนะนำนี้มีผู้ใช้อื่นใช้งานแล้ว กรุณาลองรหัสอื่น");
      return;
    }

    // Update in users list
    const updatedUsers = users.map(u => {
      if (u.username === currentUser?.username) {
        return { ...u, referralCode: cleanCode };
      }
      return u;
    });

    onUpdateUsers(updatedUsers);
    setCodeSuccess("✅ อัปเดตรหัสแนะนำส่วนตัวของคุณเรียบร้อยแล้ว!");
    if (onAddSystemNotification) {
      onAddSystemNotification(`🎯 เปลี่ยนรหัสแนะนำเป็น "${cleanCode}" เรียบร้อยแล้ว`, "success");
    }
    setTimeout(() => setCodeSuccess(null), 3000);
  };

  // Simulate new registration via tracking link
  const handleSimulateRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const name = simName.trim();
    const username = simUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    
    if (!name || !username) {
      if (onAddSystemNotification) {
        onAddSystemNotification("❌ กรุณากรอกชื่อและชื่อผู้ใช้สำหรับการจำลอง", "warning");
      }
      return;
    }

    // Check if user already exists
    if (users.some(u => u.username === username)) {
      if (onAddSystemNotification) {
        onAddSystemNotification(`⚠️ ชื่อผู้ใช้ "${username}" ซ้ำในระบบจำลอง`, "warning");
      }
      return;
    }

    // Create fictional referred user
    const newUser: UserAccount = {
      username: username,
      name: name,
      role: "member",
      isActive: true,
      botLimit: 3,
      createdAt: new Date().toLocaleDateString('th-TH'),
      points: 0,
      referralsCount: 0,
      referralCode: username,
      referredBy: referralCode
    };

    // Calculate next point increment for currentUser (Dynamic Campaign Points per successful referral!)
    const oldPoints = currentUser.points || 0;
    const pointsToAdd = rewardPoints;
    const newPoints = oldPoints + pointsToAdd;
    const oldReferrals = currentUser.referralsCount || 0;
    const newReferrals = oldReferrals + 1;

    // Check milestones
    let milestoneMessage = null;
    if (enableMilestones) {
      // Find milestones that were crossed just now
      const crossedMilestone = milestones.find(m => oldPoints < m.pointsThreshold && newPoints >= m.pointsThreshold);
      if (crossedMilestone) {
        milestoneMessage = crossedMilestone.message;
      }
    }

    // Update all users
    const updatedUsers = users.map(u => {
      if (u.username === currentUser.username) {
        return {
          ...u,
          points: newPoints,
          referralsCount: newReferrals
        };
      }
      return u;
    });

    // Add the new referred user to the system lists
    const finalUsersList = [...updatedUsers, newUser];
    onUpdateUsers(finalUsersList);

    // Logging the simulation action
    const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const logId = Math.random().toString();
    const newLog = {
      id: logId,
      text: `👤 ผู้ใช้ใหม่ "${name}" (@${username}) สมัครสมาชิกผ่านรหัสเชิญชวนของคุณแล้ว! (+${pointsToAdd} แต้มจากแคมเปญ "${campaignName}")`,
      time: timeStr
    };

    setSimulationLogs(prev => [newLog, ...prev]);

    // Append directly to the mini-referral activity log
    const dynamicActLog = {
      id: `act-log-${Date.now()}`,
      username: username,
      name: name,
      pointsAdded: pointsToAdd,
      timestamp: "เมื่อสักครู่นี้",
      status: "success" as const
    };
    setReferralActivityLogs(prev => [dynamicActLog, ...prev]);

    // Triggers
    if (onAddSystemNotification) {
      onAddSystemNotification(`🎉 จำลองสำเร็จ! @${username} ลงทะเบียนผ่านลิงก์ของคุณแล้ว คุณได้รับ +${pointsToAdd} คะแนน`, "success");
    }

    if (milestoneMessage) {
      setTimeout(() => {
        const milestoneLog = {
          id: Math.random().toString(),
          text: `👑 [ระบบส่งรางวัลอัตโนมัติ] คุณทำแต้มถึงระดับ Milestone สำเร็จ!\n"${milestoneMessage}"`,
          time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
        setSimulationLogs(prev => [milestoneLog, ...prev]);
        if (onAddSystemNotification) {
          onAddSystemNotification(`🏆 บอทส่งข้อความบรรลุเป้าหมายแต้มสะสมรางวัลให้คุณแล้ว!`, "info");
        }
      }, 1500);
    }

    // Reset Form fields
    setSimName("");
    setSimUsername("");
    setSimEmail("");
  };

  const handleUpdateMilestone = (index: number, value: string) => {
    const updated = [...milestones];
    updated[index].message = value;
    setMilestones(updated);
  };

  const handleUpdateMilestonePoints = (index: number, points: number) => {
    const updated = [...milestones];
    updated[index].pointsThreshold = Math.max(1, points);
    setMilestones(updated);
  };

  const handleSaveMilestoneSettings = () => {
    setIsSavingSettings(true);
    
    const updatedConfig: BotConfig = {
      ...activeBot,
      marketingSettings: {
        enableMilestoneNotifications: enableMilestones,
        milestones: milestones,
        campaignName: campaignName,
        rewardPointsPerInvite: rewardPoints,
        challengeQuestion: challengeQuestion,
        challengeAnswer: challengeAnswer,
        challengeActive: challengeActive
      }
    };

    onUpdateBotConfig(updatedConfig);
    
    setTimeout(() => {
      setIsSavingSettings(false);
      if (onAddSystemNotification) {
        onAddSystemNotification("💾 บันทึกเกณฑ์แจกของรางวัล แคมเปญ และข้อความจำลองเฉลยกลุ่ม สำเร็จ!", "success");
      }
    }, 600);
  };

  const handleGenerateCaption = async () => {
    setIsGeneratingCaption(true);
    setCaptionCopied(false);
    try {
      const response = await fetch("/api/ai/generate-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignName,
          rewardPoints,
          inviteLink: uniqueLink,
          platform: sharePlatform,
          tone: shareTone,
          geminiApiKey: activeBot.externalApis?.geminiApiKey || null,
          openaiApiKey: activeBot.externalApis?.openaiApiKey || null
        })
      });
      const data = await response.json();
      if (data.caption) {
        setGeneratedCaption(data.caption);
        if (onAddSystemNotification) {
          onAddSystemNotification("✍️ เจนเนอเรตแคปชั่นแชร์แคมเปญสำเร็จแล้ว!", "success");
        }
      } else {
        throw new Error(data.error || "ไม่สามารถดึงข้อมูลแคปชั่นได้");
      }
    } catch (err: any) {
      console.error(err);
      if (onAddSystemNotification) {
        onAddSystemNotification(`❌ เกิดข้อผิดพลาด: ${err.message || "กรุณาลองอีกครั้ง"}`, "warning");
      }
    } finally {
      setIsGeneratingCaption(false);
    }
  };

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(generatedCaption);
    setCaptionCopied(true);
    if (onAddSystemNotification) {
      onAddSystemNotification("📋 คัดลอกแคปชั่นใส่คลิปบอร์ดแล้ว พร้อมแชร์ลงโซเชียล!", "success");
    }
    setTimeout(() => setCaptionCopied(false), 2000);
  };

  const handleAnalyzeGroupChat = async () => {
    setIsAnalyzingChat(true);
    try {
      const currentKey = activeBot.token || activeBot.name;
      const storageKey = `sandbox_chat_history_${currentKey}`;
      const saved = localStorage.getItem(storageKey);
      
      let messagesToAnalyze = [];
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.groupChat && parsed.groupChat.length > 0) {
            messagesToAnalyze = parsed.groupChat.filter((m: any) => m.sender !== "system");
          }
        } catch (e) {
          console.error("Error reading saved chat history in analyzer:", e);
        }
      }

      if (messagesToAnalyze.length === 0) {
        messagesToAnalyze = [
          { senderName: "สมชาย (Somchai)", text: "แคมเปญนี้แจกแต้มจริงไหมครับ อยากได้แต้มแลกของรางวัลเร็วๆ จัง" },
          { senderName: "สมปอง (Sompong)", text: "ผมเพิ่งได้แต้ม +10 แต้มจากการสะสมแต้มแชร์มาครับ บอทตอบไวมาก!" },
          { senderName: "อนันต์ (Anan)", text: "พิมพ์เฉลยภารกิจแล้วแต้มยังไม่ขึ้นเลย ต้องเว้นวรรคแบบไหนครับ?" },
          { senderName: "จิมมี่ (Jimmy)", text: "ใครมีทริคแชร์แคมเปญให้คนสมัครกดลิ้งก์เร็วๆ บ้าง แชร์ต่อกันในกลุ่มหน่อย" },
          { senderName: "วัลลภ (Wanlop)", text: "แจกโบนัสแต้มสะสมคุ้มค่ามากเลยครับ เอาไปแลกฟีเจอร์พรีเมียมตัวจริงได้เฉยเลย โครตชอบ" },
          { senderName: "กรรณิการ์ (Kannika)", text: "บอทจำลองตอบสนองคำสั่ง /checkpoints ได้ฉับไวมาก ไม่กวนใจเลยจ้า" },
          { senderName: "สุดารัตน์ (Sudarat)", text: "อยากเสนอแนะให้มีของรางวัลใหญ่ๆ มาให้สะสมแต้มแลกเพิ่มขึ้นอีกหน่อยค่ะ แคมเปญจะได้คึกคัก" },
          { senderName: "วีระ (Weera)", text: "ทำไมระบบควิซข้อที่ 2 งงๆ นิดหน่อย แต่ก็ตอบถูกจนได้ ยินดีด้วยครับทุกคน" },
          { senderName: "สุรศักดิ์ (Surasak)", text: "สุดยอดบอทตอบไวเฉลยถูกต้องเลย แอดมินใจดีมากกก" }
        ];
      }

      const response = await fetch("/api/ai/analyze-group-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesToAnalyze,
          geminiApiKey: activeBot.externalApis?.geminiApiKey || null,
          openaiApiKey: activeBot.externalApis?.openaiApiKey || null
        })
      });

      const data = await response.json();
      if (data && !data.error) {
        setAnalysisResult(data);
        
        // Add new sentiment data point to chart trend
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        setSentimentTrend(prev => {
          const next = [...prev];
          if (next.length >= 8) {
            next.shift(); // keep it within last 8 data points
          }
          next.push({
            time: timeStr,
            positive: data.sentiment?.positive ?? 70,
            neutral: data.sentiment?.neutral ?? 20,
            negative: data.sentiment?.negative ?? 10
          });
          return next;
        });

        if (onAddSystemNotification) {
          onAddSystemNotification("📊 ดึงข้อมูลแชตล่าสุดและอัปเดต AI Summary Dashboard เรียบร้อย!", "success");
        }
      } else {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการวิเคราะห์");
      }
    } catch (err: any) {
      console.error(err);
      if (onAddSystemNotification) {
        onAddSystemNotification(`❌ การวิเคราะห์ล้มเหลว: ${err.message || "กรุณาลองใหม่อีกครั้ง"}`, "warning");
      }
    } finally {
      setIsAnalyzingChat(false);
    }
  };

  const handleDownloadWeeklySummary = () => {
    try {
      const dateStr = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
      const docContent = `===========================================================
📊 รายงานวิเคราะห์ห้องสนทนาและสรุปประเด็นแคมเปญรายสัปดาห์ (AI Weekly Digest)
===========================================================
ข้อมูล ณ วันที่: ${dateStr}
บอทจำลองแคมเปญ: ${activeBot.name || "Jimmy Bot"}
คะแนนเรตติ้งแคมเปญโดยรวม: ${analysisResult?.rating || "4.6"} / 5.0
ดัชนีความรู้สึกสมาชิก (Sentiment Score):
 - เชิงบวก (Positive): ${analysisResult?.sentiment?.positive || 75}%
 - ทั่วไป (Neutral): ${analysisResult?.sentiment?.neutral || 15}%
 - เชิงลบ (Negative): ${analysisResult?.sentiment?.negative || 10}%
สถานะความรู้สึกรวม: ${analysisResult?.sentiment?.label || "เชิงบวกดีเยี่ยม (Highly Positive)"}

-----------------------------------------------------------
📝 บทสรุปความคิดเห็นหลัก (AI Weekly Summary Narrative):
-----------------------------------------------------------
${analysisResult?.summary || "สมาชิกส่วนใหญ่ตอบสนองเชิงบวกต่อแคมเปญ มีการสนทนาอย่างคึกคักเกี่ยวกับการป้อนเฉลยในบอทเพื่อรับคะแนน"}

-----------------------------------------------------------
💬 หัวข้อหลักยอดฮิตที่มีการพูดคุยบ่อย (Top Discussed Topics):
-----------------------------------------------------------
${analysisResult?.topics?.map((t: any, idx: number) => `${idx + 1}. [${t.sentiment === "positive" ? "เชิงบวก" : t.sentiment === "negative" ? "เชิงลบ" : "ทั่วไป"}] ${t.topic} (${t.count} ข้อความ)`).join("\n") || "ไม่มีข้อมูลประเด็นคุยหลัก"}

-----------------------------------------------------------
⚠️ ประเด็นร้องเรียน & ปัญหาที่พบบ่อย (Common User Complaints):
-----------------------------------------------------------
 - ปัญหาการพิมพ์คำถามเฉลยคำตอบภารกิจ (คีย์เวิร์ดเฉลยเว้นวรรคผิดพลาด)
 - สมาชิกบางรายเสนอแนะให้มีของรางวัลพรีเมียมขนาดใหญ่ขึ้น
 - ปัญหาการสแปมแชร์ลิงก์ซ้ำเพื่อปั่นคะแนนสะสม

-----------------------------------------------------------
💡 รายการข้อเสนอแนะสำหรับแอดมิน (Recommended Action Items):
-----------------------------------------------------------
${analysisResult?.actionItems?.map((item: string, idx: number) => ` [ ] ${idx + 1}. ${item}`).join("\n") || "ไม่มีข้อมูลข้อเสนอแนะ"}

===========================================================
สร้างขึ้นโดยอัตโนมัติด้วยระบบวิเคราะห์ข้อมูลอัจฉริยะ Gemini AI (Jimmy Bot)
===========================================================`;

      const blob = new Blob([docContent], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Weekly_AI_Summary_${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (onAddSystemNotification) {
        onAddSystemNotification("💾 ดาวน์โหลดรายงานสรุปประเด็นรายสัปดาห์สำเร็จเรียบร้อย!", "success");
      }
    } catch (err) {
      console.error("Failed to download summary:", err);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Intro Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-950/40 via-[#16161C] to-[#121216] border border-indigo-500/10 rounded-2xl p-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Marketing & Viral Engine
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] text-gray-400 font-bold">ระบบบอกต่อและสะสมแต้ม</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
              🎯 ระบบแชร์เพื่อสะสมคะแนนแลกรางวัล (Referral Marketing System)
            </h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              เครื่องมือสร้างการรับรู้แบรนด์และกระตุ้นการขยายฐานผู้ใช้บอทโดยอัตโนมัติ 
              ลูกเพจสามารถแชร์ลิงก์เพื่อแนะนำกลุ่ม/บอทให้เพื่อนมาสมัคร เมื่อคนกดลิงก์เข้ามา ลูกเพจจะได้คะแนนสะสม 
              เพื่อไปตรวจเช็กผ่านระบบ <span className="font-mono text-emerald-400">/checkPoints</span> และแลกสิทธิประโยชน์ในอนาคต!
            </p>
          </div>

          <div className="flex gap-4 shrink-0 bg-black/40 border border-white/5 p-4 rounded-2xl items-center">
            <Trophy className="w-10 h-10 text-amber-400" />
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">แต้มของคุณปัจุบัน</div>
              <div className="text-2xl font-black text-slate-100 font-mono tracking-tight flex items-baseline gap-1.5">
                <span className="text-amber-400">{userPoints}</span>
                <span className="text-xs text-gray-400 font-normal">คะแนน</span>
              </div>
              <div className="text-[10px] text-emerald-400 font-bold mt-0.5">
                👥 แนะนำสำเร็จ: {userReferrals} คน
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Summary Dashboard */}
      <div className="bg-[#141418] border border-indigo-500/10 rounded-2xl p-5 sm:p-6 space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Real-time AI Sentiment Analyzer
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span>
            </div>
            <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-indigo-400" />
              แผงวิเคราะห์และสรุปห้องแชตอัจฉริยะด้วย AI (AI Summary & Sentiment Dashboard)
            </h3>
            <p className="text-xs text-gray-400">
              ดึงประวัติการคุยล่าสุดในห้องกลุ่มจำลองมาวิเคราะห์อารมณ์และสรุปประเด็นกระแสตอบรับแคมเปญด้วย Gemini AI
            </p>
          </div>

          <button
            onClick={handleAnalyzeGroupChat}
            disabled={isAnalyzingChat}
            className="sm:self-center bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all shadow-md shadow-indigo-600/15 cursor-pointer flex items-center justify-center gap-2"
          >
            {isAnalyzingChat ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>กำลังส่งวิเคราะห์...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>อัปเดตบทวิเคราะห์ด้วย AI</span>
              </>
            )}
          </button>
        </div>

        {analysisResult && (
          <div className="space-y-6 relative z-10">
            {/* Top overview row: Sentiment Gauge, Rating, & Summary Narrative */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Col 1: Sentiment Gauge */}
              <div className="md:col-span-4 bg-black/25 border border-white/5 p-4 rounded-xl flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">อารมณ์โดยรวม (Sentiment)</span>
                  <div className="flex items-center gap-2 pt-1">
                    {analysisResult.sentiment?.label?.includes("บวก") || analysisResult.sentiment?.positive > 50 ? (
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                        <Smile className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400">
                        <Frown className="w-5 h-5" />
                      </div>
                    )}
                    <span className="text-sm font-extrabold text-slate-100">{analysisResult.sentiment?.label || "เชิงบวก (Positive)"}</span>
                  </div>
                </div>

                {/* Progress bars */}
                <div className="space-y-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-emerald-400 font-bold">เชิงบวก (Positive)</span>
                      <span className="text-slate-200 font-mono font-bold">{analysisResult.sentiment?.positive || 0}%</span>
                    </div>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${analysisResult.sentiment?.positive || 0}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-amber-400 font-bold">ทั่วไป (Neutral)</span>
                      <span className="text-slate-200 font-mono font-bold">{analysisResult.sentiment?.neutral || 0}%</span>
                    </div>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${analysisResult.sentiment?.neutral || 0}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-rose-400 font-bold">เชิงลบ (Negative)</span>
                      <span className="text-slate-200 font-mono font-bold">{analysisResult.sentiment?.negative || 0}%</span>
                    </div>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-rose-500 h-full transition-all duration-500" style={{ width: `${analysisResult.sentiment?.negative || 0}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Col 2: Rating */}
              <div className="md:col-span-3 bg-black/25 border border-white/5 p-4 rounded-xl flex flex-col justify-between text-center items-center py-6">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">คะแนนความคุ้มค่าแคมเปญ</span>
                  <div className="text-3xl font-black text-amber-400 font-mono pt-1">
                    {analysisResult.rating || "4.5"} <span className="text-xs text-gray-500 font-normal">/ 5.0</span>
                  </div>
                </div>

                <div className="flex gap-1 py-2 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const roundedRating = Math.round(analysisResult.rating || 4.5);
                    return (
                      <Star 
                        key={star} 
                        className={`w-5 h-5 ${
                          star <= roundedRating 
                            ? "text-amber-400 fill-amber-400" 
                            : "text-gray-700"
                        }`} 
                      />
                    );
                  })}
                </div>

                <span className="text-[10px] text-gray-400">ประเมินจากปริมาณข้อเสนอแนะเชิงบวกต่อรางวัล</span>
              </div>

              {/* Col 3: Key Summary narrative */}
              <div className="md:col-span-5 bg-black/25 border border-white/5 p-4 rounded-xl flex flex-col justify-between space-y-2">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" /> บทสรุปความคิดเห็นหลัก (AI Summary)
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    {analysisResult.summary}
                  </p>
                </div>
                <div className="text-[9px] text-gray-500 flex items-center gap-1 border-t border-white/5 pt-2 mt-2">
                  <Zap className="w-3 h-3 text-indigo-400" /> วิเคราะห์ล่าสุดเมื่อสักครู่
                </div>
              </div>

            </div>

            {/* Bottom Row: Topics vs Recommendations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Hot Topics list */}
              <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-3">
                <h4 className="text-xs font-extrabold text-slate-200 flex items-center gap-1.5 uppercase tracking-wide">
                  <TrendingUp className="w-4 h-4 text-emerald-400" /> ประเด็นสำคัญที่สมาชิกพูดคุย (Top Topics)
                </h4>
                <div className="space-y-2">
                  {analysisResult.topics && analysisResult.topics.map((t: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-white/5 text-xs">
                      <span className="text-slate-300 truncate pr-2 font-medium">💬 {t.topic}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold font-mono bg-indigo-500/10 text-indigo-300">
                          {t.count} ข้อความ
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${
                          t.sentiment === "positive" 
                            ? "bg-emerald-500/10 text-emerald-400" 
                            : t.sentiment === "negative"
                            ? "bg-rose-500/10 text-rose-400"
                            : "bg-amber-500/10 text-amber-400"
                        }`}>
                          {t.sentiment === "positive" ? "บวก" : t.sentiment === "negative" ? "ลบ" : "ทั่วไป"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action items list */}
              <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-3">
                <h4 className="text-xs font-extrabold text-slate-200 flex items-center gap-1.5 uppercase tracking-wide">
                  <AlertTriangle className="w-4 h-4 text-indigo-400" /> ข้อเสนอแนะสำหรับแอดมิน (Recommended Actions)
                </h4>
                <ul className="space-y-2.5">
                  {analysisResult.actionItems && analysisResult.actionItems.map((item: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                      <div className="w-4 h-4 rounded border border-indigo-500/40 flex items-center justify-center shrink-0 mt-0.5 bg-indigo-500/5">
                        <Check className="w-3 h-3 text-indigo-400" />
                      </div>
                      <span className="leading-relaxed font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>

            {/* New Row: Sentiment Trend Line Chart & AI Weekly Summary / Download Card */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
              {/* Left col: Sentiment Trend Chart (7 cols) */}
              <div className="lg:col-span-7 bg-black/25 border border-white/5 p-5 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-extrabold text-slate-200 flex items-center gap-1.5 uppercase tracking-wide">
                      <TrendingUp className="w-4 h-4 text-indigo-400" /> เทรนด์อารมณ์ความรู้สึกสมาชิกเรียลไทม์ (Real-time Sentiment Trend)
                    </h4>
                    <p className="text-[10px] text-gray-400">
                      กราฟเส้นแสดงแนวโน้มอารมณ์ของสมาชิกในกลุ่มจากการส่งวิเคราะห์ข้อมูลแชตกลุ่มสด
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 text-[9px] text-gray-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-full inline-block"></span> บวก ({analysisResult.sentiment?.positive || 75}%)</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-500 rounded-full inline-block"></span> ปกติ ({analysisResult.sentiment?.neutral || 15}%)</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-rose-500 rounded-full inline-block"></span> ลบ ({analysisResult.sentiment?.negative || 10}%)</span>
                  </div>
                </div>

                <div className="h-[180px] w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sentimentTrend} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="time" stroke="#71717a" fontSize={10} tickLine={false} />
                      <YAxis stroke="#71717a" fontSize={10} tickLine={false} domain={[0, 100]} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                        labelStyle={{ color: '#a1a1aa', fontWeight: 'bold', fontSize: '10px' }}
                        itemStyle={{ fontSize: '11px' }}
                      />
                      <Line type="monotone" dataKey="positive" name="บวก" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="neutral" name="ปกติ" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="negative" name="ลบ" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Right col: Weekly Digest & Download (5 cols) */}
              <div className="lg:col-span-5 bg-gradient-to-br from-indigo-950/10 to-indigo-900/5 border border-indigo-500/10 p-5 rounded-2xl flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      AI Weekly Digest
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">อัปเดตสัปดาห์นี้</span>
                  </div>

                  <h4 className="text-xs font-black text-slate-100 flex items-center gap-1.5 uppercase tracking-wide">
                    📦 สรุปผลลัพธ์และข้อเสนอแนะแคมเปญสัปดาห์นี้
                  </h4>
                  
                  <div className="space-y-1.5 text-xs text-gray-300 leading-relaxed">
                    <p>
                      <strong>ความคืบหน้าแคมเปญ:</strong> มีการเติบโตขึ้นอย่างมีนัยสำคัญ สมาชิกมีส่วนร่วมในการแชร์ลิงก์สะสมแต้มเฉลี่ยคนละ 4.2 คน และมีการพิมพ์คำสั่งตรวจสอบสถานะแต้ม <span className="font-mono text-indigo-400">/checkPoints</span> ถี่ขึ้น
                    </p>
                    <p className="text-gray-400">
                      <strong>ปัญหาที่พบบ่อย (Complaints):</strong> มีข้อสอบถามประเด็นความล่าช้าในการอนุมัติแต้มรางวัลของเพื่อนบางราย และข้อเสนอเรื่องของรางวัลพรีเมียมขนาดใหญ่ขึ้น
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadWeeklySummary}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/5 hover:border-indigo-500/20 font-bold text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>ดาวน์โหลดสรุปประเด็นรายสัปดาห์ (.TXT)</span>
                </button>
              </div>
            </div>

            {/* View Raw Chat Logs Button */}
            <div className="pt-2 border-t border-white/5 flex flex-col space-y-2">
              <button
                type="button"
                onClick={() => setShowAnalyzedChatLogs(!showAnalyzedChatLogs)}
                className="self-start text-[10px] text-gray-500 hover:text-indigo-400 font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>{showAnalyzedChatLogs ? "🙈 ซ่อนประวัติแชตที่ส่งวิเคราะห์" : "👁️ แสดงประวัติแชตที่ส่งวิเคราะห์ล่าสุด"}</span>
              </button>

              {showAnalyzedChatLogs && (
                <div className="bg-black/30 border border-white/5 p-3 rounded-xl max-h-[160px] overflow-y-auto font-mono text-[10px] text-slate-400 space-y-2.5 custom-scrollbar">
                  <div className="text-[9px] text-gray-600 border-b border-white/5 pb-1 uppercase tracking-wider font-bold">
                    ประวัติแชตกลุ่มที่ป้อนเข้าโมเดล AI (Live Simulation Chat Stream)
                  </div>
                  {/* Pull dynamically */}
                  {(() => {
                    const currentKey = activeBot.token || activeBot.name;
                    const storageKey = `sandbox_chat_history_${currentKey}`;
                    const saved = localStorage.getItem(storageKey);
                    let list = [];
                    if (saved) {
                      try {
                        const parsed = JSON.parse(saved);
                        if (parsed.groupChat && parsed.groupChat.length > 0) {
                          list = parsed.groupChat.filter((m: any) => m.sender !== "system");
                        }
                      } catch(e) {}
                    }
                    if (list.length === 0) {
                      list = [
                        { senderName: "สมชาย (Somchai)", text: "แคมเปญนี้แจกแต้มจริงไหมครับ อยากได้แต้มแลกของรางวัลเร็วๆ จัง" },
                        { senderName: "สมปอง (Sompong)", text: "ผมเพิ่งได้แต้ม +10 แต้มจากการสะสมแต้มแชร์มาครับ บอทตอบไวมาก!" },
                        { senderName: "อนันต์ (Anan)", text: "พิมพ์เฉลยภารกิจแล้วแต้มยังไม่ขึ้นเลย ต้องเว้นวรรคแบบไหนครับ?" },
                        { senderName: "จิมมี่ (Jimmy)", text: "ใครมีทริคแชร์แคมเปญให้คนสมัครกดลิ้งก์เร็วๆ บ้าง แชร์ต่อกันในกลุ่มหน่อย" },
                        { senderName: "วัลลภ (Wanlop)", text: "แจกโบนัสแต้มสะสมคุ้มค่ามากเลยครับ เอาไปแลกฟีเจอร์พรีเมียมตัวจริงได้เฉยเลย โครตชอบ" },
                        { senderName: "กรรณิการ์ (Kannika)", text: "บอทจำลองตอบสนองคำสั่ง /checkpoints ได้ฉับไวมาก ไม่กวนใจเลยจ้า" },
                        { senderName: "สุดารัตน์ (Sudarat)", text: "อยากเสนอแนะให้มีของรางวัลใหญ่ๆ มาให้สะสมแต้มแลกเพิ่มขึ้นอีกหน่อยค่ะ แคมเปญจะได้คึกคัก" }
                      ];
                    }
                    return list.map((msg: any, index: number) => (
                      <div key={index} className="flex gap-2 items-start border-b border-white/5 pb-1.5 last:border-0 last:pb-0">
                        <span className="text-indigo-400 shrink-0">[{msg.senderName || msg.sender}]:</span>
                        <span className="text-slate-300">{msg.text}</span>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* Grid Layout: Referral Engine & Share Link Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Referral Setup & Copy link & Progress Card (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Tracking Link & QR Code Card */}
          <div className="bg-[#141418] border border-white/5 rounded-2xl p-5 space-y-4 relative overflow-hidden">
            <h3 className="text-sm font-extrabold text-slate-200 flex items-center gap-2">
              <LinkIcon className="w-4.5 h-4.5 text-indigo-400" />
              ลิงก์แนะนำบอกต่อและคิวอาร์โค้ด (Your Personalized Referral Hub)
            </h3>

            <p className="text-xs text-gray-400 leading-relaxed">
              เมื่อเพื่อนของคุณกดลิงก์แชร์พิเศษ หรือสแกนคิวอาร์โค้ดนี้ด้านล่าง ระบบจะบันทึกรหัสแคมเปญ <span className="font-mono text-indigo-400">ref_{referralCode}</span> โดยอัตโนมัติ และสะสมแต้มแชร์รางวัลให้คุณทันที!
            </p>

            {/* Grid inside card for Link inputs vs QR Code */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-1">
              
              {/* Left Side of card: copy link & customize (8 cols) */}
              <div className="md:col-span-8 space-y-4">
                
                {/* Copy Link input with slide transition */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">ลิงก์แนะนำส่วนตัว:</span>
                  <div className="flex gap-2 items-center">
                    <div className="flex-1 bg-black/40 border border-white/5 px-3 py-2.5 rounded-xl text-xs text-gray-300 font-mono select-all truncate border-l-2 border-l-indigo-500 flex items-center justify-between">
                      <span className="truncate">{uniqueLink}</span>
                    </div>
                    
                    <button
                      onClick={handleCopyLink}
                      className={`px-4 py-2.5 rounded-xl border transition-all duration-300 cursor-pointer flex items-center justify-center shrink-0 font-bold text-xs relative overflow-hidden h-[38px] ${
                        copied 
                          ? "bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30" 
                          : "bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500/20 active:scale-95"
                      }`}
                      title="คัดลอกลิงก์ส่วนตัว"
                    >
                      <AnimatePresence mode="wait">
                        {copied ? (
                          <motion.span
                            key="copied"
                            initial={{ y: 15, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -15, opacity: 0 }}
                            className="flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5 animate-bounce" />
                            <span>คัดลอกแล้ว!</span>
                          </motion.span>
                        ) : (
                          <motion.span
                            key="copy"
                            initial={{ y: -15, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 15, opacity: 0 }}
                            className="flex items-center gap-1"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>คัดลอกลิงก์</span>
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </button>
                  </div>
                </div>

                {/* Customize Referral Code */}
                <div className="bg-[#0B0B0E] p-3 rounded-xl border border-white/5 space-y-2.5">
                  <label className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider">
                    ⚙️ กำหนดรหัสแคมเปญของคุณเอง (Customize Referral Code):
                  </label>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value)}
                      placeholder="เช่น winpoints, sharebonus"
                      className="flex-1 bg-black/40 border border-white/5 px-3 py-1.8 text-xs text-slate-100 rounded-xl focus:outline-none focus:border-indigo-500 transition-all font-mono"
                    />
                    <button
                      onClick={handleSaveCode}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold px-3.5 rounded-xl border border-white/5 transition-all cursor-pointer"
                    >
                      บันทึกรหัส
                    </button>
                  </div>

                  {codeError && (
                    <p className="text-[10px] text-rose-400 font-bold">{codeError}</p>
                  )}
                  {codeSuccess && (
                    <p className="text-[10px] text-emerald-400 font-bold">{codeSuccess}</p>
                  )}
                </div>
              </div>

              {/* Right Side of card: Visual QR Code Generator Bento (4 cols) */}
              <div className="md:col-span-4 bg-black/40 border border-white/5 p-3 rounded-xl flex flex-col items-center justify-between text-center space-y-2">
                <div className="bg-white p-1.5 rounded-lg inline-block shadow-md">
                  <img 
                    src={qrCodeUrl} 
                    alt="Referral Campaign QR Code" 
                    className="w-24 h-24 block object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                
                <div className="w-full space-y-1">
                  <button
                    onClick={handleDownloadQRCode}
                    disabled={qrDownloading}
                    className="w-full bg-[#1e1b4b] hover:bg-indigo-950 text-indigo-300 font-bold text-[10px] py-1.5 px-2 rounded-lg border border-indigo-500/20 transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {qrDownloading ? (
                      <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
                    ) : (
                      <Download className="w-3 h-3 text-indigo-400" />
                    )}
                    <span>{qrDownloading ? "กำลังโหลด..." : "โหลด QR Code (PNG)"}</span>
                  </button>
                  <span className="text-[8px] text-gray-500 block">สแกนเพื่อสมัครผ่านมือถือ</span>
                </div>
              </div>

            </div>
          </div>

          {/* AI Social Caption Generator Card */}
          <div className="bg-[#141418] border border-indigo-500/10 rounded-2xl p-5 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-200 flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-indigo-400 animate-pulse" />
                เครื่องมือสร้างแคปชั่นแชร์โซเชียลด้วย AI (AI Campaign Caption Generator)
              </h3>
              <span className="text-[9px] bg-indigo-500/10 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/20 font-bold uppercase flex items-center gap-1">
                <Zap className="w-2.5 h-2.5 text-indigo-400" /> Auto-Referral
              </span>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              แต่งเนื้อหาโพสต์แชร์แคมเปญ <span className="font-semibold text-slate-300">"{campaignName}"</span> ของคุณลงโซเชียลมีเดียต่างๆ 
              พร้อมใส่ลิ้งก์แนะนำตัวตน, แฮชแท็ก, และประโยค Call-To-Action (CTA) ปิดท้ายเพื่อเรียกยอดสมัครให้คุณง่ายขึ้น!
            </p>

            <div className="space-y-4 pt-1">
              {/* Row 1: Select Platform */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">1. เลือกแพลตฟอร์มปลายทาง (Select Platform):</span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSharePlatform('facebook')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      sharePlatform === 'facebook'
                        ? theme === 'light'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/10'
                          : 'bg-blue-600/20 text-blue-400 border-blue-500/40'
                        : theme === 'light'
                          ? 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:text-gray-900'
                          : 'bg-black/30 text-gray-400 border-white/5 hover:bg-black/50 hover:text-gray-300'
                    }`}
                  >
                    <span>👥 Facebook</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSharePlatform('instagram')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      sharePlatform === 'instagram'
                        ? theme === 'light'
                          ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white border-pink-500 shadow-md shadow-pink-500/10'
                          : 'bg-pink-600/20 text-pink-400 border-pink-500/40'
                        : theme === 'light'
                          ? 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:text-gray-900'
                          : 'bg-black/30 text-gray-400 border-white/5 hover:bg-black/50 hover:text-gray-300'
                    }`}
                  >
                    <span>📸 Instagram</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSharePlatform('twitter')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      sharePlatform === 'twitter'
                        ? theme === 'light'
                          ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/10'
                          : 'bg-slate-500/20 text-slate-300 border-slate-400/40'
                        : theme === 'light'
                          ? 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:text-gray-900'
                          : 'bg-black/30 text-gray-400 border-white/5 hover:bg-black/50 hover:text-gray-300'
                    }`}
                  >
                    <span>🐦 Twitter / X</span>
                  </button>
                </div>
              </div>
 
              {/* Row 2: Select Tone */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">2. เลือกโทนเสียงของโพสต์ (Select Brand Tone):</span>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setShareTone('friendly')}
                    className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all text-center cursor-pointer ${
                      shareTone === 'friendly'
                        ? theme === 'light'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                        : theme === 'light'
                          ? 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:text-gray-900'
                          : 'bg-black/20 text-gray-400 border-white/5 hover:bg-black/40 hover:text-gray-300'
                    }`}
                  >
                    🌸 เป็นมิตร
                  </button>
                  <button
                    type="button"
                    onClick={() => setShareTone('exciting')}
                    className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all text-center cursor-pointer ${
                      shareTone === 'exciting'
                        ? theme === 'light'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                        : theme === 'light'
                          ? 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:text-gray-900'
                          : 'bg-black/20 text-gray-400 border-white/5 hover:bg-black/40 hover:text-gray-300'
                    }`}
                  >
                    🔥 เร้าใจชวนคลิก
                  </button>
                  <button
                    type="button"
                    onClick={() => setShareTone('professional')}
                    className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all text-center cursor-pointer ${
                      shareTone === 'professional'
                        ? theme === 'light'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                        : theme === 'light'
                          ? 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:text-gray-900'
                          : 'bg-black/20 text-gray-400 border-white/5 hover:bg-black/40 hover:text-gray-300'
                    }`}
                  >
                    🏛️ ทางการสุภาพ
                  </button>
                  <button
                    type="button"
                    onClick={() => setShareTone('trendy')}
                    className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all text-center cursor-pointer ${
                      shareTone === 'trendy'
                        ? theme === 'light'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                        : theme === 'light'
                          ? 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:text-gray-900'
                          : 'bg-black/20 text-gray-400 border-white/5 hover:bg-black/40 hover:text-gray-300'
                    }`}
                  >
                    💅 วัยรุ่นจึ้งมาก
                  </button>
                </div>
              </div>

              {/* Row 3: Action Button */}
              <button
                type="button"
                onClick={handleGenerateCaption}
                disabled={isGeneratingCaption}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-bold py-2.5 px-4 rounded-xl border border-indigo-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isGeneratingCaption ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-200" />
                    <span>กำลังคิดและเขียนคำโดนๆ ด้วย AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-indigo-200" />
                    <span>กดเจนเนอเรตแคปชั่นแชร์พร้อมใช้ ⚡ (AI Generate)</span>
                  </>
                )}
              </button>

              {/* Row 4: Display Output Caption */}
              {(generatedCaption || isGeneratingCaption) && (
                <div className="space-y-2 bg-[#0B0B0E] p-4 rounded-xl border border-white/5 relative animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                      📝 ผลลัพธ์แคปชั่นพร้อมแชร์ ({sharePlatform.toUpperCase()} - {shareTone.toUpperCase()}):
                    </span>
                    {generatedCaption && (
                      <button
                        type="button"
                        onClick={handleCopyCaption}
                        className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          captionCopied
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-white/10'
                        }`}
                      >
                        {captionCopied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-200" />
                            <span>คัดลอกแล้ว!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-gray-400" />
                            <span>คัดลอกแคปชั่น</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {isGeneratingCaption ? (
                    <div className="space-y-2.5 py-4">
                      <div className="h-3 bg-white/5 rounded animate-pulse w-3/4" />
                      <div className="h-3 bg-white/5 rounded animate-pulse w-5/6" />
                      <div className="h-3 bg-white/5 rounded animate-pulse w-2/3" />
                      <div className="h-3 bg-white/5 rounded animate-pulse w-1/2" />
                    </div>
                  ) : (
                    <div className="text-xs text-slate-200 whitespace-pre-wrap font-sans leading-relaxed select-all max-h-64 overflow-y-auto pr-1 bg-black/20 p-3 rounded-lg border border-white/5">
                      {generatedCaption}
                    </div>
                  )}
                  
                  {generatedCaption && (
                    <div className="text-[10px] text-gray-500 text-right pt-1 font-medium">
                      💡 เคล็ดลับ: คุณสามารถคัดลอกข้อความด้านบนเพื่อนำไปวางโพสต์แชร์ได้เลย
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Visual Referral Progress Card (Loyalty Badge Canvas) */}
          <div className="bg-[#141418] border border-white/5 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-200 flex items-center gap-2">
                <Award className="w-4.5 h-4.5 text-amber-400" />
                บัตรความคืบหน้านักแนะนำแบรนด์ (Visual Campaign Badge)
              </h3>
              <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 font-bold uppercase">social-ready preview</span>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              พรีวิวดีไซน์พิเศษที่คุณสามารถเซฟรูปภาพนี้ไปโพสต์บนสตอรี่ Facebook, Line, หรือกลุ่มสตรีมมิ่งต่างๆ เพื่อสร้างฐานผู้แนะนำของคุณเองได้อย่างสะดุดตา
            </p>

            {/* Design Pass Preview Card representation */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#0a0b10] via-[#141324] to-[#181028] border-2 border-indigo-500/30 rounded-2xl p-5 shadow-2xl relative">
              {/* Design overlay glow circles */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
              
              {/* Outer decorative neon lines */}
              <div className="absolute top-3 left-3 right-3 bottom-3 border border-white/5 rounded-xl pointer-events-none" />
              <div className="absolute top-4 left-4 w-4 h-4 border-t border-l border-emerald-500/40 pointer-events-none" />
              <div className="absolute top-4 right-4 w-4 h-4 border-t border-r border-emerald-500/40 pointer-events-none" />
              <div className="absolute bottom-4 left-4 w-4 h-4 border-b border-l border-emerald-500/40 pointer-events-none" />
              <div className="absolute bottom-4 right-4 w-4 h-4 border-b border-r border-emerald-500/40 pointer-events-none" />

              <div className="space-y-4 relative z-10">
                
                {/* Header title */}
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-slate-100 text-xs">J</div>
                    <div>
                      <h4 className="text-xs font-black text-slate-100 tracking-tight">{activeBot.name ? `${activeBot.name.toUpperCase()}` : "JIMMY BOT"} REWARDS</h4>
                      <p className="text-[8px] text-gray-400 uppercase font-mono tracking-widest">Viral Growth Engine</p>
                    </div>
                  </div>
                  
                  <span className="text-[8px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded font-mono uppercase">
                    verified partner
                  </span>
                </div>

                {/* Info and QR body */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  
                  {/* Left Column: User info */}
                  <div className="md:col-span-8 space-y-3">
                    <div>
                      <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest block font-mono">Affiliate Partner</span>
                      <h4 className="text-base font-black text-slate-200">{currentUser?.name || "สมาชิกร่วมแชร์"}</h4>
                      <p className="text-[10px] text-gray-400 font-mono">@{currentUser?.username || "user"}</p>
                    </div>

                    <div className="flex gap-4">
                      <div className="bg-black/35 border border-white/5 p-2 rounded-xl flex-1 text-center">
                        <span className="text-[8px] text-gray-500 block uppercase font-mono">Earned Points</span>
                        <span className="text-base font-black text-amber-400 font-mono">{userPoints} <span className="text-[9px] font-normal text-gray-400">PTS</span></span>
                      </div>
                      <div className="bg-black/35 border border-white/5 p-2 rounded-xl flex-1 text-center">
                        <span className="text-[8px] text-gray-500 block uppercase font-mono">Total Invites</span>
                        <span className="text-base font-black text-emerald-400 font-mono">{userReferrals} <span className="text-[9px] font-normal text-gray-400">REFS</span></span>
                      </div>
                    </div>

                    <div className="text-[9px] text-indigo-300 font-mono bg-indigo-500/5 p-1 px-2 rounded border border-indigo-500/10 inline-block">
                      🏷️ Code: {referralCode}
                    </div>
                  </div>

                  {/* Right Column: Mini QR */}
                  <div className="md:col-span-4 flex flex-col items-center justify-center">
                    <div className="bg-white p-1 rounded-lg">
                      <img 
                        src={qrCodeUrl} 
                        alt="QR code display" 
                        className="w-20 h-20 block object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <span className="text-[8px] text-indigo-400 font-bold mt-1 uppercase tracking-widest font-mono">Scan To Join</span>
                  </div>

                </div>

                {/* Progress bar visual inside badge card */}
                <div className="space-y-1 bg-black/40 p-2.5 rounded-xl border border-white/5">
                  <div className="flex justify-between text-[8px] text-gray-400 font-mono">
                    <span>MILESTONE PROGRESS</span>
                    <span className="font-bold text-slate-300">{Math.min(100, Math.round((userPoints/100)*100))}% COMPLETED</span>
                  </div>
                  <div className="w-full bg-slate-800/60 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (userPoints / 100) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[7px] text-gray-500 font-bold gap-1">
                    {milestones.map((m, idx) => (
                      <span key={idx} className={userPoints >= m.pointsThreshold ? "text-emerald-400" : ""}>
                        {m.pointsThreshold} PTS: {idx === 0 ? "AI PREMIUM" : idx === 1 ? "20% OFF" : "ROYALTY"}
                      </span>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* Canvas Trigger Button */}
            <button
              onClick={handleDownloadProgressCard}
              disabled={progressCardDownloading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/10 cursor-pointer flex items-center justify-center gap-1.8"
            >
              {progressCardDownloading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>กำลังสร้างรูปบัตรและดาวน์โหลด...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>ดาวน์โหลดรูปภาพบัตรความคืบหน้าแชร์ (Save Card Image for Sharing)</span>
                </>
              )}
            </button>
          </div>

          {/* Simulated Referral Tester */}
          <div className="bg-[#141418] border border-white/5 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-200 flex items-center gap-2">
                <Share2 className="w-4.5 h-4.5 text-emerald-400" />
                จำลองการแชร์และสมัครสมาชิก (Simulation Testing Engine)
              </h3>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-bold uppercase">sandbox active</span>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              จำลองสถานการณ์ที่มีเพื่อนนอกคลิกที่ลิงก์แชร์ส่วนตัวของคุณและลงทะเบียนเข้าใช้งานระบบ เพื่อทำการทดสอบระบบคะแนน การอัปเดต และการบันทึกกิจกรรมเรียลไทม์
            </p>

            <form onSubmit={handleSimulateRegistration} className="space-y-3.5 bg-black/20 p-4 rounded-xl border border-white/5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">ชื่อเต็มลูกเพจจำลอง</label>
                  <input
                    type="text"
                    value={simName}
                    onChange={(e) => setSimName(e.target.value)}
                    placeholder="เช่น สมใจ รักดี"
                    className="w-full bg-[#111114] border border-white/5 px-3 py-1.8 text-xs text-slate-100 rounded-lg focus:outline-none focus:border-emerald-500 transition-all"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Username ใน Telegram (@)</label>
                  <input
                    type="text"
                    value={simUsername}
                    onChange={(e) => setSimUsername(e.target.value)}
                    placeholder="เช่น somjai_vip"
                    className="w-full bg-[#111114] border border-white/5 px-3 py-1.8 text-xs text-slate-100 rounded-lg focus:outline-none focus:border-emerald-500 transition-all font-mono"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all shadow-md shadow-emerald-600/15 cursor-pointer flex items-center justify-center gap-2"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>คลิกจำลองส่งลิงก์เชิญชวน & ยืนยันการลงทะเบียน</span>
              </button>
            </form>

            {/* Simulation Logs */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">กิจกรรมทดสอบจำลอง (Simulation Sandbox Logs):</span>
              <div className="bg-black/40 border border-white/5 p-3 rounded-xl max-h-[140px] overflow-y-auto font-mono text-[10px] text-slate-400 space-y-2.5 custom-scrollbar">
                {simulationLogs.length > 0 ? (
                  simulationLogs.map((log) => (
                    <div key={log.id} className="flex gap-2 items-start border-b border-white/5 pb-2 last:border-0 last:pb-0">
                      <span className="text-gray-500 shrink-0">[{log.time}]</span>
                      <span className="text-slate-300 leading-relaxed whitespace-pre-line">{log.text}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-600 italic py-3 text-center">ยังไม่มีการทดสอบจำลองในเซสชันนี้</p>
                )}
              </div>
            </div>
          </div>

          {/* Mini-Log: Live Referral Activity Feed */}
          <div className="bg-[#141418] border border-white/5 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-extrabold text-slate-200 flex items-center gap-2">
                <Users className="w-4.5 h-4.5 text-emerald-400" />
                ประวัติความสำเร็จการแนะนำบอกต่อ (Recent Referral Feed)
              </h3>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Live Log</span>
              </div>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              ฟีดความสำเร็จแสดงผู้สมัครใหม่ที่กดสมัครผ่านลิงก์บอกต่อแคมเปญของคุณแบบเรียลไทม์พร้อมคะแนนรางวัลที่บวกสะสม
            </p>

            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
              {referralActivityLogs.map((log) => (
                <div 
                  key={log.id}
                  className="flex items-center justify-between bg-black/25 border border-white/5 p-3 rounded-xl transition-all duration-300 hover:border-white/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-bold text-indigo-300 text-xs">
                      {log.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        {log.name}
                        <span className="text-[9px] text-gray-500 font-mono">@{log.username}</span>
                      </h4>
                      <p className="text-[9px] text-gray-500 flex items-center gap-1">
                        <span>สำเร็จแล้ว</span>
                        <span>•</span>
                        <span>{log.timestamp}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-block text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-lg font-mono font-black">
                      +{log.pointsAdded} PTS
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Side: Leaderboard & Milestones Settings (5 cols) */}
        <div className="lg:col-span-5 space-y-6">

          {/* Viral Campaign Builder */}
          <div className="bg-[#141418] border border-white/5 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-200 flex items-center gap-2">
              <Flame className="w-4.5 h-4.5 text-rose-500 animate-pulse" />
              เครื่องมือสร้างแคมเปญไวรัล (Viral Campaign Builder)
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              ออกแบบแคมเปญกระตุ้นยอดแชร์ของคุณทันที กำหนดชื่อแคมเปญ คะแนนรางวัล และสร้างภารกิจตอบคำถามกลุ่มเพื่อตรวจสอบสถานะผู้แชร์
            </p>

            <div className="space-y-3.5">
              {/* Campaign Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  📢 ชื่อแคมเปญส่งเสริมการแชร์:
                </label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="เช่น ชวนเพื่อนรับโบนัสทวีคูณ, แจกใหญ่ท้ายปี"
                  className="w-full bg-black/40 border border-white/5 px-3 py-2 text-xs text-slate-100 rounded-xl focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Reward Points */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    🎁 คะแนนรางวัลเฉพาะกิจต่อการแชร์:
                  </label>
                  <span className="text-xs font-black text-rose-400 font-mono">{rewardPoints} PTS</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={rewardPoints}
                  onChange={(e) => setRewardPoints(parseInt(e.target.value) || 10)}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="flex justify-between text-[9px] text-gray-500 font-bold">
                  <span>5 PTS</span>
                  <span>50 PTS</span>
                  <span>100 PTS</span>
                </div>
              </div>

              {/* Question & Answer Challenge Maker */}
              <div className="bg-black/35 p-3 rounded-xl border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase flex items-center gap-1">
                    🎯 ภารกิจตรวจสอบผู้แชร์ (Q&A Challenge)
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={challengeActive}
                      onChange={(e) => setChallengeActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3.5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                <p className="text-[10px] text-gray-500 leading-normal">
                  ให้สมาชิกพิมพ์คำตอบของเฉลยคำถามเพื่อ 'ตรวจสอบการแชร์' และยืนยันแต้ม
                </p>

                {challengeActive && (
                  <div className="space-y-2 pt-1">
                    <div className="space-y-1">
                      <span className="text-[9px] text-gray-400 block font-bold">คำถามในกลุ่ม:</span>
                      <input
                        type="text"
                        value={challengeQuestion}
                        onChange={(e) => setChallengeQuestion(e.target.value)}
                        placeholder="เช่น รหัสผ่านเข้ากลุ่มคืออะไร?"
                        className="w-full bg-black text-slate-200 border border-white/10 rounded-lg text-[11px] p-1.5 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] text-gray-400 block font-bold">เฉลยคำตอบ (พิมพ์ตรงกันเพื่อยืนยัน):</span>
                      <input
                        type="text"
                        value={challengeAnswer}
                        onChange={(e) => setChallengeAnswer(e.target.value)}
                        placeholder="เช่น รักบอทที่สุด"
                        className="w-full bg-black text-slate-200 border border-white/10 rounded-lg text-[11px] p-1.5 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Dynamic campaign quick text snippet */}
              <div className="bg-indigo-950/25 p-2.5 rounded-xl border border-indigo-500/15 text-[10px] text-indigo-300 flex items-start gap-2">
                <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
                <div>
                  <span className="font-bold uppercase block text-[8px] text-indigo-400">ตัวอย่างข้อความแชร์สำเร็จรูป:</span>
                  "🔥 เข้าร่วมแคมเปญ <b>{campaignName}</b> กับเรา สมัครใช้งานรับฟรีโบนัสคะแนนทันที {rewardPoints} คะแนน!"
                </div>
              </div>

              <button
                onClick={handleSaveMilestoneSettings}
                disabled={isSavingSettings}
                className="w-full bg-rose-600 hover:bg-rose-500 disabled:bg-gray-800 text-white font-bold text-xs py-2 rounded-xl transition-all shadow-md shadow-rose-600/15 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isSavingSettings ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังอัปเดตระบบแคมเปญ...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>อัปเดตแคมเปญ & บันทึกค่าทั้งหมด</span>
                  </>
                )}
              </button>

            </div>
          </div>

          {/* Leaderboard Table */}
          <div className="bg-[#141418] border border-white/5 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-200 flex items-center gap-2">
              <Trophy className="w-4.5 h-4.5 text-amber-400" />
              อันดับนักแชร์ระดับสูงสุด (Referrals Leaderboard)
            </h3>

            <p className="text-xs text-gray-400 leading-relaxed">
              ผู้ที่ช่วยแนะนำและบอกต่อสร้างคะแนนสะสมมากที่สุดในแพลตฟอร์มของคุณ
            </p>

            {/* Live Position Summary Widget */}
            {currentUser && (
              <div className="bg-indigo-950/20 border border-indigo-500/20 p-3 rounded-xl flex items-center justify-between text-xs text-indigo-300">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">
                    #{sortedLeaderboard.findIndex(u => u.username === currentUser.username) + 1}
                  </div>
                  <div>
                    <span className="font-bold text-slate-200">อันดับการแข่งขันของคุณ</span>
                    <span className="text-[10px] text-indigo-400 block">Real-time Leaderboard</span>
                  </div>
                </div>
                <div className="text-right font-mono font-bold">
                  <div className="text-amber-400">{currentUser.points || 0} PTS</div>
                  <div className="text-[9px] text-gray-500 font-normal">แนะนำ {currentUser.referralsCount || 0} คน</div>
                </div>
              </div>
            )}

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
              {sortedLeaderboard.map((user, idx) => {
                const isMe = user.username === currentUser?.username;
                let medal = "👥";
                if (idx === 0) medal = "🥇";
                else if (idx === 1) medal = "🥈";
                else if (idx === 2) medal = "🥉";

                return (
                  <div 
                    key={user.username}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                      isMe 
                        ? "bg-indigo-600/10 border-indigo-500/30 text-indigo-200" 
                        : "bg-black/20 border-white/5 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-sm shrink-0 w-5 text-center">{medal}</span>
                      <div className="min-w-0">
                        <span className="font-extrabold truncate block">
                          {user.name} {isMe && <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded font-bold">ฉัน</span>}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">@{user.username}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-slate-100">{user.points} แต้ม</div>
                      <div className="text-[9px] text-gray-500">แนะนำ {user.referralsCount} คน</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reward Milestone Config */}
          <div className="bg-[#141418] border border-white/5 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-200 flex items-center gap-2">
                <Settings className="w-4.5 h-4.5 text-indigo-400" />
                ตั้งค่าเกณฑ์รับของรางวัลและข้อความตอบกลับ
              </h3>
              
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={enableMilestones}
                  onChange={(e) => setEnableMilestones(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3.5 after:transition-all peer-checked:bg-indigo-600"></div>
                <span className="ml-1.5 text-[10px] font-bold text-slate-400">ระบบทำงาน</span>
              </label>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              เมื่อลูกเพจสะสมแต้มแชร์ถึงเกณฑ์ขั้นต่ำ บอทจะทำการส่งสิทธิประโยชน์หรือโค้ดรางวัลตอบกลับไปให้โดยอัตโนมัติ
            </p>

            <div className="space-y-3">
              {milestones.map((ms, index) => (
                <div key={index} className="bg-black/30 p-3 rounded-xl border border-white/5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-indigo-300 uppercase flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-amber-400" /> เป้าหมายรางวัลที่ {index + 1}
                    </span>
                    <div className="flex items-center gap-1 text-[10px]">
                      <span className="text-gray-500">เกณฑ์:</span>
                      <input
                        type="number"
                        value={ms.pointsThreshold}
                        onChange={(e) => handleUpdateMilestonePoints(index, parseInt(e.target.value) || 0)}
                        className="w-12 bg-black text-center text-slate-200 font-mono font-bold border border-white/10 rounded px-1 focus:outline-none"
                      />
                      <span className="text-gray-500">แต้ม</span>
                    </div>
                  </div>

                  <textarea
                    rows={2}
                    value={ms.message}
                    onChange={(e) => handleUpdateMilestone(index, e.target.value)}
                    placeholder="ใส่คำทักทายพร้อมโค้ดรางวัล..."
                    className="w-full bg-[#111114] border border-white/5 rounded-lg text-xs p-2 text-slate-300 focus:outline-none focus:border-indigo-500 transition-all font-sans leading-relaxed"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={handleSaveMilestoneSettings}
              disabled={isSavingSettings}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 text-white font-bold text-xs py-2 rounded-xl transition-all shadow-md shadow-indigo-600/15 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isSavingSettings ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>กำลังบันทึกตั้งค่า...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>บันทึกตั้งค่าระบบ Milestone</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
