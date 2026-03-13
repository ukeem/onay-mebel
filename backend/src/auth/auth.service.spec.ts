import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

// ────────────── mocks ──────────────

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
  smsCode: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

const mockJwt = {
  sign: jest.fn().mockReturnValue('access-token-mock'),
};

const mockConfig = {
  get: jest.fn().mockReturnValue('7d'),
};

const mockSms = {
  generateCode: jest.fn().mockReturnValue('123456'),
  sendCode: jest.fn().mockResolvedValue(undefined),
};

const mockWs = {
  forceLogout: jest.fn(),
};

const mockCatalogCopy = {
  copySettingsToUser: jest.fn().mockResolvedValue(undefined),
};

const mockNotify = {
  notifyNewUser: jest.fn().mockResolvedValue(undefined),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new AuthService(
      mockPrisma as any,
      mockJwt as any,
      mockConfig as any,
      mockSms as any,
      mockWs as any,
      mockCatalogCopy as any,
      mockNotify as any,
    );

    // Default: refreshToken.findMany returns empty
    mockPrisma.refreshToken.findMany.mockResolvedValue([]);
    mockPrisma.refreshToken.create.mockResolvedValue({});
  });

  /* ═══════════════ REGISTER ═══════════════ */

  describe('register', () => {
    it('should register a new user successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-1',
        phone: '+77001234567',
        status: UserStatus.ACTIVE,
      });

      const result = await service.register('+77001234567', 'password123');

      expect(result.userId).toBe('user-1');
      expect(result.message).toContain('Регистрация успешна');
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            phone: '+77001234567',
            status: UserStatus.ACTIVE,
            activeUntil: expect.any(Date),
          }),
        }),
      );
      expect(mockCatalogCopy.copySettingsToUser).toHaveBeenCalledWith('user-1');
    });

    it('should throw ConflictException if user already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });

      await expect(
        service.register('+77001234567', 'password123'),
      ).rejects.toThrow(ConflictException);
    });

    it('should hash the password before storing', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-1',
        phone: '+77001234567',
        status: UserStatus.ACTIVE,
      });

      await service.register('+77001234567', 'password123');

      const createCall = mockPrisma.user.create.mock.calls[0][0];
      // Password should be hashed (not plain text)
      expect(createCall.data.password).not.toBe('password123');
      expect(createCall.data.password).toMatch(/^\$2[aby]\$/);
    });
  });

  /* ═══════════════ VERIFY SMS ═══════════════ */

  describe('verifySms', () => {
    it('should verify a valid SMS code', async () => {
      mockPrisma.smsCode.findFirst.mockResolvedValue({
        id: 'sms-1',
        phone: '+77001234567',
        code: '123456',
        used: false,
      });
      mockPrisma.smsCode.update.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        phone: '+77001234567',
        role: 'USER',
        status: UserStatus.INACTIVE,
      });

      const result = await service.verifySms('+77001234567', '123456');

      expect(result.verified).toBe(true);
      expect(result.user.status).toBe(UserStatus.INACTIVE); // Should NOT activate
      expect(mockPrisma.user.update).not.toHaveBeenCalled(); // No status change
    });

    it('should throw BadRequestException for invalid code', async () => {
      mockPrisma.smsCode.findFirst.mockResolvedValue(null);

      await expect(service.verifySms('+77001234567', '000000')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.smsCode.findFirst.mockResolvedValue({
        id: 'sms-1',
        code: '123456',
        used: false,
      });
      mockPrisma.smsCode.update.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.verifySms('+77001234567', '123456')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  /* ═══════════════ LOGIN ═══════════════ */

  describe('login', () => {
    const hashedPassword = bcrypt.hashSync('password123', 10);

    const activeUser = {
      id: 'user-1',
      phone: '+77001234567',
      password: hashedPassword,
      role: 'USER',
      status: UserStatus.ACTIVE,
      activeUntil: new Date(Date.now() + 86400000), // tomorrow
    };

    it('should login an active user successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(activeUser);

      const result = await service.login('+77001234567', 'password123');

      expect(result.accessToken).toBe('access-token-mock');
      expect(result.refreshToken).toBeDefined();
      expect(result.user.id).toBe('user-1');
      expect(mockWs.forceLogout).toHaveBeenCalledWith('user-1');
    });

    it('should throw UnauthorizedException for wrong phone', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login('+77009999999', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(activeUser);

      await expect(
        service.login('+77001234567', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException for BLOCKED user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...activeUser,
        status: UserStatus.BLOCKED,
      });

      await expect(
        service.login('+77001234567', 'password123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for INACTIVE user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...activeUser,
        status: UserStatus.INACTIVE,
        activeUntil: null,
      });

      await expect(
        service.login('+77001234567', 'password123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should auto-deactivate user when activeUntil is expired', async () => {
      const expiredUser = {
        ...activeUser,
        activeUntil: new Date(Date.now() - 86400000), // yesterday
      };
      mockPrisma.user.findUnique.mockResolvedValue(expiredUser);
      mockPrisma.user.update.mockResolvedValue({});

      await expect(
        service.login('+77001234567', 'password123'),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { status: UserStatus.INACTIVE },
      });
    });

    it('should force-logout previous sessions on login', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(activeUser);

      await service.login('+77001234567', 'password123');

      expect(mockWs.forceLogout).toHaveBeenCalledWith('user-1');
    });
  });

  /* ═══════════════ REFRESH ═══════════════ */

  describe('refresh', () => {
    it('should refresh tokens successfully', async () => {
      const stored = {
        id: 'rt-1',
        token: 'valid-refresh-token',
        expiresAt: new Date(Date.now() + 86400000),
        user: {
          id: 'user-1',
          phone: '+77001234567',
          role: 'USER',
          status: UserStatus.ACTIVE,
        },
      };
      mockPrisma.refreshToken.findUnique.mockResolvedValue(stored);
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({});

      const result = await service.refresh('valid-refresh-token');

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.id).toBe('user-1');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refresh('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for expired refresh token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        token: 'expired-token',
        expiresAt: new Date(Date.now() - 86400000),
        user: { id: 'user-1', status: UserStatus.ACTIVE },
      });
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({});

      await expect(service.refresh('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw ForbiddenException for blocked user on refresh', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        token: 'token',
        expiresAt: new Date(Date.now() + 86400000),
        user: { id: 'user-1', status: UserStatus.BLOCKED },
      });

      await expect(service.refresh('token')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  /* ═══════════════ LOGOUT ═══════════════ */

  describe('logout', () => {
    it('should delete refresh token', async () => {
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.logout('token');

      expect(result.message).toBe('Выход выполнен');
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { token: 'token' },
      });
    });
  });

  /* ═══════════════ RESET PASSWORD ═══════════════ */

  describe('resetRequest', () => {
    it('should return same message whether user exists or not', async () => {
      // User exists
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrisma.smsCode.updateMany.mockResolvedValue({});
      mockPrisma.smsCode.create.mockResolvedValue({});

      const r1 = await service.resetRequest('+77001234567');

      // User doesn't exist
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const r2 = await service.resetRequest('+77009999999');

      expect(r1.message).toBe(r2.message);
    });
  });

  describe('resetConfirm', () => {
    it('should reset password and invalidate sessions', async () => {
      mockPrisma.smsCode.findFirst.mockResolvedValue({
        id: 'sms-1',
        code: '123456',
        used: false,
      });
      mockPrisma.smsCode.update.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        phone: '+77001234567',
      });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({});

      const result = await service.resetConfirm(
        '+77001234567',
        '123456',
        'newPassword123',
      );

      expect(result.message).toContain('Пароль изменён');
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(mockWs.forceLogout).toHaveBeenCalledWith('user-1');
    });

    it('should throw BadRequestException for invalid code', async () => {
      mockPrisma.smsCode.findFirst.mockResolvedValue(null);

      await expect(
        service.resetConfirm('+77001234567', '000000', 'newPass'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  /* ═══════════════ ME ═══════════════ */

  describe('me', () => {
    it('should return current user data', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        phone: '+77001234567',
        role: 'USER',
        status: UserStatus.ACTIVE,
        activeUntil: null,
        createdAt: new Date(),
      });

      const result = await service.me('user-1');

      expect(result.id).toBe('user-1');
      expect(result.phone).toBe('+77001234567');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.me('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
