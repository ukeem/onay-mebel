import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request as ExpressReq, Response } from 'express';
import { AuthService } from './auth.service';
import {
  LoginDto,
  RegisterDto,
  ResetConfirmDto,
  ResetRequestDto,
  VerifySmsDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  private get cookieOptions() {
    const isProduction = this.config.get<string>('NODE_ENV') === 'production';
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      path: '/',
    };
  }

  private setTokenCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    const accessExpiresIn = this.config.get<string>(
      'JWT_ACCESS_EXPIRES',
      '15m',
    );
    const refreshExpiresIn = this.config.get<string>(
      'JWT_REFRESH_EXPIRES',
      '7d',
    );

    res.cookie('accessToken', accessToken, {
      ...this.cookieOptions,
      maxAge: this.parseDurationMs(accessExpiresIn),
    });

    res.cookie('refreshToken', refreshToken, {
      ...this.cookieOptions,
      maxAge: this.parseDurationMs(refreshExpiresIn),
      path: '/api/auth', // only sent to auth endpoints
    });
  }

  private clearTokenCookies(res: Response) {
    res.clearCookie('accessToken', { ...this.cookieOptions });
    res.clearCookie('refreshToken', {
      ...this.cookieOptions,
      path: '/api/auth',
    });
  }

  private parseDurationMs(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 3600 * 1000;
    const value = parseInt(match[1], 10);
    switch (match[2]) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 3600 * 1000;
      case 'd':
        return value * 86400 * 1000;
      default:
        return 7 * 86400 * 1000;
    }
  }

  /** POST /api/auth/register */
  @Throttle({ short: { ttl: 60000, limit: 3 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.phone, dto.password);
  }

  /** POST /api/auth/verify-sms */
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @Post('verify-sms')
  @HttpCode(HttpStatus.OK)
  verifySms(@Body() dto: VerifySmsDto) {
    return this.auth.verifySms(dto.phone, dto.code);
  }

  /** POST /api/auth/login */
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(dto.phone, dto.password);
    this.setTokenCookies(res, result.accessToken, result.refreshToken);
    // Return user only (tokens are in httpOnly cookies)
    return { user: result.user };
  }

  /** POST /api/auth/refresh */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: ExpressReq,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = (req.cookies as Record<string, string>)?.refreshToken;
    if (!refreshToken) {
      this.clearTokenCookies(res);
      return { message: 'No refresh token' };
    }
    const result = await this.auth.refresh(refreshToken);
    this.setTokenCookies(res, result.accessToken, result.refreshToken);
    return { user: result.user };
  }

  /** POST /api/auth/logout */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: ExpressReq,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = (req.cookies as Record<string, string>)?.refreshToken;
    if (refreshToken) {
      await this.auth.logout(refreshToken);
    }
    this.clearTokenCookies(res);
    return { message: 'Выход выполнен' };
  }

  /** POST /api/auth/reset/request */
  @Throttle({ short: { ttl: 60000, limit: 3 } })
  @Post('reset/request')
  @HttpCode(HttpStatus.OK)
  resetRequest(@Body() dto: ResetRequestDto) {
    return this.auth.resetRequest(dto.phone);
  }

  /** POST /api/auth/reset/confirm */
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @Post('reset/confirm')
  @HttpCode(HttpStatus.OK)
  async resetConfirm(
    @Body() dto: ResetConfirmDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.resetConfirm(
      dto.phone,
      dto.code,
      dto.newPassword,
    );
    this.clearTokenCookies(res);
    return result;
  }

  /** GET /api/auth/me */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Request() req: { user: { id: string } }) {
    return this.auth.me(req.user.id);
  }
}
