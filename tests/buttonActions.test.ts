import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTelegramButtonPayload,
  compileButtonModel,
  migrateLegacyButtonIds,
  resolveButtonAction,
  resolveConfigAction
} from "../src/utils/buttonActions";

function config(overrides: Record<string, unknown> = {}) {
  return {
    botSettings: { welcomeMessage: "Welcome", keyboards: [] as Array<Record<string, unknown>> },
    botCommands: [] as Array<Record<string, unknown>>,
    botButtons: { inlineButtons: [] as Array<Record<string, unknown>>, replyKeyboard: [] as Array<Record<string, unknown>> },
    ...overrides
  };
}

test("Bot A and Bot B isolate identical reply labels", () => {
  const botA = config({ botSettings: { welcomeMessage: "A", keyboards: [{ id: "a_menu", text: "Menu", response: "A response" }] } });
  const botB = config({ botSettings: { welcomeMessage: "B", keyboards: [{ id: "b_menu", text: "Menu", response: "B response" }] } });
  assert.equal(resolveConfigAction(botA, { kind: "message", value: " menu " }).reply, "A response");
  assert.equal(resolveConfigAction(botB, { kind: "message", value: "MENU" }).reply, "B response");
});

test("duplicate normalized reply labels with different actions block publish", () => {
  const model = compileButtonModel(config({
    botSettings: { welcomeMessage: "Welcome", keyboards: [{ id: "one", text: " Menu ", response: "One" }] },
    botButtons: { inlineButtons: [], replyKeyboard: [{ id: "two", text: "menu", reply: "Two" }] }
  }));
  assert.ok(model.issues.some((issue) => issue.code === "duplicate_reply_text" && issue.level === "error"));
});

test("same inline label gets distinct stable callback_data", () => {
  const model = compileButtonModel(config({ botButtons: {
    replyKeyboard: [],
    inlineButtons: [
      { id: "inline_a", text: "เลือก", reply: "A" },
      { id: "inline_b", text: "เลือก", reply: "B" }
    ]
  } }));
  assert.equal(new Set(model.inlineButtons.map((button) => button.callbackData)).size, 2);
  assert.ok(model.inlineButtons.every((button) => Buffer.byteLength(button.callbackData || "") <= 64));
});

test("legacy index callback is blocked and replaced by a secret-free stable payload", () => {
  const migrated = migrateLegacyButtonIds(config({ buttonActions: [{
    id: "legacy_button",
    label: "Legacy",
    type: "inline_callback",
    action: "reply",
    reply: "Legacy reply",
    callbackData: "live_inline:0"
  }] }));
  const model = compileButtonModel(migrated);
  assert.ok(model.issues.some((issue) => issue.code === "legacy_index_callback" && issue.level === "error"));
  assert.match(model.inlineButtons[0].callbackData || "", /^jimmy:[a-z0-9]+$/);
  assert.equal((model.inlineButtons[0].callbackData || "").includes("legacy_button"), false);
});

test("old callback remains bound to its stable id after config edits", () => {
  const migrated = migrateLegacyButtonIds(config({ botButtons: { replyKeyboard: [], inlineButtons: [{ text: "Details", reply: "Old" }] } }));
  const oldModel = compileButtonModel(migrated);
  const callbackData = oldModel.inlineButtons[0].callbackData!;
  const changed = structuredClone(migrated);
  changed.botButtons!.inlineButtons![0].reply = "New";
  const resolution = resolveButtonAction(compileButtonModel(changed), { kind: "callback", value: callbackData });
  assert.equal(resolution.reply, "New");
});

test("migration does not resurrect a deleted legacy button from the derived action snapshot", () => {
  const migrated = migrateLegacyButtonIds(config({ botButtons: { replyKeyboard: [], inlineButtons: [{ text: "Delete me", reply: "Old" }] } }));
  migrated.botButtons!.inlineButtons = [];
  const migratedAgain = migrateLegacyButtonIds(migrated);
  assert.equal(compileButtonModel(migratedAgain).inlineButtons.length, 0);
});

test("preview resolver and Telegram payload share the same action model", () => {
  const bot = config({
    botSettings: { welcomeMessage: "Welcome", keyboards: [{ id: "home", text: "Home", response: "At home" }] },
    botButtons: { replyKeyboard: [], inlineButtons: [{ id: "next", text: "Next", reply: "Next page" }] }
  });
  const payload = buildTelegramButtonPayload(bot);
  const replyText = payload.replyMarkup!.keyboard[0][0].text;
  const callbackData = payload.inlineMarkup!.inline_keyboard[0][0].callback_data!;
  assert.equal(resolveConfigAction(bot, { kind: "message", value: replyText }).reply, "At home");
  assert.equal(resolveConfigAction(bot, { kind: "callback", value: callbackData }).reply, "Next page");
});

test("WebApp and URL payloads preserve their destinations", () => {
  const payload = buildTelegramButtonPayload(config({ botButtons: { replyKeyboard: [], inlineButtons: [
    { id: "site", text: "Site", url: "https://example.com" },
    { id: "webapp", text: "App", webAppUrl: "https://example.com/app" }
  ] } }));
  assert.equal(payload.inlineMarkup!.inline_keyboard[0][0].url, "https://example.com");
  assert.equal(payload.inlineMarkup!.inline_keyboard[1][0].web_app.url, "https://example.com/app");
});

test("/start always resolves to the configured welcome message", () => {
  const bot = config({ botSettings: { welcomeMessage: "Configured welcome", keyboards: [] } });
  assert.equal(resolveConfigAction(bot, { kind: "command", value: "/START" }).reply, "Configured welcome");
});

test("Back Home and Next route by stable target, not label", () => {
  const bot = config({ buttonActions: [
    { id: "ctx_home", label: "Home context", type: "menu", action: "default", context: "home" },
    { id: "ctx_page2", label: "Page 2", type: "menu", action: "default", context: "page2" },
    { id: "nav_back", label: "Back", type: "inline_callback", action: "navigate", target: "home", context: "page2" },
    { id: "nav_home", label: "Home", type: "inline_callback", action: "navigate", target: "home" },
    { id: "nav_next", label: "Next", type: "inline_callback", action: "navigate", target: "page2" }
  ] });
  for (const id of ["nav_back", "nav_home", "nav_next"]) {
    const resolution = resolveConfigAction(bot, { kind: "id", value: id });
    assert.equal(resolution.route, "navigate");
    assert.ok(resolution.target === "home" || resolution.target === "page2");
  }
});

test("reply labels are unique per menu context and resolve only inside that context", () => {
  const bot = config({ buttonActions: [
    { id: "root_menu", label: "Root", type: "menu", action: "default", context: "root" },
    { id: "page_menu", label: "Page", type: "menu", action: "default", context: "page2" },
    { id: "root_same", label: "Same", type: "reply_keyboard", action: "reply", reply: "Root reply", context: "root" },
    { id: "page_same", label: "Same", type: "reply_keyboard", action: "reply", reply: "Page reply", context: "page2" }
  ] });
  const model = compileButtonModel(bot);
  assert.equal(model.issues.some((issue) => issue.code === "duplicate_reply_text"), false);
  assert.equal(resolveButtonAction(model, { kind: "message", value: "same", context: "root" }).reply, "Root reply");
  assert.equal(resolveButtonAction(model, { kind: "message", value: "same", context: "page2" }).reply, "Page reply");
});
