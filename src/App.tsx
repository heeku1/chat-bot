import { useState, useEffect } from "react";
import { Bot, Sparkles, Terminal, FileCode, CheckCircle2, BookOpen, Settings, Plus, Trash2, Copy, Layers, Wand2, Heart, ChevronDown, ChevronUp, Check, Sun, Moon, LogOut, Users, UserCheck, Eye, Gift } from "lucide-react";
import { BotConfig, UserAccount } from "./types";
import AiCopilot from "./components/AiCopilot";
import ConfigForm from "./components/ConfigForm";
import TelegramSimulator from "./components/TelegramSimulator";
import DeployGuide from "./components/DeployGuide";
import CommandParserPlayground from "./components/CommandParserPlayground";
import LoginScreen from "./components/LoginScreen";
import UserManagementConsole from "./components/UserManagementConsole";
import TemplateDetailModal from "./components/TemplateDetailModal";
import MarketingDashboard from "./components/MarketingDashboard";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import AdminLayout, { DashboardHome, ShellPage, ShellPlaceholder } from "./components/AdminLayout";
import Phase2Panel from "./components/Phase2Panel";
import { botTemplates } from "./presets";
import { createButtonId, migrateLegacyButtonIds } from "./utils/buttonActions";
// @ts-ignore
import jimmyLogo from "./bot_jimmy_logo.jpg";

const shellPlaceholders: Partial<Record<ShellPage, { title: string; description: string }>> = {
  "content-studio": { title: "Content Studio", description: "พื้นที่สร้างและจัดการเนื้อหา ฟังก์ชันจริงจะเชื่อมใน Phase ถัดไป" },
  "image-studio": { title: "Image Studio", description: "พื้นที่สร้างและจัดการรูปภาพ ฟังก์ชันจริงจะเชื่อมใน Phase ถัดไป" },
  "code-helper": { title: "Code Helper", description: "พื้นที่ช่วยอธิบายและเตรียมโค้ด ฟังก์ชันจริงจะเชื่อมใน Phase ถัดไป" },
  conversations: { title: "Telegram Conversations", description: "จัดการและตรวจสอบบทสนทนา Telegram ฟังก์ชันจริงจะเชื่อมใน Phase ถัดไป" },
  groups: { title: "Telegram Groups", description: "จัดการและตรวจสอบกลุ่ม Telegram ฟังก์ชันจริงจะเชื่อมใน Phase ถัดไป" },
  channels: { title: "Telegram Channels", description: "จัดการและตรวจสอบแชนแนล Telegram ฟังก์ชันจริงจะเชื่อมใน Phase ถัดไป" },
  broadcast: { title: "Telegram Broadcast", description: "เตรียมและตรวจสอบงาน Broadcast ฟังก์ชันส่งจริงจะเชื่อมใน Phase ถัดไป" },
  "tool-manager": { title: "Tool Manager", description: "จัดการรายการเครื่องมือและสิทธิ์ ฟังก์ชันจริงจะเชื่อมใน Phase ถัดไป" },
  "api-connections": { title: "API Connections", description: "จัดการการเชื่อมต่อ API ภายนอก ฟังก์ชันจริงจะเชื่อมใน Phase ถัดไป" },
  "activity-logs": { title: "Activity Logs", description: "ตรวจสอบประวัติกิจกรรมของระบบ ฟังก์ชันบันทึกจริงจะเชื่อมใน Phase ถัดไป" },
  "ai-models": { title: "AI Models", description: "จัดการ AI provider และ model selection ฟังก์ชันจริงจะเชื่อมใน Phase ถัดไป" },
  "api-keys": { title: "API Keys", description: "จัดการสถานะ API keys อย่างปลอดภัย ฟังก์ชันเฉพาะหน้าจะเชื่อมใน Phase ถัดไป" },
  "telegram-settings": { title: "Telegram Settings", description: "จัดการค่าการเชื่อมต่อ Telegram ฟังก์ชันเฉพาะหน้าจะเชื่อมใน Phase ถัดไป" },
};


