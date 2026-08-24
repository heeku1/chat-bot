import assert from "node:assert/strict";
import test from "node:test";
import { authenticate, clearSessionCookie, createApiGuard, createSession, getPrincipal, isAuthConfigured, sessionCookie } from "../server/auth/session";

function mockResponse() {
  const calls: Array<{ status: number; body: unknown }> = [];
  return {
    calls,
    status(code: number) {
      return {
        json(body: unknown) {
          calls.push({ status: code, body });
        },
      };
    },
  };
}

test("server auth rejects missing configuration and wrong credentials", () => {
  const previousUsername = process.env.JIMMY_ADMIN_USERNAME;
  const previousPassword = process.env.JIMMY_ADMIN_PASSWORD;
  delete process.env.JIMMY_ADMIN_USERNAME;
  delete process.env.JIMMY_ADMIN_PASSWORD;
  try {
    assert.equal(authenticate("admin", "admin123"), null);
  } finally {
    if (previousUsername === undefined) delete process.env.JIMMY_ADMIN_USERNAME;
    else process.env.JIMMY_ADMIN_USERNAME = previousUsername;
    if (previousPassword === undefined) delete process.env.JIMMY_ADMIN_PASSWORD;
    else process.env.JIMMY_ADMIN_PASSWORD = previousPassword;
  }
});

test("server session uses HttpOnly cookies and resolves the principal", () => {
  const previousUsername = process.env.JIMMY_ADMIN_USERNAME;
  const previousPassword = process.env.JIMMY_ADMIN_PASSWORD;
  process.env.JIMMY_ADMIN_USERNAME = "owner";
  process.env.JIMMY_ADMIN_PASSWORD = "long-test-password";
  try {
    const principal = authenticate("OWNER", "long-test-password");
    assert.equal(principal?.role, "admin");
    const token = createSession(principal!);
    const cookie = sessionCookie(token, true);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /Secure/);
    assert.equal(getPrincipal({ header: () => cookie })?.username, "owner");
    assert.match(clearSessionCookie(true), /Max-Age=0/);
  } finally {
    if (previousUsername === undefined) delete process.env.JIMMY_ADMIN_USERNAME;
    else process.env.JIMMY_ADMIN_USERNAME = previousUsername;
    if (previousPassword === undefined) delete process.env.JIMMY_ADMIN_PASSWORD;
    else process.env.JIMMY_ADMIN_PASSWORD = previousPassword;
  }
});

test("api guard stays open in migration mode and blocks without a session when enabled", () => {
  const previousUsername = process.env.JIMMY_ADMIN_USERNAME;
  const previousPassword = process.env.JIMMY_ADMIN_PASSWORD;
  process.env.JIMMY_ADMIN_USERNAME = "owner";
  process.env.JIMMY_ADMIN_PASSWORD = "long-test-password";
  try {
    assert.equal(isAuthConfigured(), true);

    // migration mode: disabled guard lets everything through
    let nextCalled = false;
    createApiGuard({ enabled: false })(
      { path: "/api/bot-config", header: () => undefined },
      mockResponse(),
      () => { nextCalled = true; },
    );
    assert.equal(nextCalled, true);

    // enabled + no cookie → 401, handler never runs
    const denied = mockResponse();
    nextCalled = false;
    createApiGuard({ enabled: true })(
      { path: "/api/bot-config", header: () => undefined },
      denied,
      () => { nextCalled = true; },
    );
    assert.equal(nextCalled, false);
    assert.deepEqual(denied.calls, [{ status: 401, body: { ok: false, error: "Authentication required" } }]);

    // enabled + valid session cookie → passes through
    const token = createSession(authenticate("owner", "long-test-password")!);
    const cookie = sessionCookie(token, true);
    nextCalled = false;
    createApiGuard({ enabled: true })(
      { path: "/api/bot-config", header: (name) => (name === "cookie" ? cookie : undefined) },
      mockResponse(),
      () => { nextCalled = true; },
    );
    assert.equal(nextCalled, true);

    // login endpoint itself is always exempt
    nextCalled = false;
    createApiGuard({ enabled: true })(
      { path: "/api/auth/login", header: () => undefined },
      mockResponse(),
      () => { nextCalled = true; },
    );
    assert.equal(nextCalled, true);
  } finally {
    if (previousUsername === undefined) delete process.env.JIMMY_ADMIN_USERNAME;
    else process.env.JIMMY_ADMIN_USERNAME = previousUsername;
    if (previousPassword === undefined) delete process.env.JIMMY_ADMIN_PASSWORD;
    else process.env.JIMMY_ADMIN_PASSWORD = previousPassword;
  }
});