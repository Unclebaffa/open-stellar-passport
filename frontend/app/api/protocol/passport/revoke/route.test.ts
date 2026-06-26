import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { POST } from "./route";
import { _reset as _resetRateLimit } from "../../../../../src/lib/rate-limit";
import { _reset as _resetRevocation, isRevoked } from "../../../../../src/lib/passport/revocation-store";
import { NextRequest } from "next/server";

// Mock next/server — Next.js is not installed in the Vite frontend workspace
vi.mock("next/server", () => {
  return {
    NextResponse: {
      json: (
        body: unknown,
        init?: { status?: number; headers?: Record<string, string> },
      ) => {
        const headers = new Headers(init?.headers);
        return {
          status: init?.status ?? 200,
          headers,
          json: async () => body,
        } as unknown as Response;
      },
    },
    NextRequest: class {},
  };
});

function req(body: unknown, ip = "1.2.3.4") {
  return new Request("https://example.com/api/protocol/passport/revoke", {
    method: "POST",
    headers: {
      "x-forwarded-for": ip,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe("POST /api/protocol/passport/revoke", () => {
  beforeEach(() => {
    _resetRateLimit();
    _resetRevocation();
    vi.useFakeTimers({ now: new Date("2025-06-01T00:00:00.000Z").getTime() });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 200 with revokedAt when agentId is provided", async () => {
    const res = await POST(req({ agentId: "agent-A" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.revokedAt).toBe("2025-06-01T00:00:00.000Z");
  });

  it("marks the passport as revoked in the revocation-store", async () => {
    await POST(req({ agentId: "agent-B" }));
    expect(isRevoked("agent-B")).toBe(true);
  });

  it("is idempotent — revoking twice still returns 200", async () => {
    await POST(req({ agentId: "agent-C" }));
    const res2 = await POST(req({ agentId: "agent-C" }));
    expect(res2.status).toBe(200);
    expect(isRevoked("agent-C")).toBe(true);
  });

  it("revocation is case-insensitive in the store", async () => {
    await POST(req({ agentId: "Agent-D" }));
    expect(isRevoked("agent-d")).toBe(true);
  });

  it("revocation trims whitespace from agentId", async () => {
    await POST(req({ agentId: "  agent-E  " }));
    expect(isRevoked("agent-e")).toBe(true);
  });

  it("returns 400 when agentId is missing from body", async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ ok: false, reason: "MissingFields" });
  });

  it("returns 400 when agentId is a blank string", async () => {
    const res = await POST(req({ agentId: "   " }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ ok: false, reason: "MissingFields" });
  });

  it("returns 400 when agentId is not a string", async () => {
    const res = await POST(req({ agentId: 42 }));
    expect(res.status).toBe(400);
  });

  it("returns 429 after 10 requests from the same IP", async () => {
    for (let i = 0; i < 10; i++) {
      const res = await POST(req({ agentId: `agent-rl-${i}` }, "5.5.5.5"));
      expect(res.status).toBe(200);
    }
    const blocked = await POST(req({ agentId: "agent-rl-extra" }, "5.5.5.5"));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBe("60");
    const data = await blocked.json();
    expect(data).toEqual({ ok: false });
  });
});
