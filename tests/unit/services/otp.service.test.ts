import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as otpService from '../../../src/services/otp/otp.service';
import * as hasher from '../../../src/utils/hash';
import { redis } from '../../../src/infra/redis';
import { logger } from '../../../src/infra/logger';

vi.mock('../../../src/infra/redis', () => {
  const map = new Map<string, string>();
  return {
    redis: {
      async get(k: string) { return map.get(k) ?? null; },
      async set(k: string, v: string, _opts?: any) { map.set(k, v); return 'OK'; },
      async del(k: string) { map.delete(k); return 1; },
      async incr(_k: string) { return 1; },
      async expire(_k: string, _sec: number) { return 1; },
      async pexpire(_k: string, _ms: number) { return 1; },
      async exists(k: string) { return map.has(k) ? 1 : 0; },
      async ttl(_k: string) { return 0; }, // 0 = sem TTL
      multi() {
        const ops: Array<() => void> = [];
        const chain = {
          set(k: string, v: string, _opts?: any) { ops.push(() => map.set(k, v)); return chain; },
          del(k: string) { ops.push(() => map.delete(k)); return chain; },
          expire(_k: string, _sec: number) { return chain; },
          pexpire(_k: string, _ms: number) { return chain; },
          exec() { ops.forEach(fn => fn()); return Promise.resolve(['OK']); }
        };
        return chain;
      }
    }
  };
});

logger.info({ op: 'unit:hit:generateOtp' }) 

describe('otp.service (unit)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    logger.level = 'debug'
  });


  it('generateOtp should return issued=true when new OTP created (logs visible)', async () => {
    // força sucesso de hash para garantir emissão e, portanto, log
    vi.spyOn(hasher, 'hashOtp').mockResolvedValue('hash');
    const res = await otpService.generateOtp('u@ex.com', 'email');
    expect(res.issued).toBe(true);
  });

  it('verifyOtp should return invalid for wrong code (logs visible)', async () => {
    // garante que não caia em "expired" e passe pelo fluxo de verificação/log
    await redis.set('otp:u@ex.com', 'some-hash');
    vi.spyOn(hasher, 'verifyHash').mockResolvedValue(false);

    const res = await otpService.verifyOtp('u@ex.com', '000000');
    expect(['invalid', 'blocked']).toContain(res.status);
  });

});
