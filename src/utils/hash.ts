import * as argon2 from 'argon2';

export async function hashOtp(code: string): Promise<string> {
  // custo padrão do argon2 já é ok pra OTP
  return argon2.hash(code);
}

export async function verifyHash(hash: string, code: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, code);
  } catch {
    return false;
  }
}