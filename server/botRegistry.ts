import { createHash } from "node:crypto";

export interface BotRegistryEntry<T> {
  instanceId: string;
  config: T;
  tokenHash: string;
  publishedAt: string;
}

function normalizeInstanceId(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) : "";
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export class BotConfigRegistry<T> {
  private readonly publishedByInstance = new Map<string, BotRegistryEntry<T>>();
  private readonly instanceByTokenHash = new Map<string, string>();
  private readonly runtimeTokenByInstance = new Map<string, string>();
  private readonly draftByInstance = new Map<string, T>();

  setDraft(instanceIdInput: unknown, config: T): string {
    const instanceId = normalizeInstanceId(instanceIdInput);
    if (!instanceId) throw new Error("A valid bot instanceId is required");
    this.draftByInstance.set(instanceId, config);
    return instanceId;
  }

  getDraft(instanceIdInput: unknown): T | undefined {
    return this.draftByInstance.get(normalizeInstanceId(instanceIdInput));
  }

  commitPublished(instanceIdInput: unknown, tokenInput: unknown, config: T, publishedAt = new Date().toISOString()): BotRegistryEntry<T> {
    const instanceId = normalizeInstanceId(instanceIdInput);
    const token = typeof tokenInput === "string" ? tokenInput.trim() : "";
    if (!instanceId) throw new Error("A valid bot instanceId is required");
    if (!token) throw new Error("A Telegram bot token is required");
    const tokenHash = hashToken(token);
    const previousOwner = this.instanceByTokenHash.get(tokenHash);
    if (previousOwner && previousOwner !== instanceId) {
      throw new Error("This Telegram bot identity is already assigned to another Jimmy instance");
    }
    const previous = this.publishedByInstance.get(instanceId);
    if (previous && previous.tokenHash !== tokenHash) this.instanceByTokenHash.delete(previous.tokenHash);
    const entry = { instanceId, config, tokenHash, publishedAt };
    this.publishedByInstance.set(instanceId, entry);
    this.instanceByTokenHash.set(tokenHash, instanceId);
    this.runtimeTokenByInstance.set(instanceId, token);
    return entry;
  }

  restorePublished(instanceIdInput: unknown, config: T, tokenHashInput: unknown, publishedAt: string): void {
    const instanceId = normalizeInstanceId(instanceIdInput);
    const tokenHash = typeof tokenHashInput === "string" && /^[a-f0-9]{64}$/.test(tokenHashInput) ? tokenHashInput : "";
    if (!instanceId || !tokenHash) return;
    this.publishedByInstance.set(instanceId, { instanceId, config, tokenHash, publishedAt });
    this.instanceByTokenHash.set(tokenHash, instanceId);
  }

  resolve(instanceIdInput: unknown): BotRegistryEntry<T> | undefined {
    return this.publishedByInstance.get(normalizeInstanceId(instanceIdInput));
  }

  resolveToken(instanceIdInput: unknown): string | undefined {
    return this.runtimeTokenByInstance.get(normalizeInstanceId(instanceIdInput));
  }

  bindRuntimeToken(tokenInput: unknown): string | undefined {
    const token = typeof tokenInput === "string" ? tokenInput.trim() : "";
    if (!token) return undefined;
    const instanceId = this.instanceByTokenHash.get(hashToken(token));
    if (instanceId) this.runtimeTokenByInstance.set(instanceId, token);
    return instanceId;
  }

  entries(): BotRegistryEntry<T>[] {
    return [...this.publishedByInstance.values()];
  }

  safeSnapshot(): Array<Omit<BotRegistryEntry<T>, "tokenHash">> {
    return this.entries().map(({ instanceId, config, publishedAt }) => ({ instanceId, config, publishedAt }));
  }

  persistenceSnapshot(): BotRegistryEntry<T>[] {
    return this.entries().map((entry) => ({ ...entry }));
  }
}

export async function publishAtomically<T>(options: {
  registry: BotConfigRegistry<T>;
  instanceId: string;
  token: string;
  config: T;
  publish: () => Promise<void>;
  publishedAt?: string;
}): Promise<BotRegistryEntry<T>> {
  await options.publish();
  return options.registry.commitPublished(options.instanceId, options.token, options.config, options.publishedAt);
}
