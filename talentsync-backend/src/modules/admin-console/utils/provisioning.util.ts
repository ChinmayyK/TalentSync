import * as crypto from 'crypto';
export function randomPassword() {
  return crypto.randomBytes(10).toString('base64').slice(0, 12);
}

