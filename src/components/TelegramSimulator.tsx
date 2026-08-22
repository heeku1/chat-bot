import { useState, useEffect, useMemo, useRef } from "react";
import { Send, Bot, Users, Megaphone, ShieldAlert, Sparkles, AlertCircle, RefreshCw, Terminal, Globe, Lock, Shield, Menu, TrendingUp, Activity, Palette, History, Trash2, Check, Volume2, VolumeX, Download, HeartPulse } from "lucide-react";
import { BotConfig, ChatMessage } from "../types";
import D3ResponseDashboard from "./D3ResponseDashboard";
import AnalyticsDashboard from "./AnalyticsDashboard";
import { playSentSound, playReceivedSound, playWarningSound } from "../utils/sound";
import { ButtonAction, buildTelegramButtonPayload, compileButtonModel, resolveButtonAction, resolveConfigAction } from "../utils/buttonActions";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

interface TelegramSimulatorProps {
  config: BotConfig;
}

export default function TelegramSimulator({ config }: TelegramSimulatorProps) {
  const buttonModel = useMemo(() => compileButtonModel(config), [config]);
  const [menuContext, setMenuContext] = useState("root");
  const activeButtonPayload = useMemo(() => buildTelegramButtonPayload(config, menuContext), [config, menuContext]);
  const [activeTab, setActiveTab] = useState<'bot' | 'group' | 'channel' | 'analytics'>('bot');
  const [inputText, setInputText] = useState("");
  const [typing, setTyping] = useState(false);
  const [warnCounts, setWarnCounts] = useState<{ [userId: string]: number }>({});

  // Simulator Theme customizations
  const [wallpaper, setWallpaper] = useState<string>(() => {
    return localStorage.getItem(`sim_wallpaper_${config.token || config.name}`) || 'telegram-classic';
  });
  const [bubbleStyle, setBubbleStyle] = useState<string>(() => {
    return localStorage.getItem(`sim_bubble_${config.token || config.name}`) || 'classic';
  });
  const [showThemePanel, setShowThemePanel] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [showHealthCheckPanel, setShowHealthCheckPanel] = useState(false);
  const [healthChecking, setHealthChecking] = useState(false);
  const [healthResult, setHealthResult] = useState<{
    tested: boolean;
    ok: boolean;
    status: number;
    statusText: string;
    latencyMs: number;
    error: string | null;
    suggestion: string;
  } | null>(null);

  const handleRunHealthCheck = async () => {
    const webhookUrl = config.externalApis?.webhookUrl;
    if (!webhookUrl) {
      setHealthResult({
        tested: true,
        ok: false,
        status: 0,
        statusText: "No Webhook Configured",
        latencyMs: 0,
        error: "ยังไม่ได้ระบุ Webhook URL",
        suggestion: "กรุณาระบุ URL ของเว็บฮุกในหมวดหมู่ 'ตั้งค่าขั้นสูง & API' (Config GUI) เสียก่อนครับ"
      });
      return;
    }

    setHealthChecking(true);
    setHealthResult(null);

    try {
      const response = await fetch("/api/webhook-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl,
          apiAuthToken: config.externalApis?.apiAuthToken
        })
      });

      if (!response.ok) {
        throw new Error(`เซิร์ฟเวอร์รายงานข้อผิดพลาด: HTTP ${response.status}`);
      }

      const data = await response.json();
      setHealthResult({
        tested: true,
        ok: data.ok,
        status: data.status,
        statusText: data.statusText,
        latencyMs: data.latencyMs,
        error: data.error,
        suggestion: data.suggestion
      });
    } catch (err: any) {
      setHealthResult({
        tested: true,
        ok: false,
        status: 0,
        statusText: "Check Failed",
        latencyMs: 0,
        error: err.message || "ล้มเหลวในการเชื่อมต่อระบบตรวจสอบภายใน",
        suggestion: "ตรวจสอบการเชื่อมต่อเซิร์ฟเวอร์จำลอง หรือลองกดทดสอบใหม่อีกครั้ง"
      });
    } finally {
      setHealthChecking(false);
    }
  };

  // Sound controls
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem(`sim_sound_${config.token || config.name}`) !== 'false';
  });

  const prevBotChatLengthRef = useRef(0);
  const prevGroupChatLengthRef = useRef(0);
  const prevChannelChatLengthRef = useRef(0);

  // Live analytics counters
  const [totalUsers, setTotalUsers] = useState(245);
  const [totalReplies, setTotalReplies] = useState(182);
  const [totalBlocked, setTotalBlocked] = useState(14);
  const [keywordHits, setKeywordHits] = useState<{ [keyword: string]: number }>({});
  
  // Custom states for 4 Core Features
  const [showCommandSuggestions, setShowCommandSuggestions] = useState(false);
  const [showInlineSuggestions, setShowInlineSuggestions] = useState(false);
  const [webAppUrl, setWebAppUrl] = useState<string | null>(null);
  const [challengeVerified, setChallengeVerified] = useState<boolean>(() => {
    return localStorage.getItem(`sandbox_challenge_verified_${config.token || config.name}`) === 'true';
  });
  
  // Chats divided by tab
  const [botChat, setBotChat] = useState<ChatMessage[]>([]);
  const [groupChat, setGroupChat] = useState<ChatMessage[]>([]);
  const [channelChat, setChannelChat] = useState<ChatMessage[]>([]);

  // API Webhook logs
  const [apiLogs, setApiLogs] = useState<Array<{ id: string; time: string; event: string; payload: string }>>([]);
  const [showLogsPanel, setShowLogsPanel] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastConfigKeyRef = useRef(config.token || config.name);

  const addApiLog = (event: string, payload: any) => {
    if (!config.externalApis?.sendLeadsToApi) return;
    setApiLogs(prev => [
      {
        id: `log-${Date.now()}-${Math.random()}`,
        time: getFormattedTime(),
        event,
        payload: JSON.stringify(payload, null, 2)
      },
      ...prev
    ]);
  };

  // Persist Theme Customizations
  useEffect(() => {
    localStorage.setItem(`sim_wallpaper_${config.token || config.name}`, wallpaper);
  }, [wallpaper, config]);

  useEffect(() => {
    localStorage.setItem(`sim_bubble_${config.token || config.name}`, bubbleStyle);
  }, [bubbleStyle, config]);

  useEffect(() => {
    localStorage.setItem(`sim_sound_${config.token || config.name}`, String(soundEnabled));
  }, [soundEnabled, config]);

  // Load chats on initial load or config change
  useEffect(() => {
    const currentKey = config.token || config.name;
    lastConfigKeyRef.current = currentKey;

    const storageKey = `sandbox_chat_history_${currentKey}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.botChat && parsed.groupChat && parsed.channelChat) {
          setBotChat(parsed.botChat);
          setGroupChat(parsed.groupChat);
          setChannelChat(parsed.channelChat);
          prevBotChatLengthRef.current = parsed.botChat.length;
          prevGroupChatLengthRef.current = parsed.groupChat.length;
          prevChannelChatLengthRef.current = parsed.channelChat.length;
          setWarnCounts({});
          return;
        }
      } catch (e) {
        console.error("Error parsing saved chat history", e);
      }
    }

    // Default Fallback Initial Welcome Message if no history exists
    const fallbackBotChat = [
      {
        id: "welcome-sys",
        sender: "system",
        senderName: "System",
        text: `คุณได้ทำการเริ่มต้นแชตกับบอท ${config.name || "My Custom Bot"}`,
        timestamp: getFormattedTime()
      },
      {
        id: "welcome-bot",
        sender: "bot",
        senderName: config.name || "Bot",
        text: config.botSettings.welcomeMessage || "สวัสดีครับ! ยินดีต้อนรับสู่บริการบอทอัจฉริยะ",
        timestamp: getFormattedTime(),
        inlineButtons: buildTelegramButtonPayload(config, "root").inlineButtons.map((button) => button.id)
      }
    ];
    setBotChat(fallbackBotChat);
    prevBotChatLengthRef.current = fallbackBotChat.length;

    const fallbackGroupChat = [
      {
        id: "group-sys",
        sender: "system",
        senderName: "System",
        text: `เข้าร่วมกลุ่มแชตจำลอง (บอทถูกแต่งตั้งเป็นแอดมินแล้ว)`,
        timestamp: getFormattedTime()
      },
      {
        id: "group-init-1",
        sender: "user",
        senderName: "สมชาย (Somchai)",
        text: "ยินดีต้อนรับทุกคนครับ กลุ่มนี้มีบอทช่วยดูแลความเรียบร้อยอยู่ด้วยนะ",
        timestamp: getFormattedTime()
      }
    ];
    setGroupChat(fallbackGroupChat);
    prevGroupChatLengthRef.current = fallbackGroupChat.length;

    const initPosts: ChatMessage[] = [
      {
        id: "channel-sys",
        sender: "system",
        senderName: "System",
        text: `ช่องแชนแนลจำลอง (สิทธิ์โพสต์เฉพาะแอดมินบอท)`,
        timestamp: getFormattedTime()
      }
    ];

    config.channelSettings.scheduledPosts.forEach((post, idx) => {
      let content = post.content;
      if (config.channelSettings.autoSignature) {
        content += `\n\n${config.channelSettings.autoSignatureText}`;
      }
      initPosts.push({
        id: `channel-post-${idx}`,
        sender: "bot",
        senderName: config.name || "Channel Admin",
        text: `⏰ [กำหนดเวลาโพสต์ ${post.time}]\n\n${content}`,
        timestamp: getFormattedTime(),
        imageUrl: post.imageUrl
      });
    });

    setChannelChat(initPosts);
    prevChannelChatLengthRef.current = initPosts.length;
    setWarnCounts({});
  }, [config]);

  // Save chats on state updates
  useEffect(() => {
    const currentKey = config.token || config.name;
    if (lastConfigKeyRef.current !== currentKey) {
      // Skip saving intermediate state during config load transitions
      return;
    }
    if (botChat.length === 0 && groupChat.length === 0 && channelChat.length === 0) return;

    const storageKey = `sandbox_chat_history_${currentKey}`;
    localStorage.setItem(storageKey, JSON.stringify({
      botChat,
      groupChat,
      channelChat
    }));
  }, [botChat, groupChat, channelChat, config]);

  // Scroll to bottom whenever messages are added
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [botChat, groupChat, channelChat, typing]);

  // Play dynamic synthesized sound effects on new messages
  useEffect(() => {
    if (soundEnabled && botChat.length > prevBotChatLengthRef.current) {
      const lastMsg = botChat[botChat.length - 1];
      if (lastMsg) {
        if (lastMsg.sender === "user") {
          playSentSound();
        } else if (lastMsg.sender === "bot") {
          playReceivedSound();
        } else if (lastMsg.sender === "system" && lastMsg.text.includes("🔒")) {
          playWarningSound();
        }
      }
    }
    prevBotChatLengthRef.current = botChat.length;
  }, [botChat, soundEnabled]);

  useEffect(() => {
    if (soundEnabled && groupChat.length > prevGroupChatLengthRef.current) {
      const lastMsg = groupChat[groupChat.length - 1];
      if (lastMsg) {
        if (lastMsg.sender === "user") {
          playSentSound();
        } else if (lastMsg.sender === "bot") {
          playReceivedSound();
        } else if (lastMsg.sender === "system" && (lastMsg.text.includes("ลบ") || lastMsg.text.includes("🚫") || lastMsg.text.includes("⚠️"))) {
          playWarningSound();
        }
      }
    }
    prevGroupChatLengthRef.current = groupChat.length;
  }, [groupChat, soundEnabled]);

  useEffect(() => {
    if (soundEnabled && channelChat.length > prevChannelChatLengthRef.current) {
      const lastMsg = channelChat[channelChat.length - 1];
      if (lastMsg) {
        if (lastMsg.sender === "user") {
          playSentSound();
        } else if (lastMsg.sender === "bot") {
          playReceivedSound();
        }
      }
    }
    prevChannelChatLengthRef.current = channelChat.length;
  }, [channelChat, soundEnabled]);

  const getFormattedTime = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const addPointsToLoggedInUser = (ptsToAdd: number) => {
    try {
      const savedUser = localStorage.getItem("jimmy_bot_logged_in_user");
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        const savedUsersList = localStorage.getItem("jimmy_bot_users_list");
        if (savedUsersList) {
          const list = JSON.parse(savedUsersList);
          const updatedList = list.map((u: any) => {
            if (u.username === parsed.username) {
              const nextPoints = (u.points || 0) + ptsToAdd;
              
              // Check milestones
              const currentMilestones = config.marketingSettings?.milestones || [
                { pointsThreshold: 10, message: "🎉 ยินดีด้วยครับ! คุณสะสมแต้มแชร์ครบ 10 คะแนนแล้ว รับสิทธิ์เปิดฟีเจอร์ AI พรีเมียมทดลองฟรี 3 วัน!" },
                { pointsThreshold: 50, message: "🎁 เยี่ยมยอดมากครับ! คุณสะสมแต้มแชร์ครบ 50 คะแนนแล้ว รับคูปองส่วนลดซื้อเซ็ตบอทดูแลกลุ่ม 20% ทันที!" },
                { pointsThreshold: 100, message: "👑 ระดับตำนานตัวจริง! คุณแชร์สะสมแต้มครบ 100 คะแนน รับสิทธิ์สร้างบอทเพิ่มฟรี +2 ตัวถาวรทันที!" }
              ];
              const milestonesEnabled = config.marketingSettings?.enableMilestoneNotifications !== false;
              if (milestonesEnabled) {
                currentMilestones.forEach(m => {
                  if ((u.points || 0) < m.pointsThreshold && nextPoints >= m.pointsThreshold) {
                    // Celebrate Milestone Met!
                    const celebratoryMsg = `🏆 ขอแสดงความยินดีกับคุณ ${u.name}! คุณสะสมแต้มแชร์แคมเปญได้ครบ ${m.pointsThreshold} แต้มแล้ว! 🎉\n\n💬 ข้อความสิทธิประโยชน์:\n"${m.message}"\n\n🔑 รหัสรางวัลพิเศษของคุณ: JB-MIL-${m.pointsThreshold}PTS\n\n(ระบบส่งข้อความแสดงความยินดีอัตโนมัติ ⚡)`;
                    
                    setTimeout(() => {
                      setBotChat(prev => [...prev, {
                        id: `milestone-celebrate-${Date.now()}-${m.pointsThreshold}`,
                        sender: "bot",
                        senderName: config.name || "Bot Reward System",
                        text: celebratoryMsg,
                        timestamp: getFormattedTime()
                      }]);
                      
                      // Also post in Group Chat to celebrate publically!
                      setGroupChat(prev => [...prev, {
                        id: `milestone-group-celebrate-${Date.now()}-${m.pointsThreshold}`,
                        sender: "bot",
                        senderName: config.name || "Bot Admin",
                        text: `🏆 [ข่าวดีประชาสัมพันธ์กลุ่ม] ขอปรบมือให้สมาชิกคนเก่ง @${u.username} ทำแต้มแนะนำแคมเปญทะลุ ${m.pointsThreshold} แต้มสำเร็จแล้ว! 🎉 ได้รับสิทธิ์โค้ดรางวัลพิเศษเรียบร้อยแล้วครับ! เก่งมากๆ ครับ! 🥇`,
                        timestamp: getFormattedTime()
                      }]);
                    }, 1200);
                  }
                });
              }

              return {
                ...u,
                points: nextPoints
              };
            }
            return u;
          });
          localStorage.setItem("jimmy_bot_users_list", JSON.stringify(updatedList));
          
          const freshUser = updatedList.find((u: any) => u.username === parsed.username);
          if (freshUser) {
            localStorage.setItem("jimmy_bot_logged_in_user", JSON.stringify(freshUser));
          }
        }
      }
    } catch (e) {
      console.error("Error updating user points", e);
    }
  };

  const generateCheckpointsTable = (info: any) => {
    const campaignName = config.marketingSettings?.campaignName || "สงกรานต์แชร์สนั่นรับโบนัส";
    const rewardPointsPerInvite = config.marketingSettings?.rewardPointsPerInvite || 10;
    const isVerified = challengeVerified ? "✅ ผ่านการตรวจสอบแล้ว" : "❌ ยังไม่ได้ตอบคำถาม";
    
    // Find unlocked reward codes from milestones based on current points!
    const milestones = config.marketingSettings?.milestones || [
      { pointsThreshold: 10, message: "🎉 ยินดีด้วยครับ! คุณสะสมแต้มแชร์ครบ 10 คะแนนแล้ว รับสิทธิ์เปิดฟีเจอร์ AI พรีเมียมทดลองฟรี 3 วัน!" },
      { pointsThreshold: 50, message: "🎁 เยี่ยมยอดมากครับ! คุณสะสมแต้มแชร์ครบ 50 คะแนนแล้ว รับคูปองส่วนลดซื้อเซ็ตบอทดูแลกลุ่ม 20% ทันที!" },
      { pointsThreshold: 100, message: "👑 ระดับตำนานตัวจริง! คุณแชร์สะสมแต้มครบ 100 คะแนน รับสิทธิ์สร้างบอทเพิ่มฟรี +2 ตัวถาวรทันที!" }
    ];
    
    let unlockedReward = "❌ ไม่มี (สะสมแต้มเพิ่มเพื่อรับของรางวัล)";
    milestones.forEach((m, idx) => {
      if (info.points >= m.pointsThreshold) {
        unlockedReward = `🎁 ปลดล็อกเป้าหมายที่ ${idx + 1} แล้ว! Code: JB-MIL-${m.pointsThreshold}PTS`;
      }
    });

    const tableStr = `📊 ตารางสรุปแคมเปญไวรัล & คะแนนสะสม\n┌──────────────────────────────────────────────┐\n  👤 สมาชิก: ${info.name} (@${info.code})\n  📢 แคมเปญ: ${campaignName}\n  🎁 อัตราโบนัส: +${rewardPointsPerInvite} PTS ต่อคน\n├──────────────────────────────────────────────┤\n  👥 แนะนำเพื่อนสำเร็จ:  ${info.referrals} คน\n  🏆 แต้มแชร์สะสม:       ${info.points} PTS\n  🎯 ตรวจสอบการแชร์:    ${isVerified}\n  🔑 รางวัลปลดล็อก:     ${unlockedReward}\n└──────────────────────────────────────────────┘\n💡 พิมพ์คำเฉลยของแคมเปญกลุ่มนี้ในแชตเพื่อตรวจสอบและรับแต้มโบนัสพิเศษ +15 แต้ม!`;
    return tableStr;
  };

  const getLoggedInUserPoints = () => {
    try {
      const savedUser = localStorage.getItem("jimmy_bot_logged_in_user");
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        const savedUsersList = localStorage.getItem("jimmy_bot_users_list");
        if (savedUsersList) {
          const list = JSON.parse(savedUsersList);
          const fresh = list.find((u: any) => u.username === parsed.username);
          if (fresh) {
            return {
              name: fresh.name,
              points: fresh.points || 0,
              referrals: fresh.referralsCount || 0,
              code: fresh.referralCode || fresh.username
            };
          }
        }
        return {
          name: parsed.name,
          points: parsed.points || 0,
          referrals: parsed.referralsCount || 0,
          code: parsed.referralCode || parsed.username
        };
      }
    } catch (e) {}
    return { name: "คุณ (You)", points: 0, referrals: 0, code: "user" };
  };

  const handleExportConfig = () => {
    try {
      const dataStr = JSON.stringify(config, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${(config.name || "bot_config").toLowerCase().replace(/\s+/g, "_")}_config.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export config", err);
    }
  };

  // Watch typing in input box to show/hide dynamic floating widgets (Commands/Inline queries)
  useEffect(() => {
    if (activeTab === 'bot' && inputText.startsWith('/')) {
      setShowCommandSuggestions(true);
    } else {
      setShowCommandSuggestions(false);
    }

    if (activeTab === 'bot' && config.inlineQuerySettings?.enableInline && inputText.startsWith('@')) {
      setShowInlineSuggestions(true);
    } else {
      setShowInlineSuggestions(false);
    }
  }, [inputText, activeTab, config]);

  const handleSendInlineQuery = (content: string, title: string) => {
    const inlineMsg: ChatMessage = {
      id: `user-inline-${Date.now()}`,
      sender: "user",
      senderName: "คุณ (You) [Inline Query]",
      text: content,
      timestamp: getFormattedTime()
    };

    setBotChat(prev => [...prev, inlineMsg]);
    setInputText("");
    
    addApiLog("🔍 Inline Query Triggered (Webhook Event)", {
      event_type: "inline_query_selection",
      user: { id: 123456, name: "คุณ (You)" },
      query_title: title,
      content_sent: content
    });

    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      const matchedReply = config.botSettings.autoReplies.find(
        r => content.toLowerCase().includes(r.keyword.toLowerCase())
      );
      
      if (matchedReply) {
        setBotChat(prev => [...prev, {
          id: `bot-reply-${Date.now()}`,
          sender: "bot",
          senderName: config.name || "Bot",
          text: matchedReply.reply,
          timestamp: getFormattedTime()
        }]);
      } else {
        setBotChat(prev => [...prev, {
          id: `bot-reply-${Date.now()}`,
          sender: "bot",
          senderName: config.name || "Bot",
          text: `🔍 [ส่งข้อความผ่านค้นหาด่วนแบบ Inline: "${title}"]\n\nได้รับคำร้องเรียบร้อยครับ! มีอะไรให้ทางเราช่วยเหลือเพิ่มเติม สอบถามได้ทันทีครับ`,
          timestamp: getFormattedTime()
        }]);
      }
      setTotalReplies(prev => prev + 1);
    }, 800);
  };

  const handleInlineButtonClick = (btn: ButtonAction) => {
    const resolution = btn.callbackData
      ? resolveButtonAction(buttonModel, { kind: "callback", value: btn.callbackData })
      : resolveButtonAction(buttonModel, { kind: "id", value: btn.id });
    if (resolution.route === "navigate" && resolution.target) {
      const targetPayload = buildTelegramButtonPayload(config, resolution.target);
      setMenuContext(resolution.target);
      setBotChat(prev => [...prev, {
        id: `bot-menu-${Date.now()}`,
        sender: "bot",
        senderName: config.name || "Bot",
        text: resolution.reply || "เมนู:",
        timestamp: getFormattedTime(),
        inlineButtons: targetPayload.inlineButtons.map((button) => button.id)
      }]);
    } else if (resolution.route === "url" && resolution.target) {
      window.open(resolution.target, "_blank", "noopener,noreferrer");
      addApiLog("🔘 Inline Button Clicked (URL Opened)", {
        button_text: btn.label,
        action: "open_url",
        url: resolution.target
      });
    } else if (resolution.route === "web_app" && resolution.target) {
      setWebAppUrl(resolution.target);
      addApiLog("🌐 Telegram Web App Opened", {
        button_text: btn.label,
        action: "open_web_app",
        url: resolution.target
      });
    } else if (resolution.matched && resolution.reply) {
      const userBtnMsg: ChatMessage = {
        id: `user-btn-${Date.now()}`,
        sender: "user",
        senderName: "คุณ (You)",
        text: btn.label,
        timestamp: getFormattedTime()
      };
      setBotChat(prev => [...prev, userBtnMsg]);
      
      addApiLog("🔘 Inline Button Clicked (Text Trigger)", {
        button_text: btn.label,
        action: "callback_data",
        callback_data: btn.callbackData
      });

      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        setBotChat(prev => [...prev, {
          id: `bot-inline-reply-${Date.now()}`,
          sender: "bot",
          senderName: config.name || "Bot",
          text: resolution.reply!,
          timestamp: getFormattedTime()
        }]);
        setTotalReplies(prev => prev + 1);
        addApiLog("📤 Outbound Bot Reply (Inline Button Response)", {
          button_text: btn.label,
          reply_sent: resolution.reply
        });
      }, 700);
    }
  };

  const handleMenuButtonClick = () => {
    const mType = config.botMenuButton?.type || 'commands';
    if (mType === 'web_app') {
      const url = config.botMenuButton?.url || "https://ai.studio/build";
      setWebAppUrl(url);
      addApiLog("🌐 Telegram Web App Opened", {
        action: "open_web_app",
        button_text: config.botMenuButton?.text || "เปิดเว็บบอท",
        url: url
      });
    } else {
      setInputText('/');
      addApiLog("💡 Bot Menu Button Clicked", {
        action: "show_commands_menu",
        menu_type: "commands"
      });
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      senderName: "คุณ (You)",
      text: textToSend,
      timestamp: getFormattedTime()
    };

    if (activeTab === 'bot') {
      const isDirectAllowed = config.privacySettings?.allowDirectMessages ?? true;
      if (!isDirectAllowed) {
        const updatedChat = [...botChat, userMsg];
        setBotChat(updatedChat);
        setInputText("");
        setTyping(true);
        setTimeout(() => {
          setTyping(false);
          setBotChat(prev => [...prev, {
            id: `bot-privacy-err-${Date.now()}`,
            sender: "bot",
            senderName: config.name || "Bot",
            text: "🔒 ขออภัยครับ บอทนี้ถูกปิดไม่ให้สื่อสารแบบส่วนตัว (Direct Message) ผ่านการตั้งค่าความเป็นส่วนตัวแล้ว",
            timestamp: getFormattedTime()
          }]);
        }, 600);
        return;
      }

      const updatedChat = [...botChat, userMsg];
      setBotChat(updatedChat);
      setInputText("");

      addApiLog("📥 Direct Message Received (Webhook Event)", {
        event_type: "message_received",
        chat_type: "private",
        chat_id: "chat_987654",
        user: { id: 123456, name: "คุณ (You)" },
        text: textToSend,
        api_auth_token: config.externalApis?.apiAuthToken ? `${config.externalApis.apiAuthToken.slice(0, 4)}...` : "None"
      });

      const isSlash = textToSend.trim().startsWith("/");
      const slashCommandName = isSlash ? textToSend.trim().split(/\s+/)[0] : "";
      const actionResolution = isSlash
        ? resolveConfigAction(config, { kind: "command", value: slashCommandName })
        : resolveButtonAction(buttonModel, { kind: "message", value: textToSend, context: menuContext });

      // Check if it matches an auto-reply keyword
      const matchedReply = config.botSettings.autoReplies.find(
        r => textToSend.toLowerCase().includes(r.keyword.toLowerCase())
      );

      const cleanCmd = textToSend.trim().toLowerCase();
      const isPointsCheck = cleanCmd === "/checkpoints" || cleanCmd === "/เช็คแต้ม" || cleanCmd === "/เช็กแต้ม" || cleanCmd === "/checkpoints";

      setTyping(true);

      setTimeout(async () => {
        setTyping(false);
        if (isPointsCheck) {
          const info = getLoggedInUserPoints();
          const pointsText = generateCheckpointsTable(info);
          
          setBotChat(prev => [...prev, {
            id: `bot-reply-points-${Date.now()}`,
            sender: "bot",
            senderName: config.name || "Bot",
            text: pointsText,
            timestamp: getFormattedTime()
          }]);
          setTotalReplies(prev => prev + 1);
          addApiLog("📤 Outbound Bot Reply (Referrals Points Check)", {
            event_type: "command_response",
            chat_type: "private",
            command: cleanCmd,
            text_sent: pointsText
          });
        } else if (actionResolution.matched) {
          const targetPayload = actionResolution.route === "navigate" && actionResolution.target
            ? buildTelegramButtonPayload(config, actionResolution.target)
            : null;
          if (actionResolution.route === "navigate" && actionResolution.target) setMenuContext(actionResolution.target);
          if (actionResolution.action?.id === "system_start") setMenuContext("root");
          const responseText = actionResolution.reply || (actionResolution.route === "navigate" ? "เมนู:" : "รับคำสั่งแล้วครับ");
          setBotChat(prev => [...prev, {
            id: `bot-reply-${Date.now()}`,
            sender: "bot",
            senderName: config.name || "Bot",
            text: responseText,
            timestamp: getFormattedTime(),
            inlineButtons: actionResolution.action?.id === "system_start"
              ? buildTelegramButtonPayload(config, "root").inlineButtons.map((button) => button.id)
              : targetPayload?.inlineButtons.map((button) => button.id)
          }]);
          setTotalReplies(prev => prev + 1);
          addApiLog("📤 Outbound Bot Reply (APIBot Command Trigger)", {
            event_type: "message_sent",
            chat_type: "private",
            text_sent: responseText,
            matched_action_id: actionResolution.action?.id,
            runtime_route: actionResolution.route
          });
        } else if (matchedReply) {
          const responseText = matchedReply.reply;
          setBotChat(prev => [...prev, {
            id: `bot-reply-${Date.now()}`,
            sender: "bot",
            senderName: config.name || "Bot",
            text: responseText,
            timestamp: getFormattedTime(),
            imageUrl: matchedReply.imageUrl
          }]);
          setTotalReplies(prev => prev + 1);
          addApiLog("📤 Outbound Bot Reply (Keyword Trigger)", {
            event_type: "message_sent",
            chat_type: "private",
            text_sent: responseText,
            matched_keyword: matchedReply.keyword,
            attached_image: matchedReply.imageUrl ? "Yes" : "No"
          });
        } else if (config.botSettings.enableAiAssistant) {
          // Send request to server-side Gemini chat API
          setTyping(true);
          try {
            const res = await fetch("/api/ai/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                message: textToSend,
                config: config,
                chatHistory: updatedChat.slice(-10) // Send last 10 messages for context
              })
            });
            const data = await res.json();
            setBotChat(prev => [...prev, {
              id: `bot-ai-${Date.now()}`,
              sender: "bot",
              senderName: config.name || "AI Assistant",
              text: data.reply,
              timestamp: getFormattedTime()
            }]);
            setTotalReplies(prev => prev + 1);
            addApiLog("🧠 AI Assistant Response (API Call)", {
              event_type: "ai_generation",
              model: "gemini-2.5-flash",
              input_text: textToSend,
              output_text: data.reply
            });
          } catch (err) {
            setBotChat(prev => [...prev, {
              id: `bot-error-${Date.now()}`,
              sender: "bot",
              senderName: config.name || "Bot",
              text: "ขออภัยด้วยครับ ฉันเกิดข้อผิดพลาดในการเชื่อมต่อสมอง AI",
              timestamp: getFormattedTime()
            }]);
            setTotalReplies(prev => prev + 1);
          } finally {
            setTyping(false);
          }
        } else {
          // Default no assistant answer
          setBotChat(prev => [...prev, {
            id: `bot-def-${Date.now()}`,
            sender: "bot",
            senderName: config.name || "Bot",
            text: "ฉันไม่เข้าใจคำถามนี้ครับ ลองใช้ปุ่มเมนูทางลัดด้านล่าง หรือตั้งค่าระบบ AI Assistant เพื่อตอบแชตอัตโนมัติได้อย่างยืดหยุ่นมากขึ้นครับ!",
            timestamp: getFormattedTime()
          }]);
          setTotalReplies(prev => prev + 1);
        }
      }, 800);

    } else if (activeTab === 'group') {
      setGroupChat(prev => [...prev, userMsg]);
      setInputText("");

      addApiLog("📥 Group Message Received (Webhook Event)", {
        event_type: "message_received",
        chat_type: "group",
        chat_id: "group_555888",
        user: { id: 123456, name: "คุณ (You)" },
        text: textToSend
      });

      // 3. Keyword Monitoring Check
      const monitoring = config.groupSettings.keywordMonitoring;
      if (monitoring && monitoring.enable && monitoring.keywords && monitoring.keywords.length > 0) {
        const matchedKeywords = monitoring.keywords.filter(keyword => 
          textToSend.toLowerCase().includes(keyword.toLowerCase())
        );

        if (matchedKeywords.length > 0) {
          matchedKeywords.forEach(keyword => {
            setKeywordHits(prev => {
              const currentCount = (prev[keyword] || 0) + 1;
              const threshold = monitoring.alertThreshold || 2;
              
              if (currentCount === threshold) {
                const alertText = `🚨 [ระบบตรวจจับคำสำคัญ - Keyword Monitoring Alert]\n\nพบสมาชิกร่วมคุยในกลุ่มพูดถึงคำเฝ้าระวัง: "${keyword}" ครบจำนวนเกณฑ์เฝ้าระวัง (${threshold} ครั้ง)!\n\n💬 ข้อความล่าสุด: "${textToSend}"\n👤 ผู้ส่ง: คุณ (You)\n\n📌 ระบบส่งข้อความแจ้งเตือนแอดมินอัตโนมัติเรียบร้อยแล้ว!`;
                
                if (monitoring.notificationType === 'bot_message' || monitoring.notificationType === 'both') {
                  setTimeout(() => {
                    setGroupChat(g => [...g, {
                      id: `group-keyword-alert-${Date.now()}-${Math.random()}`,
                      sender: "bot",
                      senderName: config.name || "System Monitor",
                      text: alertText,
                      timestamp: getFormattedTime()
                    }]);
                    setTotalReplies(r => r + 1);
                    playWarningSound();
                  }, 1200);
                }

                if (monitoring.notificationType === 'email' || monitoring.notificationType === 'both') {
                  addApiLog("📧 Keyword Monitoring Email Dispatched", {
                    event_type: "email_sent",
                    to_email: monitoring.adminEmail || "admin@example.com",
                    subject: `🚨 [ALERT] Keyword "${keyword}" reached threshold in group`,
                    body: alertText
                  });
                }
              }
              
              return {
                ...prev,
                [keyword]: currentCount
              };
            });
          });
        }
      }

      let hasViolation = false;
      let reason = "";

      // 1. Link Check
      if (config.groupSettings.antiSpam.blockLinks && /(https?:\/\/[^\s]+)/gi.test(textToSend)) {
        hasViolation = true;
        reason = "ห้ามสแปมแชร์ลิงก์ภายนอกกลุ่มแชต";
      }

      // 2. Swear Word Check
      const swearWords = ['ควย', 'เย็ด', 'เหี้ย', 'สัส', 'หน้าหี', 'มึง', 'กู'];
      if (config.groupSettings.antiSpam.blockSwearWords && swearWords.some(w => textToSend.includes(w))) {
        hasViolation = true;
        reason = "ห้ามพูดคุยด้วยคำหยาบคายหรือไม่สุภาพ";
      }

      // Check Group Privacy Mode (if true, bot only reads commands)
      const privacyGroup = config.privacySettings?.groupPrivacyMode ?? false;
      const isCommand = textToSend.startsWith("/");

      if (privacyGroup && !isCommand) {
        // Group Privacy Mode is ON, Bot ignores normal chats (does not moderate spam or swearing unless it starts with /)
        addApiLog("🔒 Group Privacy Mode is ON", {
          info: "Bot ignored normal message because it is not a slash command.",
          ignored_text: textToSend
        });
        return;
      }

      if (hasViolation) {
        setTotalBlocked(prev => prev + 1);
        setTyping(true);
        setTimeout(() => {
          setTyping(false);
          setTotalReplies(prev => prev + 1);
          
          const canDelete = config.adminPermissions?.canDeleteMessages ?? true;
          const canBan = config.adminPermissions?.canBanUsers ?? true;

          if (canDelete) {
            // Delete User message (visual simulation)
            setGroupChat(prev => prev.map(m => m.id === userMsg.id ? { ...m, text: "🚨 [ข้อความนี้ถูกลบโดยบอทแอดมิน เนื่องจากทำผิดกฎกลุ่ม]", sender: "system" } : m));
            addApiLog("🛡️ Auto Moderation: Message Deleted", {
              action: "delete_message",
              message_id: userMsg.id,
              reason,
              permission_used: "can_delete_messages"
            });
          } else {
            // Can't delete
            setGroupChat(prev => [...prev, {
              id: `group-bot-err-${Date.now()}`,
              sender: "bot",
              senderName: config.name || "Bot Admin",
              text: `⚠️ ตรวจพบข้อความผิดกฎกลุ่ม แต่ฉันลบไม่ได้เนื่องจากไม่ได้รับสิทธิ์ผู้ดูแล "can_delete_messages" จากผู้ตั้งค่า`,
              timestamp: getFormattedTime()
            }]);
            addApiLog("⚠️ Moderation Failed (Missing Permission)", {
              action: "delete_message_failed",
              reason,
              required_permission: "can_delete_messages"
            });
          }

          // Calculate warnings
          const currentWarn = (warnCounts["you"] || 0) + 1;
          setWarnCounts(prev => ({ ...prev, you: currentWarn }));

          if (currentWarn >= config.groupSettings.antiSpam.warnLimit) {
            if (canBan) {
              setGroupChat(prev => [...prev, {
                id: `group-bot-ban-${Date.now()}`,
                sender: "bot",
                senderName: config.name || "Bot Admin",
                text: `🚫 สมาชิก คุณ (You) ทำผิดกฎครบกำหนดจำนวน ${currentWarn}/${config.groupSettings.antiSpam.warnLimit} ครั้ง จึงถูกเตะออกจากกลุ่มโดยอัตโนมัติ`,
                timestamp: getFormattedTime()
              }]);
              setWarnCounts(prev => ({ ...prev, you: 0 }));
              addApiLog("🛡️ Auto Moderation: Member Restricted", {
                action: "ban_user",
                target_user: "คุณ (You)",
                warnings_count: currentWarn,
                permission_used: "can_restrict_members"
              });
            } else {
              setGroupChat(prev => [...prev, {
                id: `group-bot-ban-err-${Date.now()}`,
                sender: "bot",
                senderName: config.name || "Bot Admin",
                text: `⚠️ สมาชิก คุณ (You) ผิดกฎครบกำหนดสูงสุด ${currentWarn}/${config.groupSettings.antiSpam.warnLimit} ครั้ง แต่ฉันแบนไม่ได้เนื่องจากขาดสิทธิ์ผู้ดูแล "can_restrict_members"`,
                timestamp: getFormattedTime()
              }]);
              addApiLog("⚠️ Moderation Failed (Missing Permission)", {
                action: "ban_user_failed",
                target_user: "คุณ (You)",
                required_permission: "can_restrict_members"
              });
            }
          } else {
            setGroupChat(prev => [...prev, {
              id: `group-bot-warn-${Date.now()}`,
              sender: "bot",
              senderName: config.name || "Bot Admin",
              text: `⚠️ สมาชิก คุณ (You) ละเมิดกฎกลุ่ม! [สาเหตุ: ${reason}]\nกรุณาปฏิบัติตามกฎ ได้รับการเตือนแล้ว ${currentWarn}/${config.groupSettings.antiSpam.warnLimit} ครั้ง`,
              timestamp: getFormattedTime()
            }]);
            addApiLog("🛡️ Auto Moderation: Warning Issued", {
              action: "warn_user",
              target_user: "คุณ (You)",
              reason,
              warning_tier: `${currentWarn}/${config.groupSettings.antiSpam.warnLimit}`
            });
          }
        }, 600);
      } else {
        // Handle Group Command checks
        const cleanCmd = textToSend.trim().toLowerCase();
        const isPointsCheck = cleanCmd === "/checkpoints" || cleanCmd === "/เช็คแต้ม" || cleanCmd === "/เช็กแต้ม";
        const matchedCmd = config.groupSettings.customCommands.find(
          c => c.command.toLowerCase() === cleanCmd || ("/" + c.command.toLowerCase()) === cleanCmd
        );

        // Q&A Challenge check
        const challengeQ = config.marketingSettings?.challengeQuestion || "JIMMY BOT เปิดให้บริการครั้งแรกในปี ค.ศ. ใด?";
        const challengeA = (config.marketingSettings?.challengeAnswer || "2024").trim().toLowerCase();
        const isChallengeActive = config.marketingSettings?.challengeActive ?? true;
        const isCorrectAnswer = isChallengeActive && textToSend.trim().toLowerCase() === challengeA;

        if (isCorrectAnswer && !challengeVerified) {
          setChallengeVerified(true);
          localStorage.setItem(`sandbox_challenge_verified_${config.token || config.name}`, 'true');
          setTyping(true);
          setTimeout(() => {
            setTyping(false);
            addPointsToLoggedInUser(15);
            
            const verifySuccessText = `🎉 ถูกต้องครับ! คุณ @user ตอบคำถามภารกิจกลุ่มได้ถูกต้อง!\n\n📋 คำถามกลุ่ม: "${challengeQ}"\n🔑 คำตอบที่คุณส่ง: "${textToSend}"\n\n🛡️ ตรวจสอบการแชร์: ✅ ผ่านการตรวจสอบแล้ว\n🎁 ได้รับโบนัสแชร์พิเศษ: +15 คะแนนสะสม ในบัญชีของคุณเรียบร้อย!\n\n(พิมพ์ /checkPoints เพื่อเช็คสรุปคะแนนอัปเดตใหม่ได้เลย!)`;
            setGroupChat(prev => [...prev, {
              id: `group-bot-challenge-ok-${Date.now()}`,
              sender: "bot",
              senderName: config.name || "Bot Admin",
              text: verifySuccessText,
              timestamp: getFormattedTime()
            }]);
            setTotalReplies(prev => prev + 1);
          }, 600);
          return;
        } else if (isCorrectAnswer && challengeVerified) {
          setTyping(true);
          setTimeout(() => {
            setTyping(false);
            setGroupChat(prev => [...prev, {
              id: `group-bot-challenge-dup-${Date.now()}`,
              sender: "bot",
              senderName: config.name || "Bot Admin",
              text: `ℹ️ คุณตอบเฉลยแคมเปญกลุ่มนี้และผ่านการตรวจสอบ ✅ เรียบร้อยแล้วครับ! คะแนนโบนัสของคุณถูกสะสมอยู่ครบถ้วนในตารางสรุป`,
              timestamp: getFormattedTime()
            }]);
          }, 500);
          return;
        }

        if (isPointsCheck) {
          setTyping(true);
          setTimeout(() => {
            setTyping(false);
            const info = getLoggedInUserPoints();
            const pointsText = generateCheckpointsTable(info);

            setGroupChat(prev => [...prev, {
              id: `group-bot-points-${Date.now()}`,
              sender: "bot",
              senderName: config.name || "Bot Admin",
              text: pointsText,
              timestamp: getFormattedTime()
            }]);
            setTotalReplies(prev => prev + 1);
            addApiLog("📤 Outbound Bot Reply (Group Points Check)", {
              event_type: "command_response",
              chat_type: "group",
              command: cleanCmd,
              text_sent: pointsText
            });
          }, 500);
        } else if (matchedCmd) {
          setTyping(true);
          setTimeout(() => {
            setTyping(false);
            setGroupChat(prev => [...prev, {
              id: `group-bot-cmd-${Date.now()}`,
              sender: "bot",
              senderName: config.name || "Bot Admin",
              text: matchedCmd.reply,
              timestamp: getFormattedTime()
            }]);
            setTotalReplies(prev => prev + 1);
            addApiLog("📤 Outbound Bot Reply (Custom Group Command)", {
              event_type: "command_response",
              chat_type: "group",
              command: cleanCmd,
              text_sent: matchedCmd.reply
            });
          }, 500);
        } else {
          // Check Auto-Translation
          const autoTranslation = config.groupSettings.autoTranslation;
          if (autoTranslation?.enable) {
            setTyping(true);
            fetch("/api/ai/translate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: textToSend,
                targetLanguage: autoTranslation.targetLanguage || "ภาษาไทย",
                geminiApiKey: config.externalApis?.geminiApiKey,
                openaiApiKey: config.externalApis?.openaiApiKey
              })
            })
              .then(res => res.json())
              .then(data => {
                setTyping(false);
                if (data.needsTranslation && data.translatedText) {
                  setGroupChat(prev => [...prev, {
                    id: `group-bot-trans-${Date.now()}`,
                    sender: "bot",
                    senderName: config.name || "Bot Admin",
                    text: `🌐 [ระบบแปลภาษาอัจฉริยะ - ตรวจจับได้: ${data.detectedLanguage}]\nแปลเป็น ${autoTranslation.targetLanguage || "ภาษาไทย"}:\n"${data.translatedText}"`,
                    timestamp: getFormattedTime()
                  }]);
                  setTotalReplies(prev => prev + 1);
                  addApiLog("🌐 Auto Translation Completed", {
                    event_type: "auto_translation",
                    detected_language: data.detectedLanguage,
                    target_language: autoTranslation.targetLanguage || "ภาษาไทย",
                    original_text: textToSend,
                    translated_text: data.translatedText
                  });
                } else {
                  addApiLog("🌐 Auto Translation Skipped", {
                    info: "Message is already in the target language or no translation needed.",
                    detected_language: data.detectedLanguage
                  });
                }
              })
              .catch(err => {
                setTyping(false);
                console.error("Translation API error:", err);
              });
          }
        }
      }
    }
  };

  // Simulate new group member entering
  const handleSimulateNewMember = () => {
    if (activeTab !== 'group') return;
    const mockNames = ["วิชัย (Wichai)", "นารี (Naree)", "เอกชัย (Ekachai)", "สุพรรณ (Suphan)"];
    const randomName = mockNames[Math.floor(Math.random() * mockNames.length)];

    const joinSysMsg: ChatMessage = {
      id: `join-sys-${Date.now()}`,
      sender: "system",
      senderName: "System",
      text: `${randomName} เข้าร่วมกลุ่มแชตผ่านลิงก์เชิญ`,
      timestamp: getFormattedTime()
    };

    setGroupChat(prev => [...prev, joinSysMsg]);
    setTotalUsers(prev => prev + 1);

    if (config.groupSettings.welcomeNewMember) {
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        const welcomeText = (config.groupSettings.welcomeMessage || "สวัสดี {name} ยินดีต้อนรับเข้าสู่กลุ่มของเราครับ!")
          .replace("{name}", randomName);

        setGroupChat(prev => [...prev, {
          id: `welcome-bot-${Date.now()}`,
          sender: "bot",
          senderName: config.name || "Bot Admin",
          text: welcomeText,
          timestamp: getFormattedTime()
        }]);
        setTotalReplies(prev => prev + 1);
      }, 700);
    }
  };

  // Reset Simulator chat
  const handleResetChat = () => {
    if (activeTab === 'bot') {
      setMenuContext("root");
      setBotChat([
        {
          id: "welcome-sys",
          sender: "system",
          senderName: "System",
          text: `ล้างการสนทนาและเริ่มต้นจำลองบอท ${config.name || "My Custom Bot"} ใหม่อีกครั้ง`,
          timestamp: getFormattedTime()
        },
        {
          id: "welcome-bot",
          sender: "bot",
          senderName: config.name || "Bot",
          text: config.botSettings.welcomeMessage || "สวัสดีครับ! ยินดีต้อนรับสู่บริการบอทอัจฉริยะ",
          timestamp: getFormattedTime(),
          inlineButtons: buildTelegramButtonPayload(config, "root").inlineButtons.map((button) => button.id)
        }
      ]);
    } else if (activeTab === 'group') {
      setGroupChat([
        {
          id: "group-sys",
          sender: "system",
          senderName: "System",
          text: `เริ่มจำลองห้องแชตกลุ่มใหม่สำเร็จ`,
          timestamp: getFormattedTime()
        }
      ]);
      setWarnCounts({});
    }
  };

  const currentChatList = activeTab === 'bot' ? botChat : activeTab === 'group' ? groupChat : channelChat;

  // Computed lists for 4 Core Features
  const replyKeyboardButtons = activeButtonPayload.replyButtons;

  const inlineQueryWord = showInlineSuggestions ? inputText.slice(1).toLowerCase() : "";
  const filteredInlineResults = (config.inlineQuerySettings?.results || []).filter(
    res => res.title.toLowerCase().includes(inlineQueryWord) || res.description.toLowerCase().includes(inlineQueryWord)
  );

  const commandWord = showCommandSuggestions ? inputText.slice(1).toLowerCase() : "";
  const filteredCommands = (config.botCommands || []).filter(
    cmd => cmd.command.toLowerCase().includes(commandWord) || cmd.description.toLowerCase().includes(commandWord)
  );

  const getWallpaperClass = () => {
    switch (wallpaper) {
      case 'telegram-classic':
        return 'bg-[#0e1621]';
      case 'midnight-dark':
        return 'bg-[#09090b]';
      case 'warm-sunset':
        return 'bg-gradient-to-tr from-[#1a0e0e] via-[#110e1a] to-[#0a141d]';
      case 'neon-cyber':
        return 'bg-[#06030b]';
      default:
        return 'bg-black/40';
    }
  };

  const getBubbleClass = (isSelf: boolean) => {
    let styleClass = "";
    switch (bubbleStyle) {
      case 'capsule':
        styleClass = "rounded-3xl";
        break;
      case 'sharp':
        styleClass = "rounded-none";
        break;
      case 'glass':
        styleClass = "rounded-2xl backdrop-blur-md";
        break;
      case 'classic':
      default:
        styleClass = "rounded-2xl";
        break;
    }

    if (bubbleStyle === 'glass') {
      if (isSelf) {
        return `${styleClass} bg-indigo-500/20 border border-indigo-500/40 text-slate-100 ${isSelf ? 'rounded-tr-none' : 'rounded-tl-none'}`;
      } else {
        return `${styleClass} bg-white/5 border border-white/10 text-slate-100 ${isSelf ? 'rounded-tr-none' : 'rounded-tl-none'}`;
      }
    } else {
      if (isSelf) {
        return `${styleClass} bg-indigo-600 text-white ${isSelf ? 'rounded-tr-none' : 'rounded-tl-none'}`;
      } else {
        return `${styleClass} bg-[#16161A] text-slate-100 border border-white/5 ${isSelf ? 'rounded-tr-none' : 'rounded-tl-none'}`;
      }
    }
  };

  return (
    <div className="bg-[#111114] border border-white/5 rounded-2xl overflow-hidden shadow-md flex flex-col h-[650px] relative">
      {/* Simulator Head Nav */}
      <div className="bg-[#16161A] border-b border-white/5 text-slate-100 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          {activeTab === 'bot' && config.avatarUrl ? (
            <img
              src={config.avatarUrl}
              alt="Bot Avatar"
              className="w-9 h-9 rounded-full object-cover border border-white/10"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="bg-indigo-600/20 text-indigo-400 p-2 rounded-xl border border-indigo-500/30">
              {activeTab === 'bot' ? <Bot className="w-5 h-5" /> : activeTab === 'group' ? <Users className="w-5 h-5" /> : <Megaphone className="w-5 h-5" />}
            </div>
          )}
          <div>
            <div className="text-sm font-semibold flex items-center gap-1.5">
              {activeTab === 'bot' && `🤖 บอท: ${config.name || "Custom Bot"}`}
              {activeTab === 'group' && `👥 กลุ่ม: ห้องแชตจำลองความเรียบร้อย`}
              {activeTab === 'channel' && `📢 แชนแนล: บรอดแคสต์ข่าวประชาสัมพันธ์`}
            </div>
            <div className="text-[11px] text-gray-400">
              {activeTab === 'bot' && (config.botSettings.enableAiAssistant ? "🟢 ระบบผู้ช่วย AI ทำงานอยู่" : "🟢 ทำงานตามปุ่มเมนูที่กำหนดไว้")}
              {activeTab === 'group' && "🟢 แอดมินตรวจสอบสแปมอัตโนมัติ"}
              {activeTab === 'channel' && `🟢 โพสต์อัตโนมัติ (${config.channelSettings.enableFormatting})`}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5">
          {/* Sound mute/unmute button */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${soundEnabled ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}
            title={soundEnabled ? "เปิดเสียงแจ้งเตือน (คลิกเพื่อปิดเสียง)" : "ปิดเสียงแจ้งเตือน (คลิกเพื่อเปิดเสียง)"}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">เปิดเสียง</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">ปิดเสียง</span>
              </>
            )}
          </button>

          {/* Theme Customizer button */}
          <button
            onClick={() => {
              setShowThemePanel(!showThemePanel);
              setShowHistoryPanel(false);
              setShowLogsPanel(false);
              setShowHealthCheckPanel(false);
            }}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${showThemePanel ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
            title="ปรับแต่งธีม Wallpaper และสไตล์ข้อความ"
          >
            <Palette className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ธีมแชต</span>
          </button>

          {/* History viewer button */}
          <button
            onClick={() => {
              setShowHistoryPanel(!showHistoryPanel);
              setShowThemePanel(false);
              setShowLogsPanel(false);
              setShowHealthCheckPanel(false);
            }}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${showHistoryPanel ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
            title="ดูประวัติแชต Sandbox ย้อนหลัง"
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ประวัติแชต</span>
          </button>

          {/* Webhook Health Check button */}
          <button
            onClick={() => {
              setShowHealthCheckPanel(!showHealthCheckPanel);
              setShowThemePanel(false);
              setShowHistoryPanel(false);
              setShowLogsPanel(false);
            }}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${showHealthCheckPanel ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
            title="ตรวจสอบความพร้อมเชื่อมต่อของ Webhook"
          >
            <HeartPulse className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">เช็คเว็บฮุก</span>
          </button>

          {config.externalApis?.sendLeadsToApi && (
            <button
              onClick={() => {
                setShowLogsPanel(!showLogsPanel);
                setShowThemePanel(false);
                setShowHistoryPanel(false);
                setShowHealthCheckPanel(false);
              }}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer border transition-all ${showLogsPanel ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'text-gray-400 border-white/5 hover:text-white hover:bg-white/5'}`}
              title="ดูข้อมูลส่งออก API / Webhooks"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>มอนิเตอร์ API ({apiLogs.length})</span>
            </button>
          )}

          {/* Export configuration button */}
          <button
            onClick={handleExportConfig}
            className="text-gray-400 hover:text-white hover:bg-white/5 p-1.5 rounded-lg transition-all text-xs flex items-center gap-1 cursor-pointer border border-transparent hover:border-white/5"
            title="ส่งออกการตั้งค่าบอทปัจจุบันเป็นไฟล์ JSON"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">ส่งออก JSON</span>
          </button>

          <button 
            onClick={handleResetChat} 
            disabled={activeTab === 'channel'}
            className="text-gray-400 hover:text-white hover:bg-white/5 p-1.5 rounded-lg transition-all text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title="ล้างข้อความจำลองใหม่"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>เคลียร์แชต</span>
          </button>
        </div>
      </div>

      {/* Theme Customizer Panel Overlay */}
      {showThemePanel && (
        <div className="absolute top-[62px] left-3 right-3 bg-[#16161A]/95 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl z-50 animate-in fade-in slide-in-from-top-4 duration-200 text-left">
          <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
            <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
              <Palette className="w-4 h-4" /> ปรับแต่งหน้าต่างแชตจำลอง (Simulator Theme)
            </span>
            <button onClick={() => setShowThemePanel(false)} className="text-gray-500 hover:text-white text-xs cursor-pointer">✕ ปิด</button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* Wallpaper selection */}
            <div>
              <span className="block text-[11px] font-bold text-gray-400 mb-2">วอลเปเปอร์พื้นหลัง (Wallpaper)</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'telegram-classic', name: 'Telegram Classic', bg: 'bg-[#0e1621]' },
                  { id: 'midnight-dark', name: 'Midnight Solid', bg: 'bg-[#09090b]' },
                  { id: 'warm-sunset', name: 'Warm Sunset', bg: 'bg-gradient-to-tr from-[#1a0e0e] via-[#110e1a] to-[#0a141d]' },
                  { id: 'neon-cyber', name: 'Cyberpunk Glow', bg: 'bg-[#06030b]' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setWallpaper(item.id)}
                    className={`p-2 rounded-xl border text-[10px] font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${wallpaper === item.id ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-white/5 bg-black/20 text-gray-400 hover:text-white hover:border-white/10'}`}
                  >
                    <div className={`w-full h-5 rounded-md ${item.bg} border border-white/10`} />
                    <span>{item.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bubble style selection */}
            <div>
              <span className="block text-[11px] font-bold text-gray-400 mb-2">สไตล์กล่องข้อความ (Bubble Style)</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'classic', name: 'Rounded Classic' },
                  { id: 'capsule', name: 'Pill Capsule' },
                  { id: 'sharp', name: 'Modern Sharp' },
                  { id: 'glass', name: 'Glassmorphism' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setBubbleStyle(item.id)}
                    className={`p-2 rounded-xl border text-[10px] font-bold flex items-center justify-between transition-all cursor-pointer ${bubbleStyle === item.id ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-white/5 bg-black/20 text-gray-400 hover:text-white hover:border-white/10'}`}
                  >
                    <span>{item.name}</span>
                    {bubbleStyle === item.id && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sound test and control section */}
          <div className="border-t border-white/5 mt-4 pt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-gray-400">ทดสอบเสียงประกอบ (Sound Effects):</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${soundEnabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}>
                {soundEnabled ? "เปิดใช้งาน" : "ปิดใช้งาน"}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => playSentSound()}
                className="bg-white/5 hover:bg-white/10 text-gray-300 text-[10px] font-bold px-2.5 py-1.5 rounded-xl border border-white/5 transition-all cursor-pointer flex items-center gap-1"
                title="ทดสอบเสียงส่งข้อความ"
              >
                🔊 ส่งข้อความ
              </button>
              <button
                type="button"
                onClick={() => playReceivedSound()}
                className="bg-white/5 hover:bg-white/10 text-gray-300 text-[10px] font-bold px-2.5 py-1.5 rounded-xl border border-white/5 transition-all cursor-pointer flex items-center gap-1"
                title="ทดสอบเสียงรับข้อความ / บอทตอบกลับ"
              >
                🔊 บอทตอบกลับ
              </button>
              <button
                type="button"
                onClick={() => playWarningSound()}
                className="bg-white/5 hover:bg-white/10 text-gray-300 text-[10px] font-bold px-2.5 py-1.5 rounded-xl border border-white/5 transition-all cursor-pointer flex items-center gap-1"
                title="ทดสอบเสียงแจ้งเตือนข้อผิดพลาด / ตรวจพบสแปม"
              >
                🔊 ตรวจพบสแปม/เตือน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Webhook Health Check Panel Overlay */}
      {showHealthCheckPanel && (
        <div className="absolute top-[62px] left-3 right-3 bg-[#16161A]/95 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl z-50 animate-in fade-in slide-in-from-top-4 duration-200 text-left">
          <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
            <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 animate-pulse" /> ตรวจสอบสัญญานเชื่อมต่อเว็บฮุก (Webhook Connectivity Check)
            </span>
            <button onClick={() => setShowHealthCheckPanel(false)} className="text-gray-500 hover:text-white text-xs cursor-pointer">✕ ปิด</button>
          </div>

          <p className="text-[11px] text-gray-400 leading-relaxed mb-3">
            ทดสอบส่งสัญญาณอัปเดต (Webhook Payload) ของ Telegram จำลองจากเซิร์ฟเวอร์ Jimmy_bot ไปยังเซิร์ฟเวอร์ปลายทางของคุณ เพื่อทดสอบความเสถียรและความพร้อมในการดีพลอย
          </p>

          <div className="bg-[#111114] rounded-xl p-3 border border-white/5 space-y-2 mb-3 font-sans">
            <div className="flex flex-col gap-1 text-[11px]">
              <span className="text-gray-400 font-bold">Webhook URL ปลายทาง:</span>
              <span className="font-mono bg-black/40 px-2 py-1.5 rounded-lg text-indigo-300 border border-white/5 break-all">
                {config.externalApis?.webhookUrl || "🔴 ยังไม่ได้กำหนด (กรุณากรอกในเมนูด้านซ้าย)"}
              </span>
            </div>
            
            {config.externalApis?.apiAuthToken && (
              <div className="flex justify-between items-center text-[10px] text-gray-500">
                <span>คีย์ตรวจสอบความปลอดภัย (Auth Token):</span>
                <span className="font-mono text-emerald-400">เปิดใช้และส่งพร้อมเฮดเดอร์ Authorization 🔒</span>
              </div>
            )}
          </div>

          {healthResult && (
            <div className={`rounded-xl p-3 border mb-3 text-[11px] animate-fadeIn ${
              healthResult.ok 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' 
                : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
            }`}>
              <div className="flex items-center justify-between font-bold mb-1.5">
                <span className="flex items-center gap-1.5">
                  {healthResult.ok ? "🟢 เชื่อมต่อสำเร็จ (CORS / HTTP OK)" : "🔴 เชื่อมต่อล้มเหลว"}
                </span>
                <span className="font-mono bg-black/30 px-1.5 py-0.5 rounded">
                  Status: {healthResult.status || "Error"} ({healthResult.statusText})
                </span>
              </div>
              
              {healthResult.error && (
                <p className="font-mono font-bold text-[10.5px] bg-black/20 p-1.5 rounded border border-white/5 mb-1.5">
                  {healthResult.error}
                </p>
              )}

              <p className="leading-relaxed text-slate-300 font-sans">
                💡 <span className="font-bold text-white">คำแนะนำ:</span> {healthResult.suggestion}
              </p>

              {healthResult.latencyMs > 0 && (
                <div className="mt-2 text-[10px] text-gray-400 flex justify-between items-center font-mono border-t border-white/5 pt-1.5">
                  <span>ความเร็วในการตอบสนอง (Latency):</span>
                  <span className={healthResult.latencyMs > 1500 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                    {healthResult.latencyMs} ms
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={healthChecking}
              onClick={handleRunHealthCheck}
              className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800 text-white text-[11px] font-bold py-2.5 rounded-xl transition-all border border-rose-500/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${healthChecking ? 'animate-spin' : ''}`} />
              <span>{healthChecking ? "กำลังตรวจสอบการเชื่อมต่อ..." : "กดเพื่อตรวจสอบ (Run Health Check)"}</span>
            </button>
          </div>
        </div>
      )}

      {/* History Menu Panel Overlay */}
      {showHistoryPanel && (
        <div className="absolute top-[62px] left-3 right-3 bg-[#16161A]/95 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl z-50 animate-in fade-in slide-in-from-top-4 duration-200 text-left">
          <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <History className="w-4 h-4" /> เมนูประวัติแชตย้อนหลัง (Sandbox Chat Histories)
            </span>
            <button onClick={() => setShowHistoryPanel(false)} className="text-gray-500 hover:text-white text-xs cursor-pointer">✕ ปิด</button>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed mb-3">
            ระบบทำการบันทึกทุกแชตที่คุณพิมพ์คุยกับบอทตัวนี้ไว้ใน LocalStorage เพื่อให้จำลองข้อความต่อได้ทันทีแม้จะปิดหรือรีเฟรชหน้าเว็บ
          </p>
          <div className="bg-[#111114] rounded-xl p-3 border border-white/5 space-y-2 mb-3 max-h-[120px] overflow-y-auto font-sans">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-400">บอทแชตส่วนตัว (Direct Chat):</span>
              <span className="font-mono font-bold text-indigo-400">{botChat.length} ข้อความ</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-400">ห้องแชตกลุ่ม (Group Chat):</span>
              <span className="font-mono font-bold text-indigo-400">{groupChat.length} ข้อความ</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-400">ช่องบรอดแคสต์ (Channel Chat):</span>
              <span className="font-mono font-bold text-indigo-400">{channelChat.length} ข้อความ</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                handleResetChat();
                setShowHistoryPanel(false);
              }}
              className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 text-[11px] font-bold py-2.5 rounded-xl transition-all border border-white/5 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>รีเซ็ตแชตเริ่มต้น</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const currentKey = config.token || config.name;
                localStorage.removeItem(`sandbox_chat_history_${currentKey}`);
                handleResetChat();
                setShowHistoryPanel(false);
              }}
              className="flex-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 text-[11px] font-bold py-2.5 rounded-xl transition-all border border-rose-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ลบประวัติ LocalStorage</span>
            </button>
          </div>
        </div>
      )}

      {/* Simulator Environment Selector tabs */}
      <div className="bg-[#111114]/80 border-b border-white/5 px-2.5 py-1.5 flex gap-1 shadow-inner">
        <button
          onClick={() => setActiveTab('bot')}
          className={`flex-1 py-1 rounded-lg text-[10px] sm:text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${activeTab === 'bot' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-gray-400 hover:bg-white/5 hover:text-slate-200'}`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">บอทแชตส่วนตัว</span>
          <span className="inline sm:hidden">บอท</span>
        </button>
        <button
          onClick={() => setActiveTab('group')}
          className={`flex-1 py-1 rounded-lg text-[10px] sm:text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${activeTab === 'group' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-gray-400 hover:bg-white/5 hover:text-slate-200'}`}
        >
          <Users className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">ผู้ดูแลกลุ่ม</span>
          <span className="inline sm:hidden">กลุ่ม</span>
        </button>
        <button
          onClick={() => setActiveTab('channel')}
          className={`flex-1 py-1 rounded-lg text-[10px] sm:text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${activeTab === 'channel' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-gray-400 hover:bg-white/5 hover:text-slate-200'}`}
        >
          <Megaphone className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">แชนแนลข่าว</span>
          <span className="inline sm:hidden">แชนแนล</span>
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 py-1 rounded-lg text-[10px] sm:text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${activeTab === 'analytics' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-gray-400 hover:bg-white/5 hover:text-slate-200'}`}
        >
          <Activity className="w-3.5 h-3.5 animate-pulse" />
          <span>วิเคราะห์ข้อมูล</span>
        </button>
      </div>

      {/* Warning Box banner inside Simulator for special states */}
      {activeTab === 'group' && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-[11px] text-amber-400 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span>ทดสอบสแปม: ลองพิมพ์แชร์ลิงก์ (เช่น http://test.com) หรือพิมพ์คำไม่สุภาพ</span>
          </div>
          <button 
            onClick={handleSimulateNewMember}
            className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold px-2 py-0.5 rounded text-[10px] transition-all cursor-pointer"
          >
            จำลองสมาชิกเข้ากลุ่มใหม่ +
          </button>
        </div>
      )}

      {activeTab === 'group' && config.marketingSettings?.challengeActive !== false && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-2 text-[11px] text-emerald-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0 animate-pulse" />
            <div>
              <span className="font-bold text-white">🏆 ภารกิจตรวจสอบผู้แชร์กลุ่ม:</span>{" "}
              <span className="italic">{config.marketingSettings?.challengeQuestion || "JIMMY BOT เปิดให้บริการครั้งแรกในปี ค.ศ. ใด?"}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${challengeVerified ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'}`}>
              {challengeVerified ? "✅ VERIFIED" : "❌ UNVERIFIED"}
            </span>
            <span className="text-[10px] text-emerald-300 font-medium">
              (เฉลย: <span className="font-mono bg-black/40 px-1 rounded">{config.marketingSettings?.challengeAnswer || "2024"}</span>)
            </span>
          </div>
        </div>
      )}

      {activeTab === 'bot' && config.botSettings.enableAiAssistant && (
        <div className="bg-indigo-500/10 border-b border-indigo-500/20 px-4 py-2 text-[11px] text-indigo-300 flex items-center gap-1.5 shadow-xs">
          <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0 animate-pulse" />
          <span>ระบบ AI อัจฉริยะเปิดใช้งานอยู่: คุณสามารถพิมพ์ข้อความทั่วไปคุยและถามตอบกับบอทได้เลย!</span>
        </div>
      )}

      {/* Main Chat Area */}
      <div className={`flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar transition-all duration-300 ${getWallpaperClass()}`}>
        {activeTab === 'analytics' ? (
          <AnalyticsDashboard config={config} />
        ) : (
          <>
            {currentChatList.map((msg) => {
              if (msg.sender === "system") {
                return (
                  <div key={msg.id} className="flex justify-center my-2.5">
                    <span className="bg-white/5 text-gray-400 border border-white/5 px-3 py-1.5 rounded-xl text-[10px] font-medium text-center shadow-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-gray-500" />
                      {msg.text}
                    </span>
                  </div>
                );
              }

              const isSelf = msg.sender === "user";

              return (
                <div key={msg.id} className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                  <div className={`flex items-start gap-2.5 max-w-[85%] ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Dynamic Avatar */}
                    {!isSelf && (
                      <div className="w-8 h-8 rounded-full bg-indigo-600/10 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden mt-0.5">
                        {activeTab === 'bot' && config.avatarUrl ? (
                          <img
                            src={config.avatarUrl}
                            alt="Bot Avatar"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Bot className="w-4 h-4 text-indigo-400" />
                        )}
                      </div>
                    )}

                    <div className={`px-3.5 py-2.5 shadow-xs transition-all duration-300 ${getBubbleClass(isSelf)}`}>
                      {!isSelf && (
                        <div className="text-[10px] font-bold text-indigo-400 mb-0.5">
                          {msg.senderName}
                        </div>
                      )}
                      {msg.imageUrl && (
                        <div className="mb-2 max-w-full rounded-lg overflow-hidden border border-white/10">
                          <img
                            src={msg.imageUrl}
                            alt="Attached attachment"
                            className="w-full max-h-48 object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                      <div className="text-xs whitespace-pre-wrap leading-relaxed break-words">{msg.text}</div>
                      <div className={`text-[9px] mt-1 text-right ${isSelf ? 'text-indigo-200' : 'text-gray-500'}`}>
                        {msg.timestamp}
                      </div>
                    </div>
                  </div>

                  {/* Bot Inline Buttons under bubble */}
                  {!isSelf && msg.sender === "bot" && activeTab === 'bot' && (msg.inlineButtons || []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 ml-10.5 max-w-[80%]">
                      {buttonModel.inlineButtons.filter((btn) => msg.inlineButtons?.includes(btn.id)).map((btn) => (
                        <button
                          key={btn.id}
                          type="button"
                          onClick={() => handleInlineButtonClick(btn)}
                          className="bg-[#1c1c24] hover:bg-indigo-600/15 border border-white/5 hover:border-indigo-500/40 text-indigo-400 text-[10px] font-bold py-1.5 px-3 rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                        >
                          <span>{btn.label}</span>
                          {(btn.url || btn.webAppUrl) && <Globe className="w-3 h-3 text-gray-500" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing simulation with avatar */}
            {typing && (
              <div className="flex justify-start items-start gap-2.5">
                <div className="w-8 h-8 rounded-full bg-indigo-600/10 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden mt-0.5">
                  {activeTab === 'bot' && config.avatarUrl ? (
                    <img
                      src={config.avatarUrl}
                      alt="Bot Avatar"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Bot className="w-4 h-4 text-indigo-400" />
                  )}
                </div>
                <div className="bg-[#16161A] rounded-2xl rounded-tl-none px-4 py-3 border border-white/5 shadow-xs flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-indigo-400 mr-1">{config.name || "Bot"}</span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* 🚀 Command Suggestions Popover list */}
      {activeTab === 'bot' && showCommandSuggestions && filteredCommands.length > 0 && (
        <div className="absolute left-3 right-3 bottom-[64px] bg-[#16161A] border border-white/10 rounded-2xl shadow-2xl z-40 p-2.5 max-h-[180px] overflow-y-auto custom-scrollbar">
          <div className="text-[9px] font-bold text-gray-500 px-2 py-1 uppercase tracking-wider">💡 รายการคำสั่งด่วน (Bot Commands)</div>
          <div className="space-y-0.5 mt-1">
            {filteredCommands.map((cmd, cIdx) => (
              <button
                key={cIdx}
                type="button"
                onClick={() => {
                  setInputText(`/${cmd.command}`);
                  setShowCommandSuggestions(false);
                }}
                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-indigo-600/10 text-xs flex justify-between items-center transition-all cursor-pointer text-slate-200"
              >
                <span className="font-mono text-indigo-400 font-bold">/{cmd.command}</span>
                <span className="text-gray-400 text-[10px]">{cmd.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 🚀 Inline Queries Popover results */}
      {activeTab === 'bot' && showInlineSuggestions && filteredInlineResults.length > 0 && (
        <div className="absolute left-3 right-3 bottom-[64px] bg-[#16161A] border border-white/10 rounded-2xl shadow-2xl z-40 p-2.5 max-h-[180px] overflow-y-auto custom-scrollbar">
          <div className="text-[9px] font-bold text-indigo-400 px-2 py-1 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            ค้นหาด่วนแบบ Inline (Inline Queries)
          </div>
          <div className="space-y-1 mt-1.5">
            {filteredInlineResults.map((res, rIdx) => (
              <button
                key={rIdx}
                type="button"
                onClick={() => handleSendInlineQuery(res.content, res.title)}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-indigo-600/10 flex flex-col transition-all border border-transparent hover:border-white/5 cursor-pointer"
              >
                <span className="text-xs font-bold text-slate-200">{res.title}</span>
                <span className="text-[10px] text-gray-400 mt-0.5 leading-snug">{res.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Simulator Bottom Menu (Keyboard Shortcuts) for BOT tab only */}
      {activeTab === 'bot' && replyKeyboardButtons.length > 0 && (
        <div className="bg-[#16161A] border-t border-white/5 px-3 py-2.5 shadow-md">
          <div className="text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">⌨️ แป้นพิมพ์เมนูด่วนของบอท (Quick Menu Buttons)</div>
          <div className="grid grid-cols-2 gap-2">
            {replyKeyboardButtons.map((kb) => (
              <button
                key={kb.id}
                type="button"
                onClick={() => handleSendMessage(kb.label)}
                disabled={typing}
                className="bg-[#111114] hover:bg-white/5 border border-white/5 hover:border-indigo-500/30 text-indigo-400 hover:text-indigo-300 text-[11px] font-semibold py-2 px-3 rounded-xl shadow-xs transition-all cursor-pointer text-center truncate"
              >
                {kb.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message Input Box with custom Menu button */}
      {activeTab !== 'analytics' && (
        activeTab !== 'channel' ? (
          <div className="bg-[#16161A] border-t border-white/5 p-3 flex gap-2 items-center">
            {activeTab === 'bot' && (
              <button
                type="button"
                onClick={handleMenuButtonClick}
                className="bg-[#111114] hover:bg-white/5 border border-white/5 hover:border-indigo-500/30 text-indigo-400 hover:text-indigo-300 text-[11px] font-bold px-3 py-2.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer shrink-0"
                title="เปิดเมนูบอท"
              >
                <Menu className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {config.botMenuButton?.type === 'web_app' && config.botMenuButton.text ? config.botMenuButton.text : '📁 เมนูบอท'}
                </span>
              </button>
            )}

            <input
              type="text"
              className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:bg-black/60"
              placeholder={activeTab === 'bot' ? "พิมพ์ / คำสั่งด่วน หรือพิมพ์ @ ค้นหาแบบ inline..." : "พิมพ์ข้อความส่งในกลุ่มแชต..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSendMessage(inputText);
                }
              }}
              disabled={typing}
            />
            <button
              onClick={() => handleSendMessage(inputText)}
              disabled={typing || !inputText.trim()}
              className="bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-800 text-white p-2.5 rounded-xl shadow-xs transition-all flex items-center justify-center cursor-pointer flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="bg-[#111114] border-t border-white/5 px-4 py-3.5 text-center text-xs text-gray-500 font-medium">
            🔒 สมาชิกทั่วไปสามารถอ่านข่าวสารในแชนแนลได้เท่านั้น (ส่งแชตไม่ได้)
          </div>
        )
      )}

      {/* 🌐 Telegram Web App Simulated Modal */}
      {webAppUrl && (
        <div className="absolute inset-0 bg-black/95 z-50 flex flex-col p-4 animate-none overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3">
            <span className="text-xs font-bold text-indigo-400 flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-400 animate-pulse" />
              Telegram Web App (หน้าจอจำลองเปิด Web App ในแอปพลิเคชัน)
            </span>
            <button
              onClick={() => setWebAppUrl(null)}
              className="bg-[#1e1e24] hover:bg-rose-600/20 hover:text-rose-400 border border-white/5 text-gray-300 text-[10px] font-bold px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
            >
              ปิดเว็บแอป ✕
            </button>
          </div>
          
          <div className="flex-1 rounded-xl overflow-hidden bg-[#16161A] border border-white/5 flex flex-col relative">
            <div className="bg-[#111114] px-3 py-1.5 border-b border-white/5 text-[10px] font-mono text-gray-500 flex items-center gap-1 truncate select-all">
              🔒 Safe Connection: {webAppUrl}
            </div>
            <iframe
              src={webAppUrl}
              className="w-full flex-1 border-0"
              title="Telegram Web App Simulator"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}

      {/* API Logs overlay */}
      {showLogsPanel && config.externalApis?.sendLeadsToApi && (
        <div className="absolute inset-x-0 bottom-0 top-[102px] bg-[#0A0A0C]/95 border-t border-white/10 z-30 flex flex-col p-4 animate-none overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 font-mono">
              <Globe className="w-4 h-4 text-emerald-400" />
              API Webhook & Event Monitor (จำลองการรับส่งข้อมูล)
            </span>
            <button
              onClick={() => setApiLogs([])}
              className="text-[10px] text-gray-500 hover:text-rose-400 underline cursor-pointer"
            >
              เคลียร์ประวัติ Log
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3.5 custom-scrollbar pr-1 pb-4">
            {apiLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 space-y-2 p-6">
                <Terminal className="w-8 h-8 text-gray-600 animate-pulse" />
                <p className="text-xs font-bold">ยังไม่มีประวัติการส่งข้อมูล (API Log is Empty)</p>
                <p className="text-[10px] text-gray-600 max-w-xs leading-relaxed">
                  ลองพิมพ์แชตส่งข้อความ หรือลองส่งข้อมูลผิดกฎในกลุ่มเพื่อกระตุ้นให้ Webhook ส่งข้อความ Payload ไปหา API ปลายทางของคุณ!
                </p>
              </div>
            ) : (
              apiLogs.map((log) => (
                <div key={log.id} className="bg-black/80 border border-white/5 rounded-xl p-3 space-y-2 font-mono text-[10px] text-left">
                  <div className="flex justify-between items-center text-emerald-400 border-b border-white/5 pb-1 font-bold">
                    <span className="flex items-center gap-1">🌐 {log.event}</span>
                    <span className="text-gray-500 font-normal">{log.time}</span>
                  </div>
                  <pre className="text-slate-300 overflow-x-auto whitespace-pre leading-relaxed p-1.5 bg-[#0D0D10] rounded-lg border border-white/5 custom-scrollbar">{log.payload}</pre>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
