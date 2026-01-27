import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

export function generateApiKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function hashApiKey(key: string): Promise<string> {
  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
  return bcrypt.hash(key, saltRounds);
}

export async function verifyApiKey(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

