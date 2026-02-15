import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const mockAuthService = {
  register: jest.fn(),
  verifySms: jest.fn(),
  login: jest.fn(),
  refresh: jest.fn(),
  logout: jest.fn(),
  resetRequest: jest.fn(),
  resetConfirm: jest.fn(),
  me: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: string) => {
    const map: Record<string, string> = {
      NODE_ENV: 'test',
      JWT_ACCESS_EXPIRES: '15m',
      JWT_REFRESH_EXPIRES: '7d',
    };
    return map[key] ?? defaultValue;
  }),
};

/** Mock Express Response */
function createMockRes() {
  return {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as any;
}

/** Mock Express Request with cookies */
function createMockReq(cookies: Record<string, string> = {}) {
  return { cookies } as any;
}

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('register', () => {
    it('should call authService.register with correct args', async () => {
      const dto = { phone: '+77001234567', password: 'password123' };
      const expected = { userId: 'user-1', message: 'OK' };
      mockAuthService.register.mockResolvedValue(expected);

      const result = await controller.register(dto);

      expect(result).toEqual(expected);
      expect(mockAuthService.register).toHaveBeenCalledWith(
        '+77001234567',
        'password123',
      );
    });
  });

  describe('verifySms', () => {
    it('should call authService.verifySms with correct args', async () => {
      const dto = { phone: '+77001234567', code: '123456' };
      const expected = { verified: true };
      mockAuthService.verifySms.mockResolvedValue(expected);

      const result = await controller.verifySms(dto);

      expect(result).toEqual(expected);
      expect(mockAuthService.verifySms).toHaveBeenCalledWith(
        '+77001234567',
        '123456',
      );
    });
  });

  describe('login', () => {
    it('should set cookies and return user', async () => {
      const dto = { phone: '+77001234567', password: 'password123' };
      const serviceResult = {
        accessToken: 'at',
        refreshToken: 'rt',
        user: { id: 'user-1' },
      };
      mockAuthService.login.mockResolvedValue(serviceResult);
      const res = createMockRes();

      const result = await controller.login(dto, res);

      expect(result).toEqual({ user: { id: 'user-1' } });
      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(mockAuthService.login).toHaveBeenCalledWith(
        '+77001234567',
        'password123',
      );
    });
  });

  describe('refresh', () => {
    it('should read refreshToken from cookie and set new cookies', async () => {
      const req = createMockReq({ refreshToken: 'rt-token' });
      const res = createMockRes();
      const serviceResult = {
        accessToken: 'new-at',
        refreshToken: 'new-rt',
        user: { id: 'user-1' },
      };
      mockAuthService.refresh.mockResolvedValue(serviceResult);

      const result = await controller.refresh(req, res);

      expect(result).toEqual({ user: { id: 'user-1' } });
      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(mockAuthService.refresh).toHaveBeenCalledWith('rt-token');
    });
  });

  describe('logout', () => {
    it('should read refreshToken from cookie and clear cookies', async () => {
      const req = createMockReq({ refreshToken: 'rt-token' });
      const res = createMockRes();
      mockAuthService.logout.mockResolvedValue({ message: 'Выход выполнен' });

      const result = await controller.logout(req, res);

      expect(result).toEqual({ message: 'Выход выполнен' });
      expect(res.clearCookie).toHaveBeenCalledTimes(2);
      expect(mockAuthService.logout).toHaveBeenCalledWith('rt-token');
    });
  });

  describe('resetRequest', () => {
    it('should call authService.resetRequest', async () => {
      const dto = { phone: '+77001234567' };
      const expected = { message: 'Код отправлен' };
      mockAuthService.resetRequest.mockResolvedValue(expected);

      const result = await controller.resetRequest(dto);

      expect(result).toEqual(expected);
      expect(mockAuthService.resetRequest).toHaveBeenCalledWith('+77001234567');
    });
  });

  describe('resetConfirm', () => {
    it('should clear cookies after password reset', async () => {
      const dto = {
        phone: '+77001234567',
        code: '123456',
        newPassword: 'newPass123',
      };
      const expected = { message: 'Пароль изменён' };
      mockAuthService.resetConfirm.mockResolvedValue(expected);
      const res = createMockRes();

      const result = await controller.resetConfirm(dto, res);

      expect(result).toEqual(expected);
      expect(res.clearCookie).toHaveBeenCalledTimes(2);
      expect(mockAuthService.resetConfirm).toHaveBeenCalledWith(
        '+77001234567',
        '123456',
        'newPass123',
      );
    });
  });

  describe('me', () => {
    it('should call authService.me with user id from request', async () => {
      const req = { user: { id: 'user-1' } };
      const expected = {
        id: 'user-1',
        phone: '+77001234567',
        role: 'USER',
      };
      mockAuthService.me.mockResolvedValue(expected);

      const result = await controller.me(req);

      expect(result).toEqual(expected);
      expect(mockAuthService.me).toHaveBeenCalledWith('user-1');
    });
  });
});
