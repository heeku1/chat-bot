import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export interface AuthPrincipal {
  userId: string;
  username: string;
  name: string;
  role: "admin" | "member";
}

const SESSION_COOKIE = "jimmy_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

type Session = { principal: AuthPrincipal; expiresAt: number };

const sessions = new Map<string, Session>();

export function authenticate(username: string, password: string): AuthPrincipal | null {
  const configuredUsername = process.env.JIMMY_ADMIN_USERNAME?.trim();
  const configuredPassword = process.env.JIMMY_ADMIN_PASSWORD || "";
  if (!configuredUsername || !configuredPassword) return null;
  if (username.trim().toLowerCase() !== configuredUsername.toLowerCase()) return null;
  if (!safeEqual(password, configuredPassword)) return null;
  return {
    userId: `admin:${configuredUsername.toLowerCase()}`,
    username: configuredUsername,
    name: "Platform Administrator",
    role: "admin",
  };
}

export function createSession(principal: AuthPrincipal): string {
  cleanupSessions();
  const token = randomBytes(32).toString("base64url");
  sessions.set(hashToken(token), { principal, expiresAt: Date.now() + SESSION_TTL_MS });
  return token;
}

export function getPrincipal(request: { header(name: string): string | undefined }): AuthPrincipal | null {
  cleanupSessions();
  const token = parseCookie(request.header("cookie"), SESSION_COOKIE);
  if (!token) return null;
  return sessions.get(hashToken(token))?.principal || null;
}

export function revokeSession(request: { header(name: string): string | undefined }): void {
  const token = parseCookie(request.header("cookie"), SESSION_COOKIE);
  if (token) sessions.delete(hashToken(token));
}

export function sessionCookie(token: string, secure: boolean): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}${secure ? "; Secure" : ""}`;
}

export function clearSessionCookie(secure: boolean): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}

/** เส้นทาง /api/* ที่ยอมให้เรียกได้โดยไม่มี session (login flow เอง) */
const AUTH_EXEMPT_PATHS = new Set(["/api/auth/login", "/api/auth/me", "/api/auth/logout"]);

export interface ApiGuardRequest {
  path: string;
  header(name: string): string | undefined;
}

export interface ApiGuardResponse {
  status(code: number): { json(body: unknown): void };
}

/**
 * Middleware กันการเรียก /api/* โดยไม่ยืนยันตัวตน
 * enabled=false = migration mode (ยังไม่ตั้ง admin credential) — ปล่อยผ่านทั้งหมด
 */
export function createApiGuard(options: { enabled: boolean }) {
  return function apiGuard(req: ApiGuardRequest, res: ApiGuardResponse, next: () => void): void {
    if (!options.enabled || AUTH_EXEMPT_PATHS.has(req.path)) {
      next();
      return;
    }
    if (!getPrincipal(req)) {
      res.status(401).json({ ok: false, error: "Authentication required" });
      return;
    }
    next();
  };
}

export function isAuthConfigured(): boolean {
  return Boolean(process.env.JIMMY_ADMIN_USERNAME?.trim() && process.env.JIMMY_ADMIN_PASSWORD);
}

function safeEqual(left: string, right: string): boolean {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function parseCookie(header: string | undefined, name: string): string | null {
  const pair = header?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : null;
}

function cleanupSessions() {
  const now = Date.now();
  for (const [key, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(key);
  }
}