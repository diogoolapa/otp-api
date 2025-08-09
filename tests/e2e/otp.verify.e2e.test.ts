import request from 'supertest';
import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';
import buildApp from '../../src/app';
import { redis } from '../../src/infra/redis';
import { hashOtp } from '../../src/utils/hash';

let app: Awaited<ReturnType<typeof buildApp>>;

describe('POST /otp/verify', () => {
  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  beforeEach(async () => {
    // Clean up any existing OTP data before each test
    const keys = await redis.keys('otp:*');
    if (keys.length > 0) {
      await redis.del(keys);
    }
  });

  afterAll(async () => {
    await app.close();
    await redis.quit();
  });

  it('should return success on valid OTP', async () => {
    const identifier = 'test@example.com';
    
    await request(app.server)
      .post('/otp/request')
      .send({ identifier, channel: 'email' })
      .expect(200);

    const key = `otp:${identifier}`;
    const otp = '123456';
    await redis.set(key, await hashOtp(otp));

    const res = await request(app.server)
      .post('/otp/verify')
      .send({ identifier, code: otp })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('should fail on expired OTP', async () => {
    const identifier = 'expire@example.com';
    await redis.set(`otp:${identifier}`, 'hash', { EX: 1 });
    await new Promise((r) => setTimeout(r, 1500));

    const res = await request(app.server)
      .post('/otp/verify')
      .send({ identifier, code: '000000' })
      .expect(410);

    expect(res.body.error).toBe('Code expired');
  });

  it('should block after max attempts', async () => {
    const identifier = 'block@example.com';
    const otp = '111111';
    await redis.set(`otp:${identifier}`, await hashOtp(otp), { EX: 300 });

    for (let i = 0; i < 5; i++) {
      await request(app.server)
        .post('/otp/verify')
        .send({ identifier, code: '000000' })
        .expect((res) => {
          if (![401, 429].includes(res.status)) {
            throw new Error('unexpected status during attempts');
          }
        });
    }

    const res = await request(app.server)
      .post('/otp/verify')
      .send({ identifier, code: otp })
      .expect(429);

    expect(res.body.error).toBe('Too many attempts');
  });
});
