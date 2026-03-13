import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotifyService {
  private readonly logger = new Logger(NotifyService.name);
  private readonly telegramToken: string | undefined;
  private readonly telegramChatId: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.telegramToken = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    this.telegramChatId = this.config.get<string>('TELEGRAM_CHAT_ID');

    if (!this.telegramToken || !this.telegramChatId) {
      this.logger.warn('Telegram not configured — notifications disabled');
    }
  }

  /** Send notification about new user registration */
  async notifyNewUser(phone: string, userId: string): Promise<void> {
    const text = `🆕 Новый пользователь: ${phone}\nID: ${userId}\n${new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' })}`;
    await this.sendTelegram(text);
  }

  /** Send notification about expired user subscriptions */
  async notifyExpiredUsers(phones: string[]): Promise<void> {
    const list = phones.join('\n');
    const text = `⏰ Истёк срок у ${phones.length} пользователей:\n${list}`;
    await this.sendTelegram(text);
  }

  private async sendTelegram(text: string): Promise<void> {
    if (!this.telegramToken || !this.telegramChatId) return;

    try {
      const url = `https://api.telegram.org/bot${this.telegramToken}/sendMessage`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.telegramChatId,
          text,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`Telegram API error: ${res.status} ${body}`);
      }
    } catch (err) {
      this.logger.error(`Telegram notification failed: ${err}`);
    }
  }
}
