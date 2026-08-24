import assert from "node:assert/strict";
import test from "node:test";
import {
  OutboundBlockedError,
  assertSafePublicUrl,
  createRateLimiter,
  isBlockedIp,
  timingSafeTokenEqual,
} from "../server/security/outbound";

test("private, loopback and metadata IPs are blocked while public IPs pass", () => {
  for (const blocked of ["127.0.0.1", "10.0.0.5", "169.254.169.254", "172.16.0.9", "192.168.1.1", "100.64.0.1", "0.0.0.0", "224.0.0.1", "::1", "::", "fe80::1", "fd00::1", "::ffff:127.0.0.1", "not-an-ip"]) {
    assert.equal(isBlockedIp(blocked), true, `expected blocked: ${blocked}`);
  }
  for (const allowed of ["8.8.8.8", "1.1.1.1", "93.184.216.34", "2606:4700::1111"]) {
    assert.equal(isBlockedIp(allowed), false, `expected allowed: ${allowed}`);
  }
});

test("rate limiter allows up to max then denies within the window", () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 2 });
  assert.equal(limiter.allow("ip-1"), true);
  assert.equal(limiter.allow("ip-1"), true);
  assert.equal(limiter.allow("ip-1"), false);
  assert.equal(limiter.allow("ip-2"), true); // keys are independent
});

test("token comparison is timing-safe and length-independent", () => {
  assert.equal(timingSafeTokenEqual("secret-a", "secret-a"), true);
  assert.equal(timingSafeTokenEqual("secret-a", "secret-b"), false);
  assert.equal(timingSafeTokenEqual("short", "a-much-longer-value"), false);
});

test("outbound URLs must be public HTTPS without embedded credentials", async () => {
  await assert.rejects(assertSafePublicUrl("http://example.com/hook"), OutboundBlockedError);
  await assert.rejects(assertSafePublicUrl("https://user:pass@example.com/hook"), OutboundBlockedError);
  await assert.rejects(assertSafePublicUrl("https://127.0.0.1/hook"), OutboundBlockedError);
  await assert.rejects(assertSafePublicUrl("https://[::1]/hook"), OutboundBlockedError);
  await assert.rejects(assertSafePublicUrl("https://169.254.169.254/latest/meta-data"), OutboundBlockedError);
  await assert.rejects(assertSafePublicUrl("https://localhost/hook"), OutboundBlockedError);
  await assert.rejects(assertSafePublicUrl("not a url"), OutboundBlockedError);
});
