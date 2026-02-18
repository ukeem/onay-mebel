import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Периодическая очистка истёкших записей:
 * - RefreshToken (старше 30 дней)
 * - SmsCode (старше 1 часа)
 */
@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Каждый день в 3:00 — удаление старых refresh-токенов */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanExpiredRefreshTokens() {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 дней
    const result = await this.prisma.refreshToken.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    if (result.count > 0) {
      this.logger.log(`Удалено ${result.count} истёкших refresh-токенов`);
    }
  }

  /** Каждый час — удаление использованных/истёкших SMS-кодов */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanExpiredSmsCodes() {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000); // 1 час
    const result = await this.prisma.smsCode.deleteMany({
      where: {
        OR: [{ used: true }, { createdAt: { lt: cutoff } }],
      },
    });
    if (result.count > 0) {
      this.logger.log(`Удалено ${result.count} SMS-кодов`);
    }
  }
}
