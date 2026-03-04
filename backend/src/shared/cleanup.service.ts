import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Периодическая очистка и обслуживание:
 * - Деактивация пользователей с истёкшим activeUntil (ежедневно в 0:05)
 * - RefreshToken (старше 30 дней)
 * - SmsCode (старше 1 часа)
 */
@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Каждый день в 0:05 — деактивация пользователей с истёкшей подпиской.
   * activeUntil означает «активен ДО конца этого дня»,
   * поэтому сравниваем с началом текущего дня (00:00).
   */
  @Cron('5 0 * * *')
  async deactivateExpiredUsers() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const result = await this.prisma.user.updateMany({
      where: {
        status: UserStatus.ACTIVE,
        activeUntil: { lt: startOfToday },
      },
      data: { status: UserStatus.INACTIVE },
    });

    if (result.count > 0) {
      this.logger.log(
        `Деактивировано ${result.count} пользователей с истёкшей подпиской`,
      );
    }
  }

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
