import { describe, it, expect, vi, afterEach } from "vitest";
import { uuidv4 } from "../uuid";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("uuidv4", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses crypto.randomUUID in a secure context", () => {
    expect(uuidv4()).toMatch(UUID_V4);
    // the fallback makes the same shape, so only a known value shows which path ran
    const known = "0b7e4c1a-2f3d-4a5b-9c6d-7e8f9a0b1c2d";
    vi.stubGlobal("crypto", { randomUUID: () => known, getRandomValues: (bytes) => bytes.fill(0) });
    expect(uuidv4()).toBe(known);
  });

  it("makes a UUIDv4 from getRandomValues on a plain-http site, where randomUUID is missing", () => {
    const getRandomValues = (bytes) => bytes.fill(0xff);
    vi.stubGlobal("crypto", { getRandomValues });
    // every bit set, so only the version and variant bits the fallback forces can make it a v4
    expect(uuidv4()).toBe("ffffffff-ffff-4fff-bfff-ffffffffffff");

    vi.stubGlobal("crypto", { getRandomValues: (bytes) => bytes.fill(0) });
    expect(uuidv4()).toBe("00000000-0000-4000-8000-000000000000");
  });

  it("gives 10,000 distinct keys from the fallback", () => {
    const real = globalThis.crypto;
    vi.stubGlobal("crypto", { getRandomValues: (bytes) => real.getRandomValues(bytes) });
    const seen = new Set(Array.from({ length: 10000 }, uuidv4));
    expect(seen.size).toBe(10000);
    for (const id of seen) expect(id).toMatch(UUID_V4);
  });
});
