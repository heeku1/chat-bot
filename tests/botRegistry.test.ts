import assert from "node:assert/strict";
import test from "node:test";
import { BotConfigRegistry, publishAtomically } from "../server/botRegistry";

test("registry isolates same labels across bot instances without exposing tokens", () => {
  const registry = new BotConfigRegistry<{ reply: string }>();
  registry.commitPublished("bot_a", "token-a", { reply: "A" });
  registry.commitPublished("bot_b", "token-b", { reply: "B" });
  assert.equal(registry.resolve("bot_a")?.config.reply, "A");
  assert.equal(registry.resolve("bot_b")?.config.reply, "B");
  assert.equal(JSON.stringify(registry.safeSnapshot()).includes("token-a"), false);
  assert.equal(JSON.stringify(registry.safeSnapshot()).includes("token-b"), false);
});

test("failed publish leaves the previous active config intact", async () => {
  const registry = new BotConfigRegistry<{ version: number }>();
  registry.commitPublished("bot_a", "token-a", { version: 1 });
  await assert.rejects(() => publishAtomically({
    registry,
    instanceId: "bot_a",
    token: "token-a",
    config: { version: 2 },
    publish: async () => { throw new Error("Telegram rejected publish"); }
  }));
  assert.equal(registry.resolve("bot_a")?.config.version, 1);
});

test("persisted token hashes rebind the matching runtime token without storing the token", () => {
  const original = new BotConfigRegistry<{ reply: string }>();
  original.commitPublished("bot_a", "high-entropy-token-a", { reply: "A" });
  const persisted = original.persistenceSnapshot()[0];
  assert.equal(JSON.stringify(persisted).includes("high-entropy-token-a"), false);

  const restored = new BotConfigRegistry<{ reply: string }>();
  restored.restorePublished(persisted.instanceId, persisted.config, persisted.tokenHash, persisted.publishedAt);
  assert.equal(restored.bindRuntimeToken("wrong-token"), undefined);
  assert.equal(restored.bindRuntimeToken("high-entropy-token-a"), "bot_a");
  assert.equal(restored.resolveToken("bot_a"), "high-entropy-token-a");
});
