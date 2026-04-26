import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

// Get and validate encryption key
function getEncryptionKey(): Buffer {
    const keyHex = process.env.TOKEN_ENCRYPTION_KEY;
    if (!keyHex) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('TOKEN_ENCRYPTION_KEY must be set in production (64 hex chars = 32 bytes)');
        }
        console.warn('WARNING: TOKEN_ENCRYPTION_KEY not set. Using insecure default for development.');
        // Random key for dev - will change on restart but that's fine for dev
        return crypto.randomBytes(32);
    }
    if (keyHex.length !== 64) {
        throw new Error('TOKEN_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    }
    return Buffer.from(keyHex, 'hex');
}

const KEY = getEncryptionKey();

export function encryptToken(plain: string) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}.${tag.toString('hex')}.${encrypted.toString('hex')}`;
}

export function decryptToken(payload: string) {
    const [ivHex, tagHex, dataHex] = payload.split('.');
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const data = Buffer.from(dataHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return decrypted.toString('utf8');
}