const defaultBotConfig: BotConfig = {
  name: "บอทต้อนรับ & ดูแลกลุ่มอัจฉริยะ",
  token: "",
  platform: "all",
  reviewerMode: "normal",
  avatarUrl: "https://picsum.photos/seed/bot/150/150", // default placeholder
  botCommands: [
    { command: "start", description: "เริ่มต้นใช้งานบอทและรับข้อความต้อนรับ", reply: "สวัสดีครับ ยินดีต้อนรับเข้าสู่บริการบอทอัจฉริยะ! พิมพ์เมนูคีย์บอร์ดหรือถาม AI ได้เลยครับ 🤖✨" },
    { command: "help", description: "ดูคู่มือการใช้งานและคำสั่งทั้งหมด", reply: "🤖 คู่มือช่วยเหลือสำหรับการใช้งานบอท:\n- คลิกเมนูแผงด้านล่างเพื่อดูสินค้า/บริการ\n- พิมพ์คุยกับ AI ได้โดยตรง\n- ใช้คำสั่งพิเศษในกลุ่ม เช่น /rules\n- พิมพ์ @บอท ตามด้วยคำค้นเพื่อค้นหาด่วนแบบ Inline!" },
    { command: "promo", description: "รับโค้ดคูปองส่วนลดพิเศษล่าสุด", reply: "🎁 โค้ดส่วนลดของคุณคือ: WELCOME100 (รับส่วนลด 100 บาทเมื่อช้อปครบ 500 บาท!)" }
  ],
  botButtons: {
    inlineButtons: [
      { text: "🌐 เยี่ยมชมเว็บไซต์หลัก", url: "https://ai.studio/build" },
      { text: "📞 สอบถามโปรโมชั่นพิเศษ", reply: "ราคาพิเศษสำหรับวันนี้ ลดกระหน่ำสูงสุด 20% สนใจสามารถสั่งซื้อกับแอดมินได้เลยครับ!" },
      { text: "⭐ แนะนำกลุ่มแชตนี้", reply: "ขอบคุณที่สนับสนุนเรา! หากชื่นชอบ สามารถแชร์กลุ่มนี้ให้เพื่อนๆ เข้ามาร่วมพูดคุยกันได้เลยนะครับ" }
    ],
    replyKeyboard: [
      { text: "📦 ดูบริการและสินค้าของเรา", reply: "ขณะนี้เรามีบริการจัดทำบอท Telegram, พัฒนาเว็บแอปพลิเคชัน และเทรนนิ่งระบบ AI แบบครบวงจรครับ!" },
      { text: "🕒 เวลาทำการของร้าน", reply: "ร้านค้าและเจ้าหน้าที่แอดมินพร้อมให้บริการทุกวัน ตั้งแต่เวลา 09:00 น. ถึง 20:00 น. นอกเวลาทำการสามารถพิมพ์ถาม AI ได้เลยครับ!" }
    ]
  },
  botMenuButton: {
    type: "commands",
    text: "🌐 เปิดร้านค้าออนไลน์",
    url: "https://ai.studio/build"
  },
  inlineQuerySettings: {
    enableInline: true,
    placeholder: "ค้นหาข้อมูลด่วน...",
    results: [
      { id: "inline-1", title: "🎁 คูปองส่วนลด 50%", description: "โค้ดลดราคาจัดส่งฟรีและลดเพิ่ม 50 บาท", content: "🎉 แจกคูปองส่วนลดด่วน! เพียงพิมพ์โค้ด FAST50 รับส่วนลดค่าจัดส่งฟรีทันที" },
      { id: "inline-2", title: "📍 พิกัดร้านและแผนที่", description: "ที่อยู่สำนักงานใหญ่ สาขากรุงเทพฯ", content: "📍 แผนที่สำนักงานใหญ่: ตั้งอยู่ที่สยามพารากอน ชั้น 4 กรุงเทพฯ เปิดบริการทุกวัน 10:00 - 22:00 น." },
      { id: "inline-3", title: "👤 สมัครสมาชิกใหม่", description: "ขั้นตอนการสมัครสมาชิกเพื่อรับคะแนนสะสม", content: "👤 วิธีสมัครสมาชิก: ส่งชื่อ-เบอร์โทรหาแอดมินเพื่อลงทะเบียนฟรี สะสมแต้มแลกของรางวัลมากมาย!" }
    ]
  },
  botSettings: {
    welcomeMessage: "สวัสดีครับ! ยินดีต้อนรับเข้าสู่ระบบบอทบริการอัจฉริยะ 🤖✨\n\nกรุณาเลือกเมนูที่คุณต้องการสืบค้นด้านล่างเพื่อเริ่มต้นการใช้งานได้ทันทีครับ:",
    enableAiAssistant: true,
    aiPrompt: "คุณคือบอทบริการลูกค้าอัจฉริยะชื่อ 'มั่งคั่ง' คอยพูดคุยและตอบคำถามอย่างเป็นกันเองและสุภาพ ข้อมูลร้านค้า: ร้านเปิดทำการ 9:00 - 18:00 น. มีโปรโมชั่นคูปองจัดส่งฟรีเมื่อช้อปครบ 350 บาทขึ้นไป!",
    keyboards: [
      { text: "📦 ดูสินค้าทั้งหมด", response: "ขณะนี้เรามีสินค้าคอลเลกชันใหม่ล่าสุด ได้แก่ เสื้อยืดดีไซน์มินิมอล ราคา 290.- และกระเป๋าสะพายผ้าแคนวาส ราคา 390.- ครับ!" },
      { text: "💳 วิธีการชำระเงิน", response: "สามารถโอนเงินผ่านบัญชีธนาคารออมทรัพย์ กสิกรไทย\nเลขบัญชี: 123-4-56789-0\nชื่อบัญชี: บจก. เทเลแกรมบอทครีเอเตอร์\n(เมื่อโอนเสร็จรบกวนส่งสลิปแจ้งทางแอดมินด้วยครับ)" },
      { text: "📞 ติดต่อเจ้าหน้าที่", response: "หากคุณมีคำถามเร่งด่วน สามารถโทรติดต่อฝ่ายบริการลูกค้าสัมพันธ์ได้ที่เบอร์ 02-123-4567 ในเวลาทำการครับ" }
    ],
    autoReplies: [
      { keyword: "ราคา", reply: "สินค้าของร้านเริ่มต้นเพียง 290 บาทเท่านั้นครับ!" },
      { keyword: "โปรโมชั่น", reply: "พิเศษสุดวันนี้! ซื้อสินค้าครบ 500 บาท รับส่วนลดเพิ่มทันที 5%" },
      { keyword: "ที่อยู่", reply: "สำนักงานใหญ่ของเราตั้งอยู่เลขที่ 123 อาคารสยามสแควร์ กรุงเทพมหานคร" }
    ]
  },
  groupSettings: {
    welcomeNewMember: true,
    welcomeMessage: "🎉 ยินดีต้อนรับคุณ {name} เข้าสู่กลุ่มแชตอย่างเป็นทางการ!\nกรุณาตรวจสอบกฎระเบียบของกลุ่มพิมพ์คำสั่ง /rules เพื่อความเรียบร้อยร่วมกันนะครับ",
    antiSpam: {
      blockLinks: true,
      blockSwearWords: true,
      warnLimit: 3
    },
    rulesAnnouncement: "📢 ประกาศระเบียบปฏิบัติในกลุ่มแชตประจำชั่วโมง:\n1. ห้ามเผยแพร่ลิงก์สแปมโฆษณาใดๆ โดยเด็ดขาด\n2. กรุณาใช้คำสุภาพเป็นมิตรกับผู้อื่น\n3. มีการบันทึกคะแนนตักเตือน หากผิดครบ 3 ครั้ง ระบบจะคัดออกทันที",
    rulesInterval: 1,
    customCommands: [
      { command: "/rules", reply: "📢 กฎระเบียบสำคัญประจำกลุ่มแชต:\n- ห้ามแชร์ลิงก์ภายนอก\n- กรุณาใช้ถ้อยคำสุภาพ\n(หากทำผิดกฎครบ 3 ครั้งจะถูกแบนและเตะออกทันทีครับ)" },
      { command: "/help", reply: "🤖 เมนูคำสั่งลัดช่วยเหลือของบอท:\n/rules - ตรวจสอบกฎระเบียบของกลุ่ม\n/help - แสดงคำชี้แจงความช่วยเหลือนี้" }
    ],
    autoTranslation: {
      enable: false,
      targetLanguage: "ภาษาไทย"
    },
    keywordMonitoring: {
      enable: false,
      keywords: ["help", "bad service", "error", "scammed"],
      notificationType: "both",
      adminEmail: "admin@example.com",
      alertThreshold: 2
    }
  },
  channelSettings: {
    autoSignature: true,
    autoSignatureText: "📢 ช่องประชาสัมพันธ์อย่างเป็นทางการ | ติดต่อโฆษณาที่ @AdminSupport",
    enableFormatting: "None",
    targetChannelId: "",
    targetChannelUsername: "",
    scheduledPosts: [
      { id: "post-1", time: "09:00", content: "☀️ อรุณสวัสดิ์ยามเช้า! อัปเดตยอดสั่งซื้อรอบเช้าพร้อมจัดส่งสินค้าให้ลูกค้าเรียบร้อยแล้ว เตรียมรอรับเลขแทร็กได้บ่ายนี้ครับ" },
      { id: "post-2", time: "18:00", content: "📢 ประกาศ: เปิดตัวสินค้าคอลเลกชันพิเศษจำนวนจำกัดช่วงค่ำนี้ ห้ามพลาดกดกระดิ่งติดตามแชนแนลไว้เลย!" }
    ]
  },
  adminPermissions: {
    canDeleteMessages: true,
    canBanUsers: true,
    canPinMessages: true,
    canChangeGroupInfo: false
  },
  privacySettings: {
    allowDirectMessages: true,
    groupPrivacyMode: false,
    showPublicStats: true,
    hideBotCreator: false
  },
  externalApis: {
    webhookUrl: "https://api.yourdomain.com/telegram-webhook",
    googleSheetsUrl: "https://docs.google.com/spreadsheets/d/1xxxx/edit",
    customApiUrl: "https://api.yourdomain.com/products/active",
    apiAuthToken: "tlg_secret_token_abc123xyz",
    sendLeadsToApi: true
  },
  mediaLibrary: [
    {
      id: "media-1",
      name: "แบนเนอร์เปิดตัวสินค้าใหม่",
      url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
      type: "image/jpeg"
    },
    {
      id: "media-2",
      name: "ภาพโปรโมชั่นส่วนลดพิเศษ",
      url: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=600&q=80",
      type: "image/jpeg"
    }
  ]
};

function sanitizePublishConfig(bot: BotConfig): BotConfig {
  const migrated = migrateLegacyButtonIds(bot);
  return {
    ...migrated,
    token: "",
    externalApis: {
      ...migrated.externalApis,
      apiAuthToken: "",
      geminiApiKey: "",
      openaiApiKey: ""
    }
  };
}

