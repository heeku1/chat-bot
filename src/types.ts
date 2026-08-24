import type { ButtonAction, ButtonActionName, ButtonActionType, ButtonIssue } from './utils/buttonActions';

export interface BotConfig {
  instanceId?: string;
  name: string;
  token: string;
  platform: 'bot' | 'group' | 'channel' | 'all';
  reviewerMode?: 'off' | 'normal' | 'strict';
  avatarUrl?: string; // URL or Base64 of generated bot profile image
  
  // Bot (Direct Chat) settings
  botSettings: {
    welcomeMessage: string;
    enableAiAssistant: boolean;
    aiPrompt: string;
    keyboards: Array<{
      id?: string;
      text: string;
      response: string;
      action?: ButtonActionName;
      target?: string;
      context?: string;
    }>;
    autoReplies: Array<{
      keyword: string;
      reply: string;
      imageUrl?: string;
    }>;
  };

  // 4 Core Telegram Features (APIBot commands, Bot buttons, Bot menu, Inline queries)
  botCommands?: Array<{
    id?: string;
    command: string;
    description: string;
    reply: string;
    action?: ButtonActionName;
    target?: string;
  }>;
  botButtons?: {
    inlineButtons: Array<{
      id?: string;
      text: string;
      type?: ButtonActionType;
      action?: ButtonActionName;
      target?: string;
      context?: string;
      url?: string;
      webAppUrl?: string;
      reply?: string;
    }>;
    replyKeyboard: Array<{
      id?: string;
      text: string;
      reply: string;
      action?: ButtonActionName;
      target?: string;
      context?: string;
    }>;
  };
  botMenuButton?: {
    id?: string;
    type: 'commands' | 'web_app' | 'default';
    text: string; // for web_app
    url: string; // for web_app
  };
  buttonActions?: ButtonAction[];
  buttonMigrationIssues?: ButtonIssue[];
  inlineQuerySettings?: {
    enableInline: boolean;
    placeholder: string;
    results: Array<{
      id: string;
      title: string;
      description: string;
      content: string;
    }>;
  };

  // Group settings
  groupSettings: {
    welcomeNewMember: boolean;
    welcomeMessage: string;
    antiSpam: {
      blockLinks: boolean;
      blockSwearWords: boolean;
      warnLimit: number;
    };
    rulesAnnouncement: string;
    rulesInterval: number; // in hours, 0 to disable
    customCommands: Array<{
      command: string; // e.g., /rules, /help
      reply: string;
    }>;
    autoTranslation?: {
      enable: boolean;
      targetLanguage: string;
    };
    keywordMonitoring?: {
      enable: boolean;
      keywords: string[];
      notificationType: 'email' | 'bot_message' | 'both';
      adminEmail?: string;
      alertThreshold?: number;
    };
  };

  // Channel settings
  channelSettings: {
    autoSignature: boolean;
    autoSignatureText: string;
    enableFormatting: 'HTML' | 'MarkdownV2' | 'None';
    targetChannelId?: string;
    targetChannelUsername?: string;
    scheduledPosts: Array<{
      id: string;
      time: string; // HH:MM
      content: string;
      imageUrl?: string;
    }>;
  };

  // Admin permissions settings
  adminPermissions: {
    canDeleteMessages: boolean;
    canBanUsers: boolean;
    canPinMessages: boolean;
    canChangeGroupInfo: boolean;
  };

  // Privacy Settings
  privacySettings: {
    allowDirectMessages: boolean;
    groupPrivacyMode: boolean; // true = only read command, false = read all message (for spam check)
    showPublicStats: boolean;
    hideBotCreator: boolean;
  };

  // External APIs Config
  externalApis: {
    webhookUrl: string;
    googleSheetsUrl: string;
    customApiUrl: string;
    apiAuthToken: string;
    sendLeadsToApi: boolean;
    geminiApiKey?: string;
    openaiApiKey?: string;
  };

  // Data sources สำหรับเช็กสมาชิก/กิจกรรม (read-only JSON API)
  dataSources?: {
    membersApiUrl?: string;
    activityApiUrl?: string;
    apiToken?: string;
  };

  // Media Library for auto-messages, welcomes, and scheduled posts
  mediaLibrary?: Array<{
    id: string;
    name: string;
    url: string; // Base64 or URL
    type: string;
  }>;

  // Marketing & Referral Rewards Settings
  marketingSettings?: {
    enableMilestoneNotifications: boolean;
    milestones: Array<{
      pointsThreshold: number;
      message: string;
    }>;
    campaignName?: string;
    rewardPointsPerInvite?: number;
    challengeQuestion?: string;
    challengeAnswer?: string;
    challengeActive?: boolean;
  };
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot' | 'system';
  senderName: string;
  text: string;
  timestamp: string;
  inlineButtons?: string[];
  imageUrl?: string;
}

export interface ParsedCommand {
  isValid: boolean;
  prefix: string; // '/' or '!'
  commandName: string;
  originalCommandName: string;
  didFuzzyMatch: boolean;
  target?: {
    type: 'username' | 'userid' | 'none';
    value: string;
  };
  positionalArgs: string[];
  namedArgs: Record<string, string | boolean>;
  ambiguities: string[];
  error?: string;
  executionSuggestion?: string;
}

export interface UserAccount {
  username: string;
  password?: string;
  name: string;
  role: 'admin' | 'member';
  isActive: boolean;
  botLimit: number;
  createdAt: string;
  
  // Referral System Fields
  points?: number;
  referralCode?: string;
  referralsCount?: number;
  referredBy?: string;
}
