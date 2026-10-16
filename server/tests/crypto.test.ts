import { encrypt, decrypt, maskSecret } from '../src/utils/crypto';

describe('AES-256-GCM Crypto Utility', () => {
  it('should encrypt and decrypt a plaintext string correctly', () => {
    const secret = 'my-super-secret-azure-app-secret-12345!@#$';
    const encrypted = encrypt(secret);

    expect(encrypted).not.toEqual(secret);
    expect(encrypted.split(':').length).toBe(3);

    const decrypted = decrypt(encrypted);
    expect(decrypted).toEqual(secret);
  });

  it('should generate different ciphertexts for the same plaintext due to random IV', () => {
    const secret = 'test-secret';
    const enc1 = encrypt(secret);
    const enc2 = encrypt(secret);

    expect(enc1).not.toEqual(enc2);
    expect(decrypt(enc1)).toEqual(secret);
    expect(decrypt(enc2)).toEqual(secret);
  });

  it('should fail with error if ciphertext is tampered', () => {
    const secret = 'sensitive-data';
    const encrypted = encrypt(secret);
    const parts = encrypted.split(':');
    const tampered = `${parts[0]}:${parts[1]}:${parts[2].slice(0, -2)}aa`;

    expect(() => decrypt(tampered)).toThrow();
  });

  it('should correctly mask secrets', () => {
    expect(maskSecret('sk-proj-1234567890abcdef1234567890')).toBe('sk-p...7890');
    expect(maskSecret('short')).toBe('****');
  });
});

