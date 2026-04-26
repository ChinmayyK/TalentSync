import * as jwt from 'jsonwebtoken';

export function createSignedLink(
  payload: Record<string, any>,
  expiresIn = '24h',
) {
  const secret = process.env.JWT_SECRET || 'secret';
  const token = jwt.sign(payload, secret, {
    expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
  });
  // Frontend route for one-time setup (adjust host per env)
  const host = process.env.APP_BASE_URL || 'http://localhost:3000';
  return `${host}/onboard?token=${token}`;
}

export function verifySignedToken(token: string) {
  const secret = process.env.JWT_SECRET || 'secret';
  try {
    return jwt.verify(token, secret);
  } catch (e) {
    throw new Error('Invalid or expired token');
  }
}
