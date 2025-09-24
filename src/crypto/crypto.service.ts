import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { createCipheriv, createDecipheriv, createHash, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

@Injectable()
export class CryptoService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly secretKey = process.env.CRYPTO_SECRET || 'default-secret-key-change-in-production';
  private readonly saltRounds = 10;

  async encrypt(text: string): Promise<string> {
    if (!text || text.length === 0) return text;

    // Generate random IV for security
    const iv = randomBytes(16);

    // Derive key from secret using scrypt
    const key = (await promisify(scrypt)(this.secretKey, 'salt', 32)) as Buffer;

    const cipher = createCipheriv(this.algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Prepend IV to encrypted data
    return iv.toString('hex') + ':' + encrypted;
  }

  async decrypt(encryptedText: string): Promise<string> {
    if (!encryptedText || encryptedText.length === 0) return encryptedText;

    // Split IV and encrypted data
    const [ivHex, encrypted] = encryptedText.split(':');
    if (!ivHex || !encrypted) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(ivHex, 'hex');

    // Derive key from secret using scrypt
    const key = (await promisify(scrypt)(this.secretKey, 'salt', 32)) as Buffer;

    const decipher = createDecipheriv(this.algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  async createHash(text: string): Promise<string> {
    return bcrypt.hash(text, this.saltRounds);
  }

  hashForSearch(text: string): string {
    return createHash('sha256')
      .update(text + this.secretKey)
      .digest('hex');
  }

  async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}
