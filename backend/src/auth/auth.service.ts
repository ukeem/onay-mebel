import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CatalogCopyService } from '../shared/catalog-copy.service';
import { parseDuration } from '../shared/parse-duration.util';
import { SmsService } from '../sms/sms.service';
import { WsGateway } from '../ws/ws.gateway';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 12;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly sms: SmsService,
    private readonly ws: WsGateway,
    private readonly catalogCopy: CatalogCopyService,
  ) {}

  /* ─────────────── REGISTER ─────────────── */

  async register(phone: string, password: string) {
    const existing = await this.prisma.user.findUnique({ where: { phone } });
    if (existing) {
      throw new ConflictException('Пользователь уже зарегистрирован');
    }

    const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        phone,
        password: hashedPassword,
        status: UserStatus.INACTIVE,
      },
    });

    // Copy catalog settings to new user
    await this.catalogCopy.copySettingsToUser(user.id);

    return {
      message:
        'Регистрация успешна. Обратитесь к администратору для активации.',
      userId: user.id,
    };
  }

  /* ─────────────── VERIFY SMS (Step 2: validate code only, does NOT activate) ─────────────── */

  async verifySms(phone: string, code: string) {
    const valid = await this.validateSmsCode(phone, code);
    if (!valid) {
      throw new BadRequestException('Неверный или истёкший код');
    }

    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    // Per TZ: verify-sms only validates the code, it does NOT activate the user.
    // Activation is done by admin setting activeUntil.
    return {
      message: 'Код подтверждён',
      verified: true,
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        status: user.status,
      },
    };
  }

  /* ─────────────── LOGIN ─────────────── */

  async login(phone: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      throw new UnauthorizedException('Неверный номер или пароль');
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new ForbiddenException('BLOCKED');
    }

    // Check activeUntil: if expired, set status to INACTIVE
    // activeUntil represents end-of-day, so compare with start of today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if (
      user.status === UserStatus.ACTIVE &&
      user.activeUntil &&
      user.activeUntil < startOfToday
    ) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { status: UserStatus.INACTIVE },
      });
      throw new ForbiddenException('INACTIVE');
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new ForbiddenException('INACTIVE');
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      throw new UnauthorizedException('Неверный номер или пароль');
    }

    const tokens = await this.issueTokens(user.id, user.phone, user.role);

    // Force-logout previous session via WebSocket
    this.ws.forceLogout(user.id);

    return {
      ...tokens,
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        status: user.status,
        activeUntil: user.activeUntil,
      },
    };
  }

  /* ─────────────── REFRESH ─────────────── */

  async refresh(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored) {
      throw new UnauthorizedException('Недействительный refresh token');
    }

    if (stored.expiresAt < new Date()) {
      await this.prisma.refreshToken.deleteMany({ where: { id: stored.id } });
      throw new UnauthorizedException('Refresh token истёк');
    }

    if (stored.user.status === UserStatus.BLOCKED) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId: stored.user.id },
      });
      throw new ForbiddenException('BLOCKED');
    }

    // ACTIVE but subscription expired → mark INACTIVE
    // activeUntil represents end-of-day, so compare with start of today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if (
      stored.user.status === UserStatus.ACTIVE &&
      stored.user.activeUntil &&
      stored.user.activeUntil < startOfToday
    ) {
      await this.prisma.user.update({
        where: { id: stored.user.id },
        data: { status: UserStatus.INACTIVE },
      });
      await this.prisma.refreshToken.deleteMany({
        where: { userId: stored.user.id },
      });
      throw new ForbiddenException('INACTIVE');
    }

    // Already INACTIVE
    if (stored.user.status === UserStatus.INACTIVE) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId: stored.user.id },
      });
      throw new ForbiddenException('INACTIVE');
    }

    // Rotate: delete old, issue new (deleteMany won't throw if already gone)
    await this.prisma.refreshToken.deleteMany({ where: { id: stored.id } });

    const tokens = await this.issueTokens(
      stored.user.id,
      stored.user.phone,
      stored.user.role,
    );

    return {
      ...tokens,
      user: {
        id: stored.user.id,
        phone: stored.user.phone,
        role: stored.user.role,
        status: stored.user.status,
        activeUntil: stored.user.activeUntil,
      },
    };
  }

  /* ─────────────── LOGOUT ─────────────── */

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
    return { message: 'Выход выполнен' };
  }

  /* ─────────────── RESET PASSWORD (request) ─────────────── */

  async resetRequest(phone: string) {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      // Don't reveal if user exists
      return { message: 'Если номер зарегистрирован, код будет отправлен' };
    }

    await this.sendSmsCode(phone);
    return { message: 'Если номер зарегистрирован, код будет отправлен' };
  }

  /* ─────────────── RESET PASSWORD (confirm) ─────────────── */

  async resetConfirm(phone: string, code: string, newPassword: string) {
    const valid = await this.validateSmsCode(phone, code);
    if (!valid) {
      throw new BadRequestException('Неверный или истёкший код');
    }

    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Invalidate all refresh tokens
    await this.prisma.refreshToken.deleteMany({ where: { userId: user.id } });

    // Force logout via WebSocket
    this.ws.forceLogout(user.id);

    return { message: 'Пароль изменён. Войдите заново.' };
  }

  /* ─────────────── ME (current user) ─────────────── */

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        role: true,
        status: true,
        activeUntil: true,
        createdAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    return user;
  }

  /* ═══════════════ HELPERS ═══════════════ */

  private async issueTokens(userId: string, phone: string, role: string) {
    const payload = { sub: userId, phone, role };

    const accessToken = this.jwt.sign(payload);

    const refreshTokenStr = randomBytes(64).toString('hex');
    const refreshExpiresIn = this.config.get<string>(
      'JWT_REFRESH_EXPIRES',
      '7d',
    );
    const expiresAt = new Date();
    expiresAt.setSeconds(
      expiresAt.getSeconds() + parseDuration(refreshExpiresIn),
    );

    // Clean old refresh tokens for this user (max 5)
    const existing = await this.prisma.refreshToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    if (existing.length >= 5) {
      const toDelete = existing.slice(0, existing.length - 4);
      await this.prisma.refreshToken.deleteMany({
        where: { id: { in: toDelete.map((t) => t.id) } },
      });
    }

    await this.prisma.refreshToken.create({
      data: {
        token: refreshTokenStr,
        userId,
        expiresAt,
      },
    });

    return { accessToken, refreshToken: refreshTokenStr };
  }

  private async sendSmsCode(phone: string) {
    // Invalidate old codes
    await this.prisma.smsCode.updateMany({
      where: { phone, used: false },
      data: { used: true },
    });

    const code = this.sms.generateCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    await this.prisma.smsCode.create({
      data: { phone, code, expiresAt },
    });

    await this.sms.sendCode(phone, code);
    this.logger.log(`SMS code sent to ${phone}`);
  }

  private async validateSmsCode(phone: string, code: string): Promise<boolean> {
    const smsCode = await this.prisma.smsCode.findFirst({
      where: {
        phone,
        code,
        used: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!smsCode) return false;

    await this.prisma.smsCode.update({
      where: { id: smsCode.id },
      data: { used: true },
    });

    return true;
  }
}
