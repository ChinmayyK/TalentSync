import { encryptToken, decryptToken } from './token-encryption.util';

describe('TokenEncryption', () => {
    it('should encrypt and decrypt a token correctly', () => {
        const original = 'my-secret-token-123';
        const encrypted = encryptToken(original);
        expect(encrypted).not.toBe(original);
        expect(encrypted.split('.').length).toBe(3); // iv.tag.data

        const decrypted = decryptToken(encrypted);
        expect(decrypted).toBe(original);
    });
});
