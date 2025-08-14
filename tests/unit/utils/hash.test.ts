import { describe, it, expect } from "vitest";
import { hashOtp, verifyHash } from "../../../src/utils/hash";

describe("utils/hash", () => {
  it("should hash and verify a code", async () => {
    const code = "123456";
    const hash = await hashOtp(code);
    expect(hash).toBeTruthy();

    const ok = await verifyHash(hash, code);
    expect(ok).toBe(true);
  });
});
