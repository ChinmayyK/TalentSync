import * as jwt from 'jsonwebtoken';
import ms from 'ms';

export function signAccessToken(payload: object) {
  const ttl = process.env.ACCESS_TOKEN_TTL || '15m';
  return jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: ttl as any,
  });
}

export function signRefreshToken(payload: object) {
  const ttl = process.env.REFRESH_TOKEN_TTL || '7d';
  return jwt.sign(
    payload,
    (process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET) as string,
    { expiresIn: ttl as any },
  );
}

export function verifyAccessToken(token: string) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET as string);
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Access token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid access token');
    }
    throw error;
  }
}

export function verifyRefreshToken(token: string) {
  try {
    return jwt.verify(
      token,
      (process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET) as string,
    );
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid refresh token');
    }
    throw error;
  }
}
