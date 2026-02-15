import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

const mockUsersService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  changePassword: jest.fn(),
  remove: jest.fn(),
};

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  describe('findAll', () => {
    it('should pass requester role to service', async () => {
      const req = { user: { id: 'admin-1', role: Role.ADMIN } };
      mockUsersService.findAll.mockResolvedValue([]);

      await controller.findAll(req);

      expect(mockUsersService.findAll).toHaveBeenCalledWith(Role.ADMIN);
    });
  });

  describe('findOne', () => {
    it('should pass id and requester role to service', async () => {
      const req = { user: { id: 'admin-1', role: Role.SUPER } };
      mockUsersService.findOne.mockResolvedValue({ id: 'user-1' });

      await controller.findOne('user-1', req);

      expect(mockUsersService.findOne).toHaveBeenCalledWith(
        'user-1',
        Role.SUPER,
      );
    });
  });

  describe('create', () => {
    it('should pass dto to service', async () => {
      const dto = {
        phone: '+77001234567',
        password: 'password123',
        role: Role.USER,
      };
      mockUsersService.create.mockResolvedValue({ id: 'user-1' });

      await controller.create(dto);

      expect(mockUsersService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('should pass id, dto, requesterId, and requesterRole to service', async () => {
      const req = { user: { id: 'admin-1', role: Role.SUPER } };
      const dto = { status: 'BLOCKED' as any };
      mockUsersService.update.mockResolvedValue({});

      await controller.update('user-1', dto, req);

      expect(mockUsersService.update).toHaveBeenCalledWith(
        'user-1',
        dto,
        'admin-1',
        Role.SUPER,
      );
    });
  });

  describe('changePassword', () => {
    it('should pass id, dto, and requesterRole to service', async () => {
      const req = { user: { id: 'admin-1', role: Role.ADMIN } };
      const dto = { newPassword: 'newPass123' };
      mockUsersService.changePassword.mockResolvedValue({
        message: 'Пароль изменён',
      });

      await controller.changePassword('user-1', dto, req);

      expect(mockUsersService.changePassword).toHaveBeenCalledWith(
        'user-1',
        dto,
        Role.ADMIN,
      );
    });
  });

  describe('remove', () => {
    it('should pass id and requesterId to service', async () => {
      const req = { user: { id: 'super-1', role: Role.SUPER } };
      mockUsersService.remove.mockResolvedValue({
        message: 'Пользователь удалён',
      });

      await controller.remove('user-1', req);

      expect(mockUsersService.remove).toHaveBeenCalledWith('user-1', 'super-1');
    });
  });
});
