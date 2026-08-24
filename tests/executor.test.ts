import assert from "node:assert/strict";
import test from "node:test";
import { ApprovalStore } from "../server/ai/approvals";
import { ToolExecutor, resolveToolFromText } from "../server/ai/executor";
import { formatDataSourceSummary } from "../server/telegram/handlers";

test("approval preserves the original payload for execution", () => {
  const store = new ApprovalStore();
  const approval = store.create({
    chatId: "123",
    userId: "456",
    intent: "system_action",
    payload: "deploy production",
    summary: "deploy production",
    risk: "high",
  });

  const resolved = store.resolve(approval.id, "123", "456", "approve");
  assert.equal(resolved?.payload, "deploy production");
});

test("executor routes approved broadcast and deploy requests", async () => {
  const broadcasts: Array<{ chatId: string; text: string }> = [];
  let deployCalls = 0;
  const executor = new ToolExecutor({
    listBroadcastTargets: () => ["111", "222"],
    sendBroadcastMessage: async (chatId, text) => {
      broadcasts.push({ chatId, text });
    },
    triggerDeploy: async () => {
      deployCalls += 1;
      return { ok: true, message: "deployed" };
    },
    repairWebhook: async () => ({ ok: true, message: "repaired" }),
  });

  assert.deepEqual(resolveToolFromText("บรอดแคสต์: โปรวันนี้"), { tool: "send_broadcast", risk: "medium" });
  const broadcast = await executor.execute("state_changing_action", "บรอดแคสต์: โปรวันนี้");
  assert.equal(broadcast.ok, true);
  assert.equal(broadcasts.length, 2);
  assert.equal(broadcasts[0].text, "📢 Broadcast\n\nโปรวันนี้");

  const deploy = await executor.execute("system_action", "deploy production");
  assert.equal(deploy.message, "deployed");
  assert.equal(deployCalls, 1);
});

test("data source summaries cap list output and report totals", () => {
  const summary = formatDataSourceSummary("สมาชิก", {
    total: 7,
    items: ["A", "B", "C", "D", "E", "F", "G"],
  });

  assert.match(summary, /รวมทั้งหมด 7 รายการ/);
  assert.match(summary, /1\. A/);
  assert.match(summary, /\.\.\.และอีก 2 รายการ/);
  assert.equal(summary.includes("7. G"), false);
});
