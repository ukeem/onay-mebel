import { CatalogCopyService } from './catalog-copy.service';

// ────────────── mocks ──────────────

const mockPrisma = {
  material: {
    findMany: jest.fn(),
  },
  hardware: {
    findMany: jest.fn(),
  },
  serviceTemplate: {
    findFirst: jest.fn(),
  },
  userMaterial: {
    createMany: jest.fn(),
  },
  userHardware: {
    createMany: jest.fn(),
  },
  userService: {
    upsert: jest.fn(),
  },
  userDefaults: {
    upsert: jest.fn(),
  },
};

describe('CatalogCopyService', () => {
  let service: CatalogCopyService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CatalogCopyService(mockPrisma as any);
  });

  describe('copySettingsToUser', () => {
    it('should copy materials, hardware, and service template', async () => {
      const materials = [
        { id: 'mat-1', price: 5000 },
        { id: 'mat-2', price: 7000 },
      ];
      const hardware = [{ id: 'hw-1', price: 1500 }];
      const template = {
        sawingPrice: 100,
        drillingPrice: 50,
        edgeBandingPrice: 30,
        technologistPercent: 10,
        designerPercent: 5,
        assemblyPercent: 15,
        deliveryPrice: 5000,
        profitType: 'PERCENT',
        profitValue: 20,
      };

      mockPrisma.material.findMany.mockResolvedValue(materials);
      mockPrisma.hardware.findMany.mockResolvedValue(hardware);
      mockPrisma.serviceTemplate.findFirst.mockResolvedValue(template);
      mockPrisma.userMaterial.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.userHardware.createMany.mockResolvedValue({ count: 1 });
      mockPrisma.userService.upsert.mockResolvedValue({});

      await service.copySettingsToUser('user-1');

      // Materials
      expect(mockPrisma.userMaterial.createMany).toHaveBeenCalledWith({
        data: [
          { userId: 'user-1', materialId: 'mat-1', price: 5000 },
          { userId: 'user-1', materialId: 'mat-2', price: 7000 },
        ],
        skipDuplicates: true,
      });

      // Hardware
      expect(mockPrisma.userHardware.createMany).toHaveBeenCalledWith({
        data: [{ userId: 'user-1', hardwareId: 'hw-1', price: 1500 }],
        skipDuplicates: true,
      });

      // Service template
      expect(mockPrisma.userService.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          create: expect.objectContaining({
            userId: 'user-1',
            sawingPrice: 100,
            profitType: 'PERCENT',
          }),
        }),
      );
    });

    it('should skip materials if catalog is empty', async () => {
      mockPrisma.material.findMany.mockResolvedValue([]);
      mockPrisma.hardware.findMany.mockResolvedValue([]);
      mockPrisma.serviceTemplate.findFirst.mockResolvedValue(null);

      await service.copySettingsToUser('user-1');

      expect(mockPrisma.userMaterial.createMany).not.toHaveBeenCalled();
      expect(mockPrisma.userHardware.createMany).not.toHaveBeenCalled();
      expect(mockPrisma.userService.upsert).not.toHaveBeenCalled();
    });

    it('should skip hardware if none exist but copy materials', async () => {
      mockPrisma.material.findMany.mockResolvedValue([
        { id: 'mat-1', price: 5000 },
      ]);
      mockPrisma.hardware.findMany.mockResolvedValue([]);
      mockPrisma.serviceTemplate.findFirst.mockResolvedValue(null);
      mockPrisma.userMaterial.createMany.mockResolvedValue({ count: 1 });

      await service.copySettingsToUser('user-1');

      expect(mockPrisma.userMaterial.createMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.userHardware.createMany).not.toHaveBeenCalled();
    });
  });
});
