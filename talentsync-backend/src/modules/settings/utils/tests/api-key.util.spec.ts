import { generateApiKey, hashApiKey, verifyApiKey } from '../api-key.util';

describe('ApiKeyUtil', () => {
    it('should generate a 64-character hex string (32 bytes)', () => {
        const key = generateApiKey();
        expect(key).toHaveLength(64);
    });

    it('should hash and verify correctness', async () => {
        const key = generateApiKey();
        const hashed = await hashApiKey(key);
        const valid = await verifyApiKey(key, hashed);
        expect(valid).toBe(true);
    });

    it('should fail verification for wrong key', async () => {
        const key = generateApiKey();
        const otherKey = generateApiKey();
        const hashed = await hashApiKey(key);
        const valid = await verifyApiKey(otherKey, hashed);
        expect(valid).toBe(false);
    });
});
