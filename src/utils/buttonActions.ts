export type ButtonActionType =
  | "reply_keyboard"
  | "inline_callback"
  | "url"
  | "web_app"
  | "command"
  | "menu";

export type ButtonActionName =
  | "reply"
  | "navigate"
  | "command"
  | "open_url"
  | "open_web_app"
  | "show_commands"
  | "default";

export interface ButtonAction {
  id: string;
  label: string;
  type: ButtonActionType;
  action: ButtonActionName;
  target?: string;
  reply?: string;
  url?: string;
  webAppUrl?: string;
  command?: string;
  context?: string;
  source?: string;
  callbackData?: string;
  legacyCallbackData?: string;
}

export interface ButtonConfigLike {
  botSettings?: {
    welcomeMessage?: string;
    keyboards?: Array<Record<string, unknown>>;
  };
  botCommands?: Array<Record<string, unknown>>;
  botButtons?: {
    inlineButtons?: Array<Record<string, unknown>>;
    replyKeyboard?: Array<Record<string, unknown>>;
  };
  botMenuButton?: Record<string, unknown>;
  buttonActions?: ButtonAction[];
  buttonMigrationIssues?: ButtonIssue[];
}

export interface ButtonIssue {
  level: "error" | "warning";
  code:
    | "duplicate_reply_text"
    | "duplicate_id"
    | "duplicate_callback_data"
    | "missing_target"
    | "invalid_url"
    | "orphan_menu_target"
    | "legacy_index_callback"
    | "unsupported_generated_code";
  message: string;
  actionIds: string[];
}

export interface ButtonDebugRow {
  label: string;
  id: string;
  type: ButtonActionType;
  action: ButtonActionName;
  target: string;
  payload: string;
  runtimeRoute: string;
  status: "PASS" | "FAIL";
}

export interface ButtonModel {
  actions: ButtonAction[];
  replyButtons: ButtonAction[];
  inlineButtons: ButtonAction[];
  commands: ButtonAction[];
  menuButton?: ButtonAction;
  issues: ButtonIssue[];
  debugRows: ButtonDebugRow[];
}

export interface ButtonResolution {
  matched: boolean;
  action?: ButtonAction;
  route: "reply" | "navigate" | "command" | "url" | "web_app" | "menu" | "unmatched";
  reply?: string;
  target?: string;
}

const CALLBACK_PREFIX = "jimmy:";
const MAX_CALLBACK_BYTES = 64;

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function bytes(value: string): number {
  return new TextEncoder().encode(value).length;
}

function hashString(value: string): string {
  let hash = 2166136261;
  let second = 2246822507;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
    second ^= value.charCodeAt(index);
    second = Math.imul(second, 3266489909);
  }
  return `${(hash >>> 0).toString(36)}${(second >>> 0).toString(36)}`;
}

function cleanId(value: unknown): string {
  return stringValue(value).trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48);
}

export function stableButtonId(source: string, item: Record<string, unknown>, occurrence = 0): string {
  const existing = cleanId(item.id);
  if (existing) return existing;
  const fingerprint = JSON.stringify({
    source,
    label: stringValue(item.label || item.text).trim(),
    action: stringValue(item.action),
    target: stringValue(item.target),
    reply: stringValue(item.reply || item.response),
    url: stringValue(item.url),
    webAppUrl: stringValue(item.webAppUrl),
    command: stringValue(item.command),
    occurrence
  });
  return `btn_${hashString(fingerprint)}`;
}

export function createButtonId(prefix = "btn"): string {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().replace(/-/g, "").slice(0, 16)
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
  return `${prefix}_${random}`;
}

export function normalizeReplyText(value: string): string {
  return stringValue(value).trim().toLocaleLowerCase();
}

