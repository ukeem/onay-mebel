import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';

// ────────────── mocks ──────────────

const mockPrisma = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    delete: jest.fn(),
  },
  refreshToken: {
    deleteMany: jest.fn(),
  },
};

const mockWs = {
  forceLogout: jest.fn(),
};

const mockCatalogCopy = {
  copySettingsToUser: jest.fn().mockResolvedValue(undefined),
};

const mockUploads = {
  deleteUserWithUploads: jest.fn().mockResolvedValue(undefined),
};

const makeUser = (overrides: Record<string, any> = {}) => ({
  id: 'user-1',
  phone: '+77001234567',
  password: bcrypt.hashSync('password123', 10),
  role: Role.USER,
  status: UserStatus.ACTIVE,
  activeUntil: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new UsersService(
      mockPrisma as any,
      mockWs as any,
      mockCatalogCopy as any,
      mockUploads as any,
    );
  });

  /* ═══════════════ findAll ═══════════════ */

  describe('findAll', () => {
    it('should return all users for SUPER', async () => {
      mockPrisma.user.findMany.mockResolvedValue([makeUser()]);

      const result = await service.findAll(Role.SUPER);

      expect(result).toHaveLength(1);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it('should filter to USER role for ADMIN', async () => {
      mockPrisma.user.findMany.mockResolvedValue([makeUser()]);

      await service.findAll(Role.ADMIN);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { role: Role.USER } }),
      );
    });
  });

  /* ═══════════════ findOne ═══════════════ */

  describe('findOne', () => {
    it('should return user by id', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser());

      const result = await service.findOne('user-1');

      expect(result.id).toBe('user-1');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if ADMIN tries to view ADMIN', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(
        makeUser({ role: Role.ADMIN }),
      );

      await expect(service.findOne('admin-1', Role.ADMIN)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow ADMIN to view USER', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(
        makeUser({ role: Role.USER }),
      );

      const result = await service.findOne('user-1', Role.ADMIN);
      expect(result.id).toBe('user-1');
    });

    it('should allow SUPER to view any role', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(
        makeUser({ role: Role.ADMIN }),
      );

      const result = await service.findOne('admin-1', Role.SUPER);
      expect(result.id).toBe('user-1');
    });
  });

  /* ═══════════════ create ═══════════════ */

  describe('create', () => {
    it('should create a user with hashed password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(makeUser());

      const result = await service.create({
        phone: '+77001234567',
        password: 'password123',
      });

      expect(result.id).toBe('user-1');
      expect(mockCatalogCopy.copySettingsToUser).toHaveBeenCalledWith('user-1');

      const createCall = mockPrisma.user.create.mock.calls[0][0];
      expect(createCall.data.status).toBe(UserStatus.ACTIVE);
    });

    it('should throw ConflictException for duplicate phone', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser());

      await expect(
        service.create({ phone: '+77001234567', password: 'password123' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  /* ═══════════════ update ═══════════════ */

  describe('update', () => {
    it('should update user status', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser());
      mockPrisma.user.update.mockResolvedValue(
        makeUser({ status: UserStatus.BLOCKED }),
      );
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({});

      const result = await service.update(
        'user-1',
        { status: UserStatus.BLOCKED },
        'admin-1',
        Role.SUPER,
      );

      expect(result.status).toBe(UserStatus.BLOCKED);
      expect(mockWs.forceLogout).toHaveBeenCalledWith('user-1');
    });

    it('should throw ForbiddenException when editing self', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser({ id: 'self' }));

      await expect(
        service.update('self', { status: UserStatus.BLOCKED }, 'self'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when editing SUPER', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(
        makeUser({ role: Role.SUPER }),
      );

      await expect(
        service.update(
          'super-1',
          { status: UserStatus.BLOCKED },
          'admin-1',
          Role.SUPER,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when ADMIN edits ADMIN', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(
        makeUser({ role: Role.ADMIN }),
      );

      await expect(
        service.update(
          'admin-2',
          { status: UserStatus.BLOCKED },
          'admin-1',
          Role.ADMIN,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when non-SUPER changes role', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser());

      await expect(
        service.update('user-1', { role: Role.ADMIN }, 'admin-1', Role.ADMIN),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should set ACTIVE status when activeUntil is in the future', async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      mockPrisma.user.findUnique.mockResolvedValue(
        makeUser({ status: UserStatus.INACTIVE }),
      );
      mockPrisma.user.update.mockResolvedValue(
        makeUser({ status: UserStatus.ACTIVE }),
      );

      await service.update(
        'user-1',
        { activeUntil: futureDate },
        'admin-1',
        Role.SUPER,
      );

      const updateCall = mockPrisma.user.update.mock.calls[0][0];
      expect(updateCall.data.status).toBe(UserStatus.ACTIVE);
    });

    it('should set INACTIVE status when activeUntil is in the past', async () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      mockPrisma.user.findUnique.mockResolvedValue(makeUser());
      mockPrisma.user.update.mockResolvedValue(
        makeUser({ status: UserStatus.INACTIVE }),
      );

      await service.update(
        'user-1',
        { activeUntil: pastDate },
        'admin-1',
        Role.SUPER,
      );

      const updateCall = mockPrisma.user.update.mock.calls[0][0];
      expect(updateCall.data.status).toBe(UserStatus.INACTIVE);
    });
  });

  /* ═══════════════ changePassword ═══════════════ */

  describe('changePassword', () => {
    it('should change password and invalidate sessions', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser());
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({});

      const result = await service.changePassword(
        'user-1',
        { newPassword: 'newPassword123' },
        Role.SUPER,
      );

      expect(result.message).toBe('Пароль изменён');
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(mockWs.forceLogout).toHaveBeenCalledWith('user-1');
    });

    it('should throw ForbiddenException for SUPER target', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(
        makeUser({ role: Role.SUPER }),
      );

      await expect(
        service.changePassword(
          'super-1',
          { newPassword: 'newPass' },
          Role.SUPER,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when ADMIN changes non-USER password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(
        makeUser({ role: Role.ADMIN }),
      );

      await expect(
        service.changePassword(
          'admin-2',
          { newPassword: 'newPass' },
          Role.ADMIN,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword('x', { newPassword: 'newPass' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  /* ═══════════════ remove ═══════════════ */

  describe('remove', () => {
    it('should delete user and force logout', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser());
      const result = await service.remove('user-1', 'admin-1');

      expect(result.message).toBe('Пользователь удалён');
      expect(mockUploads.deleteUserWithUploads).toHaveBeenCalledWith('user-1');
      expect(mockWs.forceLogout).toHaveBeenCalledWith('user-1');
    });

    it('does not report deletion or force logout when upload cleanup fails', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser());
      mockUploads.deleteUserWithUploads.mockRejectedValueOnce(
        new Error('filesystem failure'),
      );

      await expect(service.remove('user-1', 'admin-1')).rejects.toThrow(
        'filesystem failure',
      );
      expect(mockWs.forceLogout).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when deleting self', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser({ id: 'admin-1' }));

      await expect(service.remove('admin-1', 'admin-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when deleting SUPER', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(
        makeUser({ role: Role.SUPER }),
      );

      await expect(service.remove('super-1', 'admin-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent', 'admin-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
