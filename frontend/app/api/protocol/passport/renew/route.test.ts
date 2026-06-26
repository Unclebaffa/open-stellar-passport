import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { POST } from "./route";
import { _reset } from "../../../../../src/lib/rate-limit";
import { globalPassportStore } from "../../../../../src/lib/passport-store";
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
  return new Request("https://example.com/api/protocol/passport/renew", {
    method: "POST",
    headers: {
      "x-forwarded-for": ip,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe("POST /api/protocol/passport/renew", () => {
  beforeEach(() => {
    _reset();
    globalPassportStore.reset();
    vi.useFakeTimers({ now: new Date("2025-01-01T00:00:00.000Z").getTime() });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 200 with new expiresAt for a valid renewal request", async () => {
    // Seed a passport in the global store
    globalPassportStore.issuePassport("agent-A", 100, "proof-hash-A");

    // Advance past the 30-day TTL
    vi.setSystemTime(new Date("2025-02-05T00:00:00.000Z").getTime());

    const res = await POST(req({ agentId: "agent-A", zkProofHash: "proof-hash-A" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    // 2025-02-05 + 30 days = 2025-03-07
    expect(data.expiresAt).toBe("2025-03-07T00:00:00.000Z");
  });

  it("does not change spendCapXlm after renewal", async () => {
    globalPassportStore.issuePassport("agent-cap", 250, "proof-cap");
    vi.setSystemTime(new Date("2025-02-05T00:00:00.000Z").getTime());

    await POST(req({ agentId: "agent-cap", zkProofHash: "proof-cap" }));

    const passport = globalPassportStore.getPassport("agent-cap")!;
    expect(passport.spendCapXlm).toBe(250);
  });

  it("returns 404 for an unknown agentId", async () => {
    const res = await POST(req({ agentId: "nobody", zkProofHash: "any" }));
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data).toEqual({ ok: false, reason: "PassportNotFound" });
  });

  it("returns 404 for a mismatched zkProofHash", async () => {
    globalPassportStore.issuePassport("agent-B", 100, "real-hash");

    const res = await POST(req({ agentId: "agent-B", zkProofHash: "wrong-hash" }));
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data).toEqual({ ok: false, reason: "InvalidProofHash" });
  });

  it("returns 400 when agentId is missing", async () => {
    const res = await POST(req({ zkProofHash: "some-hash" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ ok: false, reason: "MissingFields" });
  });

  it("returns 400 when zkProofHash is missing", async () => {
    globalPassportStore.issuePassport("agent-C", 100, "hash-C");
    const res = await POST(req({ agentId: "agent-C" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ ok: false, reason: "MissingFields" });
  });

  it("returns 429 after 5 requests from the same IP", async () => {
    globalPassportStore.issuePassport("agent-rl", 100, "hash-rl");

    for (let i = 0; i < 5; i++) {
      const res = await POST(req({ agentId: "agent-rl", zkProofHash: "hash-rl" }, "9.9.9.9"));
      expect(res.status).toBe(200);
    }

    const blocked = await POST(req({ agentId: "agent-rl", zkProofHash: "hash-rl" }, "9.9.9.9"));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBe("60");
    const data = await blocked.json();
    expect(data).toEqual({ ok: false });
  });
});
