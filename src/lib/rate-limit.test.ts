import { describe, expect, it } from "vitest";
import { clientIp, rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  it("allows up to the limit, then blocks with a retry hint", () => {
    const key = `k-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(key, { limit: 3, windowMs: 1000 }).ok).toBe(true);
    }
    const blocked = rateLimit(key, { limit: 3, windowMs: 1000 });
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("recovers once the window passes", async () => {
    const key = `k-${Math.random()}`;
    rateLimit(key, { limit: 1, windowMs: 20 });
    expect(rateLimit(key, { limit: 1, windowMs: 20 }).ok).toBe(false);
    await new Promise((r) => setTimeout(r, 30));
    expect(rateLimit(key, { limit: 1, windowMs: 20 }).ok).toBe(true);
  });

  it("tracks keys independently", () => {
    expect(rateLimit(`a-${Math.random()}`, { limit: 1, windowMs: 1000 }).ok).toBe(true);
    expect(rateLimit(`b-${Math.random()}`, { limit: 1, windowMs: 1000 }).ok).toBe(true);
  });
});

describe("clientIp", () => {
  it("takes the first x-forwarded-for entry", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip, then 'unknown'", () => {
    expect(clientIp(new Headers({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
