import { createHash, timingSafeEqual } from "node:crypto";
import dns from "node:dns/promises";
import net from "node:net";

/** Error ที่โยนเมื่อ URL/โฮสต์ถูกบล็อกด้วยเหตุผลด้านความปลอดภัย */
export class OutboundBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OutboundBlockedError";
  }
}

/** ตรวจว่า IP เป็น private/loopback/link-local/metadata ที่ห้ามยิงจาก server */
export function isBlockedIp(address: string): boolean {
  const family = net.isIP(address);
  if (family === 4) return isBlockedIpv4(address);
  if (family === 6) return isBlockedIpv6(address);
  return true; // ไม่ใช่ IP ที่ parse ได้ = ถือว่าไม่ปลอดภัย
}

function isBlockedIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true; // this-network / private / loopback
  if (a === 169 && b === 254) return true; // link-local + cloud metadata (169.254.169.254)
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 192 && b === 0) return true; // protocol assignments
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a >= 224) return true; // multicast + reserved
  return false;
}

function isBlockedIpv6(address: string): boolean {
  const lower = address.toLowerCase();
  // IPv4-mapped (::ffff:a.b.c.d) → ตรวจฝั่ง IPv4 ต่อ
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedIpv4(mapped[1]);
  if (lower === "::" || lower === "::1") return true; // unspecified / loopback
  if (/^f[cd]/.test(lower)) return true; // fc00::/7 unique-local
  if (/^fe[89ab]/.test(lower)) return true; // fe80::/10 link-local
  if (lower.startsWith("2001:db8:")) return true; // documentation range
  return false;
}

/**
 * ตรวจ URL ก่อนให้ server fetch:
 * - https เท่านั้น, ห้าม embed credential
 * - resolve DNS ทุก record แล้วบล็อกถ้า record ใดชี้เข้าเครือข่ายภายใน
 */
export async function assertSafePublicUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new OutboundBlockedError("Invalid URL");
  }
  if (url.protocol !== "https:") throw new OutboundBlockedError("Only HTTPS URLs are allowed");
  if (url.username || url.password) throw new OutboundBlockedError("Credentials in URL are not allowed");

  const hostname = url.hostname.replace(/^\[/, "").replace(/\]$/, "");
  if (net.isIP(hostname)) {
    if (isBlockedIp(hostname)) throw new OutboundBlockedError("Host points to a blocked address");
    return url;
  }
  let records: Array<{ address: string }>;
  try {
    records = await dns.lookup(hostname, { all: true });
  } catch {
    throw new OutboundBlockedError("Host could not be resolved");
  }
  if (!records.length) throw new OutboundBlockedError("Host has no DNS records");
  for (const record of records) {
    if (isBlockedIp(record.address)) throw new OutboundBlockedError("Host resolves to a blocked address");
  }
  return url;
}

export interface SafeFetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
}

/**
 * fetch ที่ผ่านการตรวจ SSRF ทุก hop (redirect ต้องถูกตรวจซ้ำ), มี timeout
 * และจำกัดขนาด response เพื่อกัน memory exhaustion
 */
export async function safeFetch(rawUrl: string, options: SafeFetchOptions = {}): Promise<Response> {
  const { timeoutMs = 8000, maxBytes = 512 * 1024, maxRedirects = 3 } = options;
  let currentUrl = rawUrl;

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const validated = await assertSafePublicUrl(currentUrl); // eslint-disable-line no-await-in-loop
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(validated, {
        method: hop === 0 ? options.method || "GET" : "GET",
        headers: options.headers,
        body: hop === 0 ? options.body : undefined,
        redirect: "manual",
        signal: controller.signal,
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) return response;
        currentUrl = new URL(location, validated).toString();
        continue;
      }
      const contentLength = Number(response.headers.get("content-length") || 0);
      if (contentLength > maxBytes) throw new OutboundBlockedError(`Response too large (${contentLength} bytes)`);
      return response;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new OutboundBlockedError("Too many redirects");
}

/** อ่าน body แบบจำกัดขนาด (กันโดน feed response ใหญ่เกิน) */
export async function readBodyWithLimit(response: Response, maxBytes = 512 * 1024): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new OutboundBlockedError(`Response exceeds ${maxBytes} bytes`);
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

/** เทียบ token แบบ timing-safe (hash ก่อนเพื่อให้ length เท่ากันเสมอ) */
export function timingSafeTokenEqual(left: string, right: string): boolean {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

export interface RateLimiter {
  /** คืน true ถ้าอนุญาต, false ถ้าเกินโควตาใน window */
  allow(key: string): boolean;
}

/** In-memory sliding-window rate limiter (เพียงพอสำหรับ single-instance deploy) */
export function createRateLimiter(options: { windowMs: number; max: number }): RateLimiter {
  const hits = new Map<string, number[]>();
  return {
    allow(key: string): boolean {
      const now = Date.now();
      const windowStart = now - options.windowMs;
      const recent = (hits.get(key) || []).filter((timestamp) => timestamp > windowStart);
      if (recent.length >= options.max) {
        hits.set(key, recent);
        return false;
      }
      recent.push(now);
      hits.set(key, recent);
      return true;
    },
  };
}