export default function App() {
  // 👥 Users Membership Management State
  const [users, setUsers] = useState<UserAccount[]>(() => {
    let loadedUsers: UserAccount[] = [];
    try {
      const saved = localStorage.getItem("jimmy_bot_users_list");
      if (saved) {
        loadedUsers = JSON.parse(saved);
      }
    } catch (e) {}
    
    const defaultUsers: UserAccount[] = [
      {
        username: "admin",
        password: "admin123",
        name: "ผู้ดูแลระบบสูงสุด (Master Admin)",
        role: "admin",
        isActive: true,
        botLimit: 10,
        createdAt: "7/7/2026",
        points: 150,
        referralsCount: 15,
        referralCode: "admin"
      },
      {
        username: "staff1",
        password: "password123",
        name: "เจ้าหน้าที่เทคนิค 1 (Staff 1)",
        role: "member",
        isActive: true,
        botLimit: 3,
        createdAt: "7/7/2026",
        points: 40,
        referralsCount: 4,
        referralCode: "staff1"
      },
      {
        username: "shopowner",
        password: "password123",
        name: "เจ้าของร้านค้า (Shop Owner)",
        role: "member",
        isActive: true,
        botLimit: 5,
        createdAt: "7/7/2026",
        points: 80,
        referralsCount: 8,
        referralCode: "shopowner"
      },
      {
        username: "demo_user",
        password: "password123",
        name: "ผู้ทดสอบระบบ (Demo User)",
        role: "member",
        isActive: true,
        botLimit: 1,
        createdAt: "7/7/2026",
        points: 10,
        referralsCount: 1,
        referralCode: "demouser"
      }
    ];

    if (loadedUsers.length > 0) {
      return loadedUsers.map(u => {
        const d = defaultUsers.find(du => du.username === u.username);
        return {
          ...u,
          points: u.points !== undefined ? u.points : (d?.points || 0),
          referralsCount: u.referralsCount !== undefined ? u.referralsCount : (d?.referralsCount || 0),
          referralCode: u.referralCode || (d?.referralCode || u.username),
        };
      });
    }

    localStorage.setItem("jimmy_bot_users_list", JSON.stringify(defaultUsers));
    return defaultUsers;
  });

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const saved = localStorage.getItem("jimmy_bot_logged_in_user");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return null;
  });

  const [showUsersConsole, setShowUsersConsole] = useState<boolean>(false);

  const [bots, setBots] = useState<BotConfig[]>([]);
  const [activeBotIndex, setActiveBotIndex] = useState<number>(0);

  // Sync Bots list on User login or switch
  useEffect(() => {
    if (!currentUser) {
      setBots([]);
      return;
    }
    try {
      const storageKey = `telegram_bots_list_${currentUser.username}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const allowedBots = parsed.slice(0, currentUser.botLimit).map((bot: BotConfig) => migrateLegacyButtonIds({
            ...bot,
            instanceId: bot.instanceId || createButtonId("bot")
          }));
          setBots(allowedBots);
          localStorage.setItem(storageKey, JSON.stringify(allowedBots));
          setActiveBotIndex(0);
          return;
        }
      }
    } catch (e) {
      console.error(e);
    }
    const initialBots = [migrateLegacyButtonIds({ ...structuredClone(defaultBotConfig), instanceId: createButtonId("bot") })];
    setBots(initialBots);
    setActiveBotIndex(0);
    try {
      const storageKey = `telegram_bots_list_${currentUser.username}`;
      localStorage.setItem(storageKey, JSON.stringify(initialBots));
    } catch (e) {}
  }, [currentUser]);

  // Dynamically check if active user gets disabled or deleted
  useEffect(() => {
    if (!currentUser) return;
    const freshUser = users.find(u => u.username === currentUser.username);
    if (!freshUser) {
      handleLogout();
    } else if (!freshUser.isActive) {
      alert(`🔒 บัญชีของคุณ "${currentUser.name}" ถูกปิดใช้งานโดยผู้ดูแลระบบสูงสุดแล้ว ระบบจะนำคุณออกจากแผงควบคุม`);
      handleLogout();
    } else if (
      freshUser.botLimit !== currentUser.botLimit || 
      freshUser.name !== currentUser.name ||
      freshUser.points !== currentUser.points ||
      freshUser.referralsCount !== currentUser.referralsCount ||
      freshUser.referralCode !== currentUser.referralCode
    ) {
      setCurrentUser(freshUser);
      localStorage.setItem("jimmy_bot_logged_in_user", JSON.stringify(freshUser));
    }
  }, [users, currentUser]);

  const handleLogout = () => {
    setCurrentUser(null);
    setShowUsersConsole(false);
    localStorage.removeItem("jimmy_bot_logged_in_user");
  };

  const handleUpdateUsers = (newUsersList: UserAccount[]) => {
    setUsers(newUsersList);
    localStorage.setItem("jimmy_bot_users_list", JSON.stringify(newUsersList));
  };

  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    localStorage.setItem("jimmy_bot_logged_in_user", JSON.stringify(user));
  };

  const [activeTab, setActiveTab] = useState<'config' | 'simulator' | 'parser' | 'deploy' | 'marketing'>('config');
  const [shellPage, setShellPage] = useState<ShellPage>('dashboard');
  const [showTemplates, setShowTemplates] = useState<boolean>(true);
  const [presetMessage, setPresetMessage] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  // Keyboard shortcut listener for tab switching (Alt + 1, Alt + 2, Alt + 3, Alt + 4, Alt + 5)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        if (e.key === '1') {
          e.preventDefault();
          setActiveTab('config');
          setShellPage('bot-configuration');
        } else if (e.key === '2') {
          e.preventDefault();
          setActiveTab('simulator');
          setShellPage('conversations');
        } else if (e.key === '3') {
          e.preventDefault();
          setActiveTab('parser');
          setShellPage('command-parser');
        } else if (e.key === '4') {
          e.preventDefault();
          setActiveTab('deploy');
          setShellPage('deploy-guide');
        } else if (e.key === '5') {
          e.preventDefault();
          setActiveTab('marketing');
          setShellPage('dashboard');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem("jimmy_bot_theme");
      if (saved === 'light') return 'light';
    } catch (e) {}
    return 'dark';
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    try {
      localStorage.setItem("jimmy_bot_theme", nextTheme);
    } catch (e) {}
  };

  const activeBot = bots[activeBotIndex] || bots[0] || defaultBotConfig;
  const [liveConfigData, setLiveConfigData] = useState<any | null>(null);
  const [publishResult, setPublishResult] = useState<any | null>(null);
  const [publishError, setPublishError] = useState<string>("");
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [isLoadingLiveConfig, setIsLoadingLiveConfig] = useState<boolean>(false);
  const [showLiveConfigPanel, setShowLiveConfigPanel] = useState<boolean>(false);
  const [featureMatrix, setFeatureMatrix] = useState<any[]>([]);
  const [featureMatrixSummary, setFeatureMatrixSummary] = useState<any | null>(null);
  const [showFeatureMatrix, setShowFeatureMatrix] = useState<boolean>(false);
  const [isLoadingFeatureMatrix, setIsLoadingFeatureMatrix] = useState<boolean>(false);
  const [preflightResult, setPreflightResult] = useState<any | null>(null);
  const [showPreflightWarnings, setShowPreflightWarnings] = useState<boolean>(false);

  const loadLiveConfig = async () => {
    setIsLoadingLiveConfig(true);
    try {
      const response = await fetch(`/api/telegram/live-config?instanceId=${encodeURIComponent(activeBot.instanceId || "")}`);
      const data = await response.json();
      setLiveConfigData(data);
      if (data?.telegramStatus?.hasBotToken === false) {
        setPublishError("Telegram Bot ยังไม่พร้อม: ยังไม่ได้ตั้ง BOT_TOKEN");
      }
    } catch (error: any) {
      setPublishError(error?.message || "โหลด Live Config ไม่สำเร็จ");
    } finally {
      setIsLoadingLiveConfig(false);
    }
  };

  const loadFeatureMatrix = async () => {
    setIsLoadingFeatureMatrix(true);
    try {
      const response = await fetch(`/api/telegram/feature-matrix?instanceId=${encodeURIComponent(activeBot.instanceId || "")}`);
      const data = await response.json();
      setFeatureMatrix(data?.features || []);
      setFeatureMatrixSummary(data?.summary || null);
    } catch (error: any) {
      console.error("loadFeatureMatrix error:", error);
    } finally {
      setIsLoadingFeatureMatrix(false);
    }
  };

  const handlePublishToTelegram = async () => {
    setIsPublishing(true);
    setPublishError("");
    setPreflightResult(null);
    setShowPreflightWarnings(false);
    try {
      // Preflight check first
      const preflightRes = await fetch("/api/telegram/preflight-publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceId: activeBot.instanceId, token: activeBot.token, config: sanitizePublishConfig(activeBot) })
      });
      const preflight = await preflightRes.json();
      setPreflightResult(preflight);
      if (!preflight.canPublish) {
        setPublishError(preflight.blockers?.map((b: any) => b.message).join(", ") || "ไม่สามารถเผยแพร่ได้");
        setShowPreflightWarnings(true);
        setIsPublishing(false);
        return;
      }
      if (preflight.warnings?.length > 0) {
        setShowPreflightWarnings(true);
      }
      const response = await fetch("/api/telegram/publish-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceId: activeBot.instanceId, token: activeBot.token, config: sanitizePublishConfig(activeBot) })
      });
      const data = await response.json();
      setPublishResult(data);
      if (!response.ok || data?.ok === false) {
        const telegramErrors = data?.telegram ? Object.values(data.telegram)
          .map((step: any) => step?.error)
          .filter(Boolean) : [];
        setPublishError(data?.error || telegramErrors[0] || "เผยแพร่ไม่สำเร็จ");
      } else {
        setShowLiveConfigPanel(false);
      }
      await Promise.all([loadLiveConfig(), loadFeatureMatrix()]);
    } catch (error: any) {
      setPublishError(error?.message || "เผยแพร่ไม่สำเร็จ");
    } finally {
      setIsPublishing(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    loadLiveConfig();
    loadFeatureMatrix();
  }, [currentUser, activeBot.instanceId, activeBot.token, activeBot.externalApis?.geminiApiKey, activeBot.externalApis?.openaiApiKey]);

  const hasBotToken = Boolean(activeBot?.token?.trim()) || liveConfigData?.telegramStatus?.hasBotToken !== false;
  const isPublished = Boolean(liveConfigData?.liveMap?.lastPublishedAt);
  const hasBackendError = Boolean(publishError);
  const telegramStatusLabel = !hasBotToken || hasBackendError
    ? "Telegram Bot ยังไม่พร้อม"
    : isPublished
      ? "Telegram Real Bot Connected"
      : "ยังไม่ได้เผยแพร่ config ไป Telegram";

  const saveBotsToLocalStorage = (newBots: BotConfig[]) => {
    if (!currentUser) return;
    const limit = currentUser.botLimit;
    const finalBots = newBots.slice(0, limit).map((bot) => migrateLegacyButtonIds({
      ...bot,
      instanceId: bot.instanceId || createButtonId("bot")
    }));
    setBots(finalBots);
    const storageKey = `telegram_bots_list_${currentUser.username}`;
    localStorage.setItem(storageKey, JSON.stringify(finalBots));
  };

  const handleUpdateActiveBot = (updatedBot: BotConfig) => {
    const nextBots = [...bots];
    const targetIndex = activeBotIndex < nextBots.length ? activeBotIndex : 0;
    nextBots[targetIndex] = migrateLegacyButtonIds({
      ...updatedBot,
      instanceId: bots[targetIndex]?.instanceId || updatedBot.instanceId || createButtonId("bot")
    });
    saveBotsToLocalStorage(nextBots);
  };

  const handleAddNewBot = () => {
    if (currentUser && bots.length >= currentUser.botLimit) {
      setPresetMessage(`⚠️ บัญชีของคุณจำกัดโควตาไว้ไม่เกิน ${currentUser.botLimit} ตัว (สามารถเพิ่มโควตาได้โดยติดต่อแอดมิน)`);
      setTimeout(() => setPresetMessage(null), 5000);
      return;
    }
    if (bots.length >= 10) return;
    const newBotNum = bots.length + 1;
    const newBot: BotConfig = migrateLegacyButtonIds({
      ...structuredClone(defaultBotConfig),
      instanceId: createButtonId("bot"),
      name: `บอทตัวที่ ${newBotNum} - ใหม่`,
      avatarUrl: `https://picsum.photos/seed/bot_${newBotNum}_${Math.floor(Math.random() * 1000)}/150/150`
    });
    const nextBots = [...bots, newBot];
    saveBotsToLocalStorage(nextBots);
    setActiveBotIndex(nextBots.length - 1);
  };

  const handleCloneActiveBot = () => {
    if (currentUser && bots.length >= currentUser.botLimit) {
      setPresetMessage(`⚠️ ไม่สามารถคัดลอกได้ เนื่องจากโควตาเต็มที่ ${currentUser.botLimit} ตัว`);
      setTimeout(() => setPresetMessage(null), 5000);
      return;
    }
    if (bots.length >= 10) return;
    const clonedBot: BotConfig = migrateLegacyButtonIds({
      ...structuredClone(activeBot),
      instanceId: createButtonId("bot"),
      name: `${activeBot.name} (คัดลอก)`,
    });
    const nextBots = [...bots, clonedBot];
    saveBotsToLocalStorage(nextBots);
    setActiveBotIndex(nextBots.length - 1);
  };

  const handleDeleteActiveBot = () => {
    if (bots.length <= 1) return;
    const nextBots = bots.filter((_, idx) => idx !== activeBotIndex);
    saveBotsToLocalStorage(nextBots);
    setActiveBotIndex(Math.max(0, activeBotIndex - 1));
  };

  const handleSuggest = (newConfig: BotConfig) => {
    // If the suggest was generated without a token, preserve the user's existing token
    handleUpdateActiveBot({
      ...newConfig,
      instanceId: activeBot.instanceId,
      token: activeBot.token || newConfig.token || ""
    });
    // Jump user back to the preview/simulator page
    setActiveTab('simulator');
  };

  const handleLoadTemplate = (templateConfig: BotConfig, templateName: string) => {
    const nextConfig = {
      ...templateConfig,
      instanceId: activeBot.instanceId,
      token: activeBot.token || ""
    };
    handleUpdateActiveBot(nextConfig);
    setPresetMessage(`✨ โหลดเทมเพลต "${templateName}" สำหรับบอทปัจจุบันเรียบร้อยแล้ว!`);
    setTimeout(() => setPresetMessage(null), 5000);
  };

  const handleImportTemplateAsNew = (templateConfig: BotConfig, templateName: string) => {
    if (currentUser && bots.length >= currentUser.botLimit) {
      setPresetMessage(`⚠️ บัญชีของคุณจำกัดโควตาไว้ไม่เกิน ${currentUser.botLimit} ตัว (ไม่สามารถนำเข้าเทมเพลตเพิ่มได้)`);
      setTimeout(() => setPresetMessage(null), 5000);
      return;
    }
    if (bots.length >= 10) {
      setPresetMessage("⚠️ ไม่สามารถเพิ่มบอทใหม่ได้ เนื่องจากคุณมีบอทเต็มจำนวน (สูงสุด 10 ตัว) แล้ว");
      setTimeout(() => setPresetMessage(null), 5000);
      return;
    }
    const nextBots = [...bots, migrateLegacyButtonIds({ ...structuredClone(templateConfig), instanceId: createButtonId("bot"), token: "" })];
    saveBotsToLocalStorage(nextBots);
    setActiveBotIndex(nextBots.length - 1);
    setPresetMessage(`🎉 นำเข้าเทมเพลต "${templateName}" เป็นบอทใหม่ใน Workspace เรียบร้อยแล้ว!`);
    setTimeout(() => setPresetMessage(null), 5000);
  };

  const handleShellNavigate = (page: ShellPage) => {
    setShellPage(page);
    if (page === 'command-parser') setActiveTab('parser');
    else if (page === 'deploy-guide') setActiveTab('deploy');
    else if (page === 'bot-configuration') setActiveTab('config');
    else if (page === 'users' && currentUser?.role === 'admin') setShowUsersConsole(true);
  };

  if (!currentUser) {
    return (
      <LoginScreen
        theme={theme}
        toggleTheme={toggleTheme}
        users={users}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  const aiReady = Boolean(activeBot.externalApis?.geminiApiKey || activeBot.externalApis?.openaiApiKey);
  const placeholderPage = shellPlaceholders[shellPage];
  const isPhase2PanelPage = shellPage === 'memory' || shellPage === 'recommendations' || shellPage === 'approvals';

  return (
    <AdminLayout
      activePage={shellPage}
      currentUser={currentUser}
      theme={theme}
      aiReady={aiReady}
      telegramReady={hasBotToken && !hasBackendError}
      onNavigate={handleShellNavigate}
      onToggleTheme={toggleTheme}
      onLogout={handleLogout}
    >
      {shellPage === 'dashboard' ? (
        <DashboardHome botCount={bots.length} telegramReady={hasBotToken && !hasBackendError} aiReady={aiReady}>
          <AnalyticsDashboard config={activeBot} />
        </DashboardHome>
      ) : isPhase2PanelPage ? (
        <Phase2Panel
          page={shellPage}
          activeBot={activeBot}
          isAdmin={currentUser.role === 'admin'}
          onUpdateBot={handleUpdateActiveBot}
        />
      ) : placeholderPage ? (
        <ShellPlaceholder title={placeholderPage.title} description={placeholderPage.description} />
      ) : (
    <div className={`legacy-workspace legacy-page-${shellPage} font-sans flex flex-col antialiased ${theme === 'light' ? 'light text-slate-800' : 'dark text-slate-100'}`}>
      {/* Header Banner */}
      <header className="legacy-app-header bg-[#0B0B0D]/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img 
              src={jimmyLogo} 
              alt="Jimmy_bot Logo" 
              className="w-10 h-10 rounded-xl object-cover border border-white/10 ring-2 ring-indigo-500/20" 
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-100 tracking-tight">
                  Jimmy_bot
                </h1>
                <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  AI & Command Suite
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-normal">
                เครื่องมือสร้างบอท Telegram ด้วย AI และระบบวิเคราะห์คำสั่งแบบไม่ต้องเขียนโค้ด
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 justify-end w-full lg:w-auto">
            {/* Logged in User Bar */}
            <div className="flex items-center gap-2 bg-black/30 border border-white/5 p-1 rounded-xl pr-3 pl-2 text-xs">
              <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
                {currentUser.name.charAt(0)}
              </div>
              <div className="text-left font-sans">
                <div className="font-bold text-slate-200 text-[11px] max-w-[120px] truncate">{currentUser.name}</div>
                <div className="text-[9px] text-gray-500 font-semibold flex items-center gap-1">
                  <span>บอท: {bots.length}/{currentUser.botLimit}</span>
                  <span>•</span>
                  <span className="text-indigo-400 uppercase">{currentUser.role}</span>
                </div>
              </div>

              {/* Admin-only Manage Users Console */}
              {currentUser.role === "admin" && (
                <button
                  onClick={() => setShowUsersConsole(true)}
                  className="ml-2 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white p-1.5 rounded-lg border border-indigo-500/20 hover:border-indigo-500 transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                  title="จัดการสมาชิก"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">คีย์ผู้ใช้</span>
                </button>
              )}

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="ml-1 bg-white/5 hover:bg-rose-500/10 text-gray-400 hover:text-rose-400 p-1.5 rounded-lg border border-white/5 hover:border-rose-500/20 transition-all cursor-pointer"
                title="ออกจากระบบ"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 bg-white/5 hover:bg-white/10 text-indigo-400 rounded-xl border border-white/5 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold px-3"
              title="สลับโทนสีสว่าง/มืด"
            >
              {theme === 'light' ? (
                <>
                  <Moon className="w-4 h-4 text-slate-400" />
                  <span className="hidden sm:inline">โหมดมืด (Dark)</span>
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline">โหมดสว่าง (Light)</span>
                </>
              )}
            </button>

            <div className={`hidden md:flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl border ${
              !hasBotToken || hasBackendError
                ? "text-rose-300 bg-rose-500/10 border-rose-500/20"
                : isPublished
                  ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/20"
                  : "text-amber-300 bg-amber-500/10 border-amber-500/20"
            }`}>
              <span className={`w-2 h-2 rounded-full ${!hasBotToken || hasBackendError ? "bg-rose-500" : isPublished ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}></span>
              <span>{telegramStatusLabel}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="legacy-app-main max-w-7xl mx-auto px-4 py-1 flex-1 w-full flex flex-col gap-6">
        <Phase2Panel
          page={shellPage}
          activeBot={activeBot}
          isAdmin={currentUser.role === 'admin'}
          onUpdateBot={handleUpdateActiveBot}
        />
        {/* Top: AI Copilot Section */}
        <div className="legacy-ai-section"><AiCopilot activeBot={activeBot} onSuggest={handleSuggest} /></div>

        {/* Multi-Bot Workspace Dashboard */}
        <div className="legacy-bots-section bg-[#111114] border border-white/5 rounded-2xl p-4 sm:p-5 shadow-xl shadow-black/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="bg-indigo-500/10 text-indigo-400 p-1.5 rounded-lg border border-indigo-500/10">
                  <Layers className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  คลังเก็บและสลับบอทจำลอง (Multi-Bot Workspace)
                </h2>
              </div>
              <p className="text-xs text-gray-400">
                คุณสามารถเพิ่มบอทจำลองที่มีบุคลิกและการตั้งค่าต่างกันได้สูงสุด 10 ตัวเพื่อทดลองแชตแบบคู่ขนานกันได้
              </p>
            </div>
            
            <div className="flex items-center gap-2.5 self-start sm:self-center">
              <span className="text-xs font-bold text-gray-400 bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/5">
                จำนวนบอทปัจจุบัน: <span className="text-indigo-400 font-extrabold">{bots.length}</span> / 10
              </span>
              
              <button
                onClick={handleAddNewBot}
                disabled={bots.length >= 10}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:border-transparent text-white text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มบอทใหม่</span>
              </button>
            </div>
          </div>

          {/* List of Bots */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            <div className="flex gap-2.5 overflow-x-auto py-1">
              {bots.map((bot, index) => {
                const isActive = index === activeBotIndex;
                return (
                  <button
                    key={index}
                    onClick={() => {
                      setActiveBotIndex(index);
                      setActiveTab('config'); // Switch focus to config when switching bots
                    }}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border shrink-0 cursor-pointer ${
                      isActive
                        ? "bg-indigo-600/10 border-indigo-500 text-indigo-300 shadow-md shadow-indigo-500/5"
                        : "bg-[#16161A] border-white/5 text-gray-400 hover:text-slate-200 hover:border-white/10"
                    }`}
                  >
                    <img
                      src={bot.avatarUrl || "https://picsum.photos/seed/bot/150/150"}
                      alt={bot.name}
                      referrerPolicy="no-referrer"
                      className="w-5 h-5 rounded-full object-cover shrink-0 border border-white/10"
                    />
                    <span className="max-w-[130px] truncate">{bot.name || "บอทไม่มีชื่อ"}</span>
                  </button>
                );
              })}
            </div>

            {/* Actions for Active Bot */}
            <div className="flex items-center gap-1.5 border-l border-white/10 pl-3 sm:ml-auto shrink-0">
              <button
                onClick={handleCloneActiveBot}
                disabled={bots.length >= 10}
                title="คัดลอกบอทตัวนี้"
                className="p-2 bg-slate-800/80 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 rounded-xl border border-white/5 transition-all cursor-pointer disabled:cursor-not-allowed flex items-center gap-1 text-xs font-semibold px-2.5"
              >
                <Copy className="w-4 h-4" />
                <span className="hidden sm:inline">คัดลอก</span>
              </button>
              
              <button
                onClick={handleDeleteActiveBot}
                disabled={bots.length <= 1}
                title="ลบบอทตัวนี้"
                className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 disabled:opacity-40 disabled:hover:bg-rose-500/10 rounded-xl border border-rose-500/10 transition-all cursor-pointer disabled:cursor-not-allowed flex items-center gap-1 text-xs font-semibold px-2.5"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">ลบ</span>
              </button>
            </div>
          </div>
        </div>

        {/* Preset Toast/Notification Banner */}
        {presetMessage && (
          <div className="legacy-bots-section bg-gradient-to-r from-indigo-950 to-[#111114] border border-indigo-500/30 rounded-2xl p-4 flex items-center justify-between shadow-xl shadow-indigo-950/20 animate-none">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-500/20 p-2 rounded-lg border border-indigo-500/20 shrink-0">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-100">{presetMessage}</p>
                <p className="text-[10px] text-indigo-300/80 mt-0.5">ระบบได้ทำการอัปเดตข้อมูลและประสานงานจำลองการใช้งานบอทตัวนี้เรียบร้อยแล้ว</p>
              </div>
            </div>
            <button
              onClick={() => setPresetMessage(null)}
              className="text-gray-400 hover:text-white text-[10px] font-bold px-2.5 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-all cursor-pointer shrink-0"
            >
              ตกลง
            </button>
          </div>
        )}

        {/* 4-5 Premium Templates Section */}
        <div className="legacy-bots-section bg-[#111114] border border-white/5 rounded-2xl overflow-hidden shadow-xl shadow-black/30">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-white/[0.02] transition-all cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <div className="bg-indigo-500/10 text-indigo-400 p-2 rounded-xl border border-indigo-500/10">
                <Wand2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  🎨 เทมเพลตบอทพรีเมียมสำเร็จรูป 5 สไตล์ (Exclusive Bot Templates)
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  เลือกใช้งานเทมเพลตที่ได้รับการปรับตั้งค่าคีย์บอร์ด ปุ่ม และมีเดียอย่างสวยงาม เพื่อใช้งานหรือศึกษาทันที
                </p>
              </div>
            </div>
            <div className="bg-white/5 p-1.5 rounded-lg border border-white/5 text-gray-400 hover:text-slate-200">
              {showTemplates ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {showTemplates && (
            <div className="p-4 sm:p-5 border-t border-white/5 bg-black/10 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {botTemplates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="bg-[#16161A] border border-white/5 hover:border-white/10 rounded-2xl p-4.5 flex flex-col justify-between space-y-4 transition-all shadow-md shadow-black/10"
                  >
                    {/* Header */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-gradient-to-b ${tpl.color}`}>
                          {tpl.category}
                        </span>
                        <span className="text-xl">{tpl.icon}</span>
                      </div>

                      <div className="flex gap-3">
                        <img
                          src={tpl.config.avatarUrl}
                          alt={tpl.title}
                          referrerPolicy="no-referrer"
                          className="w-11 h-11 rounded-xl object-cover border border-white/10 shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-200 truncate">{tpl.title}</h4>
                          <p className="text-[10px] text-gray-400 font-medium truncate mt-0.5">{tpl.subtitle}</p>
                        </div>
                      </div>

                      <p className="text-[11px] text-gray-400 leading-relaxed min-h-[50px]">
                        {tpl.description}
                      </p>
                    </div>

                    {/* Features Checklist */}
                    <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 space-y-2">
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase tracking-wider border-b border-white/5 pb-1 mb-1">
                        <Check className="w-3 h-3 text-emerald-400" /> ฟีเจอร์ที่รวมมาให้
                      </div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
                        <div className="text-slate-300 truncate">💬 คำสั่งลัด: <span className="text-indigo-400 font-semibold">{tpl.config.botCommands.length} ชุด</span></div>
                        <div className="text-slate-300 truncate">⌨️ แผงปุ่มกด: <span className="text-indigo-400 font-semibold">{(tpl.config.botButtons?.replyKeyboard?.length || 0) + (tpl.config.botButtons?.inlineButtons?.length || 0)} ปุ่ม</span></div>
                        <div className="text-slate-300 truncate">🤖 โต้ตอบออโต้: <span className="text-indigo-400 font-semibold">{tpl.config.botSettings.autoReplies.length} คำ</span></div>
                        <div className="text-slate-300 truncate">🖼️ คลังรูปภาพ: <span className="text-indigo-400 font-semibold">{(tpl.config.mediaLibrary || []).length} ภาพ</span></div>
                      </div>
                    </div>

                    {/* View Details/Preview Button */}
                    <button
                      onClick={() => {
                        setSelectedTemplate(tpl);
                        setIsPreviewOpen(true);
                      }}
                      className="w-full bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/5 text-[11px] font-bold py-2 px-3 rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 hover:border-white/10"
                      title="ดูรายละเอียดบุคลิกภาพ โครงสร้างชุดคำสั่ง และแป้นพิมพ์ทั้งหมดของเทมเพลตนี้"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-400" />
                      <span>ดูตัวอย่าง & บุคลิกภาพบอท</span>
                    </button>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => handleLoadTemplate(tpl.config, tpl.title)}
                        className="bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 text-[10px] font-bold py-2 rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1"
                        title="โหลดทับข้อมูลบอทจำลองที่คุณกำลังเลือกทำอยู่ในตอนนี้"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        <span>โหลดทับบอทนี้</span>
                      </button>

                      <button
                        onClick={() => handleImportTemplateAsNew(tpl.config, tpl.title)}
                        disabled={bots.length >= 10}
                        className="bg-slate-800 hover:bg-slate-700 disabled:bg-gray-900 disabled:text-gray-600 border border-white/5 text-slate-200 hover:text-white text-[10px] font-bold py-2 rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1"
                        title="สร้างบอทใหม่เพิ่มเข้ามาอีกหนึ่งตัวในคลังสลับบอทด้านบน"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>เพิ่มเป็นบอทใหม่</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Unified Tab Navigation Bar */}
        <div className="legacy-tab-nav bg-[#111114] p-1.5 rounded-2xl border border-white/5 shadow-lg shadow-black/40">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-1.5">
            <button
              onClick={() => setActiveTab('config')}
              className={`py-3 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'config'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-gray-400 hover:text-slate-200 hover:bg-white/5'
              }`}
              title="สลับไปหน้าตั้งค่าบอท (คีย์ลัด: Alt + 1)"
            >
              <Settings className="w-4 h-4 text-indigo-400" />
              <span>⚙️ ตั้งค่า GUI</span>
              <kbd className="hidden lg:inline-block ml-1 text-[9px] opacity-60 font-mono bg-black/30 px-1.5 py-0.5 rounded border border-white/5 text-slate-300">Alt+1</kbd>
            </button>
            <button
              onClick={() => setActiveTab('simulator')}
              className={`py-3 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'simulator'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-gray-400 hover:text-slate-200 hover:bg-white/5'
              }`}
              title="สลับไปหน้าจำลองแชตบอท (คีย์ลัด: Alt + 2)"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>💬 จำลองบอท</span>
              <kbd className="hidden lg:inline-block ml-1 text-[9px] opacity-60 font-mono bg-black/30 px-1.5 py-0.5 rounded border border-white/5 text-slate-300">Alt+2</kbd>
            </button>
            <button
              onClick={() => setActiveTab('marketing')}
              className={`py-3 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'marketing'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-gray-400 hover:text-slate-200 hover:bg-white/5'
              }`}
              title="สลับไปหน้าบอกต่อสะสมแต้มการตลาด (คีย์ลัด: Alt + 5)"
            >
              <Gift className="w-4 h-4 text-rose-400" />
              <span>🎁 แชร์ & สะสมแต้ม</span>
              <kbd className="hidden lg:inline-block ml-1 text-[9px] opacity-60 font-mono bg-black/30 px-1.5 py-0.5 rounded border border-white/5 text-slate-300">Alt+5</kbd>
            </button>
            <button
              onClick={() => setActiveTab('parser')}
              className={`py-3 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'parser'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-gray-400 hover:text-slate-200 hover:bg-white/5'
              }`}
              title="สลับไปหน้าวิเคราะห์ประมวลผลคำสั่ง (คีย์ลัด: Alt + 3)"
            >
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>⚡ วิเคราะห์คำสั่ง</span>
              <kbd className="hidden lg:inline-block ml-1 text-[9px] opacity-60 font-mono bg-black/30 px-1.5 py-0.5 rounded border border-white/5 text-slate-300">Alt+3</kbd>
            </button>
            <button
              onClick={() => setActiveTab('deploy')}
              className={`py-3 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'deploy'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-gray-400 hover:text-slate-200 hover:bg-white/5'
              }`}
              title="สลับไปหน้าวิธีดีพลอยและเปิดใช้งาน (คีย์ลัด: Alt + 4)"
            >
              <FileCode className="w-4 h-4 text-cyan-400" />
              <span>📄 วิธีเปิดใช้งาน</span>
              <kbd className="hidden lg:inline-block ml-1 text-[9px] opacity-60 font-mono bg-black/30 px-1.5 py-0.5 rounded border border-white/5 text-slate-300">Alt+4</kbd>
            </button>
          </div>
        </div>

        {/* Workspace Display Area */}
        <div className="legacy-workspace-display w-full">
          {activeTab === 'config' ? (
            <div className="bg-[#111114] border border-white/5 rounded-2xl p-4 sm:p-6 shadow-xl shadow-black/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 border-b border-white/5 pb-4 gap-3">
                <div className="space-y-0.5">
                  <h2 className="text-sm sm:text-base font-extrabold text-slate-100 flex items-center gap-2">
                    ⚙️ จัดการการตั้งค่าผ่านเมนู GUI
                  </h2>
                  <p className="text-[11px] text-gray-400">แก้ไขข้อมูลปุ่ม คีย์บอร์ด บุคลิกบอท และข้อมูลระบบกลุ่ม</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                  <span className="text-[11px] text-indigo-300 font-bold bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-md">
                    บันทึกอัตโนมัติเป็น Draft Preview
                  </span>
                  <button
                    onClick={handlePublishToTelegram}
                    disabled={isPublishing}
                    className="text-[11px] font-bold bg-emerald-500/15 hover:bg-emerald-500/25 disabled:opacity-60 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-md cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isPublishing ? "กำลังเผยแพร่..." : "เผยแพร่ไป Telegram จริง"}
                  </button>
                  <button
                    onClick={async () => {
                      await loadLiveConfig();
                      setShowLiveConfigPanel(prev => !prev);
                    }}
                    disabled={isLoadingLiveConfig}
                    className="text-[11px] font-bold bg-cyan-500/10 hover:bg-cyan-500/20 disabled:opacity-60 text-cyan-300 border border-cyan-500/20 px-3 py-1 rounded-md cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isLoadingLiveConfig ? "กำลังโหลด..." : "ดู Live Config"}
                  </button>
                  <button
                    onClick={async () => {
                      await loadFeatureMatrix();
                      setShowFeatureMatrix(prev => !prev);
                    }}
                    disabled={isLoadingFeatureMatrix}
                    className="text-[11px] font-bold bg-violet-500/10 hover:bg-violet-500/20 disabled:opacity-60 text-violet-300 border border-violet-500/20 px-3 py-1 rounded-md cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isLoadingFeatureMatrix ? "กำลังโหลด..." : "สถานะฟีเจอร์"}
                  </button>
                </div>
              </div>
              {publishError && (
                <div className="mb-4 text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                  {publishError}
                </div>
              )}
              {showPreflightWarnings && preflightResult && (
                <div className="mb-4 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 space-y-1.5 text-[11px]">
                  <p className="text-amber-300 font-bold">⚠️ Preflight Check</p>
                  {(preflightResult.blockers || []).map((b: any) => (
                    <p key={b.key} className="text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded px-2 py-1">🚫 {b.message}</p>
                  ))}
                  {(preflightResult.warnings || []).map((w: any) => (
                    <p key={w.key} className="text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1">⚠️ {w.message}</p>
                  ))}
                  {(preflightResult.buttonDebug || []).length > 0 && (
                    <div className="overflow-x-auto pt-2">
                      <table className="w-full min-w-[900px] text-[10px] border-collapse">
                        <thead><tr className="text-left text-gray-400">
                          {['Label', 'ID', 'Type', 'Action', 'Target', 'Payload', 'Runtime Route', 'PASS/FAIL'].map((heading) => <th key={heading} className="border border-white/10 px-2 py-1">{heading}</th>)}
                        </tr></thead>
                        <tbody>{preflightResult.buttonDebug.map((row: any) => (
                          <tr key={`${row.id}-${row.type}`} className="text-slate-300">
                            {[row.label, row.id, row.type, row.action, row.target, row.payload, row.runtimeRoute, row.status].map((value, index) => (
                              <td key={index} className={`border border-white/10 px-2 py-1 ${index === 1 || index === 5 ? 'font-mono break-all' : ''} ${index === 7 ? (value === 'PASS' ? 'text-emerald-300 font-bold' : 'text-rose-300 font-bold') : ''}`}>{value}</td>
                            ))}
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
              {publishResult?.ok && (
                <div className="mb-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 space-y-1.5 text-[11px]">
                  <p className="text-emerald-300 font-bold">เผยแพร่สำเร็จ: {publishResult?.publishedConfigName}</p>
                  <p className="text-gray-300">Published at: {publishResult?.publishedAt || "-"}</p>
                  <p className="text-gray-300">Commands: {publishResult?.liveMap?.commands?.length || 0}</p>
                  <p className="text-gray-300">Reply keyboard buttons: {publishResult?.liveMap?.replyKeyboardButtons?.length || 0}</p>
                  <p className="text-gray-300">Inline buttons: {publishResult?.liveMap?.inlineButtons?.length || 0}</p>
                  <p className="text-gray-300">Menu button: {publishResult?.liveMap?.menuButton?.type || "default"}</p>
                  <p className="text-gray-300">
                    Webhook URL: {publishResult?.telegram?.webhookInfo?.result?.url || liveConfigData?.telegramStatus?.webhookInfo?.url || "-"}
                  </p>
                  {(publishResult?.liveMap?.warnings || []).length > 0 && (
                    <div className="pt-1.5 space-y-1">
                      {(publishResult?.liveMap?.warnings || []).map((warning: any, idx: number) => (
                        <p key={idx} className="text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1">
                          ⚠️ {warning.text}: ย้ายจาก {warning.from} ไป {warning.to}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {showLiveConfigPanel && liveConfigData && (
                <div className="mb-4 bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-3 space-y-1.5 text-[11px]">
                  <p className="text-cyan-300 font-bold">Live Config Summary</p>
                  <p className="text-gray-300">Bot name: {liveConfigData?.liveMap?.botName || "-"}</p>
                  <p className="text-gray-300">Welcome message: {liveConfigData?.liveMap?.welcomeMessage || "-"}</p>
                  <p className="text-gray-300">Last published: {liveConfigData?.liveMap?.lastPublishedAt || "ยังไม่เคยเผยแพร่"}</p>
                  <p className="text-gray-300">Webhook source: <span className={liveConfigData?.activeWebhookConfigSource === "published" ? "text-emerald-300" : "text-amber-300"}>{liveConfigData?.activeWebhookConfigSource || "-"}</span></p>
                  {(liveConfigData?.liveMap?.warnings || []).length > 0 && (
                    <div className="space-y-1">
                      {(liveConfigData?.liveMap?.warnings || []).map((warning: any, idx: number) => (
                        <p key={idx} className="text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1">
                          ⚠️ {warning.text}: ย้ายจาก {warning.from} ไป {warning.to}
                        </p>
                      ))}
                    </div>
                  )}
                  {(liveConfigData?.liveMap?.buttonDebug || []).length > 0 && (
                    <div className="overflow-x-auto pt-2">
                      <p className="text-cyan-300 font-bold mb-1">Button Debug Table</p>
                      <table className="w-full min-w-[900px] text-[10px] border-collapse">
                        <thead><tr className="text-left text-gray-400">
                          {['Label', 'ID', 'Type', 'Action', 'Target', 'Payload', 'Runtime Route', 'PASS/FAIL'].map((heading) => <th key={heading} className="border border-white/10 px-2 py-1">{heading}</th>)}
                        </tr></thead>
                        <tbody>{liveConfigData.liveMap.buttonDebug.map((row: any) => (
                          <tr key={`${row.id}-${row.type}`} className="text-slate-300">
                            <td className="border border-white/10 px-2 py-1">{row.label}</td>
                            <td className="border border-white/10 px-2 py-1 font-mono">{row.id}</td>
                            <td className="border border-white/10 px-2 py-1">{row.type}</td>
                            <td className="border border-white/10 px-2 py-1">{row.action}</td>
                            <td className="border border-white/10 px-2 py-1">{row.target}</td>
                            <td className="border border-white/10 px-2 py-1 font-mono break-all">{row.payload}</td>
                            <td className="border border-white/10 px-2 py-1">{row.runtimeRoute}</td>
                            <td className={`border border-white/10 px-2 py-1 font-bold ${row.status === 'PASS' ? 'text-emerald-300' : 'text-rose-300'}`}>{row.status}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  )}
                  <pre className="bg-black/30 border border-white/5 rounded-lg p-2 overflow-auto max-h-56 text-[10px] text-slate-300 whitespace-pre-wrap">
                    {JSON.stringify(liveConfigData?.liveMap || {}, null, 2)}
                  </pre>
                </div>
              )}
              {showFeatureMatrix && featureMatrix.length > 0 && (
                <div className="mb-4 bg-violet-500/5 border border-violet-500/20 rounded-xl p-3 space-y-2 text-[11px]">
                  <div className="flex items-center justify-between">
                    <p className="text-violet-300 font-bold">สถานะฟีเจอร์จริงบน Telegram</p>
                    {featureMatrixSummary && (
                      <div className="flex gap-1.5 flex-wrap justify-end">
                        {featureMatrixSummary.live > 0 && <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold">LIVE: {featureMatrixSummary.live}</span>}
                        {featureMatrixSummary.draft_only > 0 && <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-bold">DRAFT: {featureMatrixSummary.draft_only}</span>}
                        {featureMatrixSummary.simulator_only > 0 && <span className="text-[9px] bg-gray-500/10 text-gray-400 border border-gray-500/20 px-1.5 py-0.5 rounded font-bold">SIM: {featureMatrixSummary.simulator_only}</span>}
                        {featureMatrixSummary.needs_permission > 0 && <span className="text-[9px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-1.5 py-0.5 rounded font-bold">PERM: {featureMatrixSummary.needs_permission}</span>}
                        {featureMatrixSummary.unsupported > 0 && <span className="text-[9px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded font-bold">N/A: {featureMatrixSummary.unsupported}</span>}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {featureMatrix.map((f: any) => {
                      const statusColor: Record<string, string> = {
                        live: "text-emerald-300",
                        draft_only: "text-amber-300",
                        simulator_only: "text-gray-400",
                        needs_permission: "text-orange-400",
                        needs_target: "text-blue-400",
                        unsupported: "text-rose-400",
                        not_configured: "text-gray-500"
                      };
                      return (
                        <div key={f.key} className="flex items-start justify-between gap-2 bg-black/20 rounded px-2 py-1.5 border border-white/5">
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-300 font-semibold truncate">{f.label}</p>
                            <p className="text-gray-500 text-[10px] truncate">{f.reason}</p>
                          </div>
                          <span className={`text-[9px] font-bold shrink-0 ${statusColor[f.liveStatus] || "text-gray-400"}`}>
                            {f.liveStatus.replace(/_/g, " ").toUpperCase()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <ConfigForm
                config={activeBot}
                onChange={handleUpdateActiveBot}
                liveStatus={{ hasBotToken, lastPublishedAt: liveConfigData?.liveMap?.lastPublishedAt || null }}
              />
            </div>
          ) : activeTab === 'simulator' ? (
            <div className="w-full animate-fadeIn">
              <div className="mb-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-semibold rounded-xl px-3 py-2">
                นี่คือ Preview เท่านั้น ต้องกดเผยแพร่ไป Telegram จริงเพื่อให้บอทตัวจริงเปลี่ยนตาม
              </div>
              <TelegramSimulator config={activeBot} />
            </div>
          ) : activeTab === 'parser' ? (
            <div className="w-full animate-fadeIn">
              <CommandParserPlayground />
            </div>
          ) : activeTab === 'marketing' ? (
            <div className="w-full animate-fadeIn">
              <MarketingDashboard
                theme={theme}
                currentUser={currentUser}
                users={users}
                onUpdateUsers={handleUpdateUsers}
                activeBot={activeBot}
                onUpdateBotConfig={handleUpdateActiveBot}
                onAddSystemNotification={(msg) => {
                  setPresetMessage(msg);
                  setTimeout(() => setPresetMessage(null), 6000);
                }}
              />
            </div>
          ) : (
            <div className="w-full animate-fadeIn">
              <DeployGuide config={activeBot} />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="legacy-app-footer bg-[#111114] border-t border-white/5 py-6 mt-12 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Jimmy_bot Suite. จัดการบอทด้วยระบบวิเคราะห์อัจฉริยะสไตล์ Google AI Studio</p>
          <div className="flex gap-4">
            <span className="hover:text-gray-300">คู่มือการใช้งาน</span>
            <span>•</span>
            <span className="hover:text-gray-300">วิเคราะห์ข้อมูลกลุ่ม</span>
          </div>
        </div>
      </footer>

      {showUsersConsole && currentUser?.role === "admin" && (
        <UserManagementConsole
          theme={theme}
          users={users}
          onUpdateUsers={handleUpdateUsers}
          onClose={() => setShowUsersConsole(false)}
        />
      )}

      {/* Template Detail Preview Modal */}
      <TemplateDetailModal
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setSelectedTemplate(null);
        }}
        template={selectedTemplate}
        onLoadTemplate={handleLoadTemplate}
        onImportAsNew={handleImportTemplateAsNew}
        canAddMoreBots={bots.length < (currentUser?.botLimit || 1)}
        botCount={bots.length}
      />
    </div>
      )}
    </AdminLayout>
  );

}
