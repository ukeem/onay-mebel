import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotifyService } from './notify.service';

/**
 * Периодическая очистка и обслуживание:
 * - Деактивация пользователей с истёкшим activeUntil (ежедневно в 0:05)
 * - RefreshToken (старше 30 дней)
 * - SmsCode (старше 1 часа)
 */
@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: NotifyService,
  ) {}

  /**
   * Каждый день в 0:05 — деактивация пользователей с истёкшей подпиской.
   * activeUntil означает «активен ДО конца этого дня»,
   * поэтому сравниваем с началом текущего дня (00:00).
   */
  @Cron('5 0 * * *')
  async deactivateExpiredUsers() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Find users before deactivating to get their phones
    const expiredUsers = await this.prisma.user.findMany({
      where: {
        status: UserStatus.ACTIVE,
        activeUntil: { lt: startOfToday },
      },
      select: { phone: true },
    });

    if (expiredUsers.length === 0) return;

    const result = await this.prisma.user.updateMany({
      where: {
        status: UserStatus.ACTIVE,
        activeUntil: { lt: startOfToday },
      },
      data: { status: UserStatus.INACTIVE },
    });

    this.logger.log(
      `Деактивировано ${result.count} пользователей с истёкшей подпиской`,
    );

    const phones = expiredUsers.map((u) => u.phone);
    this.notify.notifyExpiredUsers(phones).catch(() => {});
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
