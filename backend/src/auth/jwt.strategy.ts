import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { UserStatus } from '@prisma/client';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { PrismaService } from '../prisma/prisma.service';

export interface JwtPayload {
  sub: string; // userId
  phone: string;
  role: string;
}

/** Extract JWT from httpOnly cookie first, then fallback to Authorization header */
function extractJwt(req: Request): string | null {
  const fromCookie = (req.cookies as Record<string, string>)?.accessToken;
  if (fromCookie) return fromCookie;
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: extractJwt,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { status: true, activeUntil: true },
    });

    if (!user) throw new ForbiddenException('BLOCKED');

    if (user.status === UserStatus.BLOCKED) {
      throw new ForbiddenException('BLOCKED');
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new ForbiddenException('INACTIVE');
    }

    // Check if subscription expired since token was issued
    // activeUntil represents end-of-day, so compare with start of today
    if (user.activeUntil) {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      if (new Date(user.activeUntil) < startOfToday) {
        await this.prisma.user.update({
          where: { id: payload.sub },
          data: { status: UserStatus.INACTIVE },
        });
        throw new ForbiddenException('INACTIVE');
      }
    }

    return { id: payload.sub, phone: payload.phone, role: payload.role };
  }
}
