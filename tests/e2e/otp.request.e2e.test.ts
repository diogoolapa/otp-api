import request from "supertest";
import { beforeAll, afterAll, beforeEach, describe, it, expect } from "vitest";
import buildApp from "../../src/app";
import { redis } from "../../src/infra/redis";

let app: Awaited<ReturnType<typeof buildApp>>;

describe("POST /otp/request", () => {
  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  beforeEach(async () => {
    // Clean up any existing OTP data before each test
    const keys = await redis.keys("otp:*");
    if (keys.length > 0) {
      await redis.del(keys);
    }
  });

  afterAll(async () => {
    await app.close();
    await redis.quit();
  });

  it("should create a new OTP successfully", async () => {
    const res = await request(app.server)
      .post("/otp/request")
      .send({ identifier: "user1@example.com", channel: "email" })
      .expect(200);

    expect(res.body).toHaveProperty("issued", true);
    expect(res.body).toHaveProperty("message", "OTP sent");
  });

  it("should suppress resend if OTP still valid", async () => {
    const identifier = "user2@example.com";

    // First request - should issue new OTP
    await request(app.server)
      .post("/otp/request")
      .send({ identifier, channel: "email" })
      .expect(200);

    // Second request - should suppress resend
    const res = await request(app.server)
      .post("/otp/request")
      .send({ identifier, channel: "email" })
      .expect(200);

    expect(res.body.issued).toBe(false);
    expect(res.body).toHaveProperty(
      "message",
      "OTP already issued (still valid)",
    );
    expect(res.body).toHaveProperty("ttl");
  });
});
