import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotifyService {
  private readonly logger = new Logger(NotifyService.name);
  private readonly telegramToken: string | undefined;
  private readonly telegramChatId: string | undefined;
  private readonly mailTransporter: nodemailer.Transporter | null;

  constructor(private readonly config: ConfigService) {
    this.telegramToken = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    this.telegramChatId = this.config.get<string>('TELEGRAM_CHAT_ID');

    const smtpHost = this.config.get<string>('SMTP_HOST');
    const smtpPort = this.config.get<number>('SMTP_PORT');
    const smtpUser = this.config.get<string>('SMTP_USER');
    const smtpPass = this.config.get<string>('SMTP_PASS');
    const smtpFrom = this.config.get<string>('SMTP_FROM');

    if (smtpHost && smtpUser && smtpPass) {
      this.mailTransporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort || 587,
        secure: (smtpPort || 587) === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });
      this.logger.log('SMTP transporter initialized');
    } else {
      this.mailTransporter = null;
      this.logger.warn('SMTP not configured — email notifications disabled');
    }
  }

  /** Send notification about new user registration */
  async notifyNewUser(phone: string, userId: string): Promise<void> {
    const text = `Новый пользователь: ${phone}\n${new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' })}`;

    await Promise.allSettled([
      this.sendTelegram(text),
      this.sendEmail(
        'Новый пользователь — Onay Mebel',
        `<h3>Новый пользователь зарегистрировался</h3>
        <p><b>Телефон:</b> ${phone}</p>
        <p><b>ID:</b> ${userId}</p>
        <p><b>Дата:</b> ${new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' })}</p>
        <p><b>Триал:</b> 7 дней</p>`,
      ),
    ]);
  }

  /** Send notification about expired user subscriptions */
  async notifyExpiredUsers(phones: string[]): Promise<void> {
    const list = phones.join('\n');
    const text = `Истёк срок у ${phones.length} пользователей:\n${list}`;

    await Promise.allSettled([
      this.sendTelegram(text),
      this.sendEmail(
        'Истёк срок подписки — Onay Mebel',
        `<h3>Истёк срок у ${phones.length} пользователей</h3>
        <ul>${phones.map((p) => `<li>${p}</li>`).join('')}</ul>
        <p><b>Дата:</b> ${new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' })}</p>`,
      ),
    ]);
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
          parse_mode: 'HTML',
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

  private async sendEmail(subject: string, html: string): Promise<void> {
    if (!this.mailTransporter) return;

    const notifyEmail = this.config.get<string>('NOTIFY_EMAIL');
    if (!notifyEmail) return;

    try {
      await this.mailTransporter.sendMail({
        from:
          this.config.get<string>('SMTP_FROM') ||
          this.config.get<string>('SMTP_USER'),
        to: notifyEmail,
        subject,
        html,
      });
    } catch (err) {
      this.logger.error(`Email notification failed: ${err}`);
    }
  }
}
