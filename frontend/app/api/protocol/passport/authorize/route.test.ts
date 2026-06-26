import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { GET } from "./route";
import { globalPassportStore } from "../../../../../src/lib/passport-store";
import {
  revokePassport,
  _reset as _resetRevocation,
} from "../../../../../src/lib/passport/revocation-store";
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

function req(params: Record<string, string>) {
  const url = new URL("https://example.com/api/protocol/passport/authorize");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Request(url.toString(), { method: "GET" }) as unknown as NextRequest;
}

describe("GET /api/protocol/passport/authorize", () => {
  beforeEach(() => {
    globalPassportStore.reset();
    _resetRevocation();
    vi.useFakeTimers({ now: new Date("2025-01-01T00:00:00.000Z").getTime() });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns ok: true for a valid, non-revoked passport within spend cap", async () => {
    globalPassportStore.issuePassport("agent-auth-1", 500, "hash-1");
    const res = await GET(req({ agentId: "agent-auth-1", amount: "100" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ ok: true });
  });

  it("returns PassportRevoked when the passport has been revoked", async () => {
    globalPassportStore.issuePassport("agent-auth-2", 500, "hash-2");
    revokePassport("agent-auth-2");
    const res = await GET(req({ agentId: "agent-auth-2", amount: "100" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ ok: false, reason: "PassportRevoked" });
  });

  it("reflects revocation before expiry — revocation wins", async () => {
    globalPassportStore.issuePassport("agent-auth-3", 500, "hash-3");
    vi.setSystemTime(new Date("2025-02-05T00:00:00.000Z").getTime()); // past 30-day expiry
    revokePassport("agent-auth-3");
    const res = await GET(req({ agentId: "agent-auth-3", amount: "10" }));
    const data = await res.json();
    expect(data.reason).toBe("PassportRevoked");
  });

  it("returns PassportNotFound for an unissued agentId", async () => {
    const res = await GET(req({ agentId: "nobody", amount: "10" }));
    const data = await res.json();
    expect(data).toEqual({ ok: false, reason: "PassportNotFound" });
  });

  it("returns PassportExpired for an expired, non-revoked passport", async () => {
    globalPassportStore.issuePassport("agent-auth-4", 500, "hash-4");
    vi.setSystemTime(new Date("2025-02-05T00:00:00.000Z").getTime()); // past expiry
    const res = await GET(req({ agentId: "agent-auth-4", amount: "10" }));
    const data = await res.json();
    expect(data).toMatchObject({ ok: false, reason: "PassportExpired" });
  });

  it("returns 400 when agentId is missing", async () => {
    const res = await GET(req({ amount: "10" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ ok: false, reason: "MissingFields" });
  });

  it("returns 400 when amount is missing", async () => {
    const res = await GET(req({ agentId: "agent-auth-1" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ ok: false, reason: "MissingFields" });
  });

  it("returns 400 for a non-integer amount", async () => {
    const res = await GET(req({ agentId: "agent-auth-1", amount: "1.5" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for a zero amount", async () => {
    const res = await GET(req({ agentId: "agent-auth-1", amount: "0" }));
    expect(res.status).toBe(400);
  });
});