export function callbackDataFor(actionId: string): string {
  const id = cleanId(actionId);
  const callbackData = `${CALLBACK_PREFIX}${hashString(id)}`;
  if (!id || bytes(callbackData) > MAX_CALLBACK_BYTES) {
    throw new Error(`Invalid callback_data for action id: ${actionId}`);
  }
  return callbackData;
}

function actionSignature(action: ButtonAction): string {
  return JSON.stringify({
    action: action.action,
    target: action.target || "",
    reply: action.reply || "",
    url: action.url || "",
    webAppUrl: action.webAppUrl || "",
    command: action.command || ""
  });
}

function isValidHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function toActionName(value: unknown, fallback: ButtonActionName): ButtonActionName {
  const allowed: ButtonActionName[] = ["reply", "navigate", "command", "open_url", "open_web_app", "show_commands", "default"];
  return allowed.includes(value as ButtonActionName) ? value as ButtonActionName : fallback;
}

function makeAction(
  source: string,
  item: Record<string, unknown>,
  occurrence: number,
  defaults: Pick<ButtonAction, "type" | "action">
): ButtonAction {
  const id = stableButtonId(source, item, occurrence);
  const action: ButtonAction = {
    id,
    label: stringValue(item.label || item.text).trim(),
    type: (stringValue(item.type) || defaults.type) as ButtonActionType,
    action: toActionName(item.action, defaults.action),
    source,
    context: stringValue(item.context).trim() || "root"
  };
  const target = stringValue(item.target).trim();
  const reply = stringValue(item.reply || item.response).trim();
  const url = stringValue(item.url).trim();
  const webAppUrl = stringValue(item.webAppUrl).trim();
  const command = stringValue(item.command).replace(/^\//, "").trim().toLowerCase();
  if (target) action.target = target;
  if (reply) action.reply = reply;
  if (url) action.url = url;
  if (webAppUrl) action.webAppUrl = webAppUrl;
  if (command) action.command = command;
  if (action.type === "inline_callback") action.callbackData = callbackDataFor(id);
  return action;
}

function legacyActions(config: ButtonConfigLike): ButtonAction[] {
  const actions: ButtonAction[] = [];
  const occurrences = new Map<string, number>();
  const add = (source: string, item: Record<string, unknown>, defaults: Pick<ButtonAction, "type" | "action">) => {
    const key = `${source}:${JSON.stringify(item)}`;
    const occurrence = occurrences.get(key) || 0;
    occurrences.set(key, occurrence + 1);
    actions.push(makeAction(source, item, occurrence, defaults));
  };

  (config.botSettings?.keyboards || []).forEach((item) => add("botSettings.keyboards", item, { type: "reply_keyboard", action: "reply" }));
  (config.botButtons?.replyKeyboard || []).forEach((item) => add("botButtons.replyKeyboard", item, { type: "reply_keyboard", action: "reply" }));
  (config.botButtons?.inlineButtons || []).forEach((item) => {
    if (stringValue(item.webAppUrl).trim()) add("botButtons.inlineButtons", item, { type: "web_app", action: "open_web_app" });
    else if (stringValue(item.url).trim()) add("botButtons.inlineButtons", item, { type: "url", action: "open_url" });
    else add("botButtons.inlineButtons", item, { type: "inline_callback", action: "reply" });
  });
  (config.botCommands || []).forEach((item) => {
    const command = stringValue(item.command).replace(/^\//, "").trim().toLowerCase();
    add("botCommands", {
      ...item,
      label: `/${command}`,
      ...(command === "start" ? { reply: stringValue(config.botSettings?.welcomeMessage) } : {})
    }, { type: "command", action: "command" });
  });

  const menu = config.botMenuButton;
  if (menu) {
    const type = stringValue(menu.type);
    const label = stringValue(menu.text).trim() || (type === "commands" ? "Menu" : "");
    const menuItem = { ...menu, label, ...(type === "web_app" ? { webAppUrl: stringValue(menu.url) } : {}) };
    if (type === "web_app") add("botMenuButton", menuItem, { type: "web_app", action: "open_web_app" });
    else if (type === "commands") add("botMenuButton", menuItem, { type: "menu", action: "show_commands" });
    else add("botMenuButton", menuItem, { type: "menu", action: "default" });
  }
  return actions.filter((action) => action.label || action.type === "menu");
}

export function compileButtonModel(config: ButtonConfigLike): ButtonModel {
  const derived = legacyActions(config);
  const derivedIds = new Set(derived.map((action) => action.id));
  const explicit = (config.buttonActions || []).filter((action) => action && !derivedIds.has(cleanId(action.id))).map((action, index) => {
    const normalized = makeAction("buttonActions", action as unknown as Record<string, unknown>, index, {
      type: action.type || "inline_callback",
      action: action.action || "reply"
    });
    const incomingCallbackData = stringValue(action.callbackData);
    const merged = {
      ...normalized,
      ...action,
      id: cleanId(action.id) || normalized.id,
      ...(/^live_inline:\d+$/.test(incomingCallbackData) ? { legacyCallbackData: incomingCallbackData } : {})
    };
    if (merged.type === "inline_callback") merged.callbackData = callbackDataFor(merged.id);
    else delete merged.callbackData;
    return merged;
  });
  const actions = [...derived, ...explicit];
  const issues = [...validateButtonActions(actions), ...(config.buttonMigrationIssues || [])];
  const failedIds = new Set(issues.filter((issue) => issue.level === "error").flatMap((issue) => issue.actionIds));
  const replyButtons = actions.filter((action) => action.type === "reply_keyboard");
  const inlineButtons = actions.filter((action) => ["inline_callback", "url", "web_app"].includes(action.type));
  const commands = actions.filter((action) => action.type === "command");
  const menuButton = actions.find((action) => action.source === "botMenuButton");
  const debugRows = actions.map((action): ButtonDebugRow => {
    let payload = action.label;
    if (action.type === "inline_callback") payload = action.callbackData || callbackDataFor(action.id);
    if (action.type === "url") payload = action.url || "";
    if (action.type === "web_app") payload = action.webAppUrl || "";
    if (action.type === "command") payload = `/${action.command || ""}`;
    return {
      label: action.label,
      id: action.id,
      type: action.type,
      action: action.action,
      target: action.target || "—",
      payload,
      runtimeRoute: action.action === "reply" ? `reply:${action.id}` : `${action.action}:${action.target || action.id}`,
      status: failedIds.has(action.id) ? "FAIL" : "PASS"
    };
  });
  return { actions, replyButtons, inlineButtons, commands, menuButton, issues, debugRows };
}

export function validateButtonActions(actions: ButtonAction[]): ButtonIssue[] {
  const issues: ButtonIssue[] = [];
  const byId = new Map<string, ButtonAction[]>();
  const byCallback = new Map<string, ButtonAction[]>();
  const byReplyText = new Map<string, ButtonAction[]>();
  const knownTargets = new Set(actions.flatMap((action) => [action.id, action.context || "root"]));

  actions.forEach((action) => {
    const idItems = byId.get(action.id) || [];
    idItems.push(action);
    byId.set(action.id, idItems);
    if (action.type === "inline_callback") {
      const callbackData = action.callbackData || callbackDataFor(action.id);
      const callbackItems = byCallback.get(callbackData) || [];
      callbackItems.push(action);
      byCallback.set(callbackData, callbackItems);
      if (/^live_inline:\d+$/.test(callbackData)) {
        issues.push({ level: "error", code: "legacy_index_callback", message: `Legacy index callback is not publishable: ${callbackData}`, actionIds: [action.id] });
      }
    }
    if (action.type === "reply_keyboard") {
      const key = `${action.context || "root"}:${normalizeReplyText(action.label)}`;
      const textItems = byReplyText.get(key) || [];
      textItems.push(action);
      byReplyText.set(key, textItems);
    }
    if ((action.action === "navigate" || action.action === "command") && !action.target && !action.command) {
      issues.push({ level: "error", code: "missing_target", message: `Button "${action.label}" is missing its target`, actionIds: [action.id] });
    }
    if (action.action === "navigate" && action.target && !knownTargets.has(action.target)) {
      issues.push({ level: "error", code: "orphan_menu_target", message: `Button "${action.label}" points to unknown target "${action.target}"`, actionIds: [action.id] });
    }
    if (action.type === "url" && (!action.url || !isValidHttpsUrl(action.url))) {
      issues.push({ level: "error", code: "invalid_url", message: `Button "${action.label}" has an invalid HTTPS URL`, actionIds: [action.id] });
    }
    if (action.type === "web_app" && (!action.webAppUrl || !isValidHttpsUrl(action.webAppUrl))) {
      issues.push({ level: "error", code: "invalid_url", message: `Button "${action.label}" has an invalid HTTPS WebApp URL`, actionIds: [action.id] });
    }
    if (action.type === "menu") {
      issues.push({ level: "warning", code: "unsupported_generated_code", message: `Generated code may require manual support for ${action.type}: "${action.label}"`, actionIds: [action.id] });
    }
    if (action.action === "navigate" || (action.context || "root") !== "root") {
      issues.push({ level: "warning", code: "unsupported_generated_code", message: `Generated code does not fully reproduce contextual menu navigation for "${action.label}"`, actionIds: [action.id] });
    }
  });

  byId.forEach((items, id) => {
    if (items.length > 1) issues.push({ level: "error", code: "duplicate_id", message: `Duplicate button id: ${id}`, actionIds: items.map((item) => item.id) });
  });
  byCallback.forEach((items, callbackData) => {
    if (items.length > 1) issues.push({ level: "error", code: "duplicate_callback_data", message: `Duplicate callback_data: ${callbackData}`, actionIds: items.map((item) => item.id) });
  });
  byReplyText.forEach((items) => {
    if (items.length < 2) return;
    const signatures = new Set(items.map(actionSignature));
    issues.push({
      level: signatures.size > 1 ? "error" : "warning",
      code: "duplicate_reply_text",
      message: signatures.size > 1
        ? `Reply text "${items[0].label}" maps to different actions. Publish is blocked; use unique labels or Inline Keyboard.`
        : `Duplicate reply text "${items[0].label}" maps to the same action. Keep only one button.`,
      actionIds: items.map((item) => item.id)
    });
  });
  return issues;
}

export function resolveButtonAction(
  model: ButtonModel,
  input: { kind: "message" | "callback" | "command" | "id"; value: string; context?: string }
): ButtonResolution {
  const context = input.context || "root";
  let action: ButtonAction | undefined;
  if (input.kind === "message") {
    const normalized = normalizeReplyText(input.value);
    action = model.replyButtons.find((item) => (item.context || "root") === context && normalizeReplyText(item.label) === normalized);
  } else if (input.kind === "callback") {
    action = model.inlineButtons.find((item) => item.type === "inline_callback" && item.callbackData === input.value);
  } else if (input.kind === "command") {
    const command = stringValue(input.value).replace(/^\//, "").trim().toLowerCase();
    action = model.commands.find((item) => item.command === command);
  } else {
    action = model.actions.find((item) => item.id === input.value);
  }
  if (!action) return { matched: false, route: "unmatched" };
  if (action.action === "navigate") {
    const targetAction = model.actions.find((item) => item.id === action!.target);
    return { matched: true, action, route: "navigate", target: action.target, reply: action.reply || targetAction?.reply };
  }
  if (action.action === "command") return { matched: true, action, route: "command", reply: action.reply, target: action.command || action.target };
  if (action.action === "open_url") return { matched: true, action, route: "url", target: action.url };
  if (action.action === "open_web_app") return { matched: true, action, route: "web_app", target: action.webAppUrl };
  if (action.action === "show_commands" || action.action === "default") return { matched: true, action, route: "menu", target: action.action };
  return { matched: true, action, route: "reply", reply: action.reply, target: action.target };
}

export function resolveConfigAction(
  config: ButtonConfigLike,
  input: { kind: "message" | "callback" | "command" | "id"; value: string; context?: string }
): ButtonResolution {
  if (input.kind === "command" && stringValue(input.value).replace(/^\//, "").trim().toLowerCase() === "start") {
    const reply = stringValue(config.botSettings?.welcomeMessage);
    const action: ButtonAction = {
      id: "system_start",
      label: "/start",
      type: "command",
      action: "command",
      command: "start",
      reply,
      source: "system.start"
    };
    return { matched: true, action, route: "command", reply, target: "start" };
  }
  return resolveButtonAction(compileButtonModel(config), input);
}

export function migrateLegacyButtonIds<T extends ButtonConfigLike>(config: T): T {
  const clone = structuredClone(config);
  const legacyCallbacks = [
    ...(clone.buttonActions || []).map((action) => action.callbackData),
    ...(clone.buttonActions || []).map((action) => action.legacyCallbackData),
    ...(clone.botButtons?.inlineButtons || []).map((action) => stringValue(action.callbackData || action.callback_data))
  ].filter((value): value is string => typeof value === "string" && /^live_inline:\d+$/.test(value));
  clone.buttonMigrationIssues = legacyCallbacks.map((callbackData) => ({
    level: "error",
    code: "legacy_index_callback",
    message: `Legacy index callback "${callbackData}" is ambiguous. Re-save the button with a stable ID before publishing.`,
    actionIds: []
  }));
  const explicitActions = (clone.buttonActions || []).filter((action) => !action.source || action.source === "buttonActions");
  const applyIds = (source: string, items: Array<Record<string, unknown>> | undefined) => {
    const occurrences = new Map<string, number>();
    (items || []).forEach((item) => {
      const key = JSON.stringify(item);
      const occurrence = occurrences.get(key) || 0;
      occurrences.set(key, occurrence + 1);
      if (!cleanId(item.id)) item.id = stableButtonId(source, item, occurrence);
    });
  };
  applyIds("botSettings.keyboards", clone.botSettings?.keyboards);
  applyIds("botButtons.replyKeyboard", clone.botButtons?.replyKeyboard);
  applyIds("botButtons.inlineButtons", clone.botButtons?.inlineButtons);
  applyIds("botCommands", clone.botCommands);
  if (clone.botMenuButton && !cleanId(clone.botMenuButton.id)) clone.botMenuButton.id = stableButtonId("botMenuButton", clone.botMenuButton);
  clone.buttonActions = explicitActions;
  clone.buttonActions = compileButtonModel(clone).actions;
  return clone;
}

export function buildTelegramButtonPayload(config: ButtonConfigLike, context = "root") {
  const model = compileButtonModel(config);
  const replyButtons = model.replyButtons.filter((action) => (action.context || "root") === context);
  const inlineButtons = model.inlineButtons.filter((action) => (action.context || "root") === context);
  const replyMarkup = replyButtons.length ? {
    keyboard: replyButtons.map((action) => [{ text: action.label }]),
    resize_keyboard: true,
    one_time_keyboard: false
  } : undefined;
  const inlineMarkup = inlineButtons.length ? {
    inline_keyboard: inlineButtons.map((action) => [{
      text: action.label,
      ...(action.type === "url" ? { url: action.url } : {}),
      ...(action.type === "web_app" ? { web_app: { url: action.webAppUrl } } : {}),
      ...(action.type === "inline_callback" ? { callback_data: action.callbackData || callbackDataFor(action.id) } : {})
    }])
  } : undefined;
  return { model, context, replyButtons, inlineButtons, replyMarkup, inlineMarkup };
}
