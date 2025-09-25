// backend/src/utils/encryption.util.ts

import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;
const IV_LENGTH = 16;

export class EncryptionUtil {
  private static algorithm = 'aes-256-cbc';
  
  // Generate a consistent 32-byte key from the encryption key
  private static getKey(): Buffer {
    if (!ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY is not set in environment variables');
    }
    return crypto
      .createHash('sha256')
      .update(ENCRYPTION_KEY)
      .digest();
  }

  /**
   * Encrypt sensitive data
   */
  static encrypt(text: string): string {
    if (!text) return '';
    
    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(
        this.algorithm,
        this.getKey(),
        iv
      );

      let encrypted = cipher.update(text, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);

      return iv.toString('hex') + ':' + encrypted.toString('hex');
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  static decrypt(text: string): string {
    if (!text) return '';
    
    try {
      const textParts = text.split(':');
      if (textParts.length !== 2) {
        console.warn('Invalid encrypted format');
        return '';
      }

      const iv = Buffer.from(textParts[0], 'hex');
      const encryptedText = Buffer.from(textParts[1], 'hex');

      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.getKey(),
        iv
      );

      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString('utf8');
    } catch (error) {
      console.error('Decryption error:', error);
      return '';
    }
  }

  /**
   * Mask PAN - Show only last 4 digits
   */
  static maskPAN(pan: string | null): string {
    if (!pan || pan.length < 4) return pan || '';
    return 'XXXX-XXXX-' + pan.slice(-4);
  }

  /**
   * Validate PAN format (basic validation)
   */
  static isValidPAN(pan: string): boolean {
    if (!pan) return false;
    // Indian PAN format: AAAAA9999A
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan.toUpperCase());
  }
}