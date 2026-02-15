import { Injectable, Logger } from '@nestjs/common';
import { randomInt } from 'crypto';

/**
 * SMS-сервис — заглушка.
 * В production заменить на реальный провайдер (smsc.kz, Mobizon и т.д.)
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  /**
   * Отправляет SMS-код (заглушка — код НЕ логируется в production)
   */
  async sendCode(phone: string, code: string): Promise<void> {
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(`📱 SMS to ${phone}: code = ${code}`);
    } else {
      this.logger.log(`📱 SMS sent to ${phone}`);
    }
    // TODO: Заменить на реальный провайдер
    // await this.httpService.post('https://smsc.kz/...', { phone, code });
  }

  /**
   * Генерирует 6-значный код (криптографически стойкий)
   */
  generateCode(): string {
    return randomInt(100000, 999999).toString();
  }
}
