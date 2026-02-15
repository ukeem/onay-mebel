import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';

// ────────────── mocks ──────────────

const mockPrisma = {
  project: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
};

const makeProject = (overrides: Record<string, any> = {}) => ({
  id: 'proj-1',
  userId: 'user-1',
  name: 'Test Project',
  clientData: 'Client info',
  rooms: [],
  calculations: [],
  createdAt: new Date(),
  ...overrides,
});

describe('ProjectsService', () => {
  let service: ProjectsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProjectsService(mockPrisma as any);
  });

  /* ═══════════════ findAll ═══════════════ */

  describe('findAll', () => {
    it('should return projects for given user', async () => {
      mockPrisma.project.findMany.mockResolvedValue([makeProject()]);

      const result = await service.findAll('user-1');

      expect(result).toHaveLength(1);
      expect(mockPrisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should return empty array when user has no projects', async () => {
      mockPrisma.project.findMany.mockResolvedValue([]);

      const result = await service.findAll('user-1');

      expect(result).toEqual([]);
    });
  });

  /* ═══════════════ findOne ═══════════════ */

  describe('findOne', () => {
    it('should return project by id for owner', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(makeProject());

      const result = await service.findOne('proj-1', 'user-1');

      expect(result.id).toBe('proj-1');
    });

    it('should throw NotFoundException if project not found', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not owner', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(
        makeProject({ userId: 'other-user' }),
      );

      await expect(service.findOne('proj-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  /* ═══════════════ create ═══════════════ */

  describe('create', () => {
    it('should create a project', async () => {
      mockPrisma.project.create.mockResolvedValue(
        makeProject({ name: 'New Project' }),
      );

      const result = await service.create('user-1', {
        name: 'New Project',
        clientData: 'Client',
      });

      expect(result.name).toBe('New Project');
      expect(mockPrisma.project.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          name: 'New Project',
          clientData: 'Client',
        },
      });
    });
  });

  /* ═══════════════ update ═══════════════ */

  describe('update', () => {
    it('should update project for owner', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(makeProject());
      mockPrisma.project.update.mockResolvedValue(
        makeProject({ name: 'Updated' }),
      );

      const result = await service.update('proj-1', 'user-1', {
        name: 'Updated',
      });

      expect(result.name).toBe('Updated');
    });

    it('should throw ForbiddenException if not owner', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(
        makeProject({ userId: 'other-user' }),
      );

      await expect(
        service.update('proj-1', 'user-1', { name: 'Update' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if project not found', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', 'user-1', { name: 'Update' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  /* ═══════════════ remove ═══════════════ */

  describe('remove', () => {
    it('should delete project for owner', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(makeProject());
      mockPrisma.project.delete.mockResolvedValue(makeProject());

      const result = await service.remove('proj-1', 'user-1');

      expect(result.id).toBe('proj-1');
    });

    it('should throw ForbiddenException if not owner', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(
        makeProject({ userId: 'other' }),
      );

      await expect(service.remove('proj-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  /* ═══════════════ duplicate ═══════════════ */

  describe('duplicate', () => {
    it('should duplicate a project via transaction', async () => {
      const srcProject = makeProject({
        rooms: [
          {
            roomTypeId: 'rt-1',
            products: [
              {
                productTypeId: 'pt-1',
                width: 600,
                height: 2100,
                depth: 600,
                bodyMaterialId: null,
                sectionsEnabled: false,
                backWallEnabled: false,
                backWallMaterialId: null,
                partitionsEnabled: false,
                shelvesEnabled: false,
                facadesEnabled: false,
                falseFacadesEnabled: false,
                falseFacadeQty: 0,
                falseFacadeMaterialId: null,
                drawersEnabled: false,
                mezzanineEnabled: false,
                countertopEnabled: false,
                extrasEnabled: false,
                sections: [],
                partitions: [],
                shelves: [],
                facades: [],
                drawers: [],
                extras: [],
                mezzanine: null,
                countertop: null,
              },
            ],
          },
        ],
      });

      mockPrisma.project.findUnique.mockResolvedValue(srcProject);

      const txMock = {
        project: {
          create: jest.fn().mockResolvedValue({
            id: 'proj-copy',
            name: 'Test Project (копия)',
          }),
        },
        room: {
          create: jest.fn().mockResolvedValue({ id: 'room-copy' }),
        },
        product: {
          create: jest.fn().mockResolvedValue({ id: 'product-copy' }),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(txMock));

      const result = await service.duplicate('proj-1', 'user-1');

      expect(result.id).toBe('proj-copy');
      expect(txMock.project.create).toHaveBeenCalled();
      expect(txMock.room.create).toHaveBeenCalledTimes(1);
      expect(txMock.product.create).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException for non-existent project', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      await expect(service.duplicate('nonexistent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if not owner', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(
        makeProject({ userId: 'other-user' }),
      );

      await expect(service.duplicate('proj-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
