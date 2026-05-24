import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly secretKey: string;

  constructor() {
    const key = process.env.ENCRYPTION_KEY;
    if (!key || key.length !== 32) {
      throw new Error(
        'ENCRYPTION_KEY debe estar definida en las variables de entorno y tener exactamente 32 caracteres.',
      );
    }
    this.secretKey = key;
  }

  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      this.algorithm,
      Buffer.from(this.secretKey),
      iv,
    );
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  decrypt(hash: string): string {
    const [ivHex, encryptedHex] = hash.split(':');
    if (!ivHex || !encryptedHex) {
      throw new Error('Formato de hash inválido o no encriptado');
    }
    const iv = Buffer.from(ivHex, 'hex');
    try {
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        Buffer.from(this.secretKey),
        iv,
      );
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err) {
      // Fallback a la clave por defecto histórica si falla con la nueva ENCRYPTION_KEY
      try {
        const fallbackKey = '12345678901234567890123456789012';
        const decipher = crypto.createDecipheriv(
          this.algorithm,
          Buffer.from(fallbackKey),
          iv,
        );
        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      } catch (fallbackErr) {
        throw err; // Lanzar el error original si el fallback también falla
      }
    }
  }
}
